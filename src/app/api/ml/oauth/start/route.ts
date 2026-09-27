import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { criarUrlAutorizacao } from "@/marketplaces/mercadolivre/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.redirect(await criarUrlAutorizacao());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.redirect(`${env().APP_URL}/configuracoes?erro=${encodeURIComponent(msg)}`);
  }
}
