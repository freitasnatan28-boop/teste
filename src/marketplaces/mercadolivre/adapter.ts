// Adapter do Mercado Livre — usa SOMENTE a API oficial (api.mercadolibre.com).
//
// Como buscamos ofertas (situação da API em set/2026):
//  - A busca pública /sites/MLB/search responde 403 para a maioria dos apps.
//    Tentamos uma vez; se vier 403, usamos as alternativas oficiais abaixo.
//  - Palavra-chave: /products/search (catálogo) + /products/{id} (preço do vendedor
//    que está ganhando o "buy box").
//  - Só categoria: /highlights/MLB/category/{id} (20 mais vendidos da categoria).
//  - Complementos: /items/bulk (vendas, preço "de"), /reviews/item/{id} (avaliações).
//
// Link de afiliado: o ML NÃO tem API pública de afiliados. Dois modos:
//  - automático: você informa uma vez o seu código (matt_tool/matt_word, detectado a
//    partir de um link seu) e o painel monta o link de cada produto;
//  - manual: link gerado no Gerador de Links (ou Barra de Afiliados) e colado no painel.
import { env } from "@/lib/env";
import { mapLimit } from "@/lib/concurrency";
import type { FiltroBusca, MarketplaceAdapter, OfertaNormalizada, ResultadoBusca, ResultadoLinkAfiliado } from "../types";
import { MarketplaceError } from "../types";
import { mlGet, MlHttpError } from "./client";
import { ML_LINK_BUILDER_URL, ML_SITE } from "./constants";
import { lerCodigoAfiliadoML } from "@/lib/configuracoes";
import { ehLinkCurtoML, extrairIdDeUrlML, montarLinkAfiliado, resolverRedirecionamentos, validarLinkAfiliadoML } from "./links";
import { enriquecer, mapItem, mapProduto, parseIdExterno, type MlItem, type MlProduct, type MlReviews } from "./mappers";
import { mockMlGet } from "./mock";
import { mlConfigurado } from "./oauth";

interface MlSiteSearch {
  results: MlItem[];
}
interface MlProductSearch {
  results: { id: string }[];
}
interface MlHighlights {
  content: { id: string; position: number; type: "ITEM" | "PRODUCT" | "USER_PRODUCT" }[];
}
type MlBulk = { id?: string; code?: number; status_code?: number; body: MlItem | null }[];

export interface PassoDiagnostico {
  nome: string;
  caminho: string;
  status: number;
  detalhe: string;
}

export interface CategoriaML {
  id: string;
  name: string;
}

const CONCORRENCIA = 4;

/** Junta os erros de cada etapa para mostrar no painel (em vez de sumir em silêncio). */
class Falhas {
  private lista: { etapa: string; msg: string }[] = [];
  add(etapa: string, e: unknown) {
    const msg = e instanceof MlHttpError ? `${e.status}${e.message.includes(":") ? " —" + e.message.split(":").slice(1).join(":").split(" — O ML")[0] : ""}` : e instanceof Error ? e.message : String(e);
    this.lista.push({ etapa, msg: msg.slice(0, 160) });
  }
  get total() {
    return this.lista.length;
  }
  resumo(ignorar: string[] = []): string | null {
    const lista = this.lista.filter((f) => !ignorar.includes(f.etapa));
    if (!lista.length) return null;
    const porEtapa = new Map<string, { n: number; msg: string }>();
    for (const f of lista) {
      const atual = porEtapa.get(f.etapa);
      porEtapa.set(f.etapa, { n: (atual?.n ?? 0) + 1, msg: atual?.msg ?? f.msg });
    }
    return (
      "Falhas: " +
      [...porEtapa.entries()].map(([etapa, { n, msg }]) => `${etapa} (${n}x, ex.: ${msg})`).join("; ") +
      ". Use Config. → Diagnóstico da API para ver detalhes."
    );
  }
}

interface MlProductItems {
  results?: {
    item_id: string;
    category_id?: string;
    price: number;
    original_price?: number | null;
    currency_id?: string;
    shipping?: { free_shipping?: boolean };
    official_store_id?: number | null;
  }[];
}
interface MlUserProduct {
  id: string;
  name?: string;
  user_id?: number;
  seller_id?: number;
}

