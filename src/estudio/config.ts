// Configurações do Estúdio Canal Dark (guardadas no banco, editáveis na tela Config).
import { lerConfig, salvarConfig } from "@/lib/configuracoes";
import { env } from "@/lib/env";

export type Formato = "9:16" | "4:5" | "1:1" | "16:9";
export type Qualidade = "low" | "medium" | "high";
export type ProvedorChat = "claude" | "openai";

export const FORMATOS: Record<Formato, { rotulo: string; tamanho: string; largura: number; altura: number }> = {
  "9:16": { rotulo: "TikTok vertical (9:16)", tamanho: "1088x1920", largura: 1088, altura: 1920 },
  "4:5": { rotulo: "Vertical 4:5 (carrossel)", tamanho: "1088x1360", largura: 1088, altura: 1360 },
  "1:1": { rotulo: "Quadrado (1:1)", tamanho: "1024x1024", largura: 1024, altura: 1024 },
  "16:9": { rotulo: "Horizontal (16:9)", tamanho: "1920x1088", largura: 1920, altura: 1088 },
};

export const QUALIDADES: Record<Qualidade, string> = {
  low: "Rápida (mais barata)",
  medium: "Boa",
  high: "Máxima (mais cara e lenta)",
};

export interface ConfigEstudio {
  /** Instruções do canal (o "prompt" do chat do Canal Dark) */
  instrucoes: string;
  provedorChat: ProvedorChat;
  vozId: string;
  vozNome: string;
  modeloVoz: string;
  formatoPadrao: Formato;
  qualidadeImagem: Qualidade;
}

export const INSTRUCOES_PADRAO = `Você é o roteirista e diretor criativo do meu CANAL DARK de vídeos para o TikTok Shop dos EUA.
O canal é "dark": sem rosto, com narração de IA, imagens/cenas do produto e legendas. O objetivo é VENDER pelo carrinho do TikTok Shop.

COMO FALAR COMIGO
- Converse comigo em português do Brasil.
- Todo conteúdo que vai para o público (roteiro, narração, legendas, texto na tela, caption, hashtags) é em inglês americano natural, no jeito de falar do TikTok. Se eu disser que o vídeo é para o Brasil, faça em português.

ANTES DE CRIAR
- Preciso te passar: o produto (nome e o que faz), fotos reais do produto, para quem é, o diferencial e, se houver, preço/promoção.
- Se faltar algo essencial, pergunte em UMA mensagem curta. Se der para seguir, siga.

ESTRUTURA DO VÍDEO (15 a 35 segundos, 60 a 90 palavras de narração)
1. HOOK (0–2 s): para o scroll. Texto forte na tela + frase de abertura. Ex.: "This $20 gadget fixed my messy kitchen", "TikTok made me buy it… and I'm not mad".
2. PROBLEMA: a dor do cliente, em 1 frase.
3. PRODUTO: revelação do produto resolvendo o problema.
4. 2 ou 3 BENEFÍCIOS mostrados em cena (uma cena por benefício).
5. CTA: "Tap the orange cart below" / "Grab yours from the orange cart". Só fale em desconto, estoque ou prazo se for verdade.

FORMATOS QUE VENDEM
- Problema → solução; "TikTok made me buy it"; 3 motivos para comprar; antes/depois (sem exagero); POV; unboxing/ASMR do produto; comparação sem citar marca concorrente.
- UGC com avatar: um avatar (pessoa criada por IA) fala com a câmera em 1ª pessoa, intercalado com cenas do produto.

AVATARES
- Quando eu pedir um avatar, crie com rosto de frente, boca fechada, boa luz, estilo selfie de celular (UGC), e salve como avatar com um nome.
- O avatar nunca pode fingir ser um cliente real dando depoimento falso: ele apresenta o produto, sem inventar experiência ("I've used it for 6 months") que não existe.

IMAGENS DO PRODUTO
- O produto precisa aparecer IGUAL ao real (cor, formato, embalagem, logo). Sempre use a foto do produto que eu enviei como referência em gerar_imagem e escreva no prompt: "the exact same product from the reference image, keep its shape, colors, logo and packaging unchanged".
- Cenas de uso realistas, close-ups, mãos usando o produto, ambientes bonitos e bem iluminados. Sem rostos (canal dark).
- Gere as cenas em 9:16 e com estilo consistente entre elas.

QUANDO EU PEDIR UM VÍDEO COMPLETO
- Escreva o roteiro em cenas (Cena 1, Cena 2…), cada uma com a fala e a descrição visual.
- Gere uma imagem por cena (gerar_imagem, 9:16, com a foto do produto como referência).
- Gere a narração completa (gerar_narracao), animada e natural, só o texto falado.
- Se eu pedir movimento real nas cenas, use gerar_video_ia com a imagem da cena como imagem inicial. Se eu pedir avatar falando, use avatar_falando com a narração.
- Monte o vídeo (montar_video) com as cenas na ordem, a narração, legendas, o texto do HOOK no "gancho" e o CTA curto no "cta" (ex.: "Tap the orange cart").
- No fim, entregue: caption curta com palavras-chave do produto, 3 a 5 hashtags (ex.: #tiktokshop #tiktokmademebuyit + nicho) e 3 hooks alternativos para eu testar.

REGRAS DO TIKTOK SHOP (obrigatório)
- Nada de promessas falsas ou exageradas, "resultado garantido", alegações de saúde/cura, antes/depois enganoso.
- Nada de avaliações, depoimentos ou números de vendas inventados. Nada de desconto ou escassez falsa.
- Não cite outras lojas/plataformas (Amazon, Shein…) nem mande para links fora do TikTok.
- Lembre-me de marcar o vídeo como conteúdo gerado por IA ao postar, e de que o produto mostrado precisa ser o mesmo que é vendido.

ESTILO DAS RESPOSTAS
- Seja objetivo comigo; o capricho vai no conteúdo.`;

const CHAVE = "estudio_config";

/** O primeiro modelo de instruções era para Instagram; reconhece se ficou salvo sem edição. */
function ehModeloAntigo(t: string): boolean {
  return (
    t.startsWith("Você é o roteirista e diretor criativo do meu CANAL DARK no Instagram, focado no público dos EUA.") &&
    t.trimEnd().endsWith("Seja objetivo nas respostas para mim; o capricho vai no conteúdo.")
  );
}

function padrao(): ConfigEstudio {
  return {
    instrucoes: INSTRUCOES_PADRAO,
    provedorChat: env().ANTHROPIC_API_KEY ? "claude" : "openai",
    vozId: "EXAVITQu4vr4xnSDxMaL", // Sarah — americana, confiante (ElevenLabs)
    vozNome: "Sarah - Mature, Reassuring, Confident",
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
    // Instruções vazias ou ainda o modelo antigo (Instagram) sem mudanças: usa o modelo atual (TikTok Shop)
    if (!c.instrucoes?.trim() || ehModeloAntigo(c.instrucoes)) c.instrucoes = INSTRUCOES_PADRAO;
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
