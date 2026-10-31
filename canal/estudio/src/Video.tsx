import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Loop, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Foto } from "./cenas/Foto";
import { Citacao, Contador, Data, Final, LinhaTempo, Lista, LogoCanal, Plataforma, Radar, Texto, Versus } from "./cenas/Graficos";
import { Mapa } from "./cenas/Mapa";
import type { PropsCena } from "./cenas/tipos-cena";
import { CONTORNO_PRETO, COR, FONTE_TEXTO, FONTE_TITULO } from "./estilo";
import type { TCena, Timeline } from "./tipos";

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

// Entrada de cada corte: um "soco" de zoom + desfoque rápido nos primeiros frames.
const Corte: React.FC<{ c: TCena; pasta: string }> = ({ c, pasta }) => {
  const f = useCurrentFrame();
  const C = COMPONENTES[c.cena.tipo];
  const forte = c.corte ? 1 : 0.5;
  const escala = interpolate(f, [0, 6], [1 + 0.1 * forte, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const blur = interpolate(f, [0, 5], [10 * forte, 0], { extrapolateRight: "clamp" });
  const branco = c.corte ? interpolate(f, [0, 3], [0.35, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ transform: `scale(${escala})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      <C cena={c.cena} parte={c.parte} partes={c.partes} duracao={c.duracao} offset={c.offset} duracaoCena={c.duracaoCena} pasta={pasta} />
      {branco > 0 && <AbsoluteFill style={{ background: "#fff", opacity: branco }} />}
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

// Granulado de filme (texturas prontas, bem mais leve que gerar ruído por frame) + vinheta + marca d'água.
const Acabamento: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img src={staticFile(`texturas/grao-${f % 6}.png`)} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.06, mixBlendMode: "overlay", imageRendering: "pixelated" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%)" }} />
      <div style={{ position: "absolute", right: 40, top: 34, opacity: 0.55, display: "flex", alignItems: "center", gap: 12 }}>
        <LogoCanal tamanho={54} />
        <span style={{ fontFamily: FONTE_TITULO, fontSize: 30, color: COR.texto, letterSpacing: 1 }}>POR TRÁS DO MAPA</span>
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
  return (
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
      {timeline.capitulos.map((c) => (
        <Sequence key={`c${c.numero}`} from={c.inicio} durationInFrames={90}>
          <Capitulo numero={c.numero} titulo={c.titulo} />
        </Sequence>
      ))}
      <Acabamento />

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
      <Loop durationInFrames={fps * 90}>
        <Audio
          src={staticFile("sons/trilha-tensao.mp3")}
          volume={(f) => 0.13 * interpolate(f, [0, fps * 2], [0, 1], { extrapolateRight: "clamp" })}
        />
      </Loop>
      <Sequence from={duracao - fps} layout="none">
        <Escurecer duracao={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};
