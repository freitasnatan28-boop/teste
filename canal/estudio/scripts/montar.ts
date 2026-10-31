// Setor de Edição (parte 1): junta narração + storyboard e calcula a linha do tempo em frames.
// Cada cena começa quando a palavra "em" é falada; fotos longas viram vários subcortes (punch-ins)
// para a tela nunca ficar parada mais de ~3 segundos.
// Uso: npm run montar -- 001-guerra-da-lagosta
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Palavra } from "./narrar";
import { paraFala } from "./roteiro";
import type { Storyboard, TCena, Timeline } from "../src/tipos";

const FPS = 30;
const PAUSA_BEAT = 0.2;
const PAUSA_CAPITULO = 0.6;
const MAX_FOTO = 2.8; // segundos antes de virar subcortes
const ALVO_SUBCORTE = 2.2;
// Gráficos que passam desse tempo são encurtados e o resto vira fotos de apoio do beat.
const LIMITE_GRAFICO: Partial<Record<string, number>> = { data: 2.4, texto: 2.6, contador: 2.8, versus: 3, radar: 3.4, mapa: 6, citacao: 6 };
const DURACAO_DESTAQUE = 1.2;
const CAUDA_FINAL = 4;
const RESERVA = ["tartu-b17", "frota-brasileira", "lagosta"];
const FOCOS_APOIO: [number, number][] = [[0.6, 0.45], [0.35, 0.55], [0.5, 0.35]];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9-]/g, "");

// Acha o instante (s) em que a sequência de palavras `alvo` começa, a partir do índice `desde`.
function acharPalavra(palavras: Palavra[], alvo: string, desde: number): { indice: number; tempo: number } | null {
  const partes = paraFala(alvo).split(/\s+/).map(norm).filter(Boolean);
  for (let i = desde; i < palavras.length; i++) {
    if (partes.every((p, k) => palavras[i + k] && norm(palavras[i + k].texto) === p)) return { indice: i, tempo: palavras[i].inicio };
  }
  return null;
}

// Se uma foto ainda não foi baixada, troca por outra do beat (ou por um cartão de texto, no retrato).
function substituirFaltantes(cena: TCena["cena"], apoio: string[], temImg: (n: string) => boolean, avisos: string[]): TCena["cena"] {
  if (cena.tipo !== "foto" || temImg(cena.img)) return cena;
  if (cena.modo === "retrato") {
    avisos.push(`foto "${cena.img}" faltando: virou cartão de texto`);
    return { tipo: "texto", linhas: [(cena.cargo ?? "").toUpperCase(), (cena.nome ?? "").toUpperCase()] };
  }
  const troca = [...apoio, ...RESERVA].find(temImg);
  avisos.push(`foto "${cena.img}" faltando: usando "${troca}"`);
  return { ...cena, img: troca ?? cena.img, rotulo: undefined };
}

function duracaoMp3(arquivo: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arquivo]).toString());
}

