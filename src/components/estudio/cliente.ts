"use client";
// Funções usadas pelas telas do estúdio (navegador).
import { useEffect, useState } from "react";
import type { ArquivoPublico } from "@/estudio/armazenamento";

export type Arquivo = ArquivoPublico;

const LADO_MAX = 2048;
const TAMANHO_DIRETO = 3.5 * 1024 * 1024;

/** Reduz fotos grandes no próprio celular antes de enviar (mais rápido e aceito por todas as IAs). */
async function prepararImagem(f: File): Promise<Blob> {
  const precisaConverter = f.type === "image/gif" || f.type === "image/heic" || f.type === "image/heif" || !/^image\/(png|jpeg|webp)$/.test(f.type);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(f);
  } catch {
    if (!precisaConverter) return f;
    throw new Error(`Não consegui abrir "${f.name}". Use PNG, JPG ou WEBP.`);
  }
  const grande = Math.max(bitmap.width, bitmap.height) > LADO_MAX;
  if (!grande && !precisaConverter && f.size <= TAMANHO_DIRETO) {
    bitmap.close();
    return f;
  }
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return f;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // PNG mantém fundo transparente (avatares recortados); se ficar pesado, vira JPG
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (png && png.size <= TAMANHO_DIRETO) return png;
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  return jpg ?? f;
}

export async function enviarImagens(arquivos: File[], opcoes: { avatar?: boolean; rotulo?: string } = {}): Promise<Arquivo[]> {
  const form = new FormData();
  for (const f of arquivos) {
    const blob = await prepararImagem(f);
    const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "png";
    form.append("arquivo", blob, `${f.name.replace(/\.[^.]+$/, "")}.${ext}`);
  }
  if (opcoes.avatar) form.set("avatar", "1");
  if (opcoes.rotulo) form.set("rotulo", opcoes.rotulo);
  const r = await fetch("/api/estudio/upload", { method: "POST", body: form });
  const j = (await r.json().catch(() => ({}))) as { arquivos?: Arquivo[]; erro?: string };
  if (!r.ok || !j.arquivos) throw new Error(j.erro ?? `Falha no envio (${r.status})`);
  return j.arquivos;
}

export async function buscarArquivos(params: Record<string, string>): Promise<Arquivo[]> {
  const r = await fetch(`/api/estudio/arquivos?${new URLSearchParams(params)}`, { cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as { arquivos?: Arquivo[]; erro?: string };
  if (!r.ok) throw new Error(j.erro ?? "Falha ao carregar arquivos");
  return j.arquivos ?? [];
}

export async function atualizarArquivo(id: string, dados: { rotulo?: string; avatar?: boolean }): Promise<Arquivo> {
  const r = await fetch(`/api/estudio/arquivos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
  const j = (await r.json().catch(() => ({}))) as { arquivo?: Arquivo; erro?: string };
  if (!r.ok || !j.arquivo) throw new Error(j.erro ?? "Falha ao salvar");
  return j.arquivo;
}

export async function apagarArquivoRemoto(id: string) {
  const r = await fetch(`/api/estudio/arquivos/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Falha ao apagar");
}

/** Baixa vários arquivos, um depois do outro. */
export async function baixarTodos(arquivos: Arquivo[]) {
  for (const a of arquivos.filter((x) => x.status === "pronto")) {
    const link = document.createElement("a");
    link.href = a.download;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    await new Promise((r) => setTimeout(r, 700));
  }
}

/** Acompanha um arquivo "processando" (vídeo em montagem) até ficar pronto. */
export function useArquivoVivo(inicial: Arquivo): Arquivo {
  const [atual, setAtual] = useState(inicial);
  const [base, setBase] = useState(inicial);
  if (base !== inicial) {
    // A tela mandou uma versão nova deste arquivo
    setBase(inicial);
    setAtual(inicial);
  }
  const processando = atual.status === "processando";
  useEffect(() => {
    if (!processando) return;
    const t = setInterval(async () => {
      try {
        const [novo] = await buscarArquivos({ ids: atual.id });
        if (novo && novo.status !== "processando") setAtual(novo);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [processando, atual.id]);
  return atual;
}

export function duracaoTexto(s: number | null): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  const seg = Math.round(s % 60);
  return m ? `${m}min ${seg}s` : `${seg}s`;
}
