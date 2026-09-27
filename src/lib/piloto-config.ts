// Configuração do piloto automático e dos limites anti-banimento.
import { lerConfig, salvarConfig } from "./configuracoes";

export interface PilotoConfig {
  ativo: boolean;
  /** Palavras-chave que a Tia procura sozinha (uma por rodada, em rodízio) */
  termos: string[];
  /** Quantas ofertas por dia (distribuídas entre início e fim) */
  ofertasPorDia: number;
  inicio: string; // "09:00"
  fim: string; // "21:00"
  scoreMinimo: number;
  descontoMinimo: number;
  /** Não repetir o mesmo produto por X dias */
  naoRepetirDias: number;
  /** true = cada mensagem espera você aprovar no painel */
  aprovacao: boolean;
  // ---- anti-banimento ----
  /** Máximo de mensagens por hora (somando todos os grupos) */
  limitePorHora: number;
  /** Intervalo aleatório entre um grupo e outro (segundos) */
  intervaloMin: number;
  intervaloMax: number;
}

export const PILOTO_PADRAO: PilotoConfig = {
  ativo: false,
  termos: ["air fryer", "jogo de panelas", "fralda", "ventilador", "organizador"],
  ofertasPorDia: 8,
  inicio: "09:00",
  fim: "21:00",
  scoreMinimo: 45,
  descontoMinimo: 10,
  naoRepetirDias: 7,
  aprovacao: false,
  limitePorHora: 20,
  intervaloMin: 20,
  intervaloMax: 60,
};

const CHAVE = "piloto_config";

export async function lerPiloto(): Promise<PilotoConfig> {
  const v = await lerConfig(CHAVE);
  if (!v) return PILOTO_PADRAO;
  try {
    return { ...PILOTO_PADRAO, ...(JSON.parse(v) as Partial<PilotoConfig>) };
  } catch {
    return PILOTO_PADRAO;
  }
}

export async function salvarPiloto(c: PilotoConfig) {
  await salvarConfig(CHAVE, JSON.stringify(c));
}

/** Converte "HH:MM" em minutos do dia */
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Horários (em minutos do dia) em que o piloto posta, distribuídos por igual. */
export function horariosDoDia(c: Pick<PilotoConfig, "ofertasPorDia" | "inicio" | "fim">): number[] {
  const n = Math.max(0, Math.min(48, Math.round(c.ofertasPorDia)));
  const a = minutos(c.inicio);
  const b = Math.max(a, minutos(c.fim));
  if (n === 0) return [];
  if (n === 1) return [a];
  return Array.from({ length: n }, (_, i) => Math.round(a + (i * (b - a)) / (n - 1)));
}

/** Data (AAAA-MM-DD) e minutos do dia no horário de Brasília */
export function agoraBrasilia(d = new Date()): { data: string; min: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return { data: `${get("year")}-${get("month")}-${get("day")}`, min: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}
