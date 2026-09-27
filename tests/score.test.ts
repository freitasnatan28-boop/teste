import { describe, expect, it } from "vitest";
import { calcularScore } from "@/lib/score";

const base = { descontoReal: null, avaliacao: null, numAvaliacoes: null, quantidadeVendida: null, posicaoMaisVendidos: null, freteGratis: false, lojaOficial: false, suspeito: false };

describe("calcularScore", () => {
  it("fica entre 0 e 100", () => {
    const max = calcularScore({ descontoReal: 90, avaliacao: 5, numAvaliacoes: 1000, quantidadeVendida: 100000, posicaoMaisVendidos: 1, freteGratis: true, lojaOficial: true, suspeito: false });
    expect(max.total).toBe(100);
    const min = calcularScore({ ...base, suspeito: true, avaliacao: 1, numAvaliacoes: 500, quantidadeVendida: 0 });
    expect(min.total).toBeGreaterThanOrEqual(0);
  });

  it("frete grátis e loja oficial somam pontos", () => {
    const sem = calcularScore(base).total;
    const com = calcularScore({ ...base, freteGratis: true, lojaOficial: true }).total;
    expect(com - sem).toBe(25);
  });

  it("mais desconto real = score maior", () => {
    expect(calcularScore({ ...base, descontoReal: 40 }).total).toBeGreaterThan(calcularScore({ ...base, descontoReal: 10 }).total);
  });

  it("desconto suspeito é penalizado", () => {
    expect(calcularScore({ ...base, descontoReal: 30, suspeito: true }).total).toBeLessThan(calcularScore({ ...base, descontoReal: 30 }).total);
  });

  it("poucas avaliações pesam menos que muitas", () => {
    const poucas = calcularScore({ ...base, avaliacao: 5, numAvaliacoes: 2 }).total;
    const muitas = calcularScore({ ...base, avaliacao: 5, numAvaliacoes: 500 }).total;
    expect(muitas).toBeGreaterThan(poucas);
  });
});
