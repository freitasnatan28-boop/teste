// Lê o roteiro em Markdown (canal/roteiros/NNN-*.md) e divide em "beats":
// cada **[VISUAL]** abre um beat novo, e o texto até o próximo [VISUAL] é a narração dele.
import { readFileSync } from "node:fs";

export type Beat = {
  id: string; // b01, b02...
  capitulo: string;
  visual: string;
  texto: string;
};

export function lerRoteiro(caminho: string): Beat[] {
  const md = readFileSync(caminho, "utf8");
  const corpo = md.split(/^## Roteiro\s*$/m)[1];
  if (!corpo) throw new Error(`"## Roteiro" não encontrado em ${caminho}`);

  const beats: Beat[] = [];
  let capitulo = "";
  let atual: Beat | null = null;

  for (const linha of corpo.split("\n")) {
    const l = linha.trim();
    if (!l || l.startsWith(">")) continue;
    if (l.startsWith("### ")) {
      capitulo = l.slice(4).replace(/\s*\(.*\)\s*$/, "").replace(/^\d+\.\s*/, "");
      continue;
    }
    if (l.startsWith("**[VISUAL]**")) {
      atual = {
        id: `b${String(beats.length + 1).padStart(2, "0")}`,
        capitulo,
        visual: l.replace("**[VISUAL]**", "").trim(),
        texto: "",
      };
      beats.push(atual);
      continue;
    }
    if (atual) atual.texto = `${atual.texto} ${l.replace(/\*/g, "")}`.trim();
  }
  return beats.filter((b) => b.texto);
}

// Grafia "fonética" só para a voz: nomes estrangeiros que a voz em PT-BR lê errado.
const PRONUNCIA: [RegExp, string][] = [
  [/\bB-17\b/g, "B-dezessete"],
  [/\bDe Gaulle\b/g, "De Gól"],
  [/\bToulon\b/g, "Tulôn"],
  [/\bCamaret\b/g, "Camarê"],
  [/\bCassiopée\b/g, "Cassiopê"],
  [/\bClemenceau\b/g, "Clemansô"],
  [/\bGaufeny\b/g, "Gofení"],
  [/\bChirac\b/g, "Xirác"],
  [/\bFAB\b/g, "fáb"],
];

export function paraFala(texto: string): string {
  return PRONUNCIA.reduce((t, [de, para]) => t.replace(de, para), texto);
}
