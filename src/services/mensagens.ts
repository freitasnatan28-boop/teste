// Mensagens das ofertas na voz do personagem.
//
// A IA (Claude) escreve SÓ a frase de impacto e o nome curto do produto.
// Preços, frete e link entram direto dos dados reais — assim a mensagem nunca
// inventa preço, avaliação, depoimento ou "eu usei".
//
// Sem ANTHROPIC_API_KEY no .env, usamos frases prontas com os bordões do personagem.
import Anthropic from "@anthropic-ai/sdk";
import type { Product } from "@prisma/client";
import { formatBRL } from "@/lib/format";
import { lerPersona, type PersonaDados } from "@/lib/persona";

export interface Variacao {
  frase: string;
  nomeCurto: string;
}

const MODELO = "claude-opus-5";

/** Monta o texto final no formato combinado. */
export function montarMensagem(p: Pick<Product, "price" | "originalPrice" | "freeShipping" | "affiliateUrl">, v: Variacao): string {
  const linhas = [v.frase.trim(), "", `📦 ${v.nomeCurto.trim()}`];
  if (p.originalPrice && p.originalPrice > p.price) linhas.push(`De: ~${formatBRL(p.originalPrice)}~`);
  linhas.push(`*POR: ${formatBRL(p.price)}* ✅`);
  if (p.freeShipping) linhas.push("🚚 Frete grátis");
  linhas.push(`🛒 Compre aqui: ${p.affiliateUrl ?? ""}`);
  return linhas.join("\n");
}

function nomeCurtoSimples(titulo: string): string {
  const palavras = titulo.split(/\s+/);
  return palavras.slice(0, 6).join(" ");
}

function contemProibida(texto: string, proibidas: string[]): boolean {
  const t = texto.toLowerCase();
  return proibidas.some((w) => w.trim() && t.includes(w.trim().toLowerCase()));
}

/** Frases prontas (sem IA), usando os bordões do personagem com o preço real. */
export function variacoesPadrao(p: Pick<Product, "title" | "price">, persona: PersonaDados): Variacao[] {
  const preco = formatBRL(p.price);
  const bordoes = persona.catchphrases.length ? persona.catchphrases : TIA_PADRAO;
  const emoji = (i: number) => persona.emojis[i % Math.max(persona.emojis.length, 1)] ?? "✨";
  const nome = nomeCurtoSimples(p.title);
  return [0, 1, 2].map((i) => ({
    frase: `${bordoes[i % bordoes.length].replace(/R\$\s?X/g, preco)} ${emoji(i)}`,
    nomeCurto: nome,
  }));
}
const TIA_PADRAO = ["Parece caro, né? Tia Fifi pagou R$X", "Afilhada, corre que tá barato!", "Chique é pagar pouco"];

let cliente: Anthropic | null = null;
function anthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cliente ??= new Anthropic();
  return cliente;
}

export function iaDisponivel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const ESQUEMA = {
  type: "object",
  properties: {
    variacoes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          frase: { type: "string", description: "Frase de impacto na voz do personagem, 1 linha" },
          nomeCurto: { type: "string", description: "Nome curto e claro do produto (até 6 palavras)" },
        },
        required: ["frase", "nomeCurto"],
        additionalProperties: false,
      },
    },
  },
  required: ["variacoes"],
  additionalProperties: false,
} as const;

/** Gera 3 variações. Usa a IA se houver chave; senão, frases prontas. */
export async function gerarVariacoes(p: Product): Promise<{ variacoes: Variacao[]; fonte: "ia" | "padrao"; aviso?: string }> {
  const persona = await lerPersona();
  const padrao = variacoesPadrao(p, persona);
  const client = anthropic();
  if (!client) return { variacoes: padrao, fonte: "padrao" };

  const dados = {
    titulo: p.title,
    preco_atual: formatBRL(p.price),
    preco_original: p.originalPrice && p.originalPrice > p.price ? formatBRL(p.originalPrice) : null,
    frete_gratis: p.freeShipping,
    loja_oficial: p.officialStore,
    categoria: p.categoryName,
  };

  const system = [
    `Você escreve mensagens curtas de ofertas para grupos de WhatsApp no Brasil, na voz do personagem "${persona.name}".`,
    `Personalidade: ${persona.personality}`,
    persona.catchphrases.length ? `Bordões (use no máximo um por frase; troque R$X pelo preço atual real): ${persona.catchphrases.join(" | ")}` : "",
    persona.emojis.length ? `Emojis preferidos: ${persona.emojis.join(" ")}` : "",
    persona.forbidden.length ? `Nunca use estas palavras: ${persona.forbidden.join(", ")}.` : "",
    "Regras obrigatórias:",
    "- Use só os dados fornecidos. Nunca invente depoimento, avaliação, experiência pessoal (\"eu usei\", \"testei\"), estoque, prazo ou desconto.",
    "- A frase tem no máximo 120 caracteres, em português do Brasil, e pode ter 1 ou 2 emojis.",
    "- O nome curto deixa claro o que é o produto, sem marketing, com no máximo 6 palavras.",
    "- As 3 variações devem ter ângulos diferentes (ex.: humor, economia, elegância).",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system,
      messages: [{ role: "user", content: `Dados reais do produto:\n${JSON.stringify(dados, null, 2)}\n\nGere 3 variações.` }],
    });
    if (r.stop_reason === "refusal") return { variacoes: padrao, fonte: "padrao", aviso: "A IA recusou este produto; usei as frases prontas." };
    const texto = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = JSON.parse(texto) as { variacoes?: Variacao[] };
    const boas = (json.variacoes ?? [])
      .filter((v) => v?.frase && v?.nomeCurto)
      .map((v) => ({ frase: v.frase.slice(0, 200), nomeCurto: v.nomeCurto.slice(0, 80) }))
      .filter((v) => !contemProibida(`${v.frase} ${v.nomeCurto}`, persona.forbidden));
    if (!boas.length) return { variacoes: padrao, fonte: "padrao", aviso: "A IA não devolveu variações válidas; usei as frases prontas." };
    return { variacoes: [...boas, ...padrao].slice(0, 3), fonte: "ia" };
  } catch (e) {
    const msg =
      e instanceof Anthropic.AuthenticationError
        ? "Chave da Anthropic inválida (ANTHROPIC_API_KEY)."
        : e instanceof Anthropic.RateLimitError
          ? "Limite da IA atingido; tente em instantes."
          : e instanceof Anthropic.APIError
            ? `Erro da IA (${e.status}).`
            : "Erro ao chamar a IA.";
    return { variacoes: padrao, fonte: "padrao", aviso: `${msg} Usei as frases prontas.` };
  }
}
