import { describe, expect, it } from "vitest";
import { dimensoesImagem, mimeImagem } from "@/estudio/armazenamento";
import { textoComAnexos } from "@/estudio/chat-tipos";
import { blocosLegenda, legendasAss } from "@/estudio/video";
import { palavrasDoAlinhamento } from "@/estudio/voz";

function alinhamento(texto: string) {
  const chars = [...texto];
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * 0.1),
    character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1),
  };
}

describe("narração: tempo das palavras", () => {
  it("junta os caracteres em palavras com início e fim", () => {
    const p = palavrasDoAlinhamento(alinhamento("Hi there, you."));
    expect(p.map((w) => w.p)).toEqual(["Hi", "there,", "you."]);
    expect(p[0]).toEqual({ p: "Hi", i: 0, f: 0.2 });
    expect(p[2].i).toBeCloseTo(1.0);
  });

  it("ignora espaços repetidos e quebras de linha", () => {
    expect(palavrasDoAlinhamento(alinhamento("  a \n\n b  ")).map((w) => w.p)).toEqual(["a", "b"]);
  });
});

describe("legendas", () => {
  const palavras = palavrasDoAlinhamento(alinhamento("Nobody was on board. The ship kept sailing alone"));

  it("agrupa até 3 palavras e quebra na pontuação", () => {
    const blocos = blocosLegenda(palavras).map((b) => b.map((w) => w.p).join(" "));
    expect(blocos).toEqual(["Nobody was on", "board.", "The ship kept", "sailing alone"]);
  });

  it("gera um evento por palavra, com a palavra falada destacada, em maiúsculas", () => {
    const ass = legendasAss(palavras, 1080, 1920, 6);
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("Style: Padrao,Anton,");
    const eventos = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(eventos).toHaveLength(palavras.length);
    expect(eventos[0]).toContain("{\\c&H00E5FF&}NOBODY{\\c&HFFFFFF&} WAS ON");
  });

  it("remove caracteres que quebrariam o arquivo de legenda", () => {
    const ass = legendasAss([{ p: "{oi}\\", i: 0, f: 0.5 }], 1080, 1920, 1);
    expect(ass).toContain("OI");
    expect(ass.split("\n").find((l) => l.startsWith("Dialogue:"))).not.toMatch(/\{oi\}/i);
  });
});

describe("imagens enviadas", () => {
  it("reconhece PNG pela assinatura e lê o tamanho", () => {
    const png = Buffer.alloc(33);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(1088, 16);
    png.writeUInt32BE(1920, 20);
    expect(mimeImagem(png)).toBe("image/png");
    expect(dimensoesImagem(png)).toEqual({ largura: 1088, altura: 1920 });
  });

  it("recusa arquivos que não são imagem", () => {
    expect(mimeImagem(Buffer.from("isto não é uma imagem de verdade"))).toBeNull();
  });
});

describe("anexos no chat", () => {
  it("informa à IA o id de cada imagem anexada", () => {
    const t = textoComAnexos({
      papel: "user",
      texto: "Transforma em zumbi",
      anexos: [{ id: "abc", mime: "image/png", base64: "", rotulo: "Luna", avatar: true }],
      bruto: null,
    });
    expect(t).toContain("id=abc");
    expect(t).toContain('"Luna"');
    expect(t).toContain("salvo como avatar");
  });
});