let cacheCategorias: { lista: CategoriaML[]; ate: number } | null = null;

/** Lista reserva, usada se a API de categorias estiver fora do ar */
export const CATEGORIAS_RAIZ_MLB: CategoriaML[] = [
  { id: "MLB5672", name: "Acessórios para Veículos" },
  { id: "MLB1403", name: "Alimentos e Bebidas" },
  { id: "MLB1071", name: "Animais" },
  { id: "MLB1384", name: "Bebês" },
  { id: "MLB1246", name: "Beleza e Cuidado Pessoal" },
  { id: "MLB1132", name: "Brinquedos e Hobbies" },
  { id: "MLB1430", name: "Calçados, Roupas e Bolsas" },
  { id: "MLB1574", name: "Casa, Móveis e Decoração" },
  { id: "MLB1051", name: "Celulares e Telefones" },
  { id: "MLB1500", name: "Construção" },
  { id: "MLB5726", name: "Eletrodomésticos" },
  { id: "MLB1000", name: "Eletrônicos, Áudio e Vídeo" },
  { id: "MLB1276", name: "Esportes e Fitness" },
  { id: "MLB263532", name: "Ferramentas" },
  { id: "MLB1144", name: "Games" },
  { id: "MLB1648", name: "Informática" },
  { id: "MLB3937", name: "Joias e Relógios" },
  { id: "MLB264586", name: "Saúde" },
];

// Memoriza que a busca pública está bloqueada para não tentar toda hora.
let buscaPublicaBloqueadaAte = 0;

// Recursos que o ML negou (403) para o seu app: não tentamos de novo por 6h.
// (Hoje o ML costuma bloquear para apps comuns: anúncios de outros vendedores,
// produtos de vendedor MLBU e avaliações.)
type Recurso = "items" | "user-products" | "reviews";
const bloqueadoAte: Partial<Record<Recurso, number>> = {};
const bloqueado = (r: Recurso) => (bloqueadoAte[r] ?? 0) > Date.now();
function marcarSe403(r: Recurso, e: unknown) {
  if (e instanceof MlHttpError && (e.status === 403 || e.status === 401)) bloqueadoAte[r] = Date.now() + 6 * 3600_000;
}

export class MercadoLivreAdapter implements MarketplaceAdapter {
  readonly id = "mercadolivre" as const;
  readonly nome = "Mercado Livre";

  private get<T>(path: string, opts?: { auth?: boolean }): Promise<T> {
    return env().ML_MOCK ? mockMlGet<T>(path) : mlGet<T>(path, opts);
  }

  habilitado(): boolean {
    return env().ML_MOCK || mlConfigurado();
  }

  motivoDesabilitado(): string | null {
    return this.habilitado() ? null : "Preencha ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI no .env (ou use ML_MOCK=true para testar).";
  }

  async buscarOfertas(filtro: FiltroBusca): Promise<ResultadoBusca> {
    const limite = Math.min(Math.max(filtro.limite ?? 20, 1), 50);
    const avisos: string[] = [];
    let ofertas: OfertaNormalizada[] = [];
    const q = filtro.palavraChave?.trim();

    if (q) {
      const viaBusca = await this.tentarBuscaPublica(q, filtro.categoriaId, limite, avisos);
      ofertas = viaBusca ?? (await this.buscarNoCatalogo(q, limite, avisos));
    } else if (filtro.categoriaId) {
      ofertas = await this.maisVendidosDaCategoria(filtro.categoriaId, avisos);
    } else {
      throw new MarketplaceError("Informe uma palavra-chave ou escolha uma categoria.");
    }

    ofertas = await this.completar(ofertas);
    return { ofertas, avisos };
  }

