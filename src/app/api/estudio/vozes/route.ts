import { NextResponse } from "next/server";
import { erroJson, semLogin } from "@/estudio/api";
import { listarVozes } from "@/estudio/voz";

export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  try {
    return NextResponse.json({ vozes: await listarVozes() });
  } catch (e) {
    return erroJson(e, 502);
  }
}
