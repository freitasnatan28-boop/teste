// Ícones e bandeiras desenhados em SVG (sem depender de emoji ou imagem externa).
import React from "react";
import { COR } from "./estilo";
import type { Pais } from "./tipos";

export const Lagosta: React.FC<{ tamanho?: number; cor?: string }> = ({ tamanho = 120, cor = "#e4572e" }) => (
  <svg width={tamanho} height={tamanho} viewBox="-50 -60 100 120">
    <g stroke={cor} strokeWidth={2.5} fill="none" strokeLinecap="round">
      <path d="M-6 -30 C -30 -55, -45 -50, -48 -58" />
      <path d="M6 -30 C 30 -55, 45 -50, 48 -58" />
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${8 * s} ${-8 + 0} L ${22 * s} 0 L ${26 * s} 12`} />
          <path d={`M${8 * s} -2 L ${24 * s} 10 L ${27 * s} 22`} />
          <path d={`M${8 * s} 4 L ${22 * s} 18 L ${24 * s} 30`} />
        </g>
      ))}
    </g>
    <g fill={cor}>
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${8 * s} -22 L ${20 * s} -34 L ${26 * s} -30 L ${12 * s} -18 Z`} />
          <ellipse cx={30 * s} cy={-40} rx={9} ry={14} transform={`rotate(${-25 * s} ${30 * s} -40)`} />
        </g>
      ))}
      <ellipse cx={0} cy={-18} rx={11} ry={18} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={-10 + i} y={-2 + i * 9} width={20 - 2 * i} height={8} rx={3} />
      ))}
      <path d="M-14 46 L 0 38 L 14 46 L 8 56 L 0 50 L -8 56 Z" />
    </g>
    <g fill="#000">
      <circle cx={-5} cy={-33} r={2.2} />
      <circle cx={5} cy={-33} r={2.2} />
    </g>
  </svg>
);

export const Navio: React.FC<{ tamanho?: number; cor?: string }> = ({ tamanho = 60, cor = COR.texto }) => (
  <svg width={tamanho} height={tamanho * 0.5} viewBox="0 0 100 50">
    <path fill={cor} d="M2 30 L98 30 L88 46 L12 46 Z" />
    <path fill={cor} d="M30 30 L30 20 L55 20 L55 12 L62 12 L62 20 L72 20 L72 30 Z" />
    <rect fill={cor} x={44} y={4} width={3} height={16} />
  </svg>
);

export const Aviao: React.FC<{ tamanho?: number; cor?: string }> = ({ tamanho = 60, cor = COR.texto }) => (
  <svg width={tamanho} height={tamanho} viewBox="-50 -50 100 100">
    <path
      fill={cor}
      d="M0 -46 C 5 -46 6 -38 6 -30 L 6 -8 L 46 8 L 46 16 L 6 6 L 5 30 L 16 38 L 16 44 L 0 40 L -16 44 L -16 38 L -5 30 L -6 6 L -46 16 L -46 8 L -6 -8 L -6 -30 C -6 -38 -5 -46 0 -46 Z"
    />
  </svg>
);

// Largura / altura oficial de cada bandeira (as outras são 3:2).
const RAZAO: Partial<Record<Pais, number>> = { USA: 1.9, DNK: 37 / 28, GBR: 2, };

