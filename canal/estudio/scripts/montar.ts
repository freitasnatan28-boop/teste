// Setor de Edição (parte 1): junta narração + storyboard e calcula a linha do tempo em frames.
// Cada cena começa quando a palavra "em" é falada. Cenas que passam do tempo ganham uma foto de apoio
// DIFERENTE (nunca a mesma foto de novo em seguida), para a tela não ficar parada.
// Uso: npm run montar -- 001-guerra-da-lagosta
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Palavra } from "./narrar";
import { paraFala } from "./roteiro";
import type { Ator, Storyboard, TCena, Timeline, Transicao, Vista } from "../src/tipos";

const FPS = 30;
const [LARGURA, ALTURA] = process.env.FORMATO === "vertical" ? [1080, 1920] : [1920, 1080];
const PAUSA_BEAT = 0.2;
const PAUSA_CAPITULO = 0.6;
// Cenas que passam desse tempo (s) são encurtadas e o resto vira uma foto de apoio do beat.
const LIMITE: Partial<Record<string, number>> = { data: 2.4, texto: 2.6, contador: 2.8, versus: 3, radar: 3.4, foto: 4.5, mapa: 6, citacao: 6 };
const SOBRA_MINIMA = 1.5; // não cria apoio menor que isso
const JANELA_REPETICAO = 25; // a mesma foto não volta antes de 25 s
const DURACAO_DESTAQUE = 1.2;
const CAUDA_FINAL = 4;
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

type Bloco = { inicio: number; fim: number; cena: TCena["cena"]; som?: string; apoio?: string[]; continua?: boolean };

const imgDe = (c: TCena["cena"]) => (c.tipo === "foto" ? c.img : c.tipo === "texto" || c.tipo === "citacao" ? c.img : undefined);

// Foto que ainda não foi baixada vira cartão de texto (nunca repete outra foto no lugar).
function substituirFaltante(cena: TCena["cena"], temImg: (n: string) => boolean, avisos: string[]): TCena["cena"] {
  if ((cena.tipo === "texto" || cena.tipo === "citacao") && cena.img && !temImg(cena.img)) return { ...cena, img: undefined };
  if (cena.tipo !== "foto" || temImg(cena.img)) return cena;
  avisos.push(`foto "${cena.img}" faltando: virou cartão de texto`);
  const linhas = cena.modo === "retrato" ? [cena.cargo ?? "", cena.nome ?? ""] : (cena.rotulo ?? "").split(" · ");
  return { tipo: "texto", linhas: linhas.filter(Boolean).map((l) => l.toUpperCase()) };
}

// Som de entrada de cada tipo de cena (null = cena entra em silêncio).
const SOM_POR_TIPO: Partial<Record<string, string[]>> = {
  texto: ["hit", "whoosh-3", "whoosh-2"],
  data: ["digitar"],
  contador: ["tique"],
  lista: ["papel"],
  citacao: ["papel"],
  mapa: ["mapa"],
  versus: ["impacto"],
  radar: ["radar"],
  plataforma: ["whoosh-2"],
  linhaTempo: ["whoosh-2"],
  final: ["whoosh-grave"],
};
const SONS_FOTO = ["whoosh-3", "obturador", "whoosh-2", "whoosh"];
const SEM_REPETIR_SOM = 8; // s: o mesmo arquivo não toca de novo antes disso
const RESPIRO_SOM = 1.2; // s: nada de dois efeitos colados

function moveuBastante(de: Vista | undefined, para: Vista): boolean {
  if (!de) return false;
  const zoom = Math.abs(Math.log(para.zoom / de.zoom));
  const dist = Math.hypot(para.centro[0] - de.centro[0], para.centro[1] - de.centro[1]) * (para.zoom / 2);
  return zoom > 0.35 || dist > 40;
}

