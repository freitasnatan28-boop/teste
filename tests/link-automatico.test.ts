import { describe, expect, it } from "vitest";
import { extrairCodigosAfiliado, montarLinkAfiliado, validarLinkAfiliadoML } from "@/marketplaces/mercadolivre/links";

describe("link de afiliado automático", () => {
  it("detecta matt_tool e matt_word num endereço", () => {
    expect(extrairCodigosAfiliado("https://www.mercadolivre.com.br/social/tiafifi?matt_word=fifi&matt_tool=12345678&forceInApp=true")).toEqual({
      mattTool: "12345678",
      mattWord: "fifi",
    });
    expect(extrairCodigosAfiliado("https://meli.la/abc")).toBeNull();
    expect(extrairCodigosAfiliado("https://x.com/?matt_tool=<script>")).toBeNull();
  });

  it("monta o link do produto com os códigos e remove rastreios antigos", () => {
    const url = montarLinkAfiliado("https://www.mercadolivre.com.br/air-fryer/p/MLB123?matt_tool=OUTRO&utm_source=x#reviews", { mattTool: "999", mattWord: "fifi" });
    expect(url).toBe("https://www.mercadolivre.com.br/air-fryer/p/MLB123?matt_tool=999&matt_word=fifi");
  });

  it("aceita etiqueta diferente (ex.: por grupo)", () => {
    const url = montarLinkAfiliado("https://produto.mercadolivre.com.br/MLB-1-x-_JM", { mattTool: "999", mattWord: "fifi" }, "grupo1");
    expect(url).toContain("matt_word=grupo1");
  });

  it("não monta link para outros sites", () => {
    expect(montarLinkAfiliado("https://exemplo.com/p/1", { mattTool: "9", mattWord: "" })).toBeNull();
  });

  it("o link montado é aceito como link de afiliado", () => {
    expect(validarLinkAfiliadoML("https://www.mercadolivre.com.br/p/MLB1?matt_tool=999&matt_word=fifi").ok).toBe(true);
  });
});
