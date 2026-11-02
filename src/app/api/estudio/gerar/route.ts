// Geração direta (sem chat): imagem, narração ou montagem de vídeo.
import { NextResponse } from "next/server";
import { z } from "zod";
import { erroJson, semLogin } from "@/estudio/api";
import { publico } from "@/estudio/armazenamento";
import { FORMATOS, type Formato, lerConfigEstudio } from "@/estudio/config";
import { ErroServico, gerarImagens } from "@/estudio/imagem";
import { iniciarMontagem } from "@/estudio/video";
import { gerarAvatarFalando, gerarCenaIA, MODELOS_VIDEO_IA, type ModeloVideoIA, verificarPlanoVideo } from "@/estudio/video-ia";
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
    avatar: z.boolean().default(false),
  }),
  z.object({
    tipo: z.literal("video_ia"),
    prompt: z.string().min(1).max(4000),
    formato,
    modelo: z.enum(Object.keys(MODELOS_VIDEO_IA) as [ModeloVideoIA, ...ModeloVideoIA[]]).default("veo-3.1-fast-generate-001"),
    duracao: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
    som: z.boolean().default(true),
    resolucao: z.enum(["720p", "1080p"]).default("720p"),
    imagemInicialId: z.string().nullish(),
    referencias: z.array(z.string()).max(3).default([]),
    rotulo: z.string().max(120).default(""),
  }),
  z.object({
    tipo: z.literal("avatar_falando"),
    avatarId: z.string().min(1),
    audioId: z.string().nullish(),
    texto: z.string().max(5000).default(""),
    vozId: z.string().default(""),
    vozNome: z.string().default(""),
    modelo: z.string().default(""),
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
    gancho: z.string().max(200).default(""),
    cta: z.string().max(120).default(""),
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
    if (d.tipo === "video_ia") {
      const v = await gerarCenaIA(d);
      return NextResponse.json({ arquivos: [publico(v)] });
    }
    if (d.tipo === "avatar_falando") {
      await verificarPlanoVideo();
      const criados = [];
      let audioId = d.audioId ?? "";
      if (!audioId) {
        if (!d.texto.trim()) return NextResponse.json({ erro: "Escolha uma narração ou escreva o que o avatar vai falar." }, { status: 400 });
        const cfg = await lerConfigEstudio();
        const n = await gerarNarracao({
          texto: d.texto,
          vozId: d.vozId || cfg.vozId,
          vozNome: d.vozNome || cfg.vozNome,
          modelo: d.modelo || cfg.modeloVoz,
          rotulo: d.rotulo ? `fala - ${d.rotulo}` : "fala do avatar",
        });
        criados.push(publico(n));
        audioId = n.id;
      }
      const v = await gerarAvatarFalando({ avatarId: d.avatarId, audioId, rotulo: d.rotulo });
      return NextResponse.json({ arquivos: [publico(v), ...criados] });
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