  async detalhesProduto(idExterno: string): Promise<OfertaNormalizada | null> {
    const { tipo, id } = parseIdExterno(idExterno);
    try {
      if (tipo === "produto" || tipo === "desconhecido") {
        const falhas = new Falhas();
        const o = await this.produtoDeCatalogo(id, falhas);
        if (o) return (await this.completar([o]))[0];
        if (tipo === "produto") {
          if (falhas.total) throw new MarketplaceError(falhas.resumo() ?? "Erro ao consultar o produto");
          return null; // produto sem vendedor ativo
        }
      }
      let item: MlItem;
      try {
        item = await this.get<MlItem>(`/items/${id}`);
      } catch (e) {
        marcarSe403("items", e);
        if (e instanceof MlHttpError && e.status === 403) {
          throw new MarketplaceError(
            "Esse link é de um anúncio avulso, e o Mercado Livre não libera anúncios de outros vendedores para o seu app. Use o link da página do produto (o endereço tem /p/MLB…) — no app, abra o produto e toque em Compartilhar.",
            "proibido",
          );
        }
        throw e;
      }
      if (item.status && item.status !== "active") return null;
      return (await this.completar([mapItem(item)], { [item.id]: item }))[0];
    } catch (e) {
      if (e instanceof MlHttpError && e.status === 404) return null;
      throw e;
    }
  }

  async gerarLinkAfiliado(oferta: Pick<OfertaNormalizada, "idExterno" | "urlProduto">): Promise<ResultadoLinkAfiliado> {
    // Modo automático: monta o link com o seu código de afiliado (matt_tool/matt_word)
    const codigo = await lerCodigoAfiliadoML();
    if (codigo?.ativo && oferta.urlProduto) {
      const url = montarLinkAfiliado(oferta.urlProduto, codigo);
      if (url) return { tipo: "automatico", url };
    }
    return {
      tipo: "manual",
      urlGerador: ML_LINK_BUILDER_URL,
      urlProduto: oferta.urlProduto ?? null,
      instrucoes: [
        "Copie o link do produto (botão abaixo).",
        "No computador: abra o Gerador de Links do Portal do Afiliado, cole o link e clique em Gerar.",
        "No celular: com a Barra de Afiliados ativada, abra o produto no app do ML e toque em Compartilhar.",
        "Copie o link gerado (começa com https://meli.la/) e cole no campo abaixo.",
      ],
    };
  }

  validarLinkAfiliado(url: string) {
    return validarLinkAfiliadoML(url);
  }

  async extrairIdDeLink(url: string): Promise<string | null> {
    const direto = extrairIdDeUrlML(url);
    if (direto) return direto;
    if (ehLinkCurtoML(url) && !env().ML_MOCK) {
      const final = await resolverRedirecionamentos(url);
      return extrairIdDeUrlML(final);
    }
    return null;
  }

  // ---------- Diagnóstico: testa cada recurso da API com a sua conta ----------

  async diagnostico(): Promise<PassoDiagnostico[]> {
    const passos: PassoDiagnostico[] = [];
    const testar = async <T,>(nome: string, path: string, resumir: (j: T) => string): Promise<T | null> => {
      try {
        const j = await this.get<T>(path);
        passos.push({ nome, caminho: path.split("?")[0], status: 200, detalhe: resumir(j) });
        return j;
      } catch (e) {
        const status = e instanceof MlHttpError ? e.status : 0;
        const msg = e instanceof Error ? e.message.split(" — O ML")[0] : String(e);
        passos.push({ nome, caminho: path.split("?")[0], status, detalhe: msg.slice(0, 200) });
        return null;
      }
    };

    await testar<{ nickname?: string }>("Sua conta", "/users/me", (j) => `conta ${j.nickname ?? "?"}`);
    await testar<MlSiteSearch>("Busca pública", `/sites/${ML_SITE}/search?q=air%20fryer&limit=3`, (j) => `${j.results?.length ?? 0} resultado(s)`);
    const busca = await testar<MlProductSearch>("Busca no catálogo", `/products/search?status=active&site_id=${ML_SITE}&q=air%20fryer&limit=5`, (j) => `${j.results?.length ?? 0} produto(s)`);
    const pid = busca?.results?.[0]?.id;
    let itemId: string | undefined;
    if (pid) {
      const p = await testar<MlProduct>("Detalhe do produto", `/products/${pid}`, (j) => (j.buy_box_winner ? `preço R$ ${j.buy_box_winner.price} (item ${j.buy_box_winner.item_id})` : "sem buy box (buy_box_winner vazio)"));
      itemId = p?.buy_box_winner?.item_id;
      const its = await testar<MlProductItems>("Vendedores do produto", `/products/${pid}/items?limit=3`, (j) => `${j.results?.length ?? 0} anúncio(s)` + (j.results?.[0] ? `, 1º a R$ ${j.results[0].price}` : ""));
      itemId = itemId ?? its?.results?.[0]?.item_id;
    }
    const h = await testar<MlHighlights>("Mais vendidos", `/highlights/${ML_SITE}/category/MLB5672`, (j) => {
      const c = j.content ?? [];
      const n = (t: string) => c.filter((x) => x.type === t).length;
      return `${c.length} (produto ${n("PRODUCT")}, anúncio ${n("ITEM")}, MLBU ${n("USER_PRODUCT")})`;
    });
    const up = h?.content?.find((c) => c.type === "USER_PRODUCT")?.id;
    itemId = itemId ?? h?.content?.find((c) => c.type === "ITEM")?.id;
    if (up) {
      const u = await testar<MlUserProduct>("Produto de vendedor (MLBU)", `/user-products/${up}`, (j) => `vendedor ${j.user_id ?? j.seller_id ?? "?"}`);
      const vend = u?.user_id ?? u?.seller_id;
      if (vend) {
        const r = await testar<{ results?: string[] }>("Anúncios do MLBU", `/users/${vend}/items/search?user_product_id=${up}`, (j) => `${j.results?.length ?? 0} anúncio(s)`);
        itemId = itemId ?? r?.results?.[0];
      }
    }
    if (itemId) {
      await testar<MlBulk>("Anúncios em lote", `/items/bulk?ids=${itemId}`, (j) => `código ${j[0]?.status_code ?? j[0]?.code ?? "?"}`);
      await testar<MlItem>("Anúncio", `/items/${itemId}`, (j) => `R$ ${j.price}, vendidos ${j.sold_quantity ?? "?"}`);
      await testar<MlReviews>("Avaliações", `/reviews/item/${itemId}`, (j) => `nota ${j.rating_average ?? "?"} (${j.paging?.total ?? 0})`);
    }
    return passos;
  }

