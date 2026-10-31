// Mapa no estilo dos vídeos de geopolítica: fundo de satélite (NASA), câmera que passeia sem parar,
// países pintados com a bandeira, rotas, pontos e "atores" (balões, retratos, ícones) presos ao mapa.
// Projeção equirretangular: o recorte de satélite se encaixa direto, sem reprojetar a imagem.
import { geoBounds, geoDistance, geoEquirectangular, geoGraticule10, geoInterpolate, geoPath } from "d3-geo";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COR, FONTE_TEXTO } from "../estilo";
import { Aviao, Bandeira, Lagosta, Navio } from "../icones";
import type { Cena, LonLat, Vista } from "../tipos";
import { AnoNoTopo, AtorNoMapa } from "./Atores";
import type { PropsCena } from "./tipos-cena";

type Feature = { properties: { iso: string; nome: string }; geometry: any; type: "Feature" };
type Paises = { features: Feature[] };

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

// Só a parte "principal" do país (ex.: a França sem a Guiana Francesa), para a bandeira não esticar errado.
function partePrincipal(f: Feature): Feature {
  if (f.geometry.type !== "MultiPolygon") return f;
  const polis = f.geometry.coordinates.map((c: unknown) => ({ type: "Feature", properties: f.properties, geometry: { type: "Polygon", coordinates: c } }) as Feature);
  const area = (p: Feature) => {
    const [[o, s], [l, n]] = geoBounds(p as any);
    return (l - o) * (n - s);
  };
  const maior = polis.reduce((a: Feature, b: Feature) => (area(b) > area(a) ? b : a));
  const [[o, s], [l, n]] = geoBounds(maior as any);
  const perto = polis.filter((p: Feature) => {
    const [[po, ps], [pl, pn]] = geoBounds(p as any);
    return Math.abs((po + pl) / 2 - (o + l) / 2) < 15 && Math.abs((ps + pn) / 2 - (s + n) / 2) < 15;
  });
  return { ...f, geometry: { type: "MultiPolygon", coordinates: perto.map((p: Feature) => p.geometry.coordinates) } };
}

const ANTIGO = { mar: "#b9cfc4", terra: "#e6d3a8", borda: "#8a6d45", papel: "#efe2c2" };

