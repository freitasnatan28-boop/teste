import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { semLogin } from "@/estudio/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const lista = await prisma.estudioConversa.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, titulo: true, updatedAt: true } });
  return NextResponse.json({ conversas: lista.map((c) => ({ id: c.id, titulo: c.titulo, atualizadaEm: c.updatedAt.toISOString() })) });
}
