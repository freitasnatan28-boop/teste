// Cliente HTTP da API oficial do Mercado Livre (api.mercadolibre.com).
import { MarketplaceError } from "../types";
import { ML_API } from "./constants";
import { obterAccessToken } from "./oauth";

export class MlHttpError extends MarketplaceError {
  constructor(
    public readonly status: number,
    public readonly path: string,
    detalhe: string,
  ) {
    const codigo = status === 403 ? "proibido" : status === 404 ? "nao_encontrado" : status === 429 ? "limite" : status === 401 ? "nao_conectado" : "outro";
    super(`Mercado Livre respondeu ${status} em ${path.split("?")[0]}${detalhe ? `: ${detalhe}` : ""}`, codigo);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mlGet<T>(path: string, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true;
  let token = auth ? await obterAccessToken() : null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const res = await fetch(`${ML_API}${path}`, {
      headers: { accept: "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;

    // Token vencido/revogado: renova uma vez e tenta de novo
    if (res.status === 401 && auth && tentativa === 0) {
      token = await obterAccessToken(true);
      continue;
    }
    // Muitas requisições ou instabilidade: espera e tenta de novo
    if ((res.status === 429 || res.status >= 500) && tentativa < 2) {
      await sleep(1500 * (tentativa + 1));
      continue;
    }
    const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    throw new MlHttpError(res.status, path, body?.message ?? body?.error ?? "");
  }
  throw new MlHttpError(0, path, "falha após várias tentativas");
}
