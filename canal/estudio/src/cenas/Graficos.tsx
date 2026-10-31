// Cenas gráficas: texto de impacto, data, lista, citação, versus, radar, contador,
// corte da plataforma continental, linha do tempo e tela final.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CONTORNO_PRETO, COR, FONTE_TEXTO, FONTE_TITULO } from "../estilo";
import { Bandeira, Lagosta } from "../icones";
import type { Cena } from "../tipos";
import type { PropsCena } from "./tipos-cena";

type P<T extends Cena["tipo"]> = PropsCena<Extract<Cena, { tipo: T }>>;

const Fundo: React.FC<{ children?: React.ReactNode; cor?: string }> = ({ children, cor = "#132a40" }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${cor} 0%, ${COR.fundo} 70%)` }}>{children}</AbsoluteFill>
);

export const Texto: React.FC<P<"texto">> = ({ cena, offset, pasta }) => {
  const f = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const passo = 7;
  const tremor = cena.tremer && f > cena.linhas.length * passo ? (random(`t${f}`) - 0.5) * 10 : 0;
  return (
    <Fundo>
      {cena.img && (
        <Img src={staticFile(`${pasta}/imagens/${cena.img}.jpg`)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) brightness(.3) blur(2px)", transform: `scale(${1.1 + f / 900})` }} />
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translate(${tremor}px, ${tremor * 0.6}px)` }}>
        {cena.linhas.map((l, i) => {
          const s = spring({ frame: f - i * passo, fps, config: { damping: 12, stiffness: 180 } });
          const ultima = i === cena.linhas.length - 1;
          // Ajusta o tamanho para a linha caber na largura da tela.
          const tamanho = Math.min(ultima ? 200 : 130, 1750 / (l.length * 0.47));
          return (
            <div key={i} style={{ fontFamily: FONTE_TITULO, fontSize: tamanho, lineHeight: 1.02, color: ultima ? cena.cor ?? COR.amarelo : COR.texto, textTransform: "uppercase", textShadow: CONTORNO_PRETO, transform: `scale(${interpolate(s, [0, 1], [2.2, 1])})`, opacity: s }}>
              {l}
            </div>
          );
        })}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Data: React.FC<P<"data">> = ({ cena, offset }) => {
  const f = useCurrentFrame() + offset;
  const letras = Math.floor(interpolate(f, [0, 22], [0, cena.texto.length], { extrapolateRight: "clamp" }));
  const linha = interpolate(f, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <Fundo cor="#2a1414">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 190, color: COR.texto, letterSpacing: 6, textShadow: CONTORNO_PRETO }}>
          {cena.texto.slice(0, letras)}
          <span style={{ opacity: f % 16 < 8 ? 1 : 0, color: COR.vermelho }}>|</span>
        </div>
        <div style={{ width: 900 * linha, height: 12, background: COR.vermelho, marginTop: 10 }} />
        {cena.sub && <div style={{ marginTop: 34, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 52, color: COR.amarelo, textTransform: "uppercase", opacity: linha }}>{cena.sub}</div>}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Lista: React.FC<P<"lista">> = ({ cena, offset }) => {
  const f = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  return (
    <Fundo>
      <AbsoluteFill style={{ padding: "150px 220px", justifyContent: "center" }}>
        {cena.titulo && <div style={{ fontFamily: FONTE_TITULO, fontSize: 96, color: COR.amarelo, marginBottom: 40, textTransform: "uppercase", textShadow: CONTORNO_PRETO }}>{cena.titulo}</div>}
        {cena.itens.map((it, i) => {
          const s = spring({ frame: f - (it.aos ?? i * 20), fps, config: { damping: 14 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 36, marginBottom: 30, opacity: s, transform: `translateX(${(1 - s) * -120}px)` }}>
              <div style={{ width: 84, height: 84, background: cena.marca === "x" ? COR.vermelho : COR.amarelo, color: cena.marca === "x" ? "#fff" : "#000", fontFamily: FONTE_TITULO, fontSize: 64, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})` }}>
                {cena.marca === "x" ? "✕" : i + 1}
              </div>
              <div style={{ fontFamily: FONTE_TITULO, fontSize: 92, color: COR.texto, textTransform: "uppercase", textShadow: CONTORNO_PRETO }}>{it.texto}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Citacao: React.FC<P<"citacao">> = ({ cena, offset, duracaoCena, pasta }) => {
  const f = useCurrentFrame() + offset;
  const palavras = cena.texto.split(" ");
  const n = interpolate(f, [4, Math.max(8, duracaoCena * 0.7)], [0, palavras.length], { extrapolateRight: "clamp" });
  return (
    <Fundo cor="#1d1a10">
      {cena.img && (
        <Img src={staticFile(`${pasta}/imagens/${cena.img}.jpg`)} style={{ position: "absolute", right: 0, top: 0, height: "100%", width: 760, objectFit: "cover", filter: "grayscale(1) brightness(.55)", maskImage: "linear-gradient(to left, #000 50%, transparent)", WebkitMaskImage: "linear-gradient(to left, #000 50%, transparent)" }} />
      )}
      <div style={{ position: "absolute", left: 150, top: 120, fontFamily: FONTE_TITULO, fontSize: 300, color: COR.amarelo, lineHeight: 1 }}>“</div>
      <div style={{ position: "absolute", left: 160, top: 330, width: cena.img ? 1100 : 1600, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: cena.texto.length < 60 ? 120 : 80, lineHeight: 1.2, color: COR.texto, textTransform: cena.texto.length < 60 ? "uppercase" : undefined }}>
        {palavras.map((p, i) => (
          <span key={i} style={{ opacity: i < n ? 1 : 0.12 }}>
            {p}{" "}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 160, bottom: 140, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 44, color: "#000", background: COR.amarelo, padding: "6px 20px", textTransform: "uppercase" }}>{cena.autor}</div>
    </Fundo>
  );
};

const NOME: Record<string, string> = { BRA: "BRASIL", FRA: "FRANÇA", USA: "EUA" };
const CORPAIS: Record<string, string> = { BRA: COR.brasil, FRA: COR.franca, USA: "#b22234" };

export const Versus: React.FC<P<"versus">> = ({ cena, offset }) => {
  const f = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 15 } });
  const vs = spring({ frame: f - 10, fps, config: { damping: 8, stiffness: 200 } });
  const lado = (pais: string, esquerda: boolean) => (
    <div style={{ position: "absolute", top: 0, bottom: 0, width: 1100, [esquerda ? "left" : "right"]: -100 + (1 - s) * -600, background: `linear-gradient(${esquerda ? 90 : 270}deg, ${CORPAIS[pais]}cc, ${CORPAIS[pais]}33)`, clipPath: esquerda ? "polygon(0 0,100% 0,82% 100%,0 100%)" : "polygon(18% 0,100% 0,100% 100%,0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Bandeira pais={pais as "BRA"} largura={300} />
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 130, color: COR.texto, marginTop: 30, textShadow: CONTORNO_PRETO }}>{NOME[pais]}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: COR.fundo, overflow: "hidden" }}>
      {lado(cena.esquerda, true)}
      {lado(cena.direita, false)}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 260, color: COR.amarelo, textShadow: CONTORNO_PRETO, transform: `scale(${interpolate(vs, [0, 1], [3, 1])}) rotate(-6deg)`, opacity: vs }}>VS</div>
      </AbsoluteFill>
      {cena.titulo && <div style={{ position: "absolute", bottom: 80, width: "100%", textAlign: "center", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 50, color: COR.texto, textTransform: "uppercase", textShadow: CONTORNO_PRETO }}>{cena.titulo}</div>}
    </AbsoluteFill>
  );
};

export const Radar: React.FC<P<"radar">> = ({ cena, offset, duracaoCena }) => {
  const f = useCurrentFrame() + offset;
  const ang = (f * 6) % 360;
  const blip = interpolate(f, [duracaoCena * 0.35, duracaoCena * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const verde = "#3dff7a";
  return (
    <AbsoluteFill style={{ background: "#020a04", justifyContent: "center", alignItems: "center" }}>
      <svg width={900} height={900} viewBox="-450 -450 900 900">
        <defs>
          <radialGradient id="tela">
            <stop offset="0" stopColor="#0b3316" />
            <stop offset="1" stopColor="#020a04" />
          </radialGradient>
          <linearGradient id="varre" gradientTransform="rotate(90)">
            <stop offset="0" stopColor={verde} stopOpacity=".55" />
            <stop offset="1" stopColor={verde} stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle r={430} fill="url(#tela)" stroke={verde} strokeWidth={4} />
        {[110, 220, 330].map((r) => <circle key={r} r={r} fill="none" stroke={verde} strokeOpacity={0.3} strokeWidth={2} />)}
        <line x1={-430} x2={430} stroke={verde} strokeOpacity={0.3} />
        <line y1={-430} y2={430} stroke={verde} strokeOpacity={0.3} />
        <path d="M0 0 L430 0 A430 430 0 0 0 304 -304 Z" fill="url(#varre)" transform={`rotate(${ang})`} />
        {blip > 0 && (
          <g transform="translate(170 -190)" opacity={blip}>
            <circle r={14} fill={verde} />
            <circle r={14 + ((f % 20) / 20) * 50} fill="none" stroke={verde} strokeWidth={3} opacity={1 - (f % 20) / 20} />
          </g>
        )}
      </svg>
      {blip > 0 && (
        <div style={{ position: "absolute", top: 120, right: 200, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 60, color: verde, letterSpacing: 4, opacity: f % 20 < 14 ? 1 : 0.3 }}>
          {cena.rotulo ?? "CONTATO"}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Contador: React.FC<P<"contador">> = ({ cena, offset }) => {
  const f = useCurrentFrame() + offset;
  const v = Math.round(interpolate(f, [0, 24], [0, cena.ate], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  return (
    <Fundo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 330, color: COR.amarelo, lineHeight: 1, textShadow: CONTORNO_PRETO }}>
          {cena.prefixo}
          {v}
          <span style={{ fontSize: 160, color: COR.texto }}> {cena.unidade}</span>
        </div>
        {cena.sub && <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 56, color: COR.texto, textTransform: "uppercase", marginTop: 20 }}>{cena.sub}</div>}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Plataforma: React.FC<P<"plataforma">> = ({ cena, offset }) => {
  const f = useCurrentFrame() + offset;
  const brilho = interpolate(f, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulo = cena.lagostaPula ? Math.abs(Math.sin(f / 9)) * 140 : 0;
  const lx = cena.lagostaPula ? 980 + ((f * 4) % 500) : 760;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#0c2238 0%, #0a1c2f 100%)" }}>
      <svg width={1920} height={1080}>
        <rect y={0} width={1920} height={300} fill="#132f4c" />
        <rect y={300} width={1920} height={780} fill="#0a3a5c" />
        <path d="M0 300 L0 1080 L1920 1080 L1920 1000 L1350 1000 L1180 640 L300 600 L260 300 Z" fill="#3a2e22" />
        <path d="M0 300 L260 300 L300 600 L0 600 Z" fill="#2f5d2a" />
        <path d="M300 600 L1180 640 L1350 1000 L1920 1000" fill="none" stroke="#c9a66b" strokeWidth={6} />
        {cena.destaque === "plataforma" && <path d="M300 600 L1180 640 L1180 700 L300 660 Z" fill={COR.amarelo} opacity={0.75 * brilho} />}
        {cena.destaque === "mar" && <rect x={1180} y={300} width={740} height={700} fill={COR.franca} opacity={0.35 * brilho} />}
      </svg>
      <div style={{ position: "absolute", left: 560, top: 690, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 44, color: COR.amarelo, textTransform: "uppercase" }}>Plataforma continental</div>
      <div style={{ position: "absolute", left: 1450, top: 420, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 44, color: COR.texto, textTransform: "uppercase" }}>Mar aberto</div>
      <div style={{ position: "absolute", left: 40, top: 220, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 40, color: COR.texto, textTransform: "uppercase" }}>Costa</div>
      <div style={{ position: "absolute", left: lx, top: 500 - pulo }}>
        <Lagosta tamanho={130} />
      </div>
      {cena.bandeira && (
        <div style={{ position: "absolute", right: 80, top: 130, opacity: brilho, transform: `scale(${0.6 + brilho * 0.4})` }}>
          <Bandeira pais={cena.bandeira} largura={220} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const LinhaTempo: React.FC<P<"linhaTempo">> = ({ cena, offset, duracaoCena }) => {
  const f = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const n = cena.itens.length;
  const passo = (duracaoCena * 0.7) / n;
  const linha = interpolate(f, [0, duracaoCena * 0.75], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Fundo>
      <div style={{ position: "absolute", left: 160, right: 160, top: 560, height: 8, background: COR.borda }} />
      <div style={{ position: "absolute", left: 160, top: 560, height: 8, width: 1600 * linha, background: COR.amarelo }} />
      {cena.itens.map((it, i) => {
        const s = spring({ frame: f - i * passo, fps, config: { damping: 13 } });
        const x = 160 + (1600 / (n - 1 || 1)) * i;
        return (
          <div key={i} style={{ position: "absolute", left: x - 220, width: 440, top: i % 2 ? 610 : 230, textAlign: "center", opacity: s, transform: `translateY(${(1 - s) * (i % 2 ? 60 : -60)}px)` }}>
            <div style={{ fontFamily: FONTE_TITULO, fontSize: 84, color: COR.amarelo, textShadow: CONTORNO_PRETO }}>{it.data}</div>
            <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 42, color: COR.texto, textTransform: "uppercase" }}>{it.texto}</div>
            <div style={{ position: "absolute", left: 200, top: i % 2 ? -64 : 300, width: 40, height: 40, borderRadius: 20, background: COR.amarelo, border: "6px solid #000" }} />
          </div>
        );
      })}
    </Fundo>
  );
};

export const Final: React.FC<P<"final">> = ({ offset }) => {
  const f = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 12 } });
  const botao = spring({ frame: f - 40, fps, config: { damping: 9 } });
  return (
    <Fundo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 30 }}>
        <div style={{ transform: `scale(${s})` }}>
          <LogoCanal tamanho={300} />
        </div>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 140, color: COR.texto, textShadow: CONTORNO_PRETO, opacity: s }}>POR TRÁS DO MAPA</div>
        <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 60, color: "#fff", background: COR.vermelho, padding: "12px 48px", borderRadius: 12, transform: `scale(${botao})` }}>INSCREVA-SE</div>
      </AbsoluteFill>
    </Fundo>
  );
};

// Logo: alfinete de mapa com uma lupa vazada, sobre um globo com meridianos.
export const LogoCanal: React.FC<{ tamanho?: number }> = ({ tamanho = 200 }) => (
  <svg width={tamanho} height={tamanho} viewBox="-100 -100 200 200">
    <circle r={92} fill={COR.fundo} stroke={COR.amarelo} strokeWidth={8} />
    <g stroke="#2d4257" strokeWidth={3} fill="none">
      <ellipse rx={40} ry={88} />
      <ellipse rx={75} ry={88} />
      <line x1={-88} x2={88} />
      <path d="M-80 -40 Q0 -55 80 -40" />
      <path d="M-80 40 Q0 55 80 40" />
    </g>
    <path d="M0 70 C -30 30, -48 10, -48 -14 A48 48 0 0 1 48 -14 C 48 10, 30 30, 0 70 Z" fill={COR.amarelo} stroke="#000" strokeWidth={5} />
    <circle cy={-16} r={22} fill={COR.fundo} />
    <circle cy={-16} r={11} fill={COR.vermelho} />
  </svg>
);
