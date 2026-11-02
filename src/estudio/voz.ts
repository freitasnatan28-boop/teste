// Narração com a ElevenLabs. Guarda também o tempo de cada palavra
// (usado depois para colocar legendas sincronizadas no vídeo).
import type { EstudioArquivo } from "@prisma/client";
import { env } from "@/lib/env";
import { registrarArquivo } from "./armazenamento";
import { ErroServico } from "./imagem";

const API = "https://api.elevenlabs.io";
export const LIMITE_TEXTO_NARRACAO = 5000;

export interface Voz {
  id: string;
  nome: string;
  descricao: string;
  preview: string | null;
}

export interface PalavraTempo {
  p: string;
  i: number; // início (s)
  f: number; // fim (s)
}

function chave(): string {
  const k = env().ELEVENLABS_API_KEY;
  if (!k) throw new ErroServico("Falta a ELEVENLABS_API_KEY no .env para gerar narrações.");
  return k;
}

async function erroDaResposta(r: Response): Promise<ErroServico> {
  let msg = `${r.status} ${r.statusText}`;
  try {
    const j = (await r.json()) as { detail?: { message?: string; status?: string } | string };
    if (typeof j.detail === "string") msg = j.detail;
    else if (j.detail?.message) msg = j.detail.message;
  } catch {
    /* corpo não é JSON */
  }
  if (r.status === 401) msg = "Chave da ElevenLabs inválida ou sem permissão (ELEVENLABS_API_KEY).";
  return new ErroServico(`ElevenLabs: ${msg}`);
}

let cacheVozes: { em: number; vozes: Voz[] } | null = null;

export async function listarVozes(): Promise<Voz[]> {
  if (cacheVozes && Date.now() - cacheVozes.em < 10 * 60_000) return cacheVozes.vozes;
  const r = await fetch(`${API}/v1/voices`, { headers: { "xi-api-key": chave() } });
  if (!r.ok) throw await erroDaResposta(r);
  const j = (await r.json()) as {
    voices: { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string; category?: string }[];
  };
  const vozes = j.voices
    .map((v) => ({
      id: v.voice_id,
      nome: v.name,
      descricao: [v.category === "premade" ? null : "sua voz", v.labels?.gender, v.labels?.accent, v.labels?.age?.replace("_", " "), v.labels?.use_case?.replace(/_/g, " ")]
        .filter(Boolean)
        .join(" · "),
      preview: v.preview_url ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  cacheVozes = { em: Date.now(), vozes };
  return vozes;
}

export const MODELOS_VOZ: Record<string, string> = {
  eleven_multilingual_v2: "Multilingual v2 (estável, ótima para narração)",
  eleven_v3: "Eleven v3 (mais expressiva, aceita [whispers], [laughs]…)",
  eleven_turbo_v2_5: "Turbo v2.5 (rápida e barata)",
  eleven_flash_v2_5: "Flash v2.5 (a mais rápida)",
};

/** Junta os caracteres com tempo em palavras. */
export function palavrasDoAlinhamento(al: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }): PalavraTempo[] {
  const palavras: PalavraTempo[] = [];
  let atual: PalavraTempo | null = null;
  al.characters.forEach((c, idx) => {
    const ini = al.character_start_times_seconds[idx] ?? 0;
    const fim = al.character_end_times_seconds[idx] ?? ini;
    if (/\s/.test(c)) {
      if (atual) palavras.push(atual);
      atual = null;
      return;
    }
    if (!atual) atual = { p: c, i: ini, f: fim };
    else {
      atual.p += c;
      atual.f = fim;
    }
  });
  if (atual) palavras.push(atual);
  return palavras.map((w) => ({ p: w.p, i: Math.round(w.i * 1000) / 1000, f: Math.round(w.f * 1000) / 1000 }));
}

export async function gerarNarracao(p: {
  texto: string;
  vozId: string;
  vozNome?: string;
  modelo: string;
  rotulo?: string;
  conversaId?: string | null;
}): Promise<EstudioArquivo> {
  const texto = p.texto.trim();
  if (!texto) throw new ErroServico("Escreva o texto da narração.");
  if (texto.length > LIMITE_TEXTO_NARRACAO)
    throw new ErroServico(`Texto longo demais para uma narração (${texto.length} caracteres; máximo ${LIMITE_TEXTO_NARRACAO}). Divida em partes.`);

  const r = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(p.vozId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": chave(), "Content-Type": "application/json" },
    body: JSON.stringify({ text: texto, model_id: p.modelo }),
  });
  if (!r.ok) throw await erroDaResposta(r);
  const j = (await r.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
  };
  const palavras = j.alignment ? palavrasDoAlinhamento(j.alignment) : [];
  const duracao = palavras.length ? palavras[palavras.length - 1].f : undefined;
  return registrarArquivo({
    tipo: "audio",
    bytes: Buffer.from(j.audio_base64, "base64"),
    mime: "audio/mpeg",
    rotulo: p.rotulo || `narração ${p.vozNome?.split(" - ")[0] ?? ""}`.trim(),
    prompt: texto,
    duracao,
    meta: { vozId: p.vozId, vozNome: p.vozNome, modelo: p.modelo, palavras },
    conversaId: p.conversaId,
  });
}
