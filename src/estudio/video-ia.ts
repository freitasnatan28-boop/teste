// Vídeo com IA pela ElevenLabs (Image & Video / Flows):
// - Veo 3.1 (Google): cena com movimento a partir de um texto e, de preferência, de uma imagem inicial;
// - Creatify Aurora: "avatar falando" — foto de uma pessoa + narração vira vídeo com a boca sincronizada.
// Precisa do plano Pro (ou acima) da ElevenLabs. A geração leva minutos: o site acompanha em segundo plano.
import type { EstudioArquivo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { caminhoArquivo, lerBytes, mimeImagem, salvarBytes } from "./armazenamento";
import type { Formato } from "./config";
import { ErroServico } from "./imagem";
import { duracaoMidia, SAIDA } from "./video";

const API = "https://api.elevenlabs.io/v1/flows/video";

export const MODELOS_VIDEO_IA = {
  "veo-3.1-fast-generate-001": "Veo 3.1 Fast (mais rápido e barato)",
  "veo-3.1-generate-001": "Veo 3.1 (qualidade máxima)",
} as const;
export type ModeloVideoIA = keyof typeof MODELOS_VIDEO_IA;
export const DURACOES_VEO = [4, 6, 8] as const;

interface MetaVideoIA {
  provedor: "elevenlabs";
  geracaoId: string;
  modo: "cena" | "avatar";
  modelo: string;
  formato: Formato;
  inicio: number;
}

function chave(): string {
  const k = env().ELEVENLABS_API_KEY;
  if (!k) throw new ErroServico("Falta a ELEVENLABS_API_KEY no .env para gerar vídeos com IA.");
  return k;
}

async function erroDaResposta(r: Response): Promise<ErroServico> {
  let msg = `${r.status} ${r.statusText}`;
  try {
    const j = (await r.json()) as { detail?: { message?: string; code?: string } | { msg?: string; loc?: unknown[] }[] | string };
    if (typeof j.detail === "string") msg = j.detail;
    else if (Array.isArray(j.detail)) msg = j.detail.map((d) => d.msg).filter(Boolean).join("; ") || msg;
    else if (j.detail?.code === "paid_plan_required")
      msg = "a geração de vídeo exige o plano Pro (ou acima) da ElevenLabs. Faça o upgrade em elevenlabs.io/pricing e tente de novo.";
    else if (j.detail?.message) msg = j.detail.message;
  } catch {
    /* corpo não é JSON */
  }
  if (r.status === 401) msg = "chave da ElevenLabs inválida (ELEVENLABS_API_KEY).";
  return new ErroServico(`ElevenLabs: ${msg}`);
}

let acessoOk = 0;
/** Confere (sem gastar nada) se a conta da ElevenLabs tem acesso à API de vídeo. */
export async function verificarPlanoVideo() {
  if (Date.now() - acessoOk < 10 * 60_000) return;
  const r = await fetch(`${API}?page_size=1`, { headers: { "xi-api-key": chave() } });
  if (!r.ok) throw await erroDaResposta(r);
  acessoOk = Date.now();
}

async function referenciaImagem(a: EstudioArquivo) {
  const bytes = await lerBytes(a);
  const mime = mimeImagem(bytes) ?? a.mime;
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new ErroServico("Use uma imagem PNG, JPG ou WEBP.");
  return { type: "inline_base64", mime_type: mime, content_base64: bytes.toString("base64") };
}

async function buscarImagem(id: string): Promise<EstudioArquivo> {
  const a = await prisma.estudioArquivo.findUnique({ where: { id } });
  if (!a || a.status !== "pronto" || !a.mime.startsWith("image/")) throw new ErroServico("Imagem não encontrada (ou ainda processando).");
  return a;
}

/** Corpo do pedido para uma cena com movimento (Veo 3.1). */
export function corpoCena(p: {
  modelo: ModeloVideoIA;
  prompt: string;
  formato: Formato;
  duracao: number;
  som: boolean;
  resolucao: "720p" | "1080p";
  imagemInicial?: Record<string, unknown> | null;
  referencias?: Record<string, unknown>[];
}): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    model_id: p.modelo,
    prompt: p.prompt,
    aspect_ratio: p.formato === "16:9" ? "16:9" : "9:16",
    duration_secs: DURACOES_VEO.includes(p.duracao as 4 | 6 | 8) ? p.duracao : 8,
    generate_audio: p.som,
    resolution: p.resolucao,
    negative_prompt: "text, captions, watermark, logo distortion, deformed product, extra fingers",
  };
  if (p.imagemInicial) corpo.start_frame = p.imagemInicial;
  else if (p.referencias?.length) {
    // Imagens de referência (produto/pessoa) no Veo: até 3, e só com 8 segundos
    corpo.images = p.referencias.slice(0, 3).map((image) => ({ image, role: "subject" }));
    corpo.duration_secs = 8;
  }
  return corpo;
}

