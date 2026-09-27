// Personagem que "fala" nas mensagens (editável na tela Piloto → Personagem).
import { prisma } from "./db";

export interface PersonaDados {
  name: string;
  personality: string;
  catchphrases: string[];
  emojis: string[];
  forbidden: string[];
}

export const TIA_FIFI: PersonaDados = {
  name: "Tia Fifi",
  personality:
    "A tia chique que parece rica, mas só compra barato. Elegante, bem-humorada e um pouco exibida com as pechinchas. Chama o público de \"afilhada\". Fala de um jeito carinhoso e divertido, com frases curtas.",
  catchphrases: ["Parece caro, né? Tia Fifi pagou R$X", "Afilhada, corre!", "Chique é pagar pouco"],
  emojis: ["💅", "✨", "💖", "👑", "🛍️", "😱"],
  forbidden: ["garantido", "milagre", "grátis para sempre"],
};

const lista = (v: string) => {
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
};

export async function lerPersona(): Promise<PersonaDados> {
  const p = await prisma.persona.findUnique({ where: { id: "principal" } });
  if (!p) return TIA_FIFI;
  return { name: p.name, personality: p.personality, catchphrases: lista(p.catchphrases), emojis: lista(p.emojis), forbidden: lista(p.forbidden) };
}

export async function salvarPersona(d: PersonaDados) {
  const data = {
    name: d.name,
    personality: d.personality,
    catchphrases: JSON.stringify(d.catchphrases),
    emojis: JSON.stringify(d.emojis),
    forbidden: JSON.stringify(d.forbidden),
  };
  await prisma.persona.upsert({ where: { id: "principal" }, create: { id: "principal", ...data }, update: data });
}
