// Componentes de motion reutilizáveis. Tudo entra e sai animado (spring/easing, nada linear).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import T from './timeline.json';

export const C = T.cores;
const FONTE = 'Poppins, sans-serif';
const OUT = {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const IN_OUT = {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

// Entrada com spring e saída suave nos últimos frames. Retorna {s: escala 0..1+, o: opacidade}.
export const useEntradaSaida = (ini, fim, {damping = 13, saida = 6} = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - ini, fps, config: {damping, stiffness: 170, mass: 0.8}});
  const sai = fim == null ? 1 : interpolate(frame, [fim - saida, fim], [1, 0], IN_OUT);
  return {s, o: Math.min(1, s * 1.4) * sai, sai, ativo: frame >= ini && (fim == null || frame < fim)};
};

// Contorno de texto: traço por baixo do preenchimento + sombra suave.
export const contorno = (px, cor = C.texto) => ({
  WebkitTextStroke: `${px}px ${cor}`,
  paintOrder: 'stroke fill',
  textShadow: '0 6px 18px rgba(0,0,0,0.35)',
});

const COR = {branco: '#FFFFFF', verde: '#8CE99A', vermelho: '#FF6B6B', amarelo: C.amarelo};

// ---------------------------------------------------------------- legenda palavra por palavra
export const Legenda = ({blocos, y}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const b = blocos.find((x) => frame >= x.ini && frame < x.fim);
  if (!b) return null;
  const ent = spring({frame: frame - b.ini, fps, config: {damping: 14, stiffness: 200}});
  const sai = interpolate(frame, [b.fim - 4, b.fim], [1, 0], IN_OUT);
  const todas = b.linhas.flat();
  const ativa = [...todas].reverse().find((w) => frame >= w.ini);
  return (
    <div style={{position: 'absolute', left: 0, width, top: y, transform: `translateY(-50%) scale(${(0.86 + 0.14 * ent) * (0.96 + 0.04 * sai)})`,
      opacity: Math.min(1, ent * 1.5) * sai, textAlign: 'center', fontFamily: FONTE, fontWeight: 800, fontSize: 80, lineHeight: 1.08,
      letterSpacing: -0.5}}>
      {b.linhas.map((lin, i) => (
        <div key={i}>
          {lin.map((w, j) => {
            const eAtiva = w === ativa;
            const pulo = eAtiva ? spring({frame: frame - w.ini, fps, config: {damping: 12, stiffness: 260}}) : 0;
            return (
              <span key={j} style={{display: 'inline-block', margin: '0 12px', color: eAtiva ? C.amarelo : COR[w.cor] || '#fff',
                transform: `scale(${1 + 0.12 * pulo})`, ...contorno(9)}}>{w.t}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- emoji pontual
export const Emoji = ({emoji, ini, x, y}) => {
  const {s, o} = useEntradaSaida(ini, ini + 36, {damping: 9});
  const frame = useCurrentFrame();
  if (frame < ini || frame > ini + 36) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, fontSize: 96, opacity: o,
      transform: `translate(-50%,-50%) scale(${s}) rotate(${interpolate(s, [0, 1], [-30, 8])}deg)`,
      filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.35))'}}>{emoji}</div>
  );
};

// ---------------------------------------------------------------- sticker kraft com borda serrilhada
const serrilhado = (dentes = 22, prof = 2.2) => {
  const pts = [];
  for (let i = 0; i <= dentes; i++) pts.push(`${(i / dentes) * 100}% ${i % 2 ? prof : 0}%`);
  for (let i = dentes; i >= 0; i--) pts.push(`${(i / dentes) * 100}% ${i % 2 ? 100 - prof : 100}%`);
  return `polygon(${pts.join(',')})`;
};

export const TituloHook = ({linhas, ini, fim, y}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const ent = spring({frame: frame - ini, fps, config: {damping: 12, stiffness: 150}});
  const sai = interpolate(frame, [fim - 7, fim], [1, 0], IN_OUT);
  if (frame > fim) return null;
  const blur = interpolate(ent, [0, 1], [18, 0]);
  const treme = Math.sin(frame * 2.3) * 6 * Math.max(0, 1 - frame / 14);
  return (
    <div style={{position: 'absolute', left: width / 2 + treme, top: y, opacity: Math.min(1, ent * 1.6) * sai,
      transform: `translate(-50%,-50%) rotate(-3deg) scale(${interpolate(ent, [0, 1], [1.45, 1]) * (0.85 + 0.15 * sai)})`,
      filter: `blur(${blur}px)`}}>
      <div style={{background: C.kraft_claro, clipPath: serrilhado(), padding: '34px 46px', boxShadow: '0 12px 30px rgba(0,0,0,.3)'}}>
        {linhas.map((l, i) => (
          <div key={i} style={{fontFamily: FONTE, fontWeight: 900, fontSize: i ? 86 : 70, lineHeight: 1.05, color: i ? C.amarelo : '#fff',
            textAlign: 'center', whiteSpace: 'nowrap', ...contorno(10)}}>{l}</div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- traços desenhados à mão (SVG)
const Traco = ({d, cor, largura, ini, dur = 12, fim, comprimento = 2600}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [ini, ini + dur], [0, 1], OUT);
  const sai = fim == null ? 1 : interpolate(frame, [fim - 6, fim], [1, 0], IN_OUT);
  return <path d={d} fill="none" stroke={cor} strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={comprimento} strokeDashoffset={comprimento * (1 - p)} opacity={sai} />;
};

export const CirculoMao = ({cx, cy, rx, ry, ini, fim}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (frame < ini || frame > fim) return null;
  // elipse levemente irregular, com a ponta passando do início (cara de caneta)
  const pts = [];
  for (let a = -0.3; a <= Math.PI * 2 + 0.35; a += 0.12) {
    const w = 1 + 0.05 * Math.sin(a * 3);
    pts.push(`${cx + Math.cos(a) * rx * w},${cy + Math.sin(a) * ry * w * (1 + 0.04 * a)}`);
  }
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <Traco d={`M${pts.join(' L')}`} cor={C.amarelo} largura={12} ini={ini} dur={14} fim={fim} comprimento={3000} />
    </svg>
  );
};

export const Proibido = ({cx, cy, r, ini, fim}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (frame < ini || frame > fim) return null;
  const a = Math.PI / 4;
  const circ = `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r}`;
  const barra = `M${cx - Math.cos(a) * r},${cy - Math.sin(a) * r} L${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.35))'}}>
      <Traco d={circ} cor={C.vermelho} largura={24} ini={ini} dur={10} fim={fim} comprimento={2 * Math.PI * r + 10} />
      <Traco d={barra} cor={C.vermelho} largura={24} ini={ini + 8} dur={6} fim={fim} comprimento={2 * r + 10} />
    </svg>
  );
};

// ---------------------------------------------------------------- selo com check desenhado
export const Selo = ({texto, ini, fim, y, x, tamanho = 44}) => {
  const {s, o} = useEntradaSaida(ini, fim);
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  if (frame < ini || (fim != null && frame > fim)) return null;
  const h = tamanho * 1.9;
  const p = interpolate(frame, [ini + 5, ini + 14], [0, 1], OUT);
  return (
    <div style={{position: 'absolute', left: x ?? width / 2, top: y, opacity: o,
      transform: `translate(-50%,-50%) translateX(${(1 - s) * -70}px) scale(${0.6 + 0.4 * s})`,
      display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: h, padding: `0 34px 0 14px`, height: h,
      boxShadow: '0 10px 24px rgba(0,0,0,.25)', whiteSpace: 'nowrap'}}>
      <svg width={h * 0.72} height={h * 0.72} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="19" fill={C.verde} />
        <path d="M11 21 L17.5 27.5 L29.5 14" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="30" strokeDashoffset={30 * (1 - p)} />
      </svg>
      <span style={{fontFamily: FONTE, fontWeight: 700, fontSize: tamanho, color: C.texto}}>{texto}</span>
    </div>
  );
};

// ---------------------------------------------------------------- preço com pop, brilho e shake
export const Preco = ({texto, ini, fim, y, tamanho = 170}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  if (frame < ini || frame > fim) return null;
  const s = spring({frame: frame - ini, fps, config: {damping: 8, stiffness: 180, mass: 0.9}}); // 0 -> 1,1 -> 1
  const sai = interpolate(frame, [fim - 5, fim], [1, 0], IN_OUT);
  const brilho = 22 + 14 * Math.sin((frame - ini) / 5);
  const treme = frame - ini < 8 ? Math.sin(frame * 3.1) * 7 * (1 - (frame - ini) / 8) : 0;
  return (
    <div style={{position: 'absolute', left: width / 2 + treme, top: y, transform: `translate(-50%,-50%) scale(${s * (0.9 + 0.1 * sai)})`,
      opacity: sai, fontFamily: FONTE, fontWeight: 900, fontSize: tamanho, color: '#fff', whiteSpace: 'nowrap',
      WebkitTextStroke: `11px ${C.texto}`, paintOrder: 'stroke fill',
      textShadow: `0 0 ${brilho}px ${C.amarelo}, 0 0 ${brilho * 2}px rgba(250,176,5,.7), 0 8px 18px rgba(0,0,0,.4)`}}>{texto}</div>
  );
};

// ---------------------------------------------------------------- CTA: botão + seta desenhada
export const BotaoCTA = ({texto, ini, fim, y, tamanho = 50, congela, setaDx = 330, setaDy = -150}) => {
  const {s, o} = useEntradaSaida(ini, fim, {damping: 10});
  const frame = Math.min(useCurrentFrame(), congela ?? Infinity); // congela = segura a tela no fim
  const {width} = useVideoConfig();
  if (frame < ini || (fim != null && frame > fim)) return null;
  const pulso = 1 + 0.035 * Math.sin((frame - ini) / 4);
  const brilho = 14 + 10 * Math.sin((frame - ini) / 4);
  return (
    <>
      <div style={{position: 'absolute', left: width / 2, top: y, opacity: o, transform: `translate(-50%,-50%) scale(${s * pulso})`,
        background: C.verde, color: '#fff', borderRadius: 999, padding: '26px 56px', fontFamily: FONTE, fontWeight: 800,
        fontSize: tamanho, whiteSpace: 'nowrap', boxShadow: `0 0 ${brilho}px rgba(35,122,53,.9), 0 10px 0 #185C26`}}>{texto}</div>
      <SetaMao x={width / 2 + setaDx} y={y + setaDy} ini={ini + 6} fim={fim} congela={congela} />
    </>
  );
};

export const SetaMao = ({x, y, ini, fim, congela}) => {
  const frame = Math.min(useCurrentFrame(), congela ?? Infinity);
  const {width, height} = useVideoConfig();
  if (frame < ini || (fim != null && frame > fim)) return null;
  const bob = Math.sin((frame - ini) / 5) * 8;
  const corpo = `M${x - 60},${y - 130} C${x + 40},${y - 110} ${x + 30},${y - 20} ${x},${y + 60}`;
  const ponta = `M${x - 46},${y + 22} L${x},${y + 64} L${x + 34},${y + 14}`;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, transform: `translateY(${bob}px)`,
      filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))'}}>
      <Traco d={corpo} cor={C.amarelo} largura={16} ini={ini} dur={9} fim={fim} comprimento={320} />
      <Traco d={ponta} cor={C.amarelo} largura={16} ini={ini + 8} dur={5} fim={fim} comprimento={150} />
    </svg>
  );
};

// ---------------------------------------------------------------- barra de progresso e textura
export const Progresso = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, width} = useVideoConfig();
  return <div style={{position: 'absolute', left: 0, top: 0, height: 10, width: (width * frame) / (durationInFrames - 1),
    background: C.verde, boxShadow: '0 0 8px rgba(35,122,53,.8)'}} />;
};

export const TexturaKraft = ({opacidade = 0.05}) => (
  <AbsoluteFill style={{opacity: opacidade, mixBlendMode: 'multiply', pointerEvents: 'none'}}>
    <Img src={staticFile('textura-kraft.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

export const Aviso = ({texto, y}) => {
  const {width} = useVideoConfig();
  return <div style={{position: 'absolute', right: 34, top: y, fontFamily: FONTE, fontWeight: 600, fontSize: 26, color: '#fff',
    opacity: 0.85, textShadow: '0 2px 6px rgba(0,0,0,.8)'}}>{texto}</div>;
};
