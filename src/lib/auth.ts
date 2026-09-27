// Verificação de login dentro das "server actions" (segunda camada além do proxy.ts).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function exigirLogin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, env().SESSION_SECRET))) redirect("/login");
}

/** Mensagem de erro amigável a partir de qualquer exceção */
export function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Erro inesperado";
}
