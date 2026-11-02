// Configurações do Estúdio Canal Dark (guardadas no banco, editáveis na tela Config).
import { lerConfig, salvarConfig } from "@/lib/configuracoes";
import { env } from "@/lib/env";

export type Formato = "9:16" | "4:5" | "1:1" | "16:9";
export type Qualidade = "low" | "medium" | "high";
export type ProvedorChat = "claude" | "openai";

export const FORMATOS: Record<Formato, { rotulo: string; tamanho: string; largura: number; altura: number }> = {
  "9:16": { rotulo: "Reels / Stories (9:16)", tamanho: "1088x1920", largura: 1088, altura: 1920 },
  "4:5": { rotulo: "Feed vertical (4:5)", tamanho: "1088x1360", largura: 1088, altura: 1360 },
  "1:1": { rotulo: "Quadrado (1:1)", tamanho: "1024x1024", largura: 1024, altura: 1024 },
  "16:9": { rotulo: "Horizontal (16:9)", tamanho: "1920x1088", largura: 1920, altura: 1088 },
};

export const QUALIDADES: Record<Qualidade, string> = {
  low: "Rápida (mais barata)",
  medium: "Boa",
  high: "Máxima (mais cara e lenta)",
};

export interface ConfigEstudio {
  /** Instruções do canal (o "prompt" do chat CANAL DARK IG/EUA) */
  instrucoes: string;
  provedorChat: ProvedorChat;
  vozId: string;
  vozNome: string;
  modeloVoz: string;
  formatoPadrao: Formato;
  qualidadeImagem: Qualidade;
}

export const INSTRUCOES_PADRAO = `Você é o roteirista e diretor criativo do meu CANAL DARK no Instagram, focado no público dos EUA.

COMO FALAR COMIGO
- Converse comigo em português do Brasil.
- Todo conteúdo que vai para o público (roteiros, narração, legendas, títulos, hashtags, textos na tela) é em inglês americano natural, nada de inglês "traduzido".

O CANAL
- Canal "dark" (sem rosto): vídeos curtos (Reels de 30 a 60 segundos) e carrosséis.
- Nichos que funcionam: curiosidades sombrias, mistérios reais, histórias verdadeiras chocantes, psicologia, fatos históricos pouco conhecidos, motivação estoica.
- Tom: cinematográfico, misterioso, direto. Frases curtas, ritmo rápido.

ESTRUTURA DE UM REELS
1. HOOK (0–3 s): uma frase que prende na hora (pergunta, choque ou promessa).
2. DESENVOLVIMENTO: fatos em sequência, com tensão crescente. Uma ideia por frase.
3. VIRADA/REVELAÇÃO perto do fim.
4. CTA curto (ex.: "Follow for part 2", "Save this").

QUANDO EU PEDIR UM VÍDEO COMPLETO
- Escreva o roteiro dividido em cenas (Cena 1, Cena 2…), cada uma com a fala da narração e a descrição visual.
- Gere uma imagem por cena com a ferramenta gerar_imagem (formato 9:16), em estilo cinematográfico escuro e consistente entre as cenas. Se eu tiver enviado um avatar/personagem, use-o como referência em todas as cenas para manter o mesmo rosto/estilo.
- Gere a narração completa com gerar_narracao (só o texto falado, em inglês).
- Monte o vídeo final com montar_video usando as imagens na ordem e a narração, com legendas.
- No fim, entregue também: legenda do post (caption) em inglês, 5 a 10 hashtags em inglês e 3 opções de título/texto da capa.

REGRAS
- Não invente fatos apresentados como verdadeiros: se for ficção ou lenda, deixe claro na narração.
- Nada de conteúdo que viole as regras do Instagram.
- Seja objetivo nas respostas para mim; o capricho vai no conteúdo.`;

const CHAVE = "estudio_config";

function padrao(): ConfigEstudio {
  return {
    instrucoes: INSTRUCOES_PADRAO,
    provedorChat: env().ANTHROPIC_API_KEY ? "claude" : "openai",
    vozId: "JBFqnCBsd6RMkjVDRZzb", // George — narrador de histórias (ElevenLabs)
    vozNome: "George - Warm, Captivating Storyteller",
    modeloVoz: "eleven_multilingual_v2",
    formatoPadrao: "9:16",
    qualidadeImagem: "medium",
  };
}

export async function lerConfigEstudio(): Promise<ConfigEstudio> {
  const base = padrao();
  const bruto = await lerConfig(CHAVE);
  if (!bruto) return base;
  try {
    const salvo = JSON.parse(bruto) as Partial<ConfigEstudio>;
    const c = { ...base, ...salvo };
    if (!(c.formatoPadrao in FORMATOS)) c.formatoPadrao = base.formatoPadrao;
    if (!(c.qualidadeImagem in QUALIDADES)) c.qualidadeImagem = base.qualidadeImagem;
    if (c.provedorChat !== "claude" && c.provedorChat !== "openai") c.provedorChat = base.provedorChat;
    if (!c.instrucoes?.trim()) c.instrucoes = INSTRUCOES_PADRAO;
    return c;
  } catch {
    return base;
  }
}

export async function salvarConfigEstudio(c: Partial<ConfigEstudio>) {
  const atual = await lerConfigEstudio();
  await salvarConfig(CHAVE, JSON.stringify({ ...atual, ...c }));
}

/** Quais serviços têm chave no .env */
export function servicos() {
  const e = env();
  return {
    claude: Boolean(e.ANTHROPIC_API_KEY),
    openai: Boolean(e.OPENAI_API_KEY),
    elevenlabs: Boolean(e.ELEVENLABS_API_KEY),
  };
}
