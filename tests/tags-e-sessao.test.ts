import { describe, expect, it } from "vitest";
import { TAGS_PADRAO, sugerirTags } from "@/lib/tags";
import { createSessionToken, passwordMatches, verifySessionToken } from "@/lib/session";
import { assinarShopee } from "@/marketplaces/shopee/assinatura";
import { createHash } from "node:crypto";

describe("sugerirTags", () => {
  it("por palavra-chave e por categoria", () => {
    expect(sugerirTags("Pisca Pisca Natal 100 LEDs", null, TAGS_PADRAO)).toContain("natal");
    expect(sugerirTags("Fralda G 120 un", null, TAGS_PADRAO)).toContain("maternidade");
    expect(sugerirTags("Qualquer coisa", "MLB1430", TAGS_PADRAO)).toEqual(["moda"]);
    expect(sugerirTags("Ventilador de mesa", null, TAGS_PADRAO)).toContain("verao");
  });
  it("não confunde pedaços de palavras", () => {
    expect(sugerirTags("Cabeceira", null, TAGS_PADRAO)).not.toContain("casa");
  });
});

describe("sessão do painel", () => {
  const segredo = "x".repeat(40);
  it("token válido é aceito e adulterado é recusado", async () => {
    const t = await createSessionToken(segredo);
    expect(await verifySessionToken(t, segredo)).toBe(true);
    expect(await verifySessionToken(t + "a", segredo)).toBe(false);
    expect(await verifySessionToken(t, "y".repeat(40))).toBe(false);
  });
  it("token vencido é recusado", async () => {
    const t = await createSessionToken(segredo, Date.now() - 31 * 86400_000);
    expect(await verifySessionToken(t, segredo)).toBe(false);
  });
  it("compara senha", () => {
    expect(passwordMatches("abc", "abc")).toBe(true);
    expect(passwordMatches("abd", "abc")).toBe(false);
    expect(passwordMatches("ab", "abc")).toBe(false);
  });
});

describe("assinatura Shopee", () => {
  it("segue o formato SHA256(AppId+Timestamp+Payload+Secret)", () => {
    const r = assinarShopee("123", "segredo", '{"query":"x"}', 1700000000);
    const esperado = createHash("sha256").update('1231700000000{"query":"x"}segredo').digest("hex");
    expect(r.signature).toBe(esperado);
    expect(r.authorization).toBe(`SHA256 Credential=123, Timestamp=1700000000, Signature=${esperado}`);
  });
});
