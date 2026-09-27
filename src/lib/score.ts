// Score de oferta (0–100): quanto maior, melhor para divulgar.
//
//  Desconto real ........ até 35 pts (60% ou mais de desconto = nota máxima)
//  Avaliação ............ até 20 pts (nota 3,0 = 0 pts; 5,0 = 20 pts; pesa menos com poucas avaliações)
//  Vendas ............... até 20 pts (10.000+ vendidos ou top 1 dos mais vendidos = máximo)
//  Frete grátis ......... 15 pts
//  Loja oficial ......... 10 pts
//  Desconto suspeito .... −15 pts

export interface EntradaScore {
  descontoReal: number | null;
  avaliacao: number | null;
  numAvaliacoes: number | null;
  quantidadeVendida: number | null;
  posicaoMaisVendidos: number | null;
  freteGratis: boolean;
  lojaOficial: boolean;
  suspeito: boolean;
}

export interface ResultadoScore {
  total: number;
  partes: { desconto: number; avaliacao: number; vendas: number; frete: number; loja: number; penalidade: number };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function calcularScore(e: EntradaScore): ResultadoScore {
  const desconto = e.descontoReal ? (clamp(e.descontoReal, 0, 60) / 60) * 35 : 0;

  let avaliacao = 6; // neutro quando não há avaliações
  if (e.avaliacao != null && (e.numAvaliacoes ?? 0) > 0) {
    const nota = (clamp(e.avaliacao, 3, 5) - 3) / 2; // 0..1
    const confianca = clamp((e.numAvaliacoes ?? 0) / 50, 0.3, 1);
    avaliacao = nota * 20 * confianca + 6 * (1 - confianca);
  }

  let vendas = 4; // neutro quando não sabemos
  if (e.quantidadeVendida != null && e.quantidadeVendida >= 0) {
    vendas = clamp(Math.log10(e.quantidadeVendida + 1) / 4, 0, 1) * 20;
  }
  if (e.posicaoMaisVendidos != null) {
    const porRanking = clamp(20 - (e.posicaoMaisVendidos - 1) * 0.5, 10, 20);
    vendas = Math.max(vendas, porRanking);
  }

  const frete = e.freteGratis ? 15 : 0;
  const loja = e.lojaOficial ? 10 : 0;
  const penalidade = e.suspeito ? -15 : 0;

  const partes = {
    desconto: Math.round(desconto * 10) / 10,
    avaliacao: Math.round(avaliacao * 10) / 10,
    vendas: Math.round(vendas * 10) / 10,
    frete,
    loja,
    penalidade,
  };
  const total = Math.round(clamp(desconto + avaliacao + vendas + frete + loja + penalidade, 0, 100));
  return { total, partes };
}
