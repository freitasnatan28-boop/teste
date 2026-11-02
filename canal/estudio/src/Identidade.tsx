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

// ---------- Versão em inglês: Behind the Map (canal para o público dos EUA) ----------

// Logo com o nome no anel: alfinete de mapa sobre o globo, "BEHIND THE MAP" em cima e um mapa-múndi estilizado.
export const LogoEN: React.FC<{ tamanho?: number }> = ({ tamanho = 800 }) => (
  <svg width={tamanho} height={tamanho} viewBox="-400 -400 800 800">
    <defs>
      <path id="arco-topo" d="M -300 0 A 300 300 0 0 1 300 0" />
      <path id="arco-base" d="M -318 0 A 318 318 0 0 0 318 0" />
      <radialGradient id="globo" cx="40%" cy="35%">
        <stop offset="0" stopColor="#1d4a78" />
        <stop offset="1" stopColor={COR.fundo} />
      </radialGradient>
    </defs>
    <circle r={392} fill={COR.fundo} />
    <circle r={380} fill="none" stroke={COR.amarelo} strokeWidth={14} />
    <circle r={250} fill="url(#globo)" stroke={COR.amarelo} strokeWidth={8} />
    <g stroke="#3b6489" strokeWidth={4} fill="none" opacity={0.9}>
      <ellipse rx={110} ry={246} />
      <ellipse rx={200} ry={246} />
      <line x1={-246} x2={246} />
      <path d="M-226 -100 Q0 -140 226 -100" />
      <path d="M-226 100 Q0 140 226 100" />
      <line y1={-246} y2={246} />
    </g>
    <text fontFamily="Anton" fontSize={92} fill={COR.texto} letterSpacing={6} textAnchor="middle">
      <textPath href="#arco-topo" startOffset="50%">BEHIND THE MAP</textPath>
    </text>
    {[-1, 1].map((s) => <circle key={s} cx={s * 318} cy={14} r={9} fill={COR.amarelo} />)}
    <g transform="translate(0 -10) scale(2.9)">
      <path d="M0 70 C -30 30, -48 10, -48 -14 A48 48 0 0 1 48 -14 C 48 10, 30 30, 0 70 Z" fill={COR.amarelo} stroke="#000" strokeWidth={4} />
      <circle cy={-16} r={22} fill={COR.fundo} />
      <circle cy={-16} r={11} fill={COR.vermelho} />
    </g>
    <text fontFamily="Oswald" fontWeight={700} fontSize={44} fill={COR.amarelo} letterSpacing={10} textAnchor="middle">
      <textPath href="#arco-base" startOffset="50%" dominantBaseline="hanging">MONEY · POWER · BORDERS</textPath>
    </text>
  </svg>
);

export const AvatarEN: React.FC = () => (
  <AbsoluteFill style={{ background: COR.fundo, justifyContent: "center", alignItems: "center" }}>
    <LogoEN tamanho={800} />
  </AbsoluteFill>
);

// Banner 2560x1440 com satélite (NASA Blue Marble, domínio público). Tudo que importa fica na faixa central 1546x423.
export const BannerEN: React.FC = () => (
  <AbsoluteFill style={{ background: COR.fundo, overflow: "hidden" }}>
    <Img src={staticFile("identidade/mundo-banner.jpg")} style={{ position: "absolute", width: 2560, height: 1440, filter: "saturate(1.1) brightness(.75)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 45% at center, rgba(7,17,28,.88) 0%, rgba(7,17,28,.55) 55%, rgba(7,17,28,.2) 100%)" }} />
    <svg width={2560} height={1440} style={{ position: "absolute", opacity: 0.22 }}>
      {Array.from({ length: 33 }, (_, i) => <line key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={1440} stroke="#9cc3e6" strokeWidth={1} />)}
      {Array.from({ length: 19 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 80} x2={2560} y2={i * 80} stroke="#9cc3e6" strokeWidth={1} />)}
    </svg>
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 40 }}>
      <LogoCanal tamanho={270} />
      <div>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 168, color: COR.texto, lineHeight: 1, letterSpacing: 2, textShadow: CONTORNO_PRETO }}>BEHIND THE MAP</div>
        <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 44, color: "#000", background: COR.amarelo, display: "inline-block", padding: "4px 24px", marginTop: 16, letterSpacing: 3 }}>
          MONEY, POWER &amp; BORDERS — EXPLAINED WITH MAPS
        </div>
        <div style={{ fontFamily: FONTE_TEXTO, fontWeight: 500, fontSize: 38, color: COR.texto, marginTop: 18, letterSpacing: 6, textShadow: CONTORNO_PRETO }}>NEW VIDEOS EVERY WEEK</div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// Marca d'água do YouTube (150x150, fundo transparente): só o símbolo, que é o que se lê em tamanho pequeno.
export const MarcaDaguaEN: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <LogoCanal tamanho={150} />
  </AbsoluteFill>
);

