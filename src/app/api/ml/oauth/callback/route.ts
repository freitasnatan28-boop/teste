// O Mercado Livre manda o usuário de volta para cá depois da autorização.
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { trocarCodigoPorToken } from "@/marketplaces/mercadolivre/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const base = `${env().APP_URL}/configuracoes`;
  if (!code || !state) {
    const erro = req.nextUrl.searchParams.get("error_description") ?? "Autorização cancelada ou sem código.";
    return NextResponse.redirect(`${base}?erro=${encodeURIComponent(erro)}`);
  }
  try {
    await trocarCodigoPorToken(code, state);
    return NextResponse.redirect(`${base}?msg=${encodeURIComponent("Mercado Livre conectado ✓")}`);
  } catch (e) {
    return NextResponse.redirect(`${base}?erro=${encodeURIComponent(e instanceof Error ? e.message : "Erro")}`);
  }
}
