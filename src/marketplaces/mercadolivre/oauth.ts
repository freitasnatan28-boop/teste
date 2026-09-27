// OAuth 2.0 do Mercado Livre (fluxo "authorization code", server side).
// Documentação: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
// - access_token vale 6 horas
// - refresh_token é de USO ÚNICO: cada renovação devolve um novo, que precisa ser salvo
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MarketplaceError } from "../types";
import { ML_API, ML_AUTH_URL } from "./constants";

const PROVIDER = "mercadolivre";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user_id?: number;
}

export function mlConfigurado(): boolean {
  const e = env();
  return Boolean(e.ML_CLIENT_ID && e.ML_CLIENT_SECRET && e.ML_REDIRECT_URI);
}

/** Monta a URL para onde o usuário é mandado para autorizar o app. */
export async function criarUrlAutorizacao(): Promise<string> {
  const e = env();
  if (!mlConfigurado()) throw new MarketplaceError("Preencha ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI no .env", "nao_conectado");
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: e.ML_CLIENT_ID,
    redirect_uri: e.ML_REDIRECT_URI,
    state,
  });
  let codeVerifier: string | null = null;
  if (e.ML_USE_PKCE) {
    codeVerifier = randomBytes(48).toString("base64url");
    params.set("code_challenge", createHash("sha256").update(codeVerifier).digest("base64url"));
    params.set("code_challenge_method", "S256");
  }
  // Limpa "states" antigos (mais de 1 hora)
  await prisma.oAuthState.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 3600_000) } } });
  await prisma.oAuthState.create({ data: { state, codeVerifier } });
  return `${ML_AUTH_URL}?${params.toString()}`;
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { message?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new MarketplaceError(
      `Mercado Livre recusou o token (${res.status}): ${json.error ?? ""} ${json.message ?? ""}`.trim(),
      "nao_conectado",
    );
  }
  return json as TokenResponse;
}

async function salvarToken(t: TokenResponse, anterior?: { refreshToken: string | null }) {
  const expiresAt = new Date(Date.now() + (t.expires_in - 60) * 1000);
  const data = {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? anterior?.refreshToken ?? null,
    expiresAt,
    userId: t.user_id != null ? String(t.user_id) : undefined,
  };
  await prisma.oAuthToken.upsert({ where: { provider: PROVIDER }, create: { provider: PROVIDER, ...data }, update: data });
}

/** Troca o "code" recebido no retorno (callback) por tokens e salva no banco. */
export async function trocarCodigoPorToken(code: string, state: string | null): Promise<void> {
  const e = env();
  let codeVerifier: string | null = null;
  if (state) {
    const saved = await prisma.oAuthState.findUnique({ where: { state } });
    if (!saved) throw new MarketplaceError("Link de autorização expirado ou inválido. Clique em 'Conectar' de novo.", "nao_conectado");
    codeVerifier = saved.codeVerifier;
    await prisma.oAuthState.delete({ where: { state } });
  }
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: e.ML_CLIENT_ID,
    client_secret: e.ML_CLIENT_SECRET,
    code: code.trim(),
    redirect_uri: e.ML_REDIRECT_URI,
  };
  if (codeVerifier) body.code_verifier = codeVerifier;
  const t = await postToken(body);
  await salvarToken(t);
  await atualizarNickname(t.access_token);
}

async function atualizarNickname(accessToken: string) {
  try {
    const res = await fetch(`${ML_API}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return;
    const me = (await res.json()) as { id?: number; nickname?: string };
    await prisma.oAuthToken.update({
      where: { provider: PROVIDER },
      data: { nickname: me.nickname ?? null, userId: me.id != null ? String(me.id) : undefined },
    });
  } catch {
    /* só informativo */
  }
}

// Evita duas renovações ao mesmo tempo (o refresh_token só pode ser usado uma vez).
let renovando: Promise<string> | null = null;

async function renovar(): Promise<string> {
  const e = env();
  const atual = await prisma.oAuthToken.findUnique({ where: { provider: PROVIDER } });
  if (!atual?.refreshToken) throw new MarketplaceError("Mercado Livre não conectado. Vá em Configurações > Conectar.", "nao_conectado");
  const t = await postToken({
    grant_type: "refresh_token",
    client_id: e.ML_CLIENT_ID,
    client_secret: e.ML_CLIENT_SECRET,
    refresh_token: atual.refreshToken,
  });
  await salvarToken(t, atual);
  return t.access_token;
}

/** Devolve um access_token válido, renovando automaticamente se estiver vencido. */
export async function obterAccessToken(forcarRenovacao = false): Promise<string> {
  const atual = await prisma.oAuthToken.findUnique({ where: { provider: PROVIDER } });
  if (!atual) throw new MarketplaceError("Mercado Livre não conectado. Vá em Configurações > Conectar Mercado Livre.", "nao_conectado");
  if (!forcarRenovacao && atual.expiresAt.getTime() > Date.now()) return atual.accessToken;
  if (!renovando) {
    renovando = renovar().finally(() => {
      renovando = null;
    });
  }
  return renovando;
}

export async function statusConexao() {
  const t = await prisma.oAuthToken.findUnique({ where: { provider: PROVIDER } });
  return t
    ? { conectado: true as const, nickname: t.nickname, userId: t.userId, expiraEm: t.expiresAt, atualizadoEm: t.updatedAt }
    : { conectado: false as const };
}

export async function desconectar() {
  await prisma.oAuthToken.deleteMany({ where: { provider: PROVIDER } });
}
