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

import { entradaVideo } from "@/estudio/video";
import { corpoCena } from "@/estudio/video-ia";

describe("vídeo com IA (Veo pela ElevenLabs)", () => {
  const img = { type: "inline_base64", mime_type: "image/png", content_base64: "AAA" };

  it("usa a imagem inicial como primeiro quadro, em 9:16", () => {
    const c = corpoCena({ modelo: "veo-3.1-fast-generate-001", prompt: "hand picks up bottle", formato: "9:16", duracao: 6, som: false, resolucao: "720p", imagemInicial: img });
    expect(c).toMatchObject({ model_id: "veo-3.1-fast-generate-001", aspect_ratio: "9:16", duration_secs: 6, generate_audio: false, start_frame: img });
    expect(c.images).toBeUndefined();
  });

  it("com fotos de referência (sem imagem inicial), manda como 'subject' e força 8 s", () => {
    const c = corpoCena({ modelo: "veo-3.1-generate-001", prompt: "x", formato: "4:5", duracao: 4, som: true, resolucao: "720p", referencias: [img, img, img, img] });
    expect(c.duration_secs).toBe(8);
    expect(c.aspect_ratio).toBe("9:16");
    expect(c.images).toEqual([{ image: img, role: "subject" }, { image: img, role: "subject" }, { image: img, role: "subject" }]);
  });

  it("duração inválida vira 8 s", () => {
    expect(corpoCena({ modelo: "veo-3.1-fast-generate-001", prompt: "x", formato: "9:16", duracao: 5, som: true, resolucao: "720p" }).duration_secs).toBe(8);
  });
});

describe("montagem com vídeos", () => {
  it("avatar falando que cobre a narração toda: corta o mesmo trecho (boca sincronizada)", () => {
    expect(entradaVideo({ tipo: "video", inicio: 10, duracao: 5, duracaoOriginal: 20 })).toEqual(["-ss", "10.000", "-t", "5.000"]);
  });

  it("clipe que não cobre o trecho: começa do início", () => {
    expect(entradaVideo({ tipo: "video", inicio: 10, duracao: 5, duracaoOriginal: 8 })).toEqual(["-t", "5.000"]);
  });

  it("clipe mais curto que a cena: repete em loop", () => {
    expect(entradaVideo({ tipo: "video", inicio: 0, duracao: 6, duracaoOriginal: 4 })).toEqual(["-stream_loop", "-1", "-t", "6.000"]);
  });
});