function main() {
  const video = process.argv[2];
  if (!video) throw new Error("Uso: npm run montar -- <pasta do vídeo em canal/videos>");
  const pastaDisco = join(import.meta.dirname, "..", "..", "videos", video);
  const pasta = `videos/${video}`;
  const sb = JSON.parse(readFileSync(join(pastaDisco, "storyboard.json"), "utf8")) as Storyboard;

  const tl: Timeline = { pasta, fps: FPS, duracao: 0, beats: [], cenas: [], destaques: [], capitulos: [], sons: [] };
  const avisos: string[] = [];
  let cursor = 0.4; // segundos
  let capituloAtual = "";

  const ids = Object.keys(sb.beats).sort();
  const todas: { inicio: number; fim: number; cena: TCena["cena"]; som?: string; apoio?: string[] }[] = [];

  ids.forEach((id, n) => {
    const beat = JSON.parse(readFileSync(join(pastaDisco, "narracao", `${id}.json`), "utf8")) as { capitulo: string; palavras: Palavra[] };
    const dur = duracaoMp3(join(pastaDisco, "narracao", `${id}.mp3`));
    const roteiro = sb.beats[id];

    if (beat.capitulo !== capituloAtual) {
      if (capituloAtual) cursor += PAUSA_CAPITULO;
      capituloAtual = beat.capitulo;
      const numero = tl.capitulos.length;
      if (numero > 0 && beat.capitulo !== "Encerramento") {
        tl.capitulos.push({ inicio: Math.round(cursor * FPS), numero, titulo: beat.capitulo });
      } else if (numero === 0) {
        tl.capitulos.push({ inicio: -1000, numero: 0, titulo: "" }); // gancho não tem cartela
      }
      if (numero > 0) tl.sons.push({ inicio: Math.round(cursor * FPS), som: "whoosh-grave", volume: 0.55 });
    }

    tl.beats.push({ id, inicio: Math.round(cursor * FPS), audio: `${pasta}/narracao/${id}.mp3`, duracao: Math.ceil(dur * FPS) + 2 });

    let desde = 0;
    roteiro.cenas.forEach((c, k) => {
      let t = 0;
      if (k > 0) {
        const achado = c.em ? acharPalavra(beat.palavras, c.em, desde) : null;
        if (!achado) {
          avisos.push(`${id}: palavra "${c.em}" não encontrada (cena ${k + 1}); dividindo o tempo`);
          t = (dur * k) / roteiro.cenas.length;
        } else {
          t = achado.tempo;
          desde = achado.indice + 1;
        }
      }
      const { em, ...cena } = c;
      if (cena.tipo === "lista") {
        let d = 0;
        cena.itens = cena.itens.map((it) => {
          const a = it.em ? acharPalavra(beat.palavras, it.em, d) : null;
          if (it.em && !a) avisos.push(`${id}: item "${it.em}" da lista não encontrado`);
          if (a) d = a.indice + 1;
          return { ...it, aos: a ? Math.round((a.tempo - t) * FPS) : undefined };
        });
      }
      todas.push({ inicio: cursor + t, fim: 0, cena, som: (c as { som?: string }).som, apoio: roteiro.apoio });
    });

    let d = 0;
    for (const dq of roteiro.destaques ?? []) {
      const palavra = typeof dq === "string" ? dq : dq.palavra;
      const texto = typeof dq === "string" ? dq : dq.texto;
      const a = acharPalavra(beat.palavras, palavra, d);
      if (!a) {
        avisos.push(`${id}: destaque "${palavra}" não encontrado`);
        continue;
      }
      d = a.indice + 1;
      tl.destaques.push({ inicio: Math.round((cursor + a.tempo) * FPS), duracao: Math.round(DURACAO_DESTAQUE * FPS), texto: texto.toUpperCase() });
      tl.sons.push({ inicio: Math.round((cursor + a.tempo) * FPS), som: "pop", volume: 0.3 });
    }

    cursor += dur + (n < ids.length - 1 ? PAUSA_BEAT : CAUDA_FINAL);
  });

  // Cada cena vai até o começo da próxima; gráficos longos ganham fotos de apoio depois deles.
  todas.forEach((c, i) => (c.fim = i < todas.length - 1 ? todas[i + 1].inicio : cursor));
  let girar = 0;
  for (const c of [...todas]) {
    const limite = LIMITE_GRAFICO[c.cena.tipo];
    if (!limite || !c.apoio?.length || c.fim - c.inicio <= limite + 1.2) continue;
    const img = c.apoio[girar++ % c.apoio.length];
    todas.splice(todas.indexOf(c) + 1, 0, { inicio: c.inicio + limite, fim: c.fim, cena: { tipo: "foto", img, focos: FOCOS_APOIO }, apoio: c.apoio });
    c.fim = c.inicio + limite;
  }
  const temImg = (n: string) => existsSync(join(pastaDisco, "imagens", `${n}.jpg`));
  for (const c of todas) {
    c.cena = substituirFaltantes(c.cena, (c.apoio ?? []).filter(temImg), temImg, avisos);
    const inicio = Math.round(c.inicio * FPS);
    const duracaoCena = Math.round(c.fim * FPS) - inicio;
    if (duracaoCena <= 0) continue;
    const segundos = duracaoCena / FPS;
    const partes = c.cena.tipo === "foto" && c.cena.modo !== "retrato" && segundos > MAX_FOTO ? Math.round(segundos / ALVO_SUBCORTE) : 1;
    for (let p = 0; p < partes; p++) {
      const a = Math.round((duracaoCena * p) / partes);
      const b = Math.round((duracaoCena * (p + 1)) / partes);
      tl.cenas.push({ inicio: inicio + a, duracao: b - a, cena: c.cena, parte: p, partes, offset: a, duracaoCena, corte: p === 0 });
    }
    tl.sons.push({ inicio, som: c.som ?? (c.cena.tipo === "data" ? "digitar" : "whoosh"), volume: c.som ? 0.6 : 0.28 });
  }

  tl.capitulos = tl.capitulos.filter((c) => c.numero > 0);
  tl.duracao = Math.round(cursor * FPS);
  writeFileSync(join(pastaDisco, "timeline.json"), JSON.stringify(tl));

  const cortes = tl.cenas.length;
  console.log(`${video}: ${(cursor / 60).toFixed(1)} min, ${todas.length} cenas, ${cortes} cortes (1 corte a cada ${(cursor / cortes).toFixed(1)} s)`);
  for (const a of avisos) console.warn(`AVISO ${a}`);
}

main();
