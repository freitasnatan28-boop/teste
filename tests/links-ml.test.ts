import { describe, expect, it } from "vitest";
import { ehLinkCurtoML, extrairIdDeUrlML, validarLinkAfiliadoML } from "@/marketplaces/mercadolivre/links";

describe("validarLinkAfiliadoML", () => {
  it("aceita meli.la", () => {
    expect(validarLinkAfiliadoML("https://meli.la/2AbCdEf").ok).toBe(true);
  });
  it("aceita link longo /sec/", () => {
    expect(validarLinkAfiliadoML("https://mercadolivre.com/sec/1a2b3c").ok).toBe(true);
  });
  it("recusa link comum de produto (não rende comissão)", () => {
    const r = validarLinkAfiliadoML("https://produto.mercadolivre.com.br/MLB-123456789-fritadeira-_JM");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("comissão");
  });
  it("recusa http e texto qualquer", () => {
    expect(validarLinkAfiliadoML("http://meli.la/abc").ok).toBe(false);
    expect(validarLinkAfiliadoML("oi").ok).toBe(false);
    expect(validarLinkAfiliadoML("https://meli.la/").ok).toBe(false);
  });
});

describe("extrairIdDeUrlML", () => {
  it("link de catálogo (/p/)", () => {
    expect(extrairIdDeUrlML("https://www.mercadolivre.com.br/fritadeira-air-fryer/p/MLB19361349?pdp_filters=x")).toBe("produto:MLB19361349");
  });
  it("link de anúncio", () => {
    expect(extrairIdDeUrlML("https://produto.mercadolivre.com.br/MLB-3456789012-fritadeira-_JM")).toBe("item:MLB3456789012");
  });
  it("parâmetro wid no fragmento", () => {
    expect(extrairIdDeUrlML("https://www.mercadolivre.com.br/up/MLBU123#polycard_client=x&wid=MLB999888777")).toBe("item:MLB999888777");
  });
  it("código solto", () => {
    expect(extrairIdDeUrlML("MLB-123456789")).toBe("item:MLB123456789");
  });
  it("outros sites retornam null", () => {
    expect(extrairIdDeUrlML("https://exemplo.com/MLB-123456789")).toBeNull();
  });
  it("detecta link curto", () => {
    expect(ehLinkCurtoML("https://meli.la/abc")).toBe(true);
    expect(ehLinkCurtoML("https://www.mercadolivre.com.br/p/MLB1")).toBe(false);
  });
});