export const Mapa: React.FC<PropsCena<Extract<Cena, { tipo: "mapa" }>>> = ({ cena, offset, duracaoCena, pasta }) => {
  const f = useCurrentFrame() + offset;
  const { width: W, height: H } = useVideoConfig();
  const paises = usePaises();
  if (!paises) return <AbsoluteFill style={{ background: COR.oceano }} />;

  const antigo = cena.estilo === "antigo";
  const t = interpolate(f, [0, Math.min(duracaoCena, 60)], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  // Depois do movimento principal, a câmera continua aproximando devagar (nunca fica parada).
  const deriva = 1 + interpolate(f, [0, duracaoCena], [0, 0.05]);
  const cam = camera(cena.de ?? cena.para, cena.para, t);
  const ppg = (W / 360) * cam.zoom * deriva; // pixels por grau
  const proj = geoEquirectangular()
    .scale((ppg * 180) / Math.PI)
    .center(cam.centro)
    .translate([W / 2, H / 2]);
  const path = geoPath(proj);
  const [cx, cy] = cam.centro;
  const prog = (em = 0) => interpolate(f / duracaoCena, [em, em + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aparece = (aos = 0) => interpolate(f, [aos, aos + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: antigo ? ANTIGO.mar : "#0b2a45", overflow: "hidden" }}>
      {!antigo && cena.fundo && (
        <Img
          src={staticFile(cena.fundo.img)}
          style={{
            position: "absolute",
            left: W / 2 + (cena.fundo.oeste - cx) * ppg,
            top: H / 2 - (cena.fundo.norte - cy) * ppg,
            width: (cena.fundo.leste - cena.fundo.oeste) * ppg,
            height: (cena.fundo.norte - cena.fundo.sul) * ppg,
            maxWidth: "none",
            filter: "saturate(1.15) contrast(1.05) brightness(.95)",
          }}
        />
      )}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          {cena.paises?.filter((p) => p.bandeira).map((p) => {
            const alvo = paises.features.find((x) => x.properties.iso === p.iso);
            if (!alvo) return null;
            const [[x0, y0], [x1, y1]] = path.bounds(partePrincipal(alvo) as any);
            return (
              <pattern key={p.iso} id={`bandeira-${p.iso}`} patternUnits="userSpaceOnUse" x={x0} y={y0} width={x1 - x0} height={y1 - y0}>
                <Bandeira pais={p.bandeira!} largura={x1 - x0} altura={y1 - y0} esticar />
              </pattern>
            );
          })}
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {antigo && <path d={path(geoGraticule10()) ?? ""} stroke={ANTIGO.borda} strokeOpacity={0.25} strokeWidth={1} fill="none" />}
        {paises.features.map((p) => (
          <path
            key={p.properties.iso + p.properties.nome}
            d={path(p) ?? ""}
            fill={antigo ? ANTIGO.terra : "none"}
            stroke={antigo ? ANTIGO.borda : "#fff"}
            strokeOpacity={antigo ? 0.8 : 0.45}
            strokeWidth={antigo ? 1.5 : 1.3}
          />
        ))}
        {cena.paises?.map((p) => {
          const alvo = paises.features.find((x) => x.properties.iso === p.iso);
          if (!alvo) return null;
          const o = aparece(p.aos);
          return (
            <path
              key={`p-${p.iso}`}
              d={path(partePrincipal(alvo)) ?? ""}
              fill={p.bandeira ? `url(#bandeira-${p.iso})` : p.cor ?? COR.amarelo}
              fillOpacity={0.78 * o}
              stroke="#fff"
              strokeWidth={3}
              strokeOpacity={o}
            />
          );
        })}
        {cena.destaques?.map((d) => {
          const alvo = paises.features.filter((p) => p.properties.iso === d.iso);
          const o = prog(d.em);
          return alvo.map((p, i) => (
            <path key={d.iso + i} d={path(p) ?? ""} fill={d.cor ?? COR.amarelo} fillOpacity={0.7 * o} stroke="#fff" strokeWidth={3} strokeOpacity={o} />
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
              <path d={d} stroke="#000" strokeOpacity={0.35} strokeWidth={10} fill="none" strokeLinecap="round" />
              <path d={d} stroke={cor} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={r.tracejada ? "14 12" : undefined} />
              {ponta && r.icone && (
                <g transform={`translate(${ponta[0]} ${ponta[1]})`}>
                  <circle r={36} fill="#fff" stroke={cor} strokeWidth={4} />
                  <g transform={`rotate(${r.icone === "aviao" ? ang + 90 : 0}) translate(-26 -${r.icone === "navio" ? 13 : 26})`}>
                    {r.icone === "navio" && <foreignObject width={52} height={26}><Navio tamanho={52} cor={cor} /></foreignObject>}
                    {r.icone === "aviao" && <foreignObject width={52} height={52}><Aviao tamanho={52} cor={cor} /></foreignObject>}
                    {r.icone === "lagosta" && <foreignObject width={52} height={52}><Lagosta tamanho={52} /></foreignObject>}
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
              <circle r={11} fill={cor} stroke="#000" strokeWidth={3} />
              {pt.rotulo && (
                <foreignObject x={24} y={-30} width={700} height={64}>
                  <div style={{ display: "inline-block", fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: 32, color: "#000", background: "#fff", padding: "2px 12px", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 3px 8px rgba(0,0,0,.5)" }}>{pt.rotulo}</div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      {antigo && <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${ANTIGO.borda}66 100%)`, mixBlendMode: "multiply" }} />}
      {cena.atores?.map((a, i) => {
        const xy = proj(a.lonlat);
        return xy ? <AtorNoMapa key={i} ator={a} x={xy[0]} y={xy[1]} frame={f} pasta={pasta} /> : null;
      })}
      {cena.ano && offset === 0 && <AnoNoTopo ano={cena.ano} />}
      {cena.titulo && (
        <div style={{ position: "absolute", top: cena.ano ? 190 : 50, width: "100%", textAlign: "center", fontFamily: "Anton", fontSize: 64, lineHeight: 1.05, color: "#fff", textTransform: "uppercase", whiteSpace: "pre-line", textShadow: "0 0 4px #000, 0 5px 0 rgba(0,0,0,.7), 0 0 24px rgba(0,0,0,.8)" }}>
          {cena.titulo}
        </div>
      )}
    </AbsoluteFill>
  );
};
