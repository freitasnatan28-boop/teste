// Montagem de vídeo no próprio servidor (ffmpeg):
// imagens em sequência com movimento suave (zoom), narração e legendas
// palavra por palavra no estilo Reels.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EstudioArquivo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { caminhoArquivo, nomeNovo, pastaEstudio } from "./armazenamento";
import type { Formato } from "./config";
import { ErroServico } from "./imagem";
import type { PalavraTempo } from "./voz";

export const SAIDA: Record<Formato, { largura: number; altura: number }> = {
  "9:16": { largura: 1080, altura: 1920 },
  "4:5": { largura: 1080, altura: 1350 },
  "1:1": { largura: 1080, altura: 1080 },
  "16:9": { largura: 1920, altura: 1080 },
};

const FPS = 30;
const PASTA_FONTES = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "assets/fontes");

export interface PedidoVideo {
  imagens: string[];
  audioId?: string | null;
  formato: Formato;
  legendas: boolean;
  movimento: boolean;
  /** Segundos por imagem quando não há narração */
  segundosPorImagem?: number;
  rotulo?: string;
  conversaId?: string | null;
}

function ffmpegPath(): string {
  const configurado = env().FFMPEG_PATH;
  if (configurado) return configurado;
  // Binário que vem com o pacote ffmpeg-static (no Windows termina em .exe)
  const local = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "node_modules/ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (existsSync(local)) return local;
  return "ffmpeg";
}

function rodar(args: string[]): Promise<{ codigo: number; saida: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(/*turbopackIgnore: true*/ ffmpegPath(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let saida = "";
    p.stderr.on("data", (d: Buffer) => {
      saida = (saida + d.toString()).slice(-8000);
    });
    p.on("error", (e) => reject(new ErroServico(`Não consegui rodar o ffmpeg (${e.message}). Rode "npm install" de novo ou defina FFMPEG_PATH no .env.`)));
    p.on("close", (codigo) => resolve({ codigo: codigo ?? 1, saida }));
  });
}

