// Identidade do canal: foto de perfil, banner e thumbnail (renderizados como imagens paradas).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LogoCanal } from "./cenas/Graficos";
import { CONTORNO_PRETO, COR, FONTE_TEXTO, FONTE_TITULO } from "./estilo";
import { Bandeira } from "./icones";

export const Avatar: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #173352 0%, ${COR.fundo} 75%)`, justifyContent: "center", alignItems: "center" }}>
    <LogoCanal tamanho={640} />
  </AbsoluteFill>
);

// Banner 2560x1440: o que aparece em todos os aparelhos é a faixa central de 1546x423.
export const Banner: React.FC = () => (
  <AbsoluteFill style={{ background: COR.fundo, overflow: "hidden" }}>
    <svg width={2560} height={1440} style={{ position: "absolute", opacity: 0.18 }}>
      {Array.from({ length: 40 }, (_, i) => (
        <line key={`v${i}`} x1={i * 70} y1={0} x2={i * 70} y2={1440} stroke="#4c7aa8" strokeWidth={1} />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 70} x2={2560} y2={i * 70} stroke="#4c7aa8" strokeWidth={1} />
      ))}
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(23,51,82,.9) 0%, transparent 60%)" }} />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 50 }}>
      <LogoCanal tamanho={250} />
      <div>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 148, color: COR.texto, lineHeight: 1, textShadow: CONTORNO_PRETO }}>POR TRÁS DO MAPA</div>
        <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 48, color: "#000", background: COR.amarelo, display: "inline-block", padding: "4px 22px", marginTop: 14, textTransform: "uppercase", letterSpacing: 2 }}>
          História e geopolítica explicadas
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// Thumbnail do vídeo 001.
export const ThumbLagosta: React.FC<{ pasta: string }> = ({ pasta }) => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <Img src={staticFile(`${pasta}/imagens/tartu-b17.jpg`)} style={{ position: "absolute", left: -40, top: 0, width: 900, height: 720, objectFit: "cover", objectPosition: "45% 60%", filter: "grayscale(1) contrast(1.3) brightness(.75)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.35) 45%, rgba(120,10,10,.55) 100%)" }} />
    <div style={{ position: "absolute", right: -70, top: 70, width: 600, height: 600, borderRadius: 300, overflow: "hidden", border: `14px solid ${COR.amarelo}`, boxShadow: "0 0 80px rgba(255,212,0,.6)" }}>
      <Img src={staticFile(`${pasta}/imagens/lagosta.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)", filter: "saturate(1.5) contrast(1.15)" }} />
    </div>
    <div style={{ position: "absolute", left: 40, top: 36, display: "flex", gap: 18, alignItems: "center" }}>
      <Bandeira pais="BRA" largura={120} />
      <span style={{ fontFamily: FONTE_TITULO, fontSize: 70, color: COR.texto, textShadow: CONTORNO_PRETO }}>VS</span>
      <Bandeira pais="FRA" largura={120} />
    </div>
    <div style={{ position: "absolute", left: 40, bottom: 40, lineHeight: 0.92 }}>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 190, color: COR.amarelo, WebkitTextStroke: "6px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>GUERRA</div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 150, color: COR.texto, WebkitTextStroke: "5px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>POR ISSO?!</div>
    </div>
    <svg width={1280} height={720} style={{ position: "absolute" }}>
      <path d="M560 470 Q 660 520 735 430" stroke="#000" strokeWidth={34} fill="none" strokeLinecap="round" />
      <path d="M560 470 Q 660 520 735 430" stroke={COR.vermelho} strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d="M705 395 L 770 400 L 745 462 Z" fill={COR.vermelho} stroke="#000" strokeWidth={6} />
    </svg>
  </AbsoluteFill>
);
