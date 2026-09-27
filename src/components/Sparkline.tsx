// Mini gráfico do histórico de preços (SVG puro, sem bibliotecas).
export function Sparkline({ pontos, largura = 320, altura = 80 }: { pontos: { price: number; capturedAt: Date }[]; largura?: number; altura?: number }) {
  if (pontos.length < 2) return <p className="muted small">O gráfico aparece a partir da 2ª consulta de preço.</p>;
  const precos = pontos.map((p) => p.price);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const faixa = max - min || 1;
  const pad = 6;
  const xy = pontos.map((p, i) => {
    const x = pad + (i / (pontos.length - 1)) * (largura - pad * 2);
    const y = pad + (1 - (p.price - min) / faixa) * (altura - pad * 2);
    return [x, y] as const;
  });
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="sparkline" role="img" aria-label="Histórico de preços">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="3.5" fill="currentColor" />
    </svg>
  );
}
