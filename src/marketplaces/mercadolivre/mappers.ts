// Converte as respostas da API do ML para o formato comum (OfertaNormalizada).
import type { OfertaNormalizada } from "../types";

// Tipos parciais: só os campos que usamos.
export interface MlPicture {
  url?: string;
  secure_url?: string;
}
export interface MlShipping {
  free_shipping?: boolean;
}
export interface MlBuyBoxWinner {
  item_id: string;
  category_id?: string;
  price: number;
  original_price?: number | null;
  currency_id?: string;
  shipping?: MlShipping;
  official_store_id?: number | null;
}
export interface MlProduct {
  id: string;
  status?: string;
  name: string;
  permalink?: string;
  pictures?: MlPicture[] | null;
  buy_box_winner?: MlBuyBoxWinner | null;
}
export interface MlItem {
  id: string;
  title: string;
  price: number;
  original_price?: number | null;
  base_price?: number | null;
  currency_id?: string;
  permalink?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  pictures?: MlPicture[];
  category_id?: string;
  catalog_product_id?: string | null;
  official_store_id?: number | null;
  official_store_name?: string | null;
  sold_quantity?: number | null;
  status?: string;
  shipping?: MlShipping;
}
export interface MlReviews {
  rating_average?: number;
  paging?: { total?: number };
}

/** Prefixos para diferenciar produto de catálogo e anúncio (os dois começam com "MLB"). */
export const idProduto = (id: string) => `produto:${id}`;
export const idItem = (id: string) => `item:${id}`;
export function parseIdExterno(idExterno: string): { tipo: "produto" | "item" | "desconhecido"; id: string } {
  const [prefixo, resto] = idExterno.includes(":") ? idExterno.split(":", 2) : ["", idExterno];
  if (prefixo === "produto") return { tipo: "produto", id: resto };
  if (prefixo === "item") return { tipo: "item", id: resto };
  return { tipo: "desconhecido", id: resto };
}

function https(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

/** Converte um produto de catálogo (com vencedor do buy box). Retorna null se não está à venda. */
export function mapProduto(p: MlProduct): OfertaNormalizada | null {
  const bb = p.buy_box_winner;
  if (!bb || typeof bb.price !== "number") return null;
  return {
    marketplace: "mercadolivre",
    idExterno: idProduto(p.id),
    itemId: bb.item_id,
    titulo: p.name,
    urlProduto: p.permalink || `https://www.mercadolivre.com.br/p/${p.id}`,
    imagemUrl: https(p.pictures?.[0]?.secure_url ?? p.pictures?.[0]?.url),
    categoriaId: bb.category_id ?? null,
    preco: bb.price,
    precoOriginal: bb.original_price ?? null,
    moeda: bb.currency_id ?? "BRL",
    freteGratis: Boolean(bb.shipping?.free_shipping),
    lojaOficial: bb.official_store_id != null,
  };
}

/** Converte um anúncio (item). */
export function mapItem(i: MlItem): OfertaNormalizada {
  return {
    marketplace: "mercadolivre",
    idExterno: idItem(i.id),
    itemId: i.id,
    titulo: i.title,
    urlProduto: i.permalink ?? null,
    imagemUrl: https(i.pictures?.[0]?.secure_url ?? i.pictures?.[0]?.url ?? i.secure_thumbnail ?? i.thumbnail),
    categoriaId: i.category_id ?? null,
    preco: i.price,
    precoOriginal: i.original_price ?? null,
    moeda: i.currency_id ?? "BRL",
    quantidadeVendida: typeof i.sold_quantity === "number" ? i.sold_quantity : null,
    freteGratis: Boolean(i.shipping?.free_shipping),
    lojaOficial: i.official_store_id != null,
    nomeLojaOficial: i.official_store_name ?? null,
  };
}

/** Completa uma oferta de catálogo com dados do anúncio vencedor e das avaliações. */
export function enriquecer(o: OfertaNormalizada, item?: MlItem | null, reviews?: MlReviews | null): OfertaNormalizada {
  const r = { ...o };
  if (item) {
    r.precoOriginal = r.precoOriginal ?? item.original_price ?? null;
    r.quantidadeVendida = r.quantidadeVendida ?? (typeof item.sold_quantity === "number" ? item.sold_quantity : null);
    r.urlProduto = r.urlProduto ?? item.permalink ?? null;
    r.imagemUrl = r.imagemUrl ?? https(item.secure_thumbnail ?? item.thumbnail);
    r.nomeLojaOficial = r.nomeLojaOficial ?? item.official_store_name ?? null;
    r.categoriaId = r.categoriaId ?? item.category_id ?? null;
  }
  if (reviews && typeof reviews.rating_average === "number" && (reviews.paging?.total ?? 0) > 0) {
    r.avaliacao = Math.round(reviews.rating_average * 10) / 10;
    r.numAvaliacoes = reviews.paging?.total ?? null;
  }
  return r;
}
