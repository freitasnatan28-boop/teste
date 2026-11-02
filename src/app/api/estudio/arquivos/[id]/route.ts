// Um arquivo do estúdio: ver/baixar (GET), renomear ou marcar como avatar (PATCH), apagar (DELETE).
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { semLogin } from "@/estudio/api";
import { apagarArquivo, caminhoArquivo, nomeDownload, publico } from "@/estudio/armazenamento";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  const a = await prisma.estudioArquivo.findUnique({ where: { id } });
  if (!a || a.status !== "pronto" || !a.arquivo) return NextResponse.json({ erro: "Arquivo não encontrado (ou ainda processando)." }, { status: 404 });
  const caminho = caminhoArquivo(a.arquivo);
  let tamanho: number;
  try {
    tamanho = (await stat(caminho)).size;
  } catch {
    return NextResponse.json({ erro: "O arquivo sumiu da pasta do estúdio." }, { status: 404 });
  }
  const baixar = new URL(req.url).searchParams.get("baixar") === "1";
  const headers: Record<string, string> = {
    "Content-Type": a.mime,
    "Cache-Control": "private, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  if (baixar) headers["Content-Disposition"] = `attachment; filename="${nomeDownload(a)}"`;

  // Suporte a "Range" (o player de vídeo/áudio do navegador e do iPhone precisa disso)
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let inicio = range[1] ? Number(range[1]) : tamanho - Number(range[2]);
    let fim = range[1] && range[2] ? Number(range[2]) : tamanho - 1;
    inicio = Math.max(0, inicio);
    fim = Math.min(fim, tamanho - 1);
    if (inicio > fim) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tamanho}` } });
    const corpo = Readable.toWeb(createReadStream(caminho, { start: inicio, end: fim })) as ReadableStream;
    return new Response(corpo, { status: 206, headers: { ...headers, "Content-Range": `bytes ${inicio}-${fim}/${tamanho}`, "Content-Length": String(fim - inicio + 1) } });
  }
  const corpo = Readable.toWeb(createReadStream(caminho)) as ReadableStream;
  return new Response(corpo, { headers: { ...headers, "Content-Length": String(tamanho) } });
}

const Mudanca = z.object({ rotulo: z.string().max(120).optional(), avatar: z.boolean().optional() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  const p = Mudanca.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const a = await prisma.estudioArquivo.update({ where: { id }, data: p.data }).catch(() => null);
  if (!a) return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });
  return NextResponse.json({ arquivo: publico(a) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  await apagarArquivo(id);
  return NextResponse.json({ ok: true });
}
