// Links do Mercado Livre: validar link de afiliado e descobrir o produto a partir de um link.

const HOSTS_AFILIADO = ["meli.la", "mercadolivre.com", "www.mercadolivre.com"];

export function validarLinkAfiliadoML(input: string): { ok: true; url: string } | { ok: false; erro: string } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, erro: "Isso não parece um link. Cole o link completo, começando com https://" };
  }
  if (url.protocol !== "https:") return { ok: false, erro: "O link precisa começar com https://" };
  const host = url.hostname.toLowerCase();
  if (host === "meli.la" && url.pathname.length > 1) return { ok: true, url: url.toString() };
  // Link longo gerado pelo portal: https://mercadolivre.com/sec/XXXX
  if (HOSTS_AFILIADO.includes(host) && url.pathname.startsWith("/sec/")) return { ok: true, url: url.toString() };
  if (host.endsWith("mercadolivre.com.br") || host.endsWith("mercadolibre.com")) {
    return {
      ok: false,
      erro: "Esse é um link comum de produto (não rende comissão). Gere o link no Gerador de Links do Portal do Afiliado ou no botão Compartilhar da Barra de Afiliados — ele começa com https://meli.la/",
    };
  }
  return { ok: false, erro: "Link não reconhecido. Links de afiliado do Mercado Livre começam com https://meli.la/" };
}

/**
 * Tenta extrair o ID de um link de produto do ML, sem acessar a internet.
 *  - Catálogo:  https://www.mercadolivre.com.br/nome-do-produto/p/MLB12345678   -> produto:MLB12345678
 *  - Anúncio:   https://produto.mercadolivre.com.br/MLB-1234567890-nome-_JM     -> item:MLB1234567890
 *  - Parâmetros ?item_id=MLB... ou #...wid=MLB... também são aceitos
 */
export function extrairIdDeUrlML(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    // Talvez a pessoa colou só o código (ex.: MLB12345678)
    const m = input.trim().toUpperCase().match(/^MLB-?(\d{6,})$/);
    return m ? `item:MLB${m[1]}` : null;
  }
  const host = url.hostname.toLowerCase();
  if (!host.endsWith("mercadolivre.com.br") && !host.endsWith("mercadolibre.com")) return null;

  const wid = url.searchParams.get("item_id") ?? url.searchParams.get("wid") ?? url.hash.match(/wid=(MLB\d+)/i)?.[1];
  const catalogo = url.pathname.match(/\/p\/(MLB\d+)/i);
  if (catalogo) return `produto:${catalogo[1].toUpperCase()}`;
  if (wid && /^MLB\d+$/i.test(wid)) return `item:${wid.toUpperCase()}`;
  const item = url.pathname.match(/\/(MLB)-?(\d{6,})/i);
  if (item) return `item:MLB${item[2]}`;
  return null;
}

/** Links curtos (meli.la, /sec/) precisam ser "abertos" para descobrir o produto. */
export function ehLinkCurtoML(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return u.hostname === "meli.la" || u.pathname.startsWith("/sec/");
  } catch {
    return false;
  }
}

function hostDoML(u: string): boolean {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return (
      new URL(u).protocol === "https:" &&
      (h === "meli.la" || h === "mercadolivre.com" || h.endsWith(".mercadolivre.com") || h.endsWith("mercadolivre.com.br") || h.endsWith("mercadolibre.com"))
    );
  } catch {
    return false;
  }
}

/**
 * Segue os redirecionamentos de um link curto (só lê o endereço final, não faz scraping).
 * Por segurança, só acessa endereços do próprio Mercado Livre.
 */
export async function resolverRedirecionamentos(input: string, maxSaltos = 6): Promise<string> {
  let atual = input.trim();
  for (let i = 0; i < maxSaltos; i++) {
    if (!hostDoML(atual)) return atual;
    const res = await fetch(atual, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      atual = new URL(loc, atual).toString();
      if (extrairIdDeUrlML(atual)) return atual;
      continue;
    }
    return atual;
  }
  return atual;
}
