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

export interface CategoriaML {
  id: string;
  name: string;
}

const CONCORRENCIA = 4;

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
        try {
          const p = await this.get<MlProduct>(`/products/${id}`);
          const o = mapProduto(p);
          if (o) return (await this.completar([o]))[0];
          if (tipo === "produto") return null; // produto sem vendedor ativo
        } catch (e) {
          if (!(e instanceof MlHttpError && e.status === 404) || tipo === "produto") throw e;
        }
      }
      const item = await this.get<MlItem>(`/items/${id}`);
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
    const produtos = await mapLimit(r.results, CONCORRENCIA, async ({ id }) => {
      try {
        return mapProduto(await this.get<MlProduct>(`/products/${id}`));
      } catch {
        return null;
      }
    });
    const validos = produtos.filter((p): p is OfertaNormalizada => p !== null);
    const semVenda = r.results.length - validos.length;
    if (semVenda > 0) avisos.push(`${semVenda} produto(s) do catálogo sem vendedor ativo foram ignorados.`);
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
      throw e;
    }
    const produtos = h.content.filter((c) => c.type === "PRODUCT");
    const itens = h.content.filter((c) => c.type === "ITEM");
    const outros = h.content.length - produtos.length - itens.length;
    if (outros > 0) avisos.push(`${outros} item(ns) do tipo "produto de vendedor" (MLBU) não são suportados pela API pública e foram ignorados.`);

    const deProdutos = await mapLimit(produtos, CONCORRENCIA, async (c) => {
      try {
        const o = mapProduto(await this.get<MlProduct>(`/products/${c.id}`));
        return o ? { ...o, posicaoMaisVendidos: c.position } : null;
      } catch {
        return null;
      }
    });
    const bulk = await this.itensEmLote(itens.map((c) => c.id));
    const deItens = itens
      .map((c) => (bulk[c.id] ? { ...mapItem(bulk[c.id]), posicaoMaisVendidos: c.position } : null))
      .filter((x) => x !== null);
    return [...deProdutos.filter((x) => x !== null), ...deItens] as OfertaNormalizada[];
  }

  /** Busca vários anúncios de uma vez (máx. 20 por chamada). */
  private async itensEmLote(ids: string[]): Promise<Record<string, MlItem>> {
    const mapa: Record<string, MlItem> = {};
    const unicos = [...new Set(ids)];
    for (let i = 0; i < unicos.length; i += 20) {
      const lote = unicos.slice(i, i + 20).join(",");
      let r: MlBulk;
      try {
        r = await this.get<MlBulk>(`/items/bulk?ids=${lote}`);
      } catch (e) {
        // Endpoint antigo (/items?ids=) funciona até 25/10/2026
        if (e instanceof MlHttpError && e.status === 404) r = await this.get<MlBulk>(`/items?ids=${lote}`);
        else continue;
      }
      for (const el of r) {
        const ok = (el.status_code ?? el.code) === 200;
        if (ok && el.body) mapa[el.body.id] = el.body;
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
      if (o.itemId) {
        try {
          const { tipo, id } = parseIdExterno(o.idExterno);
          const extra = tipo === "produto" ? `?catalog_product_id=${id}` : "";
          reviews = await this.get<MlReviews>(`/reviews/item/${o.itemId}${extra}`);
        } catch {
          reviews = null; // avaliação é opcional
        }
      }
      return enriquecer(o, o.itemId ? itens[o.itemId] : null, reviews);
    });
  }
}