// Thumbnail do vídeo 002 (EN): Groenlândia no satélite com etiqueta de preço gigante.
// Thumbnail do 003: canal brilhando dentro de um círculo vermelho, "$0" gigante, "GIVEN AWAY" e Trump pedindo de volta.
const CANAL_THUMB = "610,295 609,328 620,346 645,361 668,366 678,382 691,395 699,410 709,433";
export const ThumbPanama: React.FC<{ pasta: string }> = ({ pasta }) => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <Img src={staticFile(`${pasta}/imagens/thumb-fundo.jpg`)} style={{ position: "absolute", width: 1280, height: 720 }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 52% 52%, rgba(0,0,0,0) 22%, rgba(0,0,0,.55) 75%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,.15) 40%, rgba(0,0,0,0) 60%)" }} />
    <svg width={1280} height={720} style={{ position: "absolute" }}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <polyline points={CANAL_THUMB} stroke="#ffd400" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" opacity={0.95} />
      <polyline points={CANAL_THUMB} stroke="#fff6b0" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={660} cy={365} rx={128} ry={118} stroke="#000" strokeWidth={20} fill="none" opacity={0.5} />
      <ellipse cx={660} cy={365} rx={128} ry={118} stroke="#ff2a2a" strokeWidth={11} fill="none" />
      <path d="M905 300 Q 840 300 795 335" stroke="#000" strokeWidth={24} fill="none" strokeLinecap="round" />
      <path d="M905 300 Q 840 300 795 335" stroke="#fff" strokeWidth={11} fill="none" strokeLinecap="round" />
      <path d="M778 320 L 800 352 L 812 318 Z" fill="#fff" stroke="#000" strokeWidth={4} />
    </svg>
    <div style={{ position: "absolute", left: 40, top: 26, lineHeight: 0.88 }}>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 158, color: COR.texto, WebkitTextStroke: "6px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>GIVEN</div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 176, color: COR.amarelo, WebkitTextStroke: "6px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>AWAY</div>
    </div>
    <div style={{ position: "absolute", left: 905, top: 205, transform: "rotate(-8deg)", display: "flex", alignItems: "center", background: COR.amarelo, color: "#000", padding: "6px 46px 6px 96px", clipPath: "polygon(60px 0, 100% 0, 100% 100%, 60px 100%, 0 50%)", boxShadow: "0 16px 40px rgba(0,0,0,.7)" }}>
      <div style={{ position: "absolute", left: 44, top: "50%", width: 30, height: 30, borderRadius: 15, background: "#07111c", transform: "translateY(-50%)" }} />
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 200, lineHeight: 1 }}>$0</div>
    </div>
    <div style={{ position: "absolute", right: 36, top: 36, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ border: "4px solid #fff", lineHeight: 0, boxShadow: "0 6px 16px rgba(0,0,0,.6)" }}><Bandeira pais="USA" largura={110} /></div>
      <span style={{ fontFamily: FONTE_TITULO, fontSize: 56, color: COR.texto, textShadow: CONTORNO_PRETO }}>➜</span>
      <div style={{ border: "4px solid #fff", lineHeight: 0, boxShadow: "0 6px 16px rgba(0,0,0,.6)" }}><Bandeira pais="PAN" largura={110} /></div>
    </div>
    <div style={{ position: "absolute", left: 40, bottom: 34, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 210, height: 210, borderRadius: 105, overflow: "hidden", border: "7px solid #fff", boxShadow: "0 10px 30px rgba(0,0,0,.7)" }}>
        <Img src={staticFile(`${pasta}/imagens/trump.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }} />
      </div>
      <div style={{ position: "relative", background: "#fff", color: "#000", fontFamily: FONTE_TITULO, fontSize: 64, lineHeight: 1, padding: "16px 26px", borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>
        WE WANT IT <span style={{ color: "#e00" }}>BACK!</span>
        <div style={{ position: "absolute", left: -22, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "16px solid transparent", borderBottom: "16px solid transparent", borderRight: "24px solid #fff" }} />
      </div>
    </div>
  </AbsoluteFill>
);

export const ThumbGreenland: React.FC<{ pasta: string }> = ({ pasta }) => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <Img src={staticFile(`${pasta}/imagens/thumb-fundo.jpg`)} style={{ position: "absolute", width: 1280, height: 720, filter: "saturate(1.2) brightness(.9)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,.75) 0%, rgba(0,0,0,.2) 45%, rgba(0,0,0,0) 70%)" }} />
    <div style={{ position: "absolute", left: 40, top: 40, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ border: "4px solid #fff", lineHeight: 0, boxShadow: "0 6px 16px rgba(0,0,0,.6)" }}><Bandeira pais="USA" largura={130} /></div>
      <span style={{ fontFamily: FONTE_TITULO, fontSize: 64, color: COR.texto, textShadow: CONTORNO_PRETO }}>➜</span>
      <div style={{ border: "4px solid #fff", lineHeight: 0, boxShadow: "0 6px 16px rgba(0,0,0,.6)" }}><Bandeira pais="GRL" largura={130} /></div>
    </div>
    <div style={{ position: "absolute", left: 40, bottom: 40, lineHeight: 0.9 }}>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 170, color: COR.texto, WebkitTextStroke: "6px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>FOR</div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 170, color: COR.amarelo, WebkitTextStroke: "6px #000", textShadow: "0 10px 0 #000, 0 0 40px rgba(0,0,0,.8)" }}>SALE?</div>
    </div>
    <div style={{ position: "absolute", right: 30, top: 300, transform: "rotate(-8deg)", display: "flex", alignItems: "center", background: COR.amarelo, color: "#000", padding: "14px 40px 14px 84px", clipPath: "polygon(52px 0, 100% 0, 100% 100%, 52px 100%, 0 50%)", boxShadow: "0 16px 40px rgba(0,0,0,.7)" }}>
      <div style={{ position: "absolute", left: 40, top: "50%", width: 26, height: 26, borderRadius: 13, background: "#07111c", transform: "translateY(-50%)" }} />
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 104, lineHeight: 1 }}>$100,000,000</div>
    </div>
    <svg width={1280} height={720} style={{ position: "absolute" }}>
      <path d="M760 330 Q 700 250 640 200" stroke="#000" strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d="M760 330 Q 700 250 640 200" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" />
    </svg>
  </AbsoluteFill>
);
