// Regras de negócio das ofertas: importar do marketplace, salvar histórico,
// calcular score, detectar desconto suspeito, tags e link de afiliado.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { analisarDesconto } from "@/lib/precos";
import { calcularScore } from "@/lib/score";
import { sugerirTags } from "@/lib/tags";
import { adapter, mercadoLivre } from "@/marketplaces/registry";
import type { FiltroBusca, OfertaNormalizada } from "@/marketplaces/types";
import { MarketplaceError } from "@/marketplaces/types";

/** Não grava um ponto novo se o preço for igual ao último salvo há menos disto */
const INTERVALO_MIN_SNAPSHOT_MS = 30 * 60_000;

async function categoriaRaiz(marketplace: string, categoriaId: string | null | undefined) {
  if (!categoriaId || marketplace !== "mercadolivre") return null;
  const cache = await prisma.categoryCache.findUnique({ where: { id: categoriaId } });
  if (cache && cache.updatedAt.getTime() > Date.now() - 30 * 86400_000) return cache;
  try {
    const c = await mercadoLivre.caminhoCategoria(categoriaId);
    return prisma.categoryCache.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, rootId: c.rootId, rootName: c.rootName },
      update: { name: c.name, rootId: c.rootId, rootName: c.rootName },
    });
  } catch {
    return cache;
  }
}

/** Salva (ou atualiza) uma oferta vinda do marketplace e recalcula tudo. */
export async function salvarOferta(o: OfertaNormalizada): Promise<string> {
  const cat = await categoriaRaiz(o.marketplace, o.categoriaId);
  const existente = await prisma.product.findUnique({
    where: { marketplace_externalId: { marketplace: o.marketplace, externalId: o.idExterno } },
    include: { priceHistory: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  const dados = {
    itemId: o.itemId ?? null,
    title: o.titulo,
    permalink: o.urlProduto ?? null,
    imageUrl: o.imagemUrl ?? null,
    categoryId: o.categoriaId ?? null,
    categoryName: cat?.name ?? null,
    rootCategoryId: cat?.rootId ?? null,
    price: o.preco,
    originalPrice: o.precoOriginal ?? null,
    currency: o.moeda,
    rating: o.avaliacao ?? null,
    reviewsCount: o.numAvaliacoes ?? null,
    soldQuantity: o.quantidadeVendida ?? null,
    bestSellerPosition: o.posicaoMaisVendidos ?? existente?.bestSellerPosition ?? null,
    freeShipping: o.freteGratis,
    officialStore: o.lojaOficial,
    officialStoreName: o.nomeLojaOficial ?? null,
    lastCheckedAt: new Date(),
  } satisfies Prisma.ProductUpdateInput;

  let productId: string;
  if (existente) {
    await prisma.product.update({ where: { id: existente.id }, data: dados });
    productId = existente.id;
  } else {
    const tags = await prisma.tag.findMany();
    const slugs = sugerirTags(
      o.titulo,
      cat?.rootId,
      tags.map((t) => ({ slug: t.slug, keywords: JSON.parse(t.keywords) as string[], categoryIds: JSON.parse(t.categoryIds) as string[] })),
    );
    const criado = await prisma.product.create({
      data: {
        ...dados,
        marketplace: o.marketplace,
        externalId: o.idExterno,
        tags: { connect: slugs.map((slug) => ({ slug })) },
      },
    });
    productId = criado.id;
  }

  // Histórico: salva o preço desta consulta
  const ultimo = existente?.priceHistory[0];
  const repetido =
    ultimo &&
    ultimo.price === o.preco &&
    ultimo.originalPrice === (o.precoOriginal ?? null) &&
    Date.now() - ultimo.capturedAt.getTime() < INTERVALO_MIN_SNAPSHOT_MS;
  if (!repetido) {
    await prisma.priceSnapshot.create({ data: { productId, price: o.preco, originalPrice: o.precoOriginal ?? null } });
  }

  await recalcular(productId);
  return productId;
}

/** Recalcula desconto real, alerta de desconto suspeito e score. */
export async function recalcular(productId: string) {
  const p = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { priceHistory: { orderBy: { capturedAt: "asc" } } },
  });
  const analise = analisarDesconto(p.price, p.originalPrice, p.priceHistory);
  const score = calcularScore({
    descontoReal: analise.descontoReal,
    avaliacao: p.rating,
    numAvaliacoes: p.reviewsCount,
    quantidadeVendida: p.soldQuantity,
    posicaoMaisVendidos: p.bestSellerPosition,
    freteGratis: p.freeShipping,
    lojaOficial: p.officialStore,
    suspeito: analise.suspeito,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      score: score.total,
      scoreDetails: JSON.stringify({ ...score.partes, historicoInsuficiente: analise.historicoInsuficiente }),
      realDiscountPct: analise.descontoReal,
      suspiciousDiscount: analise.suspeito,
      suspiciousReason: analise.motivo,
    },
  });
}

