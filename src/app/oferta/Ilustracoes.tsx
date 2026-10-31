// Ilustrações em SVG usadas enquanto não há fotos reais em config.ts (fotos.produto / antes / depois).
// Leves (sem download extra) e nítidas em qualquer tela.

function Frasco({ x, id }: { x: number; id: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="38" y="18" width="44" height="30" rx="6" fill="#1a1a1a" />
      <rect x="34" y="40" width="52" height="14" rx="4" fill="#d4a017" />
      <path d="M30 54h60q14 0 14 16v150q0 16-16 16H32q-16 0-16-16V70q0-16 14-16z" fill={`url(#${id}-vidro)`} />
      <rect x="22" y="104" width="76" height="92" rx="6" fill={`url(#${id}-rotulo)`} />
      <text x="60" y="130" textAnchor="middle" fontSize="11" fontWeight="800" fill="#111" letterSpacing="1">RESINA</text>
      <text x="60" y="152" textAnchor="middle" fontSize="16" fontWeight="900" fill="#111" fontStyle="italic">EXTREME</text>
      <rect x="34" y="162" width="52" height="2" fill="#111" opacity=".5" />
      <text x="60" y="182" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111">500 ml</text>
      <path d="M28 70q2-10 12-12v160q-12-2-12-14z" fill="#fff" opacity=".18" />
    </g>
  );
}

export function KitIlustracao() {
  const id = "kit";
  return (
    <svg viewBox="0 0 320 260" role="img" aria-label="Kit com 2 frascos de Resina Extreme 500 ml">
      <defs>
        <radialGradient id={`${id}-luz`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#3b3f46" />
          <stop offset="1" stopColor="#0b0d10" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-vidro`} x1="0" x2="1">
          <stop offset="0" stopColor="#1d1f23" />
          <stop offset=".45" stopColor="#3a3d44" />
          <stop offset="1" stopColor="#111214" />
        </linearGradient>
        <linearGradient id={`${id}-rotulo`} x1="0" x2="1">
          <stop offset="0" stopColor="#c79210" />
          <stop offset=".5" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#c79210" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="130" rx="150" ry="120" fill={`url(#${id}-luz)`} />
      <ellipse cx="160" cy="244" rx="120" ry="8" fill="#000" opacity=".5" />
      <Frasco x={46} id={id} />
      <Frasco x={154} id={id} />
    </svg>
  );
}

// Silhueta lateral de um sedã — a mesma forma para o "antes" e o "depois".
// O viewBox tem folga em volta do carro para caber no quadro 3:2 sem cortar as rodas.
const CARRO =
  "M20 120l8-25q6-9 22-11l60-4 40-30q10-8 30-8h85q17 0 30 10l35 28 35 6q17 4 20 19l1 17q0 8-8 8h-28a30 30 0 0 0-60 0H120a30 30 0 0 0-60 0H28q-8 0-8-10z";
const JANELAS = "M158 56q7-6 22-6h42v30h-97zM230 50h32q14 0 24 8l28 22h-84z";

function Rodas({ cor }: { cor: string }) {
  return (
    <>
      {[90, 320].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="130" r="25" fill="#111" />
          <circle cx={cx} cy="130" r="14" fill={cor} />
          <circle cx={cx} cy="130" r="4" fill="#222" />
        </g>
      ))}
    </>
  );
}

export function CarroDepois() {
  return (
    <svg viewBox="-10 -40 420 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Carro preto com pintura brilhando depois da resina">
      <defs>
        <linearGradient id="dp-fundo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f38" />
          <stop offset="1" stopColor="#0a0c0f" />
        </linearGradient>
        <linearGradient id="dp-lata" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3c434e" />
          <stop offset=".35" stopColor="#0d0f12" />
          <stop offset=".62" stopColor="#262b33" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <linearGradient id="dp-reflexo" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="dp-corte">
          <path d={CARRO} />
        </clipPath>
      </defs>
      <rect x="-10" y="-40" width="420" height="260" fill="url(#dp-fundo)" />
      <ellipse cx="200" cy="158" rx="190" ry="10" fill="#000" opacity=".6" />
      <path d={CARRO} fill="url(#dp-lata)" />
      <g clipPath="url(#dp-corte)">
        <rect x="20" y="86" width="370" height="5" fill="url(#dp-reflexo)" />
        <rect x="60" y="99" width="300" height="2" fill="url(#dp-reflexo)" opacity=".6" />
        <path d="M150 48l25-4 60 0-30 40h-60z" fill="#fff" opacity=".07" />
      </g>
      <path d={JANELAS} fill="#9fb3c8" opacity=".55" />
      <path d="M240 50h20l-30 30h-10z" fill="#fff" opacity=".35" />
      <Rodas cor="#c9ced6" />
      <g fill="#fff">
        <path d="M110 84l3-7 3 7 7 3-7 3-3 7-3-7-7-3z" />
        <path d="M300 64l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" opacity=".8" />
      </g>
    </svg>
  );
}

export function CarroAntes() {
  return (
    <svg viewBox="-10 -40 420 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Carro com pintura opaca e empoeirada antes da resina">
      <defs>
        <filter id="an-poeira" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 .78  0 0 0 0 .74  0 0 0 0 .68  0 0 0 1.4 -.75" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <clipPath id="an-corte">
          <path d={CARRO} />
        </clipPath>
      </defs>
      <rect x="-10" y="-40" width="420" height="260" fill="#8d8a84" />
      <ellipse cx="200" cy="158" rx="190" ry="10" fill="#000" opacity=".25" />
      <path d={CARRO} fill="#4b4c4e" />
      <g clipPath="url(#an-corte)">
        <path d={CARRO} filter="url(#an-poeira)" />
        <ellipse cx="200" cy="125" rx="200" ry="14" fill="#a39a8a" opacity=".45" />
      </g>
      <path d={JANELAS} fill="#7f858b" opacity=".75" />
      <Rodas cor="#7a7a78" />
    </svg>
  );
}
