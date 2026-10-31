// Elementos que ficam presos a um ponto do mapa: balão de fala, retrato redondo, ícone em hexágono,
// bandeirinha, foto em moldura e rótulo. Todos entram com um "pop" e somem se tiverem "ateAos".
import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTE_TEXTO, FONTE_TITULO } from "../estilo";
import { Aviao, Bandeira, Lagosta, Navio } from "../icones";
import type { Ator, Icone, Pais } from "../tipos";

type Props = { ator: Ator; x: number; y: number; frame: number; pasta: string };

function entrada(frame: number, fps: number, aos = 0, ateAos?: number) {
  const s = spring({ frame: frame - aos, fps, config: { damping: 11, stiffness: 190 } });
  const sai = ateAos === undefined ? 1 : interpolate(frame, [ateAos, ateAos + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(s, sai);
}

export const AtorNoMapa: React.FC<Props> = ({ ator, x, y, frame, pasta }) => {
  const { fps } = useVideoConfig();
  const s = entrada(frame, fps, ator.aos, ator.ateAos);
  if (s <= 0.01) return null;
  const base: React.CSSProperties = { position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: Math.min(1, s * 1.5) };

  if (ator.tipo === "retrato")
    return (
      <div style={base}>
        <div style={{ width: 230, height: 230, borderRadius: 115, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 10px 30px rgba(0,0,0,.6)", background: "#222" }}>
          <Img src={staticFile(`${pasta}/imagens/${ator.img}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", filter: "grayscale(.2) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", left: "50%", top: 206, transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#fff", color: "#000", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 32, letterSpacing: 1, padding: "3px 18px", textTransform: "uppercase", boxShadow: "0 4px 10px rgba(0,0,0,.5)" }}>
          {ator.nome}
        </div>
      </div>
    );

  if (ator.tipo === "fala") {
    // Texto "digitado" logo depois do balão aparecer.
    const letras = Math.floor(interpolate(frame - (ator.aos ?? 0), [3, 3 + ator.texto.length * 0.9], [0, ator.texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    const dx = ator.dx ?? 40;
    const dy = ator.dy ?? -90;
    return (
      <div style={{ ...base, transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: "0% 100%" }}>
        <div style={{ position: "relative", background: "#fff", color: "#000", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 46, lineHeight: 1.1, padding: "14px 24px", borderRadius: 18, maxWidth: 620, minWidth: 60, textTransform: "uppercase", boxShadow: "0 8px 20px rgba(0,0,0,.5)" }}>
          {ator.texto.slice(0, letras) || " "}
          <div style={{ position: "absolute", left: 16, bottom: -18, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "22px solid #fff" }} />
        </div>
      </div>
    );
  }

  if (ator.tipo === "icone")
    return (
      <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Hexagono icone={ator.icone} cor={ator.cor} tamanho={150} />
        {ator.rotulo && (
          <div style={{ marginTop: 6, fontFamily: FONTE_TITULO, fontSize: 44, color: "#fff", textTransform: "uppercase", textAlign: "center", whiteSpace: "pre", textShadow: "0 0 3px #000, 0 3px 0 #000, 0 0 14px rgba(0,0,0,.8)" }}>
            {ator.rotulo}
          </div>
        )}
      </div>
    );

  if (ator.tipo === "bandeira")
    return (
      <div style={{ ...base, border: "3px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,.6)", lineHeight: 0 }}>
        <Bandeira pais={ator.pais} largura={110} />
      </div>
    );

  if (ator.tipo === "foto")
    return (
      <div style={{ ...base, background: "#fff", padding: "10px 10px 46px", boxShadow: "0 14px 34px rgba(0,0,0,.65)", transform: `${base.transform} rotate(-3deg)` }}>
        <Img src={staticFile(`${pasta}/imagens/${ator.img}.jpg`)} style={{ width: 600, height: 400, objectFit: "cover", filter: "grayscale(1) contrast(1.15)" }} />
        {ator.rotulo && <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, textAlign: "center", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 26, color: "#111", textTransform: "uppercase" }}>{ator.rotulo}</div>}
      </div>
    );

  if (ator.tipo === "unidade")
    return (
      <div style={base}>
        {ator.forma === "navio" ? <NavioComBandeira pais={ator.pais} /> : <Ficha pais={ator.pais} />}
      </div>
    );

  if (ator.tipo === "reacao")
    return (
      <div style={{ ...base, transform: `translate(${ator.dx ?? 50}px, ${ator.dy ?? -80}px) scale(${s})`, transformOrigin: "0% 100%" }}>
        <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "6px 14px", fontSize: 54, lineHeight: 1.1, fontFamily: "Noto Color Emoji", boxShadow: "0 8px 20px rgba(0,0,0,.5)" }}>
          {ator.emoji}
          <div style={{ position: "absolute", left: 14, bottom: -16, width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "18px solid #fff" }} />
        </div>
      </div>
    );

  if (ator.tipo === "lupa") {
    const r = ator.raio ?? 170;
    return (
      <div style={{ ...base, width: r * 2, height: r * 2 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "8px solid rgba(255,255,255,.9)", boxShadow: "0 0 0 3px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.6)" }}>
          <Img src={staticFile(`${pasta}/imagens/${ator.img}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.05 + 0.1 * interpolate(frame - (ator.aos ?? 0), [0, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }} />
        </div>
        {ator.rotulo && <div style={{ position: "absolute", left: "50%", top: r * 2 - 10, transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: FONTE_TITULO, fontSize: 40, color: "#fff", textShadow: "0 0 3px #000, 0 3px 0 #000" }}>{ator.rotulo}</div>}
      </div>
    );
  }

  return (
    <div style={{ ...base, whiteSpace: "nowrap", fontFamily: FONTE_TITULO, fontSize: 54, color: ator.cor ?? "#fff", textTransform: "uppercase", textShadow: "0 0 3px #000, 0 3px 0 #000, 0 0 16px rgba(0,0,0,.9)" }}>
      {ator.texto}
    </div>
  );
};

// Ficha militar: hexágono branco com a bandeira dentro (como as tropas nos vídeos de mapa).
export const Ficha: React.FC<{ pais: Pais; tamanho?: number }> = ({ pais, tamanho = 120 }) => {
  const id = `ficha-${pais}`;
  return (
    <svg width={tamanho} height={tamanho} viewBox="-50 -50 100 100" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,.6))", overflow: "visible" }}>
      <defs>
        <clipPath id={id}>
          <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" />
        </clipPath>
      </defs>
      <polygon points="0,-48 42,-24 42,24 0,48 -42,24 -42,-24" fill="#fff" />
      <g clipPath={`url(#${id})`}>
        <Bandeira pais={pais} largura={90} altura={80} esticar x={-45} y={-40} />
      </g>
    </svg>
  );
};

// Navio de guerra visto de lado com uma bandeirinha redonda em cima (quem é quem no mar).
export const NavioComBandeira: React.FC<{ pais: Pais; tamanho?: number }> = ({ pais, tamanho = 150 }) => (
  <div style={{ position: "relative", width: tamanho, height: tamanho * 0.78 }}>
    <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: tamanho * 0.42, height: tamanho * 0.42, borderRadius: "50%", overflow: "hidden", border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.6)", lineHeight: 0 }}>
      <Bandeira pais={pais} largura={tamanho * 0.42} altura={tamanho * 0.42} esticar />
    </div>
    <div style={{ position: "absolute", bottom: 0, left: 0, filter: "drop-shadow(0 3px 4px rgba(0,0,0,.7))" }}>
      <Navio tamanho={tamanho} cor="#4a5560" />
    </div>
  </div>
);

// Ícone dentro de um hexágono branco (como os "selos" dos vídeos de mapa).
export const Hexagono: React.FC<{ icone: Icone; cor?: string; tamanho?: number }> = ({ icone, cor = "#1d3557", tamanho = 120 }) => (
  <div style={{ position: "relative", width: tamanho, height: tamanho }}>
    <svg width={tamanho} height={tamanho} viewBox="-50 -50 100 100" style={{ position: "absolute", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))" }}>
      <polygon points="0,-48 42,-24 42,24 0,48 -42,24 -42,-24" fill="#fff" stroke={cor} strokeWidth={5} />
      <g transform="scale(.62)">
        <Glifo icone={icone} cor={cor} />
      </g>
    </svg>
    {(icone === "navio" || icone === "aviao" || icone === "lagosta") && (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icone === "navio" && <Navio tamanho={tamanho * 0.62} cor={cor} />}
        {icone === "aviao" && <Aviao tamanho={tamanho * 0.55} cor={cor} />}
        {icone === "lagosta" && <Lagosta tamanho={tamanho * 0.62} />}
      </div>
    )}
  </div>
);

const Glifo: React.FC<{ icone: Icone; cor: string }> = ({ icone, cor }) => {
  switch (icone) {
    case "documento":
      return (
        <g>
          <path d="M-26 -38 H14 L28 -24 V38 H-26 Z" fill="#f4e4bc" stroke={cor} strokeWidth={5} />
          {[-16, -4, 8, 20].map((y) => <line key={y} x1={-16} x2={18} y1={y} y2={y} stroke={cor} strokeWidth={4} />)}
        </g>
      );
    case "ancora":
      return (
        <g fill="none" stroke={cor} strokeWidth={7} strokeLinecap="round">
          <circle cy={-30} r={8} />
          <line y1={-22} y2={34} />
          <line x1={-18} x2={18} y1={-10} y2={-10} />
          <path d="M-32 12 Q-28 36 0 36 Q28 36 32 12" />
        </g>
      );
    case "explosao":
      return <polygon points="0,-44 10,-16 40,-26 20,-2 44,16 14,16 12,44 -6,20 -32,38 -22,8 -44,-6 -16,-14 -24,-40" fill="#f77f00" stroke="#d62828" strokeWidth={5} />;
    case "alerta":
      return (
        <g>
          <polygon points="0,-40 40,34 -40,34" fill="#ffd400" stroke={cor} strokeWidth={5} />
          <line y1={-14} y2={12} stroke="#000" strokeWidth={8} strokeLinecap="round" />
          <circle cy={24} r={5} fill="#000" />
        </g>
      );
    case "interrogacao":
      return <text y={30} textAnchor="middle" fontSize={90} fontFamily={FONTE_TITULO} fill={cor}>?</text>;
    case "acordo":
      return (
        <g fill="none" stroke={cor} strokeWidth={7} strokeLinecap="round">
          <path d="M-40 0 L-16 -16 L4 -4 L-8 8" />
          <path d="M40 0 L16 -16 L-4 -10" />
          <path d="M-22 14 L-4 28 L18 12" />
        </g>
      );
    case "radar":
      return (
        <g fill="none" stroke="#1fa45b" strokeWidth={5}>
          <circle r={36} />
          <circle r={20} />
          <line x2={30} y2={-20} strokeWidth={6} />
          <circle cx={14} cy={10} r={5} fill="#1fa45b" />
        </g>
      );
    case "tropa":
      return (
        <g fill={cor}>
          <circle cy={-28} r={11} />
          <path d="M-18 -12 H18 L22 26 H8 L4 42 H-4 L-8 26 H-22 Z" />
          <rect x={14} y={-34} width={5} height={44} />
        </g>
      );
    case "dinheiro":
      return <text y={30} textAnchor="middle" fontSize={84} fontFamily={FONTE_TITULO} fill="#1fa45b">$</text>;
    default:
      return null;
  }
};

export const AnoNoTopo: React.FC<{ ano: string }> = ({ ano }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: 40, width: "100%", textAlign: "center", fontFamily: FONTE_TITULO, fontSize: 130, color: "#fff", transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, opacity: s, textShadow: "0 0 4px #000, 0 6px 0 rgba(0,0,0,.7), 0 0 30px rgba(0,0,0,.8)" }}>
      {ano}
    </div>
  );
};

