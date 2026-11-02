// Geração direta (sem chat): imagem, narração ou montagem de vídeo.
import { NextResponse } from "next/server";
import { z } from "zod";
import { erroJson, semLogin } from "@/estudio/api";
import { publico } from "@/estudio/armazenamento";
import { FORMATOS, type Formato, lerConfigEstudio } from "@/estudio/config";
import { ErroServico, gerarImagens } from "@/estudio/imagem";
import { iniciarMontagem } from "@/estudio/video";
import { gerarNarracao } from "@/estudio/voz";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const formato = z.enum(Object.keys(FORMATOS) as [Formato, ...Formato[]]);

const Pedido = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("imagem"),
    prompt: z.string().min(1).max(4000),
    formato,
    qualidade: z.enum(["low", "medium", "high"]),
    referencias: z.array(z.string()).max(8).default([]),
    quantidade: z.number().int().min(1).max(4).default(1),
    rotulo: z.string().max(120).default(""),
  }),
  z.object({
    tipo: z.literal("narracao"),
    texto: z.string().min(1),
    vozId: z.string().min(1),
    vozNome: z.string().default(""),
    modelo: z.string().min(1),
    rotulo: z.string().max(120).default(""),
  }),
  z.object({
    tipo: z.literal("video"),
    imagens: z.array(z.string()).min(1).max(40),
    audioId: z.string().nullish(),
    formato,
    legendas: z.boolean().default(true),
    movimento: z.boolean().default(true),
    segundosPorImagem: z.number().min(1).max(20).default(3),
    rotulo: z.string().max(120).default(""),
  }),
]);

export async function POST(req: Request) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const p = Pedido.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Preencha os campos obrigatórios." }, { status: 400 });
  try {
    const d = p.data;
    if (d.tipo === "imagem") {
      const imgs = await gerarImagens(d);
      return NextResponse.json({ arquivos: imgs.map(publico) });
    }
    if (d.tipo === "narracao") {
      const a = await gerarNarracao(d);
      return NextResponse.json({ arquivos: [publico(a)] });
    }
    const cfg = await lerConfigEstudio();
    const v = await iniciarMontagem({ ...d, formato: d.formato ?? cfg.formatoPadrao });
    return NextResponse.json({ arquivos: [publico(v)] });
  } catch (e) {
    return erroJson(e, e instanceof ErroServico ? 400 : 500);
  }
}
