// Lista de marketplaces disponíveis. Para adicionar uma loja nova,
// crie um adapter que implemente MarketplaceAdapter e registre aqui.
import type { MarketplaceAdapter, MarketplaceId } from "./types";
import { MarketplaceError } from "./types";
import { MercadoLivreAdapter } from "./mercadolivre/adapter";
import { ShopeeAdapter } from "./shopee/adapter";

export const mercadoLivre = new MercadoLivreAdapter();
export const shopee = new ShopeeAdapter();

const TODOS: Record<MarketplaceId, MarketplaceAdapter> = {
  mercadolivre: mercadoLivre,
  shopee,
};

export function todosAdapters(): MarketplaceAdapter[] {
  return Object.values(TODOS);
}

export function adaptersHabilitados(): MarketplaceAdapter[] {
  return todosAdapters().filter((a) => a.habilitado());
}

export function adapter(id: string): MarketplaceAdapter {
  const a = TODOS[id as MarketplaceId];
  if (!a) throw new MarketplaceError(`Marketplace desconhecido: ${id}`);
  if (!a.habilitado()) throw new MarketplaceError(a.motivoDesabilitado() ?? `${a.nome} está desligado`, "desabilitado");
  return a;
}
