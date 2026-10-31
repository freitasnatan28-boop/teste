// Ícones e bandeiras desenhados em SVG (sem depender de emoji ou imagem externa).
import React from "react";
import { COR } from "./estilo";

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

export const Bandeira: React.FC<{ pais: "BRA" | "FRA" | "USA"; largura?: number }> = ({ pais, largura = 180 }) => {
  const a = largura * (2 / 3);
  if (pais === "FRA")
    return (
      <svg width={largura} height={a} viewBox="0 0 3 2">
        <rect width={1} height={2} fill="#0055a4" />
        <rect x={1} width={1} height={2} fill="#fff" />
        <rect x={2} width={1} height={2} fill="#ef4135" />
      </svg>
    );
  if (pais === "USA")
    return (
      <svg width={largura} height={a} viewBox="0 0 190 100" preserveAspectRatio="none">
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} y={(i * 100) / 13} width={190} height={100 / 13} fill={i % 2 ? "#fff" : "#b22234"} />
        ))}
        <rect width={76} height={(7 * 100) / 13} fill="#3c3b6e" />
      </svg>
    );
  return (
    <svg width={largura} height={a} viewBox="0 0 300 200">
      <rect width={300} height={200} fill="#009c3b" />
      <path d="M150 20 L280 100 L150 180 L20 100 Z" fill="#ffdf00" />
      <circle cx={150} cy={100} r={50} fill="#002776" />
      <path d="M102 88 Q150 78 198 112" stroke="#fff" strokeWidth={9} fill="none" />
    </svg>
  );
};
