"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, passwordMatches } from "@/lib/session";

// Proteção simples contra tentativas repetidas de senha (por IP, em memória)
const tentativas = new Map<string, { n: number; ate: number }>();
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60_000;

export async function entrar(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const t = tentativas.get(ip);
  if (t && t.n >= MAX_TENTATIVAS && t.ate > Date.now()) redirect("/login?erro=bloqueado");

  const senha = String(formData.get("senha") ?? "");
  const de = String(formData.get("de") ?? "/ofertas");
  if (!passwordMatches(senha, env().PANEL_PASSWORD)) {
    const atual = t && t.ate > Date.now() ? t.n + 1 : 1;
    tentativas.set(ip, { n: atual, ate: Date.now() + BLOQUEIO_MS });
    redirect(`/login?erro=senha&de=${encodeURIComponent(de)}`);
  }
  tentativas.delete(ip);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(env().SESSION_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: env().APP_URL.startsWith("https://"),
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  // Só redireciona para caminhos internos
  redirect(de.startsWith("/") && !de.startsWith("//") ? de : "/ofertas");
}

export async function sair() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
