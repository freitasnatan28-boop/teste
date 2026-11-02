import { describe, expect, it } from "vitest";
import { dimensoesImagem, mimeImagem } from "@/estudio/armazenamento";
import { textoComAnexos } from "@/estudio/chat-tipos";
import { blocosLegenda, legendasAss, textoSobreposto } from "@/estudio/video";
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
    const ass = legendasAss({ palavras, largura: 1080, altura: 1920, duracaoTotal: 6 });
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("Style: Padrao,Anton,");
    const eventos = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(eventos).toHaveLength(palavras.length);
    expect(eventos[0]).toContain("{\\c&H00E5FF&}NOBODY{\\c&HFFFFFF&} WAS ON");
  });

  it("remove caracteres que quebrariam o arquivo de legenda", () => {
    const ass = legendasAss({ palavras: [{ p: "{oi}\\", i: 0, f: 0.5 }], largura: 1080, altura: 1920, duracaoTotal: 1 });
    expect(ass).toContain("OI");
    expect(ass.split("\n").find((l) => l.startsWith("Dialogue:"))).not.toMatch(/\{oi\}/i);
  });
});

describe("texto do gancho e CTA (TikTok Shop)", () => {
  it("mostra o gancho no começo e o CTA no fim, sem sobrepor", () => {
    const ass = legendasAss({ palavras: [], largura: 1080, altura: 1920, duracaoTotal: 20, gancho: "This gadget fixed my kitchen", cta: "Tap the orange cart" });
    const eventos = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatch(/^Dialogue: 1,0:00:00\.00,0:00:03\.00,Gancho,.*This gadget fixed my kitchen$/);
    expect(eventos[1]).toMatch(/^Dialogue: 1,0:00:17\.00,0:00:20\.00,Cta,.*Tap the orange cart$/);
  });

  it("em vídeo curto, o gancho termina antes do CTA começar", () => {
    const ass = legendasAss({ palavras: [], largura: 1080, altura: 1920, duracaoTotal: 4, gancho: "Wait for it", cta: "Shop now" });
    const [g, c] = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(g).toContain(",0:00:02.00,Gancho");
    expect(c).toContain("0:00:02.00,0:00:04.00,Cta");
  });

  it("tira emojis (a fonte não tem) e mantém quebras de linha", () => {
    expect(textoSobreposto("🛒 Tap the\norange cart 🔥")).toBe("Tap the\\Norange cart");
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
