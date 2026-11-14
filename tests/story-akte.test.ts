import { describe, expect, it } from "vitest";
import {
  analisarRoteiro,
  hojeBR,
  ideiasDisponiveis,
  meusTemas,
  mmss,
  proximoNumero,
  relatorioDoDia,
  TEMAS_INICIAIS,
  temasParaMarkdown,
  temasParecidos,
  type TemaSA,
} from "@/lib/story-akte";

const meu = (n: number, extra: Partial<TemaSA> = {}): TemaSA => ({
  numero: `SA_A${String(n).padStart(2, "0")}`,
  tema: `Tema ${n}`,
  jogo: "GTA Liberty City Stories",
  dono: "Amigo",
  situacao: "planejado",
  criadoEm: "2026-11-14",
  ...extra,
});

describe("numeração", () => {
  it("Felipe continua SA_NN e o amigo começa em SA_A01", () => {
    expect(proximoNumero(TEMAS_INICIAIS, "Felipe")).toBe("SA_07");
    expect(proximoNumero(TEMAS_INICIAIS, "Amigo")).toBe("SA_A01");
    expect(proximoNumero([...TEMAS_INICIAIS, meu(1), meu(9)], "Amigo")).toBe("SA_A10");
  });
});

describe("temas repetidos", () => {
  it("bloqueia história completa de jogo reservado pelo Felipe", () => {
    const r = temasParecidos({ tema: "San Andreas: die komplette Story", jogo: "GTA San Andreas" }, TEMAS_INICIAIS);
    expect(r.map((t) => t.numero)).toEqual(["SA_02"]);
  });
  it("aceita tema de personagem do mesmo jogo", () => {
    expect(temasParecidos({ tema: "Big Smoke: der Verrat erklärt", jogo: "GTA San Andreas" }, TEMAS_INICIAIS)).toEqual([]);
  });
  it("pega texto quase igual", () => {
    const temas = [meu(1, { tema: "Die Geschichte von Lance Vance", jogo: "GTA Vice City" })];
    expect(temasParecidos({ tema: "Geschichte von Lance Vance", jogo: "" }, temas)).toHaveLength(1);
  });
  it("ideia pega some da lista de ideias livres", () => {
    const antes = ideiasDisponiveis(TEMAS_INICIAIS).length;
    const temas = [...TEMAS_INICIAIS, meu(1, { tema: "GTA Chinatown Wars (Huang Lee) — história completa", jogo: "GTA Chinatown Wars" })];
    expect(ideiasDisponiveis(temas)).toHaveLength(antes - 1);
  });
});

describe("relatório e listas", () => {
  const temas = [
    ...TEMAS_INICIAIS,
    meu(1, { situacao: "pronto", prontoEm: "2026-11-14", tituloDE: "Liberty City Stories: Die komplette Story", duracao: "12:10", pasta: "SA_A01 - LCS" }),
    meu(2, { situacao: "em_producao", tema: "Vice City Stories" }),
    meu(3, { tema: "Chinatown Wars" }),
  ];
  it("separa prontos de hoje, em produção e próximos", () => {
    const r = relatorioDoDia(temas, "2026-11-14");
    expect(r).toContain("relatório de 14/11/2026");
    expect(r).toMatch(/produzidos hoje\n- SA_A01 · „Liberty City Stories: Die komplette Story“ · GTA Liberty City Stories · 12:10 · PRONTOS\/SA_A01 - LCS/);
    expect(r).toMatch(/não terminei\n- SA_A02 · Vice City Stories/);
    expect(r).toMatch(/não pega esses\)\n- SA_A03 · Chinatown Wars/);
    expect(relatorioDoDia(temas, "2026-11-15")).toMatch(/produzidos hoje\n- \(nenhum\)/);
  });
  it("TEMAS_FEITOS.md tem Felipe primeiro e todos os temas", () => {
    const md = temasParaMarkdown(temas, "2026-11-14");
    expect(md.indexOf("SA_06")).toBeLessThan(md.indexOf("SA_A01"));
    expect(md.match(/^\| SA_/gm)).toHaveLength(9);
  });
  it("“quais temas eu fiz?” lista só os do amigo", () => {
    const t = meusTemas(temas);
    expect(t).toContain("SA_A03");
    expect(t).not.toContain("SA_02");
  });
  it("data de hoje no horário de Brasília", () => {
    expect(hojeBR(new Date("2026-11-15T02:00:00Z"))).toBe("2026-11-14");
  });
});

describe("conferir roteiro", () => {
  const roteiro = `# SA_A01 — Teste
<!-- comentario
que ocupa duas linhas -->

[V: #1 intro | #60 final]
Ein Mann kommt nach fünfzehn Jahren aus dem Gefängnis.
Er hat kein Geld.

[V: #48 a #50 negócios]
Im Jahr 1986 fährt er ein Schnellboot.

Welche Story als Nächstes? Abonniere Story Akte.`;

  it("lê os blocos como o prepara_de.py", () => {
    const a = analisarRoteiro(roteiro);
    expect(a.blocos.map((b) => b.texto)).toEqual([
      "Ein Mann kommt nach fünfzehn Jahren aus dem Gefängnis. Er hat kein Geld.",
      "Im Jahr 1986 fährt er ein Schnellboot.",
      "Welche Story als Nächstes? Abonniere Story Akte.",
    ]);
    expect(a.palavras).toBe(13 + 7 + 7);
  });
  it("monta o missoes.json com intervalos e aponta bloco sem missão", () => {
    const a = analisarRoteiro(roteiro);
    expect(a.missoesJson).toBe("[[1,60],[48,49,50],[]]");
    expect(a.semMissao).toEqual([2]);
  });
  it("avisa números em algarismo, sch + consoante e roteiro curto", () => {
    const a = analisarRoteiro(roteiro);
    expect(a.numeros).toEqual([{ bloco: 1, trechos: ["1986"] }]);
    expect(a.sch).toEqual(["Schnellboot"]);
    expect(a.alertas.join(" ")).toMatch(/22 a 28/);
    expect(a.alertas.join(" ")).toMatch(/por extenso/);
    expect(a.alertas.join(" ")).not.toMatch(/pergunta|inscrição/);
  });
  it("roteiro vazio não gera alertas", () => {
    expect(analisarRoteiro("").alertas).toEqual([]);
    expect(mmss(754)).toBe("12:34");
  });
});
