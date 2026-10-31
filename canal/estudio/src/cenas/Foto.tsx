import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_TEXTO, FONTE_TITULO } from "../estilo";
import type { Cena } from "../tipos";
import type { PropsCena } from "./tipos-cena";

// Caminho padrão do movimento quando o storyboard não define focos.
const FOCOS: [number, number][] = [
  [0.4, 0.45],
  [0.6, 0.55],
];

export const Foto: React.FC<PropsCena<Extract<Cena, { tipo: "foto" }>>> = ({ cena, duracao, pasta }) => {
  const f = useCurrentFrame();
  const src = staticFile(`${pasta}/imagens/${cena.img}.jpg`);
  const filtro = `${cena.pb ? "grayscale(1) " : ""}contrast(1.12) saturate(1.05)${cena.efeito === "noite" ? " brightness(.45) hue-rotate(190deg)" : ""}`;

  if (cena.modo === "retrato") {
    const entra = interpolate(f, [0, 10], [80, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const zoom = interpolate(f, [0, duracao], [1.02, 1.1]);
    return (
      <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
        <Img src={src} style={{ position: "absolute", inset: -60, width: "calc(100% + 120px)", height: "calc(100% + 120px)", objectFit: "cover", filter: `blur(28px) brightness(.35) ${filtro}` }} />
        <div style={{ position: "absolute", left: 180, top: 120, width: 600, height: 840, overflow: "hidden", border: `6px solid ${COR.amarelo}`, boxShadow: "0 30px 80px rgba(0,0,0,.6)", transform: `translateX(${-entra}px) rotate(-2deg)` }}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 25%", transform: `scale(${zoom})`, filter: filtro }} />
        </div>
        <div style={{ position: "absolute", left: 880, top: 380, right: 120, transform: `translateX(${entra}px)`, opacity: interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ fontFamily: FONTE_TITULO, fontSize: 120, lineHeight: 1, color: COR.texto, textTransform: "uppercase" }}>{cena.nome}</div>
          {cena.cargo && (
            <div style={{ marginTop: 24, display: "inline-block", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 40, color: "#000", background: COR.amarelo, padding: "6px 18px", textTransform: "uppercase" }}>
              {cena.cargo}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // Movimento contínuo (Ken Burns): aproxima devagar e passeia do primeiro foco para o segundo.
  const focos = cena.focos ?? FOCOS;
  const p = interpolate(f, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const [ax, ay] = focos[0];
  const [bx, by] = focos[1] ?? focos[0];
  const fx = ax + (bx - ax) * p;
  const fy = ay + (by - ay) * p;
  const zoom = 1.04 + 0.14 * p;
  const flash = cena.efeito === "flash" ? interpolate(f, [duracao * 0.3, duracao * 0.36, duracao * 0.6], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `scale(${zoom})`, filter: filtro }} />
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, rgba(255,250,220,${flash}) 0%, rgba(255,250,220,${flash * 0.5}) 35%, transparent 70%)` }} />}
      {cena.rotulo && <Rotulo texto={cena.rotulo} />}
    </AbsoluteFill>
  );
};

export const Rotulo: React.FC<{ texto: string }> = ({ texto }) => {
  const f = useCurrentFrame();
  const w = interpolate(f, [2, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 80, bottom: 90, display: "flex", alignItems: "stretch", overflow: "hidden", clipPath: `inset(0 ${100 - w * 100}% 0 0)` }}>
      <div style={{ width: 12, background: COR.amarelo }} />
      <div style={{ background: "rgba(7,17,28,.88)", color: COR.texto, fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 38, letterSpacing: 1, padding: "10px 22px", textTransform: "uppercase" }}>{texto}</div>
    </div>
  );
};
