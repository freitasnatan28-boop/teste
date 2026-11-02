// Geração de imagens com a OpenAI (gpt-image-2).
// Sem referência: cria do zero. Com referência (avatar, foto, personagem):
// usa as imagens enviadas como base ("transforma isso em…", "mesmo rosto em…").
import type { EstudioArquivo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { dimensoesImagem, lerBytes, mimeImagem, registrarArquivo } from "./armazenamento";
import { FORMATOS, type Formato, type Qualidade } from "./config";

export const MODELO_IMAGEM = "gpt-image-2";
const API = "https://api.openai.com/v1";

export interface PedidoImagem {
  prompt: string;
  formato: Formato;
  qualidade: Qualidade;
  /** IDs de arquivos do estúdio usados como referência */
  referencias?: string[];
  quantidade?: number;
  rotulo?: string;
  conversaId?: string | null;
  /** Salva direto como avatar (⭐) */
  avatar?: boolean;
}

export class ErroServico extends Error {}

function chave(): string {
  const k = env().OPENAI_API_KEY;
  if (!k) throw new ErroServico("Falta a OPENAI_API_KEY no .env para gerar imagens.");
  return k;
}

async function erroDaResposta(r: Response): Promise<ErroServico> {
  let msg = `${r.status} ${r.statusText}`;
  try {
    const j = (await r.json()) as { error?: { message?: string; code?: string } };
    if (j.error?.message) msg = j.error.message;
    if (j.error?.code === "moderation_blocked") msg = "A OpenAI bloqueou este pedido pelas regras de segurança. Reescreva o prompt (ou troque a referência).";
  } catch {
    /* corpo não é JSON */
  }
  if (r.status === 401) msg = "Chave da OpenAI inválida (OPENAI_API_KEY).";
  if (r.status === 429) msg = "Limite ou saldo da OpenAI atingido. Confira os créditos em platform.openai.com.";
  return new ErroServico(`OpenAI: ${msg}`);
}

export async function gerarImagens(p: PedidoImagem): Promise<EstudioArquivo[]> {
  const prompt = p.prompt.trim();
  if (!prompt) throw new ErroServico("Descreva a imagem que você quer.");
  const fmt = FORMATOS[p.formato] ?? FORMATOS["9:16"];
  const n = Math.min(Math.max(p.quantidade ?? 1, 1), 4);
  const refs = (p.referencias ?? []).slice(0, 8);

  let resposta: Response;
  if (refs.length) {
    const arquivos = await prisma.estudioArquivo.findMany({ where: { id: { in: refs } } });
    const porId = new Map(arquivos.map((a) => [a.id, a]));
    const form = new FormData();
    form.set("model", MODELO_IMAGEM);
    form.set("prompt", prompt);
    form.set("size", fmt.tamanho);
    form.set("quality", p.qualidade);
    form.set("n", String(n));
    form.set("output_format", "png");
    let anexadas = 0;
    for (const id of refs) {
      const a = porId.get(id);
      if (!a || a.status !== "pronto" || !a.mime.startsWith("image/")) continue;
      const bytes = await lerBytes(a);
      const mime = mimeImagem(bytes) ?? a.mime;
      form.append("image[]", new Blob([new Uint8Array(bytes)], { type: mime }), `ref-${anexadas}.${mime.split("/")[1]}`);
      anexadas++;
    }
    if (!anexadas) throw new ErroServico("Nenhuma das imagens de referência foi encontrada.");
    resposta = await fetch(`${API}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${chave()}` }, body: form });
  } else {
    resposta = await fetch(`${API}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELO_IMAGEM, prompt, size: fmt.tamanho, quality: p.qualidade, n, output_format: "png" }),
    });
  }
  if (!resposta.ok) throw await erroDaResposta(resposta);

  const json = (await resposta.json()) as { data?: { b64_json?: string }[] };
  const salvas: EstudioArquivo[] = [];
  for (const [i, item] of (json.data ?? []).entries()) {
    if (!item.b64_json) continue;
    const bytes = Buffer.from(item.b64_json, "base64");
    const dim = dimensoesImagem(bytes);
    salvas.push(
      await registrarArquivo({
        tipo: "imagem",
        bytes,
        mime: "image/png",
        rotulo: n > 1 ? `${p.rotulo || "imagem"} ${i + 1}` : p.rotulo || "",
        prompt,
        avatar: p.avatar ?? false,
        largura: dim?.largura ?? fmt.largura,
        altura: dim?.altura ?? fmt.altura,
        meta: { formato: p.formato, qualidade: p.qualidade, referencias: refs },
        conversaId: p.conversaId,
      }),
    );
  }
  if (!salvas.length) throw new ErroServico("A OpenAI não devolveu nenhuma imagem. Tente de novo.");
  return salvas;
}
