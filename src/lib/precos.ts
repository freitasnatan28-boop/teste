// Histórico de preços e detecção de "desconto suspeito".
//
// Ideia: o "preço de" (riscado) só é confiável se, em algum momento, o produto
// foi realmente vendido perto desse valor. Se o preço "por" é sempre o mesmo e o
// "de" fica lá em cima, o desconto é de fachada.

export interface PontoPreco {
  price: number;
  capturedAt: Date;
}

export interface AnaliseDesconto {
  /** Desconto anunciado pelo marketplace (preço de → preço por), em % */
  descontoAnunciado: number | null;
  /** Desconto que consideramos real, em % (usa o histórico quando suspeito) */
  descontoReal: number | null;
  suspeito: boolean;
  motivo: string | null;
  /** true quando ainda não há histórico suficiente para julgar */
  historicoInsuficiente: boolean;
  mediana: number | null;
  maximo: number | null;
  minimo: number | null;
}

// Regras (ajuste aqui se quiser ser mais ou menos rigoroso)
export const REGRAS = {
  /** Mínimo de consultas salvas para julgar o histórico */
  minPontos: 3,
  /** O histórico precisa cobrir pelo menos este número de dias */
  minDias: 3,
  /** Janela de histórico considerada */
  janelaDias: 90,
  /** "Preço de" maior que o maior preço já visto × este fator = inflado */
  fatorInflado: 1.2,
  /** Desconto anunciado acima disto é marcado como improvável mesmo sem histórico */
  descontoImprovavel: 80,
};

function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const pct = (de: number, por: number) => ((de - por) / de) * 100;

export function analisarDesconto(precoAtual: number, precoOriginal: number | null | undefined, historico: PontoPreco[], agora = new Date()): AnaliseDesconto {
  const descontoAnunciado = precoOriginal && precoOriginal > precoAtual ? pct(precoOriginal, precoAtual) : null;

  const inicioJanela = agora.getTime() - REGRAS.janelaDias * 86400_000;
  const pontos = historico.filter((p) => p.capturedAt.getTime() >= inicioJanela);
  const precos = pontos.map((p) => p.price);
  const tempos = pontos.map((p) => p.capturedAt.getTime());
  const diasCobertos = pontos.length ? (Math.max(...tempos) - Math.min(...tempos)) / 86400_000 : 0;
  const historicoInsuficiente = pontos.length < REGRAS.minPontos || diasCobertos < REGRAS.minDias;

  const base = {
    descontoAnunciado,
    historicoInsuficiente,
    mediana: precos.length ? mediana(precos) : null,
    maximo: precos.length ? Math.max(...precos) : null,
    minimo: precos.length ? Math.min(...precos) : null,
  };

  if (descontoAnunciado == null) {
    return { ...base, descontoReal: null, suspeito: false, motivo: null };
  }

  if (descontoAnunciado >= REGRAS.descontoImprovavel) {
    return {
      ...base,
      descontoReal: base.mediana != null && !historicoInsuficiente ? Math.max(0, pct(base.mediana, precoAtual)) : null,
      suspeito: true,
      motivo: `Desconto anunciado de ${Math.round(descontoAnunciado)}% é improvável — confira antes de divulgar.`,
    };
  }

  if (historicoInsuficiente || base.maximo == null || base.mediana == null) {
    return { ...base, descontoReal: descontoAnunciado, suspeito: false, motivo: null };
  }

  if (precoOriginal! > base.maximo * REGRAS.fatorInflado) {
    const real = Math.max(0, pct(base.mediana, precoAtual));
    return {
      ...base,
      descontoReal: real,
      suspeito: true,
      motivo: `O "preço de" (R$ ${precoOriginal!.toFixed(2)}) nunca foi praticado: o maior preço visto nos últimos ${REGRAS.janelaDias} dias foi R$ ${base.maximo.toFixed(2)}. Desconto real ≈ ${Math.round(real)}%.`,
    };
  }

  return { ...base, descontoReal: descontoAnunciado, suspeito: false, motivo: null };
}