async function enviar(corpo: Record<string, unknown>): Promise<string> {
  const r = await fetch(API, { method: "POST", headers: { "xi-api-key": chave(), "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw await erroDaResposta(r);
  const j = (await r.json()) as { id?: string };
  if (!j.id) throw new ErroServico("ElevenLabs não devolveu o id da geração.");
  return j.id;
}

async function registrarProcessando(dados: {
  geracaoId: string;
  modo: "cena" | "avatar";
  modelo: string;
  formato: Formato;
  rotulo: string;
  prompt: string;
  conversaId?: string | null;
}): Promise<EstudioArquivo> {
  const meta: MetaVideoIA = { provedor: "elevenlabs", geracaoId: dados.geracaoId, modo: dados.modo, modelo: dados.modelo, formato: dados.formato, inicio: Date.now() };
  const registro = await prisma.estudioArquivo.create({
    data: {
      tipo: "video",
      mime: "video/mp4",
      status: "processando",
      rotulo: dados.rotulo.slice(0, 120),
      prompt: dados.prompt,
      meta: JSON.stringify(meta),
      largura: SAIDA[dados.formato].largura,
      altura: SAIDA[dados.formato].altura,
      conversaId: dados.conversaId ?? null,
    },
  });
  acompanhar(registro.id);
  return registro;
}

/** Cena com movimento: texto + (opcional) imagem inicial ou fotos de referência. */
export async function gerarCenaIA(p: {
  prompt: string;
  formato: Formato;
  modelo?: ModeloVideoIA;
  duracao?: number;
  som?: boolean;
  resolucao?: "720p" | "1080p";
  imagemInicialId?: string | null;
  referencias?: string[];
  rotulo?: string;
  conversaId?: string | null;
}): Promise<EstudioArquivo> {
  const prompt = p.prompt.trim();
  if (!prompt) throw new ErroServico("Descreva a cena do vídeo.");
  const modelo = p.modelo && p.modelo in MODELOS_VIDEO_IA ? p.modelo : "veo-3.1-fast-generate-001";
  const imagemInicial = p.imagemInicialId ? await referenciaImagem(await buscarImagem(p.imagemInicialId)) : null;
  const referencias = imagemInicial ? [] : await Promise.all((p.referencias ?? []).slice(0, 3).map(async (id) => referenciaImagem(await buscarImagem(id))));
  const geracaoId = await enviar(
    corpoCena({ modelo, prompt, formato: p.formato, duracao: p.duracao ?? 8, som: p.som ?? true, resolucao: p.resolucao ?? "720p", imagemInicial, referencias }),
  );
  return registrarProcessando({ geracaoId, modo: "cena", modelo, formato: p.formato === "16:9" ? "16:9" : "9:16", rotulo: p.rotulo || "cena IA", prompt, conversaId: p.conversaId });
}

/** Avatar falando: foto da pessoa + narração (áudio) → vídeo com a boca sincronizada. */
export async function gerarAvatarFalando(p: { avatarId: string; audioId: string; rotulo?: string; conversaId?: string | null }): Promise<EstudioArquivo> {
  const avatar = await buscarImagem(p.avatarId);
  const audio = await prisma.estudioArquivo.findUnique({ where: { id: p.audioId } });
  if (!audio || audio.tipo !== "audio" || audio.status !== "pronto") throw new ErroServico("Narração não encontrada.");
  const geracaoId = await enviar({
    model_id: "creatify-aurora",
    image: await referenciaImagem(avatar),
    audio: { type: "inline_base64", mime_type: "audio/mpeg", content_base64: (await lerBytes(audio)).toString("base64") },
    resolution: "720p",
  });
  const formato: Formato = (avatar.largura ?? 9) > (avatar.altura ?? 16) ? "16:9" : (avatar.largura ?? 0) === (avatar.altura ?? 1) ? "1:1" : "9:16";
  return registrarProcessando({
    geracaoId,
    modo: "avatar",
    modelo: "creatify-aurora",
    formato,
    rotulo: p.rotulo || `${avatar.rotulo || "avatar"} falando`,
    prompt: audio.prompt,
    conversaId: p.conversaId,
  });
}

// ---------------- Acompanhamento (polling) ----------------

const ativos = new Set<string>();
const LIMITE_MS = 45 * 60_000;

/** Começa (ou retoma) o acompanhamento de um vídeo em geração. Seguro chamar várias vezes. */
export function acompanhar(arquivoId: string) {
  if (ativos.has(arquivoId)) return;
  ativos.add(arquivoId);
  void ciclo(arquivoId, 10_000).finally(() => ativos.delete(arquivoId));
}

async function ciclo(arquivoId: string, espera: number): Promise<void> {
  for (;;) {
    await new Promise((r) => setTimeout(r, espera));
    const a = await prisma.estudioArquivo.findUnique({ where: { id: arquivoId } });
    if (!a || a.status !== "processando") return;
    let meta: MetaVideoIA;
    try {
      meta = JSON.parse(a.meta ?? "{}") as MetaVideoIA;
    } catch {
      return;
    }
    if (meta.provedor !== "elevenlabs" || !meta.geracaoId) return;
    try {
      const terminou = await verificar(a, meta);
      if (terminou) return;
    } catch (e) {
      // Erro de rede: tenta de novo no próximo ciclo
      console.error("[video-ia]", e instanceof Error ? e.message : e);
    }
    if (Date.now() - meta.inicio > LIMITE_MS) {
      await prisma.estudioArquivo.update({ where: { id: arquivoId }, data: { status: "erro", erro: "A geração demorou demais (mais de 45 min)." } });
      return;
    }
    espera = Math.min(espera * 1.5, 60_000);
  }
}

/** Consulta a ElevenLabs uma vez. Devolve true quando terminou (pronto ou erro). */
async function verificar(a: EstudioArquivo, meta: MetaVideoIA): Promise<boolean> {
  const r = await fetch(`${API}/${encodeURIComponent(meta.geracaoId)}`, { headers: { "xi-api-key": chave() } });
  if (!r.ok) {
    if (r.status === 404) {
      await prisma.estudioArquivo.update({ where: { id: a.id }, data: { status: "erro", erro: "A ElevenLabs não encontrou esta geração." } });
      return true;
    }
    throw await erroDaResposta(r);
  }
  const j = (await r.json()) as { status: string; content_url?: string; content_mime_type?: string; error_message?: string; failure_reason?: string };
  if (j.status === "failed") {
    const motivo = j.failure_reason === "moderated" ? "Bloqueado pelas regras de conteúdo do modelo. Mude o texto ou a imagem." : (j.error_message ?? "falhou");
    await prisma.estudioArquivo.update({ where: { id: a.id }, data: { status: "erro", erro: `ElevenLabs: ${motivo} (não foi cobrado)`.slice(0, 500) } });
    return true;
  }
  if (j.status !== "completed" || !j.content_url) return false;

  const video = await fetch(j.content_url);
  if (!video.ok) throw new Error(`download do vídeo falhou (${video.status})`);
  const bytes = Buffer.from(await video.arrayBuffer());
  const nome = await salvarBytes(bytes, "video/mp4");
  const duracao = await duracaoMidia(caminhoArquivo(nome)).catch(() => null);
  await prisma.estudioArquivo.update({
    where: { id: a.id },
    data: { status: "pronto", arquivo: nome, duracao: duracao ? Math.round(duracao * 10) / 10 : null, erro: null },
  });
  return true;
}

/** Retoma os vídeos que estavam sendo gerados (ex.: depois de reiniciar o servidor). */
export async function retomarPendentes(ids?: string[]) {
  const pendentes = await prisma.estudioArquivo.findMany({
    where: { status: "processando", tipo: "video", meta: { contains: '"provedor":"elevenlabs"' }, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true },
  });
  pendentes.forEach((p) => acompanhar(p.id));
}