  // ---------- Categorias (específico do ML) ----------

  // Categorias são públicas na API (não precisam de login)
  async listarCategorias(paiId?: string): Promise<CategoriaML[]> {
    if (!paiId) {
      if (cacheCategorias && cacheCategorias.ate > Date.now()) return cacheCategorias.lista;
      try {
        const lista = await this.get<CategoriaML[]>(`/sites/${ML_SITE}/categories`, { auth: false });
        cacheCategorias = { lista, ate: Date.now() + 24 * 3600_000 };
        return lista;
      } catch {
        return CATEGORIAS_RAIZ_MLB;
      }
    }
    const c = await this.get<{ children_categories?: CategoriaML[] }>(`/categories/${paiId}`, { auth: false });
    return c.children_categories ?? [];
  }

  async caminhoCategoria(id: string): Promise<{ id: string; name: string; rootId: string; rootName: string }> {
    const c = await this.get<{ id: string; name: string; path_from_root?: CategoriaML[] }>(`/categories/${id}`, { auth: false });
    const raiz = c.path_from_root?.[0] ?? { id: c.id, name: c.name };
    return { id: c.id, name: c.name, rootId: raiz.id, rootName: raiz.name };
  }

  // ---------- Internos ----------

  private async tentarBuscaPublica(q: string, categoria: string | undefined, limite: number, avisos: string[]) {
    if (Date.now() < buscaPublicaBloqueadaAte) return null;
    const params = new URLSearchParams({ q, limit: String(limite) });
    if (categoria) params.set("category", categoria);
    try {
      const r = await this.get<MlSiteSearch>(`/sites/${ML_SITE}/search?${params}`);
      return r.results.map(mapItem);
    } catch (e) {
      if (e instanceof MlHttpError && (e.status === 403 || e.status === 401)) {
        buscaPublicaBloqueadaAte = Date.now() + 6 * 3600_000; // tenta de novo em 6h
        avisos.push("A busca pública do ML está bloqueada para o seu app (403). Usando a busca de catálogo oficial.");
        return null;
      }
      throw e;
    }
  }