/** Duração de um arquivo de mídia, lida pelo próprio ffmpeg. */
export async function duracaoMidia(arquivo: string): Promise<number | null> {
  const { saida } = await rodar(["-hide_banner", "-i", arquivo]);
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(saida);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// ---------------- Legendas (ASS) ----------------

function tempoAss(s: number): string {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${seg.toFixed(2).padStart(5, "0")}`;
}

function limparAss(t: string): string {
  return t.replace(/[{}\\]/g, "").toUpperCase();
}

/** Agrupa as palavras em blocos curtos (até 3 palavras, quebrando na pontuação). */
export function blocosLegenda(palavras: PalavraTempo[], maxPalavras = 3): PalavraTempo[][] {
  const blocos: PalavraTempo[][] = [];
  let atual: PalavraTempo[] = [];
  for (const w of palavras) {
    atual.push(w);
    const fimDeFrase = /[.!?,;:…—]$/.test(w.p);
    if (atual.length >= maxPalavras || fimDeFrase) {
      blocos.push(atual);
      atual = [];
    }
  }
  if (atual.length) blocos.push(atual);
  return blocos;
}

/** Gera o arquivo de legendas: o bloco aparece inteiro e a palavra falada fica amarela. */
export function legendasAss(palavras: PalavraTempo[], largura: number, altura: number, duracaoTotal: number): string {
  const tamanho = Math.round(Math.min(largura, altura) * 0.105);
  const margemV = Math.round(altura * (altura > largura ? 0.26 : 0.12));
  const cab = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${largura}`,
    `PlayResY: ${altura}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Padrao,Anton,${tamanho},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,${Math.round(tamanho / 11)},${Math.round(tamanho / 18)},2,60,60,${margemV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const linhas: string[] = [];
  const blocos = blocosLegenda(palavras);
  blocos.forEach((bloco, b) => {
    const proximoInicio = blocos[b + 1]?.[0]?.i ?? duracaoTotal;
    bloco.forEach((w, k) => {
      const ini = w.i;
      // A última palavra do bloco fica na tela até o próximo bloco (sem "piscar"), no máximo +0,6 s
      const fim = k < bloco.length - 1 ? bloco[k + 1].i : Math.min(Math.max(w.f, proximoInicio), w.f + 0.6);
      if (fim <= ini) return;
      const texto = bloco.map((x, j) => (j === k ? `{\\c&H00E5FF&}${limparAss(x.p)}{\\c&HFFFFFF&}` : limparAss(x.p))).join(" ");
      linhas.push(`Dialogue: 0,${tempoAss(ini)},${tempoAss(fim)},Padrao,,0,0,0,,{\\fad(40,0)}${texto}`);
    });
  });
  return [...cab, ...linhas, ""].join("\n");
}

// ---------------- Montagem ----------------

/** Uma montagem por vez, para não travar o servidor. */
let fila: Promise<unknown> = Promise.resolve();

function escaparFiltro(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/** Cria o registro "processando" e monta o vídeo em segundo plano. */
export async function iniciarMontagem(p: PedidoVideo): Promise<EstudioArquivo> {
  const imagens = p.imagens.filter(Boolean).slice(0, 40);
  if (!imagens.length) throw new ErroServico("Escolha pelo menos uma imagem para o vídeo.");
  const encontrados = await prisma.estudioArquivo.findMany({ where: { id: { in: [...imagens, ...(p.audioId ? [p.audioId] : [])] } } });
  const porId = new Map(encontrados.map((a) => [a.id, a]));
  const listaImgs = imagens.map((id) => porId.get(id)).filter((a): a is EstudioArquivo => Boolean(a && a.status === "pronto" && a.mime.startsWith("image/")));
  if (!listaImgs.length) throw new ErroServico("Nenhuma das imagens escolhidas foi encontrada (ou ainda não ficou pronta).");
  const audio = p.audioId ? porId.get(p.audioId) : undefined;
  if (p.audioId && (!audio || audio.status !== "pronto" || audio.tipo !== "audio")) throw new ErroServico("A narração escolhida não foi encontrada.");

  const registro = await prisma.estudioArquivo.create({
    data: {
      tipo: "video",
      mime: "video/mp4",
      status: "processando",
      rotulo: (p.rotulo || "vídeo").slice(0, 120),
      prompt: audio?.prompt ?? "",
      meta: JSON.stringify({ imagens: listaImgs.map((a) => a.id), audioId: audio?.id ?? null, formato: p.formato, legendas: p.legendas }),
      largura: SAIDA[p.formato].largura,
      altura: SAIDA[p.formato].altura,
      conversaId: p.conversaId ?? null,
    },
  });

  fila = fila
    .catch(() => undefined)
    .then(() => montar(registro.id, listaImgs, audio, p))
    .catch(async (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao montar o vídeo";
      await prisma.estudioArquivo.update({ where: { id: registro.id }, data: { status: "erro", erro: msg.slice(0, 500) } }).catch(() => undefined);
    });
  return registro;
}

async function montar(id: string, imagens: EstudioArquivo[], audio: EstudioArquivo | undefined, p: PedidoVideo) {
  const { largura: W, altura: H } = SAIDA[p.formato] ?? SAIDA["9:16"];
  const tmp = path.join(pastaEstudio(), "tmp", id);
  await mkdir(tmp, { recursive: true });
  try {
    let total: number;
    let palavras: PalavraTempo[] = [];
    if (audio) {
      const dur = await duracaoMidia(caminhoArquivo(audio.arquivo));
      if (!dur) throw new ErroServico("Não consegui ler a duração da narração.");
      total = dur + 0.4;
      try {
        palavras = (JSON.parse(audio.meta ?? "{}") as { palavras?: PalavraTempo[] }).palavras ?? [];
      } catch {
        palavras = [];
      }
    } else {
      total = imagens.length * Math.min(Math.max(p.segundosPorImagem ?? 3, 1), 20);
    }

    const n = imagens.length;
    const porCena = total / n;
    const args: string[] = ["-hide_banner", "-y"];
    imagens.forEach((img) => args.push("-framerate", String(FPS), "-i", caminhoArquivo(img.arquivo)));
    if (audio) args.push("-i", caminhoArquivo(audio.arquivo));

    const filtros: string[] = [];
    let acumulado = 0;
    imagens.forEach((_, k) => {
      // Arredonda em quadros e joga a sobra na última cena (o total fica exato)
      const fim = k === n - 1 ? total : Math.round(((k + 1) * porCena) * FPS) / FPS;
      const quadros = Math.max(1, Math.round((fim - acumulado) * FPS));
      acumulado += quadros / FPS;
      const base = `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},setsar=1`;
      const zoomMax = 0.12;
      const z = k % 2 === 0 ? `1+${zoomMax}*on/${quadros}` : `${1 + zoomMax}-${zoomMax}*on/${quadros}`;
      const mov = p.movimento
        ? `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${quadros}:s=${W}x${H}:fps=${FPS}`
        : `scale=${W}:${H},loop=loop=${quadros - 1}:size=1:start=0,fps=${FPS}`;
      filtros.push(`[${k}:v]${base},${mov},format=yuv420p[v${k}]`);
    });
    filtros.push(`${imagens.map((_, k) => `[v${k}]`).join("")}concat=n=${n}:v=1:a=0[vcat]`);

    let ultimo = "vcat";
    if (p.legendas && palavras.length) {
      const ass = path.join(tmp, "legendas.ass");
      await writeFile(ass, legendasAss(palavras, W, H, total), "utf8");
      filtros.push(`[vcat]subtitles=filename='${escaparFiltro(ass)}':fontsdir='${escaparFiltro(PASTA_FONTES)}'[vleg]`);
      ultimo = "vleg";
    }

    const nome = nomeNovo("video/mp4");
    const saida = caminhoArquivo(nome);
    args.push("-filter_complex", filtros.join(";"), "-map", `[${ultimo}]`);
    if (audio) args.push("-map", `${n}:a`, "-c:a", "aac", "-b:a", "192k");
    args.push("-t", total.toFixed(3), "-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", saida);

    const r = await rodar(args);
    if (r.codigo !== 0 || !existsSync(saida) || (await stat(saida)).size === 0) {
      const linhas = r.saida.trim().split("\n").slice(-4).join(" | ");
      throw new ErroServico(`ffmpeg falhou: ${linhas}`);
    }
    await prisma.estudioArquivo.update({ where: { id }, data: { status: "pronto", arquivo: nome, duracao: Math.round(total * 10) / 10, erro: null } });
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

