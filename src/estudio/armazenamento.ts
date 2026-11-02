// Arquivos do estúdio: ficam numa pasta do servidor (ESTUDIO_DIR) e cada um
// tem uma linha no banco (EstudioArquivo) com tipo, status e descrição.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EstudioArquivo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type TipoArquivo = "upload" | "imagem" | "audio" | "video";

const EXTENSOES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};

export const MIMES_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function pastaEstudio(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env().ESTUDIO_DIR);
}

/** Caminho absoluto do arquivo, sempre dentro da pasta do estúdio. */
export function caminhoArquivo(nome: string): string {
  const base = pastaEstudio();
  const abs = path.resolve(base, path.basename(nome));
  if (!abs.startsWith(base + path.sep)) throw new Error("Nome de arquivo inválido");
  return abs;
}

export function nomeNovo(mime: string): string {
  const ext = EXTENSOES[mime] ?? "bin";
  return `${Date.now()}-${randomBytes(5).toString("hex")}.${ext}`;
}

export async function salvarBytes(bytes: Buffer, mime: string): Promise<string> {
  await mkdir(pastaEstudio(), { recursive: true });
  const nome = nomeNovo(mime);
  await writeFile(caminhoArquivo(nome), bytes);
  return nome;
}

export async function lerBytes(a: Pick<EstudioArquivo, "arquivo">): Promise<Buffer> {
  if (!a.arquivo) throw new Error("Arquivo ainda não está pronto");
  return readFile(caminhoArquivo(a.arquivo));
}

/** Cria o registro de um arquivo já pronto. */
export async function registrarArquivo(dados: {
  tipo: TipoArquivo;
  bytes: Buffer;
  mime: string;
  rotulo?: string;
  prompt?: string;
  avatar?: boolean;
  meta?: unknown;
  largura?: number;
  altura?: number;
  duracao?: number;
  conversaId?: string | null;
}): Promise<EstudioArquivo> {
  const arquivo = await salvarBytes(dados.bytes, dados.mime);
  return prisma.estudioArquivo.create({
    data: {
      tipo: dados.tipo,
      arquivo,
      mime: dados.mime,
      rotulo: (dados.rotulo ?? "").slice(0, 120),
      prompt: dados.prompt ?? "",
      avatar: dados.avatar ?? false,
      meta: dados.meta === undefined ? null : JSON.stringify(dados.meta),
      largura: dados.largura,
      altura: dados.altura,
      duracao: dados.duracao,
      conversaId: dados.conversaId ?? null,
    },
  });
}

export async function apagarArquivo(id: string) {
  const a = await prisma.estudioArquivo.findUnique({ where: { id } });
  if (!a) return;
  await prisma.estudioArquivo.delete({ where: { id } });
  if (a.arquivo) await unlink(caminhoArquivo(a.arquivo)).catch(() => undefined);
}

/** Formato enviado para a tela (sem caminhos internos). */
export interface ArquivoPublico {
  id: string;
  tipo: TipoArquivo;
  mime: string;
  rotulo: string;
  prompt: string;
  avatar: boolean;
  status: string;
  erro: string | null;
  largura: number | null;
  altura: number | null;
  duracao: number | null;
  url: string;
  download: string;
  criadoEm: string;
  /** Vídeo gerado por IA (leva minutos) */
  ia: boolean;
}

export function publico(a: EstudioArquivo): ArquivoPublico {
  return {
    id: a.id,
    tipo: a.tipo as TipoArquivo,
    mime: a.mime,
    rotulo: a.rotulo,
    prompt: a.prompt,
    avatar: a.avatar,
    status: a.status,
    erro: a.erro,
    largura: a.largura,
    altura: a.altura,
    duracao: a.duracao,
    url: `/api/estudio/arquivos/${a.id}`,
    download: `/api/estudio/arquivos/${a.id}?baixar=1`,
    criadoEm: a.createdAt.toISOString(),
    ia: Boolean(a.meta?.includes('"provedor":"elevenlabs"')),
  };
}

/** Nome amigável para o download (ex.: "cena-1-farol.png"). */
export function nomeDownload(a: EstudioArquivo): string {
  const ext = EXTENSOES[a.mime] ?? "bin";
  const base =
    (a.rotulo || a.prompt || a.tipo)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || a.tipo;
  return `${base}-${a.id.slice(-5)}.${ext}`;
}

/** Lê largura/altura de PNG, JPEG, WEBP e GIF sem bibliotecas extras. */
export function dimensoesImagem(b: Buffer): { largura: number; altura: number } | null {
  try {
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
    if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF") return { largura: b.readUInt16LE(6), altura: b.readUInt16LE(8) };
    if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const tipo = b.toString("ascii", 12, 16);
      if (tipo === "VP8X") return { largura: 1 + b.readUIntLE(24, 3), altura: 1 + b.readUIntLE(27, 3) };
      if (tipo === "VP8 ") return { largura: b.readUInt16LE(26) & 0x3fff, altura: b.readUInt16LE(28) & 0x3fff };
      if (tipo === "VP8L") {
        const v = b.readUInt32LE(21);
        return { largura: (v & 0x3fff) + 1, altura: ((v >> 14) & 0x3fff) + 1 };
      }
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) return null;
        const marcador = b[i + 1];
        const tam = b.readUInt16BE(i + 2);
        if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
          return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) };
        }
        i += 2 + tam;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Descobre o tipo real pela assinatura dos bytes (não confia na extensão). */
export function mimeImagem(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}
