import { describe, expect, it } from "vitest";
import { analisarDesconto } from "@/lib/precos";

const agora = new Date("2026-09-27T12:00:00Z");
const diasAtras = (d: number) => new Date(agora.getTime() - d * 86400_000);

describe("analisarDesconto", () => {
  it("sem preço original não há desconto nem suspeita", () => {
    const r = analisarDesconto(100, null, [], agora);
    expect(r.descontoAnunciado).toBeNull();
    expect(r.suspeito).toBe(false);
  });

  it("com pouco histórico, confia no desconto anunciado", () => {
    const r = analisarDesconto(80, 100, [{ price: 80, capturedAt: agora }], agora);
    expect(r.historicoInsuficiente).toBe(true);
    expect(r.suspeito).toBe(false);
    expect(r.descontoReal).toBeCloseTo(20);
  });

  it("marca como suspeito quando o 'preço de' nunca foi praticado", () => {
    const hist = [10, 7, 4, 1].map((d) => ({ price: 80, capturedAt: diasAtras(d) }));
    const r = analisarDesconto(80, 200, hist, agora);
    expect(r.suspeito).toBe(true);
    expect(r.descontoReal).toBe(0);
    expect(r.motivo).toContain("nunca foi praticado");
  });

  it("não marca quando o produto já foi vendido perto do 'preço de'", () => {
    const hist = [
      { price: 100, capturedAt: diasAtras(10) },
      { price: 98, capturedAt: diasAtras(6) },
      { price: 80, capturedAt: diasAtras(1) },
    ];
    const r = analisarDesconto(80, 100, hist, agora);
    expect(r.suspeito).toBe(false);
    expect(r.descontoReal).toBeCloseTo(20);
  });

  it("desconto anunciado absurdo é marcado mesmo sem histórico", () => {
    const r = analisarDesconto(10, 100, [], agora);
    expect(r.suspeito).toBe(true);
  });

  it("ignora pontos fora da janela de 90 dias", () => {
    const hist = [
      { price: 200, capturedAt: diasAtras(200) }, // antigo, não conta
      ...[10, 7, 4, 1].map((d) => ({ price: 80, capturedAt: diasAtras(d) })),
    ];
    expect(analisarDesconto(80, 200, hist, agora).suspeito).toBe(true);
  });
});
