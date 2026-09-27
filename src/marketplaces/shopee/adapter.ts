// Adapter da Shopee — ESQUELETO (Fase 5).
// Fica DESLIGADO até você colocar no .env:
//   SHOPEE_ENABLED=true, SHOPEE_APP_ID=..., SHOPEE_SECRET=...
// A implementação completa (busca de ofertas e link curto) será feita e testada
// na Fase 5, conferindo a documentação atual da Shopee Affiliate Open API (GraphQL).
import { env } from "@/lib/env";
import type { FiltroBusca, MarketplaceAdapter, OfertaNormalizada, ResultadoBusca, ResultadoLinkAfiliado } from "../types";
import { MarketplaceError } from "../types";
import { assinarShopee } from "./assinatura";

export class ShopeeAdapter implements MarketplaceAdapter {
  readonly id = "shopee" as const;
  readonly nome = "Shopee";

  habilitado(): boolean {
    const e = env();
    return e.SHOPEE_ENABLED && Boolean(e.SHOPEE_APP_ID && e.SHOPEE_SECRET);
  }

  motivoDesabilitado(): string | null {
    const e = env();
    if (!e.SHOPEE_ENABLED) return "Desligado (SHOPEE_ENABLED=false). Será ativado na Fase 5, quando sua conta de afiliado for aprovada.";
    if (!e.SHOPEE_APP_ID || !e.SHOPEE_SECRET) return "Faltam SHOPEE_APP_ID e SHOPEE_SECRET no .env.";
    return null;
  }

  /** Chamada GraphQL assinada. Pronta para uso na Fase 5. */
  protected async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    if (!this.habilitado()) throw new MarketplaceError(this.motivoDesabilitado() ?? "Shopee desligada", "desabilitado");
    const e = env();
    const payload = JSON.stringify({ query, variables });
    const { authorization } = assinarShopee(e.SHOPEE_APP_ID, e.SHOPEE_SECRET, payload);
    const res = await fetch(e.SHOPEE_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (!res.ok || json.errors?.length) {
      throw new MarketplaceError(`Shopee respondeu ${res.status}: ${json.errors?.map((x) => x.message).join("; ") ?? ""}`);
    }
    return json.data as T;
  }

  private naoImplementado(): never {
    throw new MarketplaceError("Adapter da Shopee será implementado na Fase 5.", "desabilitado");
  }

  async buscarOfertas(_filtro: FiltroBusca): Promise<ResultadoBusca> {
    // Fase 5: query productOfferV2(keyword, sortType, page, limit)
    return this.naoImplementado();
  }

  async detalhesProduto(_idExterno: string): Promise<OfertaNormalizada | null> {
    return this.naoImplementado();
  }

  async gerarLinkAfiliado(_oferta: Pick<OfertaNormalizada, "idExterno" | "urlProduto">): Promise<ResultadoLinkAfiliado> {
    // Fase 5: mutation generateShortLink(input: { originUrl, subIds }) { shortLink }
    return this.naoImplementado();
  }

  validarLinkAfiliado(url: string) {
    try {
      const u = new URL(url.trim());
      if (u.protocol === "https:" && (u.hostname === "s.shopee.com.br" || u.hostname.endsWith("shope.ee"))) return { ok: true as const, url: u.toString() };
    } catch {
      /* cai no erro abaixo */
    }
    return { ok: false as const, erro: "Links de afiliado da Shopee começam com https://s.shopee.com.br/" };
  }

  async extrairIdDeLink(_url: string): Promise<string | null> {
    return null;
  }
}
