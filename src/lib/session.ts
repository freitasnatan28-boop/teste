// Cookie de login do painel, assinado com HMAC-SHA256 (Web Crypto,
// funciona tanto no servidor quanto no proxy.ts).

export const SESSION_COOKIE = "painel_sessao";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < now) return false;
  const expected = await hmac(secret, `${parts[0]}.${parts[1]}`);
  return safeEqual(expected, parts[2]);
}

export function passwordMatches(input: string, expected: string): boolean {
  // Compara em tempo constante para não vazar a senha por tempo de resposta.
  const a = enc.encode(input);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
