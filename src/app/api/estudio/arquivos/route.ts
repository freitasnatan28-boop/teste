// Lista os arquivos do estúdio (biblioteca, avatares e consulta de status).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { semLogin } from "@/estudio/api";
import { publico } from "@/estudio/armazenamento";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const url = new URL(req.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
  const tipo = url.searchParams.get("tipo");
  const limite = Math.min(Number(url.searchParams.get("limite")) || 60, 200);
  const where = ids?.length
    ? { id: { in: ids.slice(0, 100) } }
    : tipo === "avatar"
      ? { avatar: true }
      : tipo === "referencias"
        ? { mime: { startsWith: "image/" }, status: "pronto" }
        : tipo
          ? { tipo }
          : {};
  // Para escolher referências, os avatares aparecem primeiro
  const orderBy = tipo === "referencias" ? [{ avatar: "desc" as const }, { createdAt: "desc" as const }] : [{ createdAt: "desc" as const }];
  const lista = await prisma.estudioArquivo.findMany({ where, orderBy, take: limite });
  return NextResponse.json({ arquivos: lista.map(publico) });
}
