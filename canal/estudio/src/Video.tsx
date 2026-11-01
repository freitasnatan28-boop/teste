import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Loop, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Foto } from "./cenas/Foto";
import { Citacao, Contador, Data, Final, LinhaTempo, Lista, LogoCanal, Plataforma, Radar, Texto, Versus } from "./cenas/Graficos";
import { Mapa } from "./cenas/Mapa";
import type { PropsCena } from "./cenas/tipos-cena";
import { CONTORNO_PRETO, COR, FONTE_LEGENDA, FONTE_TEXTO, FONTE_TITULO } from "./estilo";
import type { TCena, Timeline } from "./tipos";
import { IdiomaContexto, useTextos } from "./idioma";

const COMPONENTES: Record<string, React.FC<PropsCena<any>>> = {
  foto: Foto,
  mapa: Mapa,
  texto: Texto,
  data: Data,
  lista: Lista,
  citacao: Citacao,
  versus: Versus,
  radar: Radar,
  contador: Contador,
  plataforma: Plataforma,
  linhaTempo: LinhaTempo,
  final: Final,
};

// Entrada de cada corte. Cada tipo de cena tem a sua (definida no montar), para não ficar repetitivo.
const Corte: React.FC<{ c: TCena; pasta: string }> = ({ c, pasta }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const C = COMPONENTES[c.cena.tipo];
  const sai = (de: number, ate: number, n: number) => interpolate(f, [0, n], [de, ate], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  let transform = "";
  let opacidade = 1;
  let branco = 0;
  if (c.transicao === "zoom") transform = `scale(${sai(1.07, 1, 7)})`;
  if (c.transicao === "suave") transform = `scale(${sai(1.12, 1, 14)})`;
  if (c.transicao === "deslize-esq") transform = `translateX(${sai(width * 0.12, 0, 8)}px)`;
  if (c.transicao === "deslize-dir") transform = `translateX(${sai(-width * 0.12, 0, 8)}px)`;
  if (c.transicao === "escurecer") opacidade = sai(0, 1, 10);
  if (c.transicao === "flash") branco = interpolate(f, [0, 4], [0.7, 0], { extrapolateRight: "clamp" });
  // "luz": clarão branco-rosado que varre a tela (troca de época/capítulo no modelo de mapa).
  const luz = c.transicao === "luz" ? interpolate(f, [0, 3, 14], [0, 1, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform, opacity: opacidade }}>
        <C cena={c.cena} parte={c.parte} partes={c.partes} duracao={c.duracao} offset={c.offset} duracaoCena={c.duracaoCena} pasta={pasta} />
      </AbsoluteFill>
      {branco > 0 && <AbsoluteFill style={{ background: "#fff", opacity: branco }} />}
      {luz > 0 && (
        <AbsoluteFill style={{ opacity: luz, background: "radial-gradient(ellipse at 20% 30%, #fff 0%, #ffd6f2 35%, #f08ad8 60%, rgba(160,90,255,.6) 85%)", transform: `translateX(${interpolate(f, [0, 14], [-15, 15])}%)` }} />
      )}
    </AbsoluteFill>
  );
};

const Destaque: React.FC<{ texto: string }> = ({ texto }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 220 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 110, color: COR.amarelo, textTransform: "uppercase", textShadow: CONTORNO_PRETO, WebkitTextStroke: "3px #000", transform: `scale(${interpolate(s, [0, 1], [1.8, 1])}) rotate(-2deg)`, opacity: s }}>
        {texto}
      </div>
    </AbsoluteFill>
  );
};

const Capitulo: React.FC<{ numero: number; titulo: string }> = ({ numero, titulo }) => {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 10, 70, 80], [-700, 0, 0, -700], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 60, top: 60, transform: `translateX(${entra}px)`, display: "flex", alignItems: "stretch" }}>
      <div style={{ background: COR.amarelo, color: "#000", fontFamily: FONTE_TITULO, fontSize: 64, padding: "4px 22px" }}>{numero}</div>
      <div style={{ background: "rgba(7,17,28,.9)", color: COR.texto, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 44, padding: "12px 26px", textTransform: "uppercase", letterSpacing: 1 }}>{titulo}</div>
    </div>
  );
};

