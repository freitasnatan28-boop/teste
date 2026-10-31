import { geoDistance, geoGraticule10, geoInterpolate, geoMercator, geoPath } from "d3-geo";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_TEXTO } from "../estilo";
import { Aviao, Lagosta, Navio } from "../icones";
import type { Cena, LonLat, Vista } from "../tipos";
import type { PropsCena } from "./tipos-cena";

type Paises = { features: { properties: { iso: string; nome: string }; geometry: any; type: "Feature" }[] };

let cache: Paises | null = null;
let pedido: Promise<Paises> | null = null;

function usePaises(): Paises | null {
  const [dados, setDados] = useState(cache);
  const [handle] = useState(() => (cache ? null : delayRender("mapa de países")));
  useEffect(() => {
    if (cache || !handle) return;
    pedido ??= fetch(staticFile("mapas/paises.json")).then((r) => r.json());
    pedido.then((d) => {
      cache = d;
      setDados(d);
      continueRender(handle);
    });
  }, [handle]);
  return dados;
}

const W = 1920;
const H = 1080;
const ESCALA_MUNDO = W / (2 * Math.PI);

function camera(de: Vista, para: Vista, t: number): Vista {
  const zoom = Math.exp(interpolate(t, [0, 1], [Math.log(de.zoom), Math.log(para.zoom)]));
  return { centro: [interpolate(t, [0, 1], [de.centro[0], para.centro[0]]), interpolate(t, [0, 1], [de.centro[1], para.centro[1]])], zoom };
}

// Posição ao longo de uma rota (grande círculo entre pontos), t de 0 a 1.
function aoLongo(pontos: LonLat[], t: number): LonLat {
  const dist = pontos.slice(1).map((p, i) => geoDistance(pontos[i], p));
  const total = dist.reduce((a, b) => a + b, 0);
  let alvo = t * total;
  for (let i = 0; i < dist.length; i++) {
    if (alvo <= dist[i] || i === dist.length - 1) return geoInterpolate(pontos[i], pontos[i + 1])(Math.min(1, alvo / dist[i])) as LonLat;
    alvo -= dist[i];
  }
  return pontos[pontos.length - 1];
}

export const Mapa: React.FC<PropsCena<Extract<Cena, { tipo: "mapa" }>>> = ({ cena, offset, duracaoCena }) => {
  const f = useCurrentFrame() + offset;
  const paises = usePaises();
  if (!paises) return <AbsoluteFill style={{ background: COR.oceano }} />;

  const t = interpolate(f, [0, Math.min(duracaoCena, 75)], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  // Depois do movimento principal, a câmera continua aproximando bem devagar (nunca fica parada).
  const deriva = 1 + interpolate(f, [0, duracaoCena], [0, 0.06]);
  const cam = camera(cena.de ?? cena.para, cena.para, t);
  const proj = geoMercator().center(cam.centro).scale(ESCALA_MUNDO * cam.zoom * deriva).translate([W / 2, H / 2]);
  const path = geoPath(proj);
  const prog = (em = 0) => interpolate(f / duracaoCena, [em, em + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #10263b 0%, ${COR.oceano} 55%, ${COR.fundo} 100%)` }}>
      <svg width={W} height={H}>
        <defs>
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path(geoGraticule10()) ?? ""} stroke="rgba(120,160,200,.12)" strokeWidth={1} fill="none" />
        {paises.features.map((p) => (
          <path key={p.properties.iso + p.properties.nome} d={path(p) ?? ""} fill={COR.terra} stroke={COR.borda} strokeOpacity={0.6} strokeWidth={1.2} />
        ))}
        {cena.destaques?.map((d) => {
          const alvo = paises.features.filter((p) => p.properties.iso === d.iso);
          const o = prog(d.em);
          return alvo.map((p, i) => (
            <path key={d.iso + i} d={path(p) ?? ""} fill={d.cor ?? COR.amarelo} fillOpacity={0.85 * o} stroke={d.cor ?? COR.amarelo} strokeWidth={3} strokeOpacity={o} filter="url(#brilho)" />
          ));
        })}
        {cena.rotas?.map((r, i) => {
          const ini = r.inicio ?? 0.05;
          const fim = r.fim ?? 0.75;
          const p = interpolate(f / duracaoCena, [ini, fim], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
          if (p <= 0) return null;
          const parcial: LonLat[] = [];
          for (let k = 0; k <= 60; k++) parcial.push(aoLongo(r.pontos, (k / 60) * p));
          const d = path({ type: "LineString", coordinates: parcial }) ?? "";
          const cor = r.cor ?? COR.vermelho;
          const ponta = proj(aoLongo(r.pontos, p));
          const antes = proj(aoLongo(r.pontos, Math.max(0, p - 0.01)));
          const ang = ponta && antes ? (Math.atan2(ponta[1] - antes[1], ponta[0] - antes[0]) * 180) / Math.PI : 0;
          return (
            <g key={i}>
              <path d={d} stroke={cor} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={r.tracejada ? "14 12" : undefined} filter="url(#brilho)" />
              {ponta && r.icone && (
                <g transform={`translate(${ponta[0]} ${ponta[1]})`}>
                  <circle r={34} fill={cor} opacity={0.25} />
                  <g transform={`rotate(${r.icone === "aviao" ? ang + 90 : 0}) translate(-30 -${r.icone === "navio" ? 15 : 30})`}>
                    {r.icone === "navio" && <foreignObject width={60} height={30}><Navio tamanho={60} /></foreignObject>}
                    {r.icone === "aviao" && <foreignObject width={60} height={60}><Aviao tamanho={60} /></foreignObject>}
                    {r.icone === "lagosta" && <foreignObject width={60} height={60}><Lagosta tamanho={60} /></foreignObject>}
                  </g>
                </g>
              )}
            </g>
          );
        })}
        {cena.pontos?.map((pt, i) => {
          const xy = proj(pt.lonlat);
          const o = prog(pt.em);
          if (!xy || o <= 0) return null;
          const pulso = (f % 30) / 30;
          const cor = pt.cor ?? COR.amarelo;
          return (
            <g key={i} transform={`translate(${xy[0]} ${xy[1]})`} opacity={o}>
              <circle r={10 + pulso * 40} fill="none" stroke={cor} strokeWidth={3} opacity={1 - pulso} />
              {pt.icone === "lagosta" ? (
                <foreignObject x={-45} y={-45} width={90} height={90}>
                  <Lagosta tamanho={90} />
                </foreignObject>
              ) : pt.icone === "navio" ? (
                <foreignObject x={-35} y={-18} width={70} height={36}>
                  <Navio tamanho={70} cor={cor} />
                </foreignObject>
              ) : (
                <circle r={11} fill={cor} stroke="#000" strokeWidth={3} />
              )}
              {pt.rotulo && (
                <foreignObject x={28} y={-34} width={700} height={70}>
                  <div style={{ display: "inline-block", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 36, color: "#000", background: cor, padding: "2px 14px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{pt.rotulo}</div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      {cena.titulo && (
        <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center" }}>
          <span style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 46, color: COR.texto, background: "rgba(7,17,28,.85)", border: `3px solid ${COR.amarelo}`, padding: "8px 28px", textTransform: "uppercase", letterSpacing: 2 }}>{cena.titulo}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