  private async buscarNoCatalogo(q: string, limite: number, avisos: string[]): Promise<OfertaNormalizada[]> {
    const params = new URLSearchParams({ status: "active", site_id: ML_SITE, q, limit: String(limite) });
    const r = await this.get<MlProductSearch>(`/products/search?${params}`);
    if (!r.results?.length) avisos.push("O catálogo do ML não trouxe nenhum produto para essa palavra-chave. Tente um termo mais genérico (ex.: \"fritadeira\").");
    const falhas = new Falhas();
    const produtos = await mapLimit(r.results ?? [], CONCORRENCIA, async ({ id }) => this.produtoDeCatalogo(id, falhas));
    const validos = produtos.filter((p): p is OfertaNormalizada => p !== null);
    const semVenda = (r.results?.length ?? 0) - validos.length - falhas.total;
    if (semVenda > 0) avisos.push(`${semVenda} produto(s) do catálogo sem vendedor ativo foram ignorados.`);
    const resumo = falhas.resumo();
    if (resumo) avisos.push(resumo);
    return validos;
  }

  private async maisVendidosDaCategoria(categoriaId: string, avisos: string[]): Promise<OfertaNormalizada[]> {
    let h: MlHighlights;
    try {
      h = await this.get<MlHighlights>(`/highlights/${ML_SITE}/category/${categoriaId}`);
    } catch (e) {
      if (e instanceof MlHttpError && e.status === 404) {
        throw new MarketplaceError(
          "Essa categoria não tem ranking de mais vendidos. Escolha uma subcategoria mais específica ou use uma palavra-chave.",
          "nao_encontrado",
        );
      }
      if (e instanceof MlHttpError && e.status === 403) {
        throw new MarketplaceError(
          "O ML não liberou o ranking de mais vendidos para o seu app. Use a busca por palavra-chave (deixe a categoria em “nenhuma”) ou libere a permissão: DevCenter → seu app → Editar → Permissões → marque Leitura em “Métricas do negócio” e nos demais grupos → salve → em Config., Desconectar e Conectar de novo.",
          "proibido",
        );
      }
      throw e;
    }
    const content = h.content ?? [];
    if (!content.length) avisos.push("O ML não retornou ranking para essa categoria.");
    const falhas = new Falhas();
    const produtos = content.filter((c) => c.type === "PRODUCT");
    const userProducts = content.filter((c) => c.type === "USER_PRODUCT");
    const itens = content.filter((c) => c.type === "ITEM");

    const deProdutos = await mapLimit(produtos, CONCORRENCIA, async (c) => {
      const o = await this.produtoDeCatalogo(c.id, falhas);
      return o ? { ...o, posicaoMaisVendidos: c.position } : null;
    });

    // User Products (MLBU): descobre o anúncio (item) de cada um
    if (bloqueado("items") && (userProducts.length || itens.length)) {
      avisos.push(
        `${userProducts.length + itens.length} item(ns) do ranking são anúncios de vendedores que o ML não libera para o seu app — foram ignorados. Os produtos de catálogo entraram normalmente.`,
      );
      const resumo = falhas.resumo();
      if (resumo) avisos.push(resumo);
      return deProdutos.filter((x) => x !== null) as OfertaNormalizada[];
    }
    const itemDeUp = await mapLimit(bloqueado("user-products") ? [] : userProducts, CONCORRENCIA, async (c) => {
      const itemId = await this.itemDeUserProduct(c.id, falhas);
      return itemId ? { itemId, position: c.position } : null;
    });
    const todosItens = [
      ...itens.map((c) => ({ itemId: c.id, position: c.position })),
      ...itemDeUp.filter((x): x is { itemId: string; position: number } => x !== null),
    ];
    const bulk = await this.itensEmLote(
      todosItens.map((x) => x.itemId),
      falhas,
    );
    const deItens = todosItens.map((x) => (bulk[x.itemId] ? { ...mapItem(bulk[x.itemId]), posicaoMaisVendidos: x.position } : null)).filter((x) => x !== null);

    const ignorados = userProducts.length + itens.length - deItens.length;
    const etapasBloqueadas = ["anúncios (/items)", "produto de vendedor (MLBU)"];
    if (ignorados > 0 && (bloqueado("items") || bloqueado("user-products"))) {
      avisos.push(`${ignorados} item(ns) do ranking são anúncios de vendedores que o ML não libera para o seu app — foram ignorados. Os produtos de catálogo entraram normalmente.`);
    }
    const resumo = falhas.resumo(bloqueado("items") || bloqueado("user-products") ? etapasBloqueadas : []);
    if (resumo) avisos.push(resumo);
    return [...deProdutos.filter((x) => x !== null), ...deItens] as OfertaNormalizada[];
  }