// "esticar": cobre a caixa toda sem deformar (corta as sobras), para pintar o território do país com a bandeira.
export const Bandeira: React.FC<{ pais: Pais; largura?: number; altura?: number; esticar?: boolean; x?: number; y?: number }> = ({ pais, largura = 180, altura, esticar, x, y }) => {
  const a = altura ?? largura / (RAZAO[pais] ?? 1.5);
  const extra = { x, y, preserveAspectRatio: "xMidYMid slice" as const };
  if (pais === "FRA")
    return (
      <svg width={largura} height={a} viewBox="0 0 3 2" {...extra}>
        <rect width={1} height={2} fill="#0055a4" />
        <rect x={1} width={1} height={2} fill="#fff" />
        <rect x={2} width={1} height={2} fill="#ef4135" />
      </svg>
    );
  if (pais === "USA")
    return (
      <svg width={largura} height={a} viewBox="0 0 190 100" {...extra}>
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} y={(i * 100) / 13} width={190} height={100 / 13} fill={i % 2 ? "#fff" : "#b22234"} />
        ))}
        <rect width={76} height={(7 * 100) / 13} fill="#3c3b6e" />
      </svg>
    );
  if (pais === "ESP")
    return (
      <svg width={largura} height={a} viewBox="0 0 3 2" {...extra}>
        <rect width={3} height={2} fill="#aa151b" />
        <rect y={0.5} width={3} height={1} fill="#f1bf00" />
      </svg>
    );
  if (pais === "MEX")
    return (
      <svg width={largura} height={a} viewBox="0 0 3 2" {...extra}>
        <rect width={1} height={2} fill="#006847" />
        <rect x={1} width={1} height={2} fill="#fff" />
        <rect x={2} width={1} height={2} fill="#ce1126" />
        <circle cx={1.5} cy={1} r={0.28} fill="#8c5a2b" />
        <path d="M1.28 1.2 Q1.5 1.42 1.72 1.2" stroke="#006847" strokeWidth={0.07} fill="none" />
      </svg>
    );
  if (pais === "RUS")
    return (
      <svg width={largura} height={a} viewBox="0 0 3 2" {...extra}>
        <rect width={3} height={2} fill="#fff" />
        <rect y={0.667} width={3} height={0.667} fill="#0039a6" />
        <rect y={1.333} width={3} height={0.667} fill="#d52b1e" />
      </svg>
    );
  if (pais === "DNK")
    return (
      <svg width={largura} height={a} viewBox="0 0 37 28" {...extra}>
        <rect width={37} height={28} fill="#c8102e" />
        <rect x={12} width={4} height={28} fill="#fff" />
        <rect y={12} width={37} height={4} fill="#fff" />
      </svg>
    );
  if (pais === "GRL")
    return (
      <svg width={largura} height={a} viewBox="0 0 18 12" {...extra}>
        <rect width={18} height={6} fill="#fff" />
        <rect y={6} width={18} height={6} fill="#c8102e" />
        <path d="M3 6 A4 4 0 0 1 11 6 Z" fill="#c8102e" />
        <path d="M3 6 A4 4 0 0 0 11 6 Z" fill="#fff" />
      </svg>
    );
  if (pais === "GBR")
    return (
      <svg width={largura} height={a} viewBox="0 0 60 30" {...extra}>
        <rect width={60} height={30} fill="#012169" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth={6} />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#c8102e" strokeWidth={2} />
        <path d="M30 0 V30 M0 15 H60" stroke="#fff" strokeWidth={10} />
        <path d="M30 0 V30 M0 15 H60" stroke="#c8102e" strokeWidth={6} />
      </svg>
    );
  if (pais === "CHN" || pais === "URS")
    return (
      <svg width={largura} height={a} viewBox="0 0 30 20" {...extra}>
        <rect width={30} height={20} fill={pais === "CHN" ? "#ee1c25" : "#cc0000"} />
        <polygon points="5,2 6.2,5.6 10,5.6 6.9,7.8 8.1,11.4 5,9.2 1.9,11.4 3.1,7.8 0,5.6 3.8,5.6" fill="#ffde00" transform={pais === "URS" ? "translate(1.5 0.5) scale(.45)" : undefined} />
        {pais === "CHN" && [[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.8} fill="#ffde00" />)}
        {pais === "URS" && <path d="M3 9 Q6 11 8 7 M4 7 L7.5 10.5" stroke="#ffde00" strokeWidth={0.9} fill="none" />}
      </svg>
    );
  return (
    <svg width={largura} height={a} viewBox="0 0 300 200" {...extra}>
      <rect width={300} height={200} fill="#009c3b" />
      <path d="M150 20 L280 100 L150 180 L20 100 Z" fill="#ffdf00" />
      <circle cx={150} cy={100} r={50} fill="#002776" />
      <path d="M102 88 Q150 78 198 112" stroke="#fff" strokeWidth={9} fill="none" />
    </svg>
  );
};
