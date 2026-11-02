import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { semLogin } from "@/estudio/api";
import { carregarConversa } from "@/estudio/chat";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  const c = await carregarConversa(id);
  if (!c) return NextResponse.json({ erro: "Conversa não encontrada" }, { status: 404 });
  return NextResponse.json(c);
}

// Apaga só a conversa; as imagens/áudios/vídeos continuam na biblioteca.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  await prisma.estudioConversa.delete({ where: { id } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
