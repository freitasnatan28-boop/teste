// Ajudantes das rotas /api/estudio/* (o proxy.ts já exige login antes de chegar aqui).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Segunda checagem de login (além do proxy.ts). Devolve uma resposta 401 se não estiver logado. */
export async function semLogin(): Promise<NextResponse | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token, env().SESSION_SECRET)) return null;
  return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
}

export function erroJson(e: unknown, status = 400) {
  return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro inesperado" }, { status });
}