function transicaoPara(cena: TCena["cena"], som: string | undefined, i: number, inicioCapitulo: boolean): Transicao {
  if (inicioCapitulo) return "luz";
  if (som === "impacto" || som === "flash") return "flash";
  if (cena.tipo === "mapa") return "suave";
  if (cena.tipo === "foto") return (["zoom", "deslize-esq", "suave", "deslize-dir"] as const)[i % 4];
  return "zoom";
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

  const estilo = sb.estilo ?? "documentario";
  const tl: Timeline = { pasta, estilo, trilha: sb.trilha ?? (estilo === "mapa" ? "trilha-mapa" : "trilha-tensao"), fps: FPS, duracao: 0, largura: LARGURA, altura: ALTURA, beats: [], cenas: [], destaques: [], capitulos: [], sons: [] };
  const aparicoes: { t: number; ator: Ator; som?: string }[] = []; // quando cada balão/retrato/ícone entra (ganha som)
  const avisos: string[] = [];
  let cursor = 0.4; // segundos
  let capituloAtual = "";

  const ids = Object.keys(sb.beats).sort();
  const todas: Bloco[] = [];

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
      if (numero > 0) tl.sons.push({ inicio: Math.round(cursor * FPS), som: estilo === "mapa" ? "luz-flash" : "whoosh-grave", volume: 0.5 });
    }

    tl.beats.push({ id, inicio: Math.round(cursor * FPS), audio: `${pasta}/narracao/${id}.mp3`, duracao: Math.ceil(dur * FPS) + 2 });

    let desde = 0;
    roteiro.cenas.forEach((c, k) => {
      let t = 0;
      let indiceCena = 0;
      if (k > 0) {
        const achado = c.em ? acharPalavra(beat.palavras, c.em, desde) : null;
        if (!achado) {
          avisos.push(`${id}: palavra "${c.em}" não encontrada (cena ${k + 1}); dividindo o tempo`);
          t = (dur * k) / roteiro.cenas.length;
        } else {
          t = achado.tempo;
          desde = achado.indice + 1;
          indiceCena = achado.indice;
        }
      }
      const { em, ...cena } = c;
      if (cena.tipo === "mapa") {
        // Balões, retratos e países entram quando a palavra "em" é falada (frames contados do início da cena).
        const quando = (palavra: string | undefined, o_que: string) => {
          if (!palavra) return undefined;
          const a = acharPalavra(beat.palavras, palavra, indiceCena);
          if (!a) avisos.push(`${id}: "${palavra}" (${o_que}) não encontrada`);
          return a ? Math.max(0, Math.round((a.tempo - t) * FPS)) : undefined;
        };
        cena.atores = cena.atores?.map((a) => {
          const aos = quando(a.em, a.tipo);
          aparicoes.push({ t: cursor + t + (aos ?? 0) / FPS, ator: a });
          const extra = a.tipo === "unidade" ? { moverAos: quando(a.mover, "unidade anda") } : {};
          if (a.tipo === "unidade" && a.para) aparicoes.push({ t: cursor + t + ((extra.moverAos ?? (aos ?? 0) + 15) / FPS), ator: { ...a, tipo: "rotulo", texto: "" } as Ator, som: "whoosh-3" });
          return { ...a, aos, ateAos: quando(a.ate, `${a.tipo} até`), ...extra };
        });
        cena.paises = cena.paises?.map((p) => ({ ...p, aos: quando(p.em, p.iso) }));
        cena.zonas = cena.zonas?.map((z) => ({ ...z, aos: quando(z.em, "zona") }));
      }
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
      tl.sons.push({ inicio: Math.round((cursor + a.tempo) * FPS), som: "pop", volume: 0.18 });
    }

    cursor += dur + (n < ids.length - 1 ? PAUSA_BEAT : CAUDA_FINAL);
  });

  // Cada cena vai até o começo da próxima.
  todas.forEach((c, i) => (c.fim = i < todas.length - 1 ? todas[i + 1].inicio : cursor));
  const temImg = (n: string) => existsSync(join(pastaDisco, "imagens", `${n}.jpg`));
  for (const c of todas) c.cena = substituirFaltante(c.cena, temImg, avisos);
  // Cartão de texto vazio (foto faltando sem legenda) sai, e a cena anterior se estende no lugar dele.
  for (let i = todas.length - 1; i > 0; i--) {
    const c = todas[i].cena;
    if (c.tipo === "texto" && c.linhas.length === 0) {
      todas[i - 1].fim = todas[i].fim;
      todas.splice(i, 1);
    }
  }
  // Imagens feitas por IA (listadas em imagens-ia.json e não em imagens.json) ganham selo na tela.
  const arqIa = join(pastaDisco, "imagens-ia.json");
  const reais = JSON.parse(readFileSync(join(pastaDisco, "imagens.json"), "utf8")) as Record<string, unknown>;
  const ia = new Set(existsSync(arqIa) ? Object.keys(JSON.parse(readFileSync(arqIa, "utf8"))).filter((n) => !(n in reais) || !temImg(n)) : []);
  const marcarIa = (c: Bloco) => {
    if (c.cena.tipo === "foto" && ia.has(c.cena.img)) c.cena = { ...c.cena, ia: true };
  };
  todas.forEach(marcarIa);

  // Cenas longas ganham uma foto de apoio que não apareceu perto dali.
  const recente = (img: string, t: number) => todas.some((o) => imgDe(o.cena) === img && Math.abs(o.inicio - t) < JANELA_REPETICAO);
  for (let i = 0; i < todas.length; i++) {
    const c = todas[i];
    const limite = c.cena.tipo === "foto" && c.cena.modo === "retrato" ? 5 : LIMITE[c.cena.tipo];
    if (!limite || c.fim - c.inicio < limite + SOBRA_MINIMA) continue;
    const img = (c.apoio ?? []).filter(temImg).find((a) => !recente(a, c.inicio + limite));
    if (!img) continue;
    const apoio: Bloco = { inicio: c.inicio + limite, fim: c.fim, cena: { tipo: "foto", img, focos: FOCOS_APOIO }, apoio: c.apoio };
    marcarIa(apoio);
    todas.splice(i + 1, 0, apoio);
    c.fim = c.inicio + limite;
  }

  // Mapas seguidos viram uma câmera contínua: o próximo começa onde o anterior parou, sem corte.
  todas.forEach((c, i) => {
    const antes = todas[i - 1]?.cena;
    if (c.cena.tipo !== "mapa" || c.cena.de) return;
    if (antes?.tipo === "mapa" && (antes.estilo ?? "satelite") === (c.cena.estilo ?? "satelite")) {
      c.cena = { ...c.cena, de: antes.para };
      c.continua = true;
    }
  });

  // Efeitos sonoros variados e espaçados: nem todo corte tem som, e o mesmo som não se repete em seguida.
  const tocados: { t: number; som: string }[] = tl.sons.map((x) => ({ t: x.inicio / FPS, som: x.som }));
  const livre = (som: string, t: number) =>
    !tocados.some((x) => Math.abs(x.t - t) < RESPIRO_SOM) && !tocados.some((x) => x.som === som && Math.abs(x.t - t) < SEM_REPETIR_SOM);
  const capitulos = new Set(tl.capitulos.map((c) => c.inicio));
  let fotos = 0;
  const vez: Record<string, number> = {}; // gira as opções de som de cada tipo
  todas.forEach((c, i) => {
    const inicio = Math.round(c.inicio * FPS);
    const duracaoCena = Math.round(c.fim * FPS) - inicio;
    if (duracaoCena <= 0) return;
    const inicioCapitulo = [...capitulos].some((x) => Math.abs(x - inicio) < FPS);
    let som = c.som;
    if (estilo === "mapa" && c.cena.tipo === "mapa" && !som && !inicioCapitulo) {
      // No modelo de mapa, o som acompanha a câmera: whoosh quando ela anda bastante, "ding" no ano.
      if (c.cena.ano) som = "ding";
      else if (moveuBastante(c.cena.de, c.cena.para)) som = ["camera-zoom", "camera-zoom-2"].find((o) => livre(o, c.inicio));
    } else if (!som && !inicioCapitulo && !c.continua) {
      const lista = c.cena.tipo === "foto" ? (fotos++ % 3 === 0 ? SONS_FOTO : []) : SOM_POR_TIPO[c.cena.tipo] ?? [];
      const k = (vez[c.cena.tipo] = (vez[c.cena.tipo] ?? -1) + 1);
      const opcoes = [...lista.slice(k % (lista.length || 1)), ...lista.slice(0, k % (lista.length || 1))];
      som = opcoes.find((o) => livre(o, c.inicio));
    }
    if (som && (c.som || livre(som, c.inicio))) {
      tl.sons.push({ inicio, som, volume: c.som ? 0.6 : som === "impacto" ? 0.45 : 0.3 });
      tocados.push({ t: c.inicio, som });
    }
    tl.cenas.push({ inicio, duracao: duracaoCena, cena: c.cena, parte: 0, partes: 1, offset: 0, duracaoCena, corte: true, transicao: c.continua && !inicioCapitulo ? "nenhuma" : transicaoPara(c.cena, c.som, i, inicioCapitulo) });
  });
  // Cada elemento que entra no mapa tem seu som (pops alternados, digitação no balão, canhão na explosão).
  let pops = 0;
  for (const { t, ator, som: forcado } of aparicoes) {
    if (tocados.some((x) => Math.abs(x.t - t) < 0.12)) continue;
    const som = forcado ??
      (ator.tipo === "foto" ? "obturador" : ator.tipo === "lupa" ? "camera-zoom-2" : ator.tipo === "icone" && ator.icone === "explosao" ? "canhao" : ator.tipo === "rotulo" ? null : estilo === "mapa" ? (pops++ % 2 ? "balao-pop-2" : "balao-pop") : "pop");
    if (!som) continue;
    tl.sons.push({ inicio: Math.round(t * FPS), som, volume: som === "canhao" ? 0.45 : 0.32 });
    tocados.push({ t, som });
    if (ator.tipo === "fala") tl.sons.push({ inicio: Math.round((t + 0.1) * FPS), som: "teclado", volume: 0.14 });
  }

  tl.capitulos = tl.capitulos.filter((c) => c.numero > 0);
  tl.duracao = Math.round(cursor * FPS);
  writeFileSync(join(pastaDisco, "timeline.json"), JSON.stringify(tl));
  // Recorta o fundo de satélite de cada mapa (NASA Blue Marble).
  execFileSync("python3", [join(import.meta.dirname, "preparar_mapas.py"), pastaDisco], { stdio: "inherit" });

  const cortes = tl.cenas.length;
  console.log(`${video}: ${(cursor / 60).toFixed(1)} min, ${cortes} cortes (1 a cada ${(cursor / cortes).toFixed(1)} s)`);
  for (const a of avisos) console.warn(`AVISO ${a}`);
}

main();