  /** Produto de catálogo → oferta. Usa o "buy box"; se vier vazio, pega o 1º vendedor em /products/{id}/items. */
  private async produtoDeCatalogo(id: string, falhas: Falhas): Promise<OfertaNormalizada | null> {
    let p: MlProduct;
    try {
      p = await this.get<MlProduct>(`/products/${id}`);
    } catch (e) {
      if (!(e instanceof MlHttpError && e.status === 404)) falhas.add("detalhe do produto (/products)", e);
      return null;
    }
    const direto = mapProduto(p);
    if (direto) return direto;
    try {
      const r = await this.get<MlProductItems>(`/products/${id}/items?limit=1`);
      const it = r.results?.[0];
      if (!it) return null;
      return mapProduto({ ...p, buy_box_winner: { ...it, item_id: it.item_id } });
    } catch (e) {
      if (e instanceof MlHttpError && e.status === 404) return null;
      falhas.add("vendedores do produto (/products/items)", e);
      return null;
    }
  }

  /** User Product (MLBU) → id do anúncio que vende esse produto. */
  private async itemDeUserProduct(id: string, falhas: Falhas): Promise<string | null> {
    try {
      const up = await this.get<MlUserProduct>(`/user-products/${id}`);
      const vendedor = up.user_id ?? up.seller_id;
      if (!vendedor) return null;
      const r = await this.get<{ results?: string[] }>(`/users/${vendedor}/items/search?user_product_id=${id}`);
      return r.results?.[0] ?? null;
    } catch (e) {
      marcarSe403("user-products", e);
      falhas.add("produto de vendedor (MLBU)", e);
      return null;
    }
  }

  /** Busca vários anúncios de uma vez (máx. 20 por chamada). */
  private async itensEmLote(ids: string[], falhas?: Falhas): Promise<Record<string, MlItem>> {
    const mapa: Record<string, MlItem> = {};
    if (bloqueado("items")) return mapa;
    const unicos = [...new Set(ids)];
    for (let i = 0; i < unicos.length; i += 20) {
      const lote = unicos.slice(i, i + 20).join(",");
      let r: MlBulk;
      try {
        r = await this.get<MlBulk>(`/items/bulk?ids=${lote}`);
      } catch (e) {
        // Endpoint antigo (/items?ids=) funciona até 25/10/2026
        try {
          if (e instanceof MlHttpError && e.status === 404) r = await this.get<MlBulk>(`/items?ids=${lote}`);
          else throw e;
        } catch (e2) {
          marcarSe403("items", e2);
          falhas?.add("anúncios (/items)", e2);
          continue;
        }
      }
      for (const el of r) {
        const cod = el.status_code ?? el.code;
        if (cod === 200 && el.body) mapa[el.body.id] = el.body;
        else {
          if (cod === 403) bloqueadoAte.items = Date.now() + 6 * 3600_000;
          falhas?.add("anúncios (/items)", new Error(`${cod ?? "?"} no item ${el.id ?? ""}`));
        }
      }
    }
    return mapa;
  }

  /** Completa as ofertas com dados do anúncio e avaliações. */
  private async completar(ofertas: OfertaNormalizada[], jaCarregados: Record<string, MlItem> = {}): Promise<OfertaNormalizada[]> {
    const faltando = ofertas.map((o) => o.itemId).filter((id): id is string => Boolean(id) && !jaCarregados[id!]);
    const itens = { ...jaCarregados, ...(await this.itensEmLote(faltando)) };
    return mapLimit(ofertas, CONCORRENCIA, async (o) => {
      let reviews: MlReviews | null = null;
      if (o.itemId && !bloqueado("reviews")) {
        try {
          const { tipo, id } = parseIdExterno(o.idExterno);
          const extra = tipo === "produto" ? `?catalog_product_id=${id}` : "";
          reviews = await this.get<MlReviews>(`/reviews/item/${o.itemId}${extra}`);
        } catch (e) {
          marcarSe403("reviews", e);
          reviews = null; // avaliação é opcional
        }
      }
      return enriquecer(o, o.itemId ? itens[o.itemId] : null, reviews);
    });
  }
}