// Legenda no estilo dos vídeos curtos: poucas palavras, a palavra acende (cinza → branco) quando é falada,
// números e palavras-chave em amarelo com um pulinho.
const Legenda: React.FC<{ palavras: { t: string; aos: number; chave?: boolean }[] }> = ({ palavras }) => {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 92, pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: "0 16px", flexWrap: "wrap", justifyContent: "center", maxWidth: 1300, opacity: entra, transform: `translateY(${(1 - entra) * 14}px)` }}>
        {palavras.map((p, i) => {
          const k = interpolate(f, [p.aos - 1, p.aos + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pulo = p.chave ? interpolate(f, [p.aos, p.aos + 4, p.aos + 9], [1, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONTE_LEGENDA,
                fontWeight: 800,
                fontSize: 64,
                letterSpacing: -0.5,
                color: k < 0.5 ? "rgba(255,255,255,.38)" : p.chave ? COR.amarelo : "#fff",
                opacity: 0.55 + 0.45 * k,
                display: "inline-block",
                transform: `scale(${pulo})`,
                textShadow: "0 0 3px rgba(0,0,0,.95), 0 3px 10px rgba(0,0,0,.85), 0 0 28px rgba(0,0,0,.55)",
              }}
            >
              {p.t}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Documentário: granulado de filme + vinheta. Modelo de mapa: imagem limpa, só a marca d'água.
const Acabamento: React.FC<{ limpo: boolean }> = ({ limpo }) => {
  const f = useCurrentFrame();
  const textos = useTextos();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {!limpo && <Img src={staticFile(`texturas/grao-${f % 6}.png`)} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.06, mixBlendMode: "overlay", imageRendering: "pixelated" }} />}
      {!limpo && <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%)" }} />}
      <div style={{ position: "absolute", right: 40, top: 34, opacity: 0.55, display: "flex", alignItems: "center", gap: 12 }}>
        <LogoCanal tamanho={54} />
        <span style={{ fontFamily: FONTE_TITULO, fontSize: 30, color: COR.texto, letterSpacing: 1 }}>{textos.marca}</span>
      </div>
    </AbsoluteFill>
  );
};

const Escurecer: React.FC<{ duracao: number }> = ({ duracao }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000", opacity: interpolate(f, [0, duracao], [0, 1], { extrapolateRight: "clamp" }) }} />;
};

export const Video: React.FC<{ timeline: Timeline | null; video: string }> = ({ timeline }) => {
  if (!timeline) return <AbsoluteFill style={{ background: COR.fundo }} />;
  const { pasta, duracao, fps } = timeline;
  const mapa = timeline.estilo === "mapa";
  return (
    <IdiomaContexto.Provider value={timeline.idioma ?? "pt"}>
    <AbsoluteFill style={{ background: "#000" }}>
      {timeline.cenas.map((c, i) => (
        <Sequence key={i} from={c.inicio} durationInFrames={c.duracao} layout="none">
          <Corte c={c} pasta={pasta} />
        </Sequence>
      ))}
      {timeline.destaques.map((d, i) => (
        <Sequence key={`d${i}`} from={d.inicio} durationInFrames={d.duracao}>
          <Destaque texto={d.texto} />
        </Sequence>
      ))}
      {!mapa && timeline.capitulos.map((c) => (
        <Sequence key={`c${c.numero}`} from={c.inicio} durationInFrames={90}>
          <Capitulo numero={c.numero} titulo={c.titulo} />
        </Sequence>
      ))}
      <Acabamento limpo={mapa} />
      {(timeline.legendas ?? []).map((l, i) => (
        <Sequence key={`l${i}`} from={l.inicio} durationInFrames={Math.max(1, l.fim - l.inicio)} layout="none">
          <Legenda palavras={l.palavras} />
        </Sequence>
      ))}

      {timeline.beats.map((b) => (
        <Sequence key={b.id} from={b.inicio} durationInFrames={b.duracao} layout="none">
          <Audio src={staticFile(b.audio)} />
        </Sequence>
      ))}
      {timeline.sons.map((s, i) => (
        <Sequence key={`s${i}`} from={s.inicio} durationInFrames={fps * 5} layout="none">
          <Audio src={staticFile(`sons/${s.som}.mp3`)} volume={s.volume} />
        </Sequence>
      ))}
      <Loop durationInFrames={fps * (mapa ? 120 : 90)}>
        <Audio
          src={staticFile(`sons/${timeline.trilha ?? "trilha-tensao"}.mp3`)}
          volume={(f) => (mapa ? 0.1 : 0.13) * interpolate(f, [0, fps * 2], [0, 1], { extrapolateRight: "clamp" })}
        />
      </Loop>
      <Sequence from={duracao - fps} layout="none">
        <Escurecer duracao={fps} />
      </Sequence>
    </AbsoluteFill>
    </IdiomaContexto.Provider>
  );
};