export async function buscarEImportar(marketplace: string, filtro: FiltroBusca) {
  const a = adapter(marketplace);
  const { ofertas, avisos } = await a.buscarOfertas(filtro);
  const ids: string[] = [];
  for (const o of ofertas) ids.push(await salvarOferta(o));
  return { importados: ids.length, avisos };
}

/** Importa um produto a partir de um link (de produto ou de afiliado meli.la). */
export async function importarPorLink(marketplace: string, url: string) {
  const a = adapter(marketplace);
  const idExterno = await a.extrairIdDeLink(url);
  if (!idExterno) throw new MarketplaceError("Não consegui identificar o produto nesse link. Cole o link da página do produto no Mercado Livre.");
  const o = await a.detalhesProduto(idExterno);
  if (!o) throw new MarketplaceError("Produto não encontrado ou sem estoque/vendedor ativo.", "nao_encontrado");
  const id = await salvarOferta(o);
  // Se o link colado já era de afiliado, aproveita
  const link = a.validarLinkAfiliado(url);
  if (link.ok) await prisma.product.update({ where: { id }, data: { affiliateUrl: link.url, affiliateUpdatedAt: new Date() } });
  return id;
}

/** Consulta de novo o preço de um produto salvo. */
export async function atualizarProduto(productId: string) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const o = await adapter(p.marketplace).detalhesProduto(p.externalId);
  if (!o) {
    await prisma.product.update({ where: { id: productId }, data: { lastCheckedAt: new Date() } });
    return false;
  }
  await salvarOferta(o);
  return true;
}

/** Atualiza os preços de todos os produtos visíveis (usado pelo botão e pelo script agendado). */
export async function atualizarTodos() {
  const produtos = await prisma.product.findMany({ where: { hidden: false }, select: { id: true } });
  let ok = 0;
  let falhas = 0;
  for (const p of produtos) {
    try {
      if (await atualizarProduto(p.id)) ok++;
    } catch {
      falhas++;
    }
  }
  return { total: produtos.length, ok, falhas };
}

export async function salvarLinkAfiliado(productId: string, url: string) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const r = adapter(p.marketplace).validarLinkAfiliado(url);
  if (!r.ok) throw new MarketplaceError(r.erro);
  await prisma.product.update({ where: { id: productId }, data: { affiliateUrl: r.url, affiliateUpdatedAt: new Date() } });
}

export interface FiltrosLista {
  categoria?: string; // categoria raiz
  precoMin?: number;
  precoMax?: number;
  descontoMin?: number;
  tag?: string;
  freteGratis?: boolean;
  semSuspeitos?: boolean;
  comLink?: boolean;
  ordem?: "score" | "desconto" | "preco" | "recentes";
}

export async function listarOfertas(f: FiltrosLista) {
  const where: Prisma.ProductWhereInput = { hidden: false };
  if (f.categoria) where.rootCategoryId = f.categoria;
  if (f.precoMin != null || f.precoMax != null) where.price = { gte: f.precoMin ?? undefined, lte: f.precoMax ?? undefined };
  if (f.descontoMin != null) where.realDiscountPct = { gte: f.descontoMin };
  if (f.tag) where.tags = { some: { slug: f.tag } };
  if (f.freteGratis) where.freeShipping = true;
  if (f.semSuspeitos) where.suspiciousDiscount = false;
  if (f.comLink) where.affiliateUrl = { not: null };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    f.ordem === "desconto"
      ? [{ realDiscountPct: { sort: "desc", nulls: "last" } }]
      : f.ordem === "preco"
        ? [{ price: "asc" }]
        : f.ordem === "recentes"
          ? [{ lastCheckedAt: "desc" }]
          : [{ score: "desc" }, { lastCheckedAt: "desc" }];
  return prisma.product.findMany({ where, orderBy, include: { tags: true }, take: 200 });
}
