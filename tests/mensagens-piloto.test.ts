import { describe, expect, it } from "vitest";
import { agoraBrasilia, horariosDoDia } from "@/lib/piloto-config";
import { TIA_FIFI } from "@/lib/persona";
import { montarMensagem, variacoesPadrao } from "@/services/mensagens";

describe("mensagem da oferta", () => {
  const produto = { price: 99.9, originalPrice: 149.9, freeShipping: true, affiliateUrl: "https://meli.la/abc", title: "Fritadeira Air Fryer 4L Preta 1500W Mondial" };

  it("segue o formato combinado, com dados reais", () => {
    const t = montarMensagem(produto, { frase: "Parece caro, né?", nomeCurto: "Air Fryer 4L" });
    // O formatador de moeda usa espaço especial (NBSP) entre "R$" e o número
    expect(t.replace(/\u00a0/g, " ").split("\n")).toEqual([
      "Parece caro, né?",
      "",
      "📦 Air Fryer 4L",
      "De: ~R$ 149,90~",
      "*POR: R$ 99,90* ✅",
      "🚚 Frete grátis",
      "🛒 Compre aqui: https://meli.la/abc",
    ]);
  });

  it("sem preço original e sem frete grátis, omite as linhas", () => {
    const t = montarMensagem({ ...produto, originalPrice: null, freeShipping: false }, { frase: "Oi", nomeCurto: "X" });
    expect(t).not.toContain("De:");
    expect(t).not.toContain("Frete");
  });

  it("frases prontas trocam R$X pelo preço real", () => {
    const v = variacoesPadrao(produto, TIA_FIFI);
    expect(v).toHaveLength(3);
    expect(v[0].frase).toContain("99,90");
    expect(v[0].frase).not.toContain("R$X");
  });
});

describe("horários do piloto", () => {
  it("distribui por igual entre início e fim", () => {
    expect(horariosDoDia({ ofertasPorDia: 3, inicio: "09:00", fim: "21:00" })).toEqual([540, 900, 1260]);
    expect(horariosDoDia({ ofertasPorDia: 1, inicio: "10:00", fim: "20:00" })).toEqual([600]);
    expect(horariosDoDia({ ofertasPorDia: 0, inicio: "10:00", fim: "20:00" })).toEqual([]);
  });

  it("usa o horário de Brasília", () => {
    const r = agoraBrasilia(new Date("2026-09-27T12:30:00Z"));
    expect(r).toEqual({ data: "2026-09-27", min: 9 * 60 + 30 });
  });
});
