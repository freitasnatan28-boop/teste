// Anúncio completo: trechos do bruto + inserção do produto + cartão final, com toda a camada de motion por cima.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import T from './timeline.json';
import {Aviso, BotaoCTA, C, CirculoMao, contorno, Emoji, Legenda, Preco, Progresso, Proibido, Selo, SetaMao, TexturaKraft, TituloHook,
  useEntradaSaida} from './elementos';

const OUT = {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const IN_OUT = {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const FONTE = 'Poppins, sans-serif';

// Posições por formato (frações da altura). 9:16 respeita a zona segura do Reels (nada nos 14% de cima e 20% de baixo).
export const LAYOUT = {
  '9x16': {videoTop: 0, legenda: 0.69, legendaTablet: 0.70, selo: 0.175, titulo: 0.40, preco: 0.43, cta: 0.76, aviso: 0.15,
    anel: [400, 380], rotulo: [190, 280, 270], selosIns: [0.60, 0.68, 0.76], produto: 680,
    cartao: {img: 0.295, l1: 0.515, l2: 0.57, rod: 0.618}},
  '4x5': {videoTop: -230, legenda: 0.74, legendaTablet: 0.88, selo: 0.085, titulo: 0.42, preco: 0.465, cta: 0.92, aviso: 0.035,
    anel: [450, 330], rotulo: [150, 222, 220], selosIns: [0.66, 0.76, 0.86], produto: 520,
    cartao: {img: 0.29, l1: 0.57, l2: 0.635, rod: 0.69}},
};

// ---------------------------------------------------------------- trecho do bruto com a entrada (transição) escolhida
const Bruto = ({seg, L}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const d = seg.dur;
  const lento = 0.03 * interpolate(frame, [0, d], [0, 1]);
  let esc = 1 + lento, tx = 0, ty = 0, blur = 0;
  if (seg.entrada === 'punch-hook') {           // 1,0 -> 1,15 com shake leve
    esc = interpolate(frame, [0, 10], [1.0, 1.15], OUT) - 0.05 * interpolate(frame, [10, d], [0, 1], IN_OUT);
    const k = Math.max(0, 1 - frame / 18);
    tx = Math.sin(frame * 2.7) * 9 * k; ty = Math.cos(frame * 3.3) * 7 * k;
  } else if (seg.entrada === 'punch') {         // 1,0 -> 1,08 em ~6 frames
    const p = spring({frame, fps, config: {damping: 14, stiffness: 260}});
    esc = 1 + 0.08 * p - 0.04 * interpolate(frame, [8, d], [0, 1], IN_OUT);
  } else if (seg.entrada === 'whip') {          // whip pan com motion blur
    const p = interpolate(frame, [0, 7], [1, 0], OUT);
    tx = p * width * 0.15; blur = p * 26; esc = 1 + 0.3 * p + lento;
  } else if (seg.entrada === 'zoom') {          // zoom through
    const p = interpolate(frame, [0, 8], [1, 0], OUT);
    esc = 1 + 0.35 * p + lento; blur = p * 14;
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', left: 0, top: L.videoTop, width: 1080, height: 1920, transformOrigin: '50% 40%',
        transform: `translate(${tx}px,${ty}px) scale(${esc})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
        <OffthreadVideo src={staticFile('bruto.mp4')} trimBefore={Math.round(seg.de * fps)} muted style={{width: 1080, height: 1920}} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- inserção: contador, mockup 3D com páginas em leque, 3 selos
const Insercao = ({seg, L}) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const I = T.insercao;
  const cx = W / 2;
  // fase A: contador 0 -> 120 com os 12 ícones em espiral
  const n = Math.round(interpolate(frame, [4, 46], [0, I.contador_ate], {easing: Easing.out(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const saiA = interpolate(frame, [54, 64], [1, 0], IN_OUT);
  const cy = H * 0.36;
  const bate = n === I.contador_ate ? spring({frame: frame - 46, fps, config: {damping: 8}}) : 0;
  // fase B: mockup entrando em 3D e páginas em leque
  const sB = spring({frame: frame - 58, fps, config: {damping: 14, stiffness: 120}});
  const sobe = interpolate(frame, [116, 130], [0, 1], IN_OUT);
  const saiB = interpolate(frame, [seg.dur - 8, seg.dur], [1, 0], IN_OUT);
  const angs = [-26, -16, -6, 6, 16, 26];
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 38%, #FFF3E0 0%, #F1D7AE 42%, #C89B6D 100%)', overflow: 'hidden'}}>
      <Img src={staticFile('textura-kraft.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3,
        mixBlendMode: 'multiply'}} />
      {frame < 66 && (
        <>
          {Array.from({length: 12}).map((_, i) => {
            const s = spring({frame: frame - 4 - i * 2, fps, config: {damping: 12, stiffness: 140}});
            const a = ((i * 30 + frame * 0.8) * Math.PI) / 180;
            const [rx, ry] = L.anel;
            return <Img key={i} src={staticFile(`icones/cat${String(i + 1).padStart(2, '0')}.png`)} style={{position: 'absolute',
              left: cx + Math.cos(a) * rx * s - 75, top: cy + Math.sin(a) * ry * s - 75, width: 150, height: 150, opacity: saiA,
              transform: `scale(${s * saiA})`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.3))'}} />;
          })}
          <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${(1 + 0.12 * Math.sin(bate * Math.PI)) * saiA})`,
            fontFamily: FONTE, fontWeight: 900, fontSize: L.rotulo[2], color: '#fff', ...contorno(14)}}>{n}</div>
          <div style={{position: 'absolute', left: cx, top: cy + L.rotulo[0], transform: `translate(-50%,-50%) scale(${saiA})`, fontFamily: FONTE,
            fontWeight: 900, fontSize: 96, color: C.amarelo, ...contorno(10)}}>{I.rotulo}</div>
          <div style={{position: 'absolute', left: cx, top: cy + L.rotulo[1], transform: `translate(-50%,-50%) scale(${saiA})`, fontFamily: FONTE,
            fontWeight: 700, fontSize: 52, color: '#fff', ...contorno(7), opacity: interpolate(frame, [20, 30], [0, 1], OUT) * saiA}}>{I.subtitulo}</div>
        </>
      )}
      {frame >= 56 && (
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: saiB,
          transform: `translateY(${-H * 0.14 * sobe}px) scale(${1 - 0.2 * sobe})`, transformOrigin: '50% 40%'}}>
          {I.paginas.map((p, k) => {
            const s = spring({frame: frame - 62 - k * 3, fps, config: {damping: 13, stiffness: 120}});
            return <Img key={p} src={staticFile(p)} style={{position: 'absolute', left: cx - 170 + (k - 2.5) * 125 * s, top: H * 0.40 - 250 - 30 * s,
              width: 340, borderRadius: 12, transform: `rotate(${angs[k] * s}deg)`, transformOrigin: '50% 100%', opacity: Math.min(1, s * 2),
              boxShadow: '0 12px 26px rgba(0,0,0,.3)'}} />;
          })}
          <div style={{position: 'absolute', left: cx, top: H * 0.42, perspective: 1400, transform: 'translate(-50%,-50%)'}}>
            <Img src={staticFile('mockup.png')} style={{width: 860, transform: `translateY(${(1 - sB) * 320}px) rotateY(${25 * (1 - sB)}deg) scale(${0.85 + 0.15 * sB})`,
              filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.35))', opacity: Math.min(1, sB * 2)}} />
          </div>
        </div>
      )}
      {I.selos.map((t, k) => <Selo key={t} texto={t} ini={120 + k * 12} fim={seg.dur} y={H * L.selosIns[k]} tamanho={58} />)}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- cartão final
const CartaoFinal = ({seg, L}) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const K = T.cartao;
  const f = Math.min(frame, seg.dur - 15); // segura os últimos 0,5 s
  const sImg = spring({frame, fps, config: {damping: 12, stiffness: 130}});
  const s1 = spring({frame: frame - 6, fps, config: {damping: 12}});
  const s2 = spring({frame: frame - 12, fps, config: {damping: 10}});
  const partes = K.linha2.split('R$');
  const brilho = 16 + 10 * Math.sin(f / 4);
  const [a, b] = K.linha1.split('Saiba mais');
  return (
    <AbsoluteFill style={{background: C.creme}}>
      <TexturaKraft opacidade={0.08} />
      <Img src={staticFile(K.imagem)} style={{position: 'absolute', left: W / 2 - L.produto / 2, top: H * L.cartao.img - L.produto / 2, width: L.produto,
        borderRadius: 36, transform: `scale(${0.7 + 0.3 * sImg}) rotate(${(1 - sImg) * -6}deg)`, boxShadow: '0 24px 50px rgba(0,0,0,.25)'}} />
      <div style={{position: 'absolute', left: 0, width: W, top: H * L.cartao.l1, textAlign: 'center', transform: `scale(${s1})`, fontFamily: FONTE,
        fontWeight: 900, fontSize: 76, color: C.texto}}>{a}<span style={{color: C.verde}}>Saiba mais</span>{b}</div>
      <div style={{position: 'absolute', left: 0, width: W, top: H * L.cartao.l2, textAlign: 'center', transform: `scale(${s2})`, fontFamily: FONTE,
        fontWeight: 800, fontSize: 52, color: C.texto}}>{partes[0]}
        <span style={{color: '#fff', fontWeight: 900, WebkitTextStroke: `7px ${C.texto}`, paintOrder: 'stroke fill',
          textShadow: `0 0 ${brilho}px ${C.amarelo}, 0 0 ${brilho * 2}px rgba(250,176,5,.6)`}}>R${partes[1]}</span></div>
      <div style={{position: 'absolute', left: 0, width: W, top: H * L.cartao.rod, textAlign: 'center', fontFamily: FONTE, fontWeight: 600,
        fontSize: 34, color: C.texto, opacity: interpolate(frame, [16, 24], [0, 1], OUT)}}>{K.rodape}</div>
      <BotaoCTA texto={T.elementos.seta_cta.texto} ini={18} y={H * L.cta} congela={seg.dur - 15} setaDx={370} setaDy={-120} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- composição
export const Anuncio = ({layout = '9x16', legendas = true}) => {
  const L = LAYOUT[layout];
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const E = T.elementos;
  const seg = Object.fromEntries(T.segmentos.map((s) => [s.id, s]));
  const Y = (y) => y * 1920 + L.videoTop;                 // posição no vídeo original -> tela
  const preco = seg.preco;
  const fimPreco = preco.inicio + preco.dur;
  const emTablet = frame >= preco.inicio && frame < fimPreco;
  const legY = H * (emTablet ? L.legendaTablet : L.legenda);
  const blocos = T.blocos.filter((b) => b.ini < E.seta_cta.ini).map((b) => ({...b, fim: Math.min(b.fim, E.seta_cta.ini)}));
  const emBruto = T.segmentos.some((s) => s.tipo === 'bruto' && frame >= s.inicio && frame < s.inicio + s.dur);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {T.segmentos.map((s) => (
        <Sequence key={s.id} from={s.inicio} durationInFrames={s.dur} premountFor={20}>
          {s.tipo === 'bruto' ? <Bruto seg={s} L={L} /> : s.tipo === 'insercao' ? <Insercao seg={s} L={L} /> : <CartaoFinal seg={s} L={L} />}
        </Sequence>
      ))}
      <TexturaKraft opacidade={0.05} />

      <TituloHook linhas={T.hook.titulo} ini={2} fim={Math.round(T.hook.ate_no_bruto * T.fps)} y={H * L.titulo} />
      <CirculoMao cx={E.circulo_carro.x * 1080} cy={Y(E.circulo_carro.y)} rx={E.circulo_carro.rx * 1080} ry={E.circulo_carro.ry * 1920}
        ini={E.circulo_carro.ini} fim={E.circulo_carro.fim} />
      <Proibido cx={E.proibido.x * 1080} cy={Y(E.proibido.y)} r={E.proibido.raio * 1080} ini={E.proibido.ini} fim={E.proibido.fim} />
      <Selo texto={E.selo_juntos.texto} ini={E.selo_juntos.ini} fim={E.selo_juntos.fim} y={H * L.selo} />
      <Preco texto={E.preco.texto} ini={E.preco.ini} fim={fimPreco} y={H * L.preco} />
      <BotaoCTA texto={E.seta_cta.texto} ini={E.seta_cta.ini} fim={fimPreco} y={H * L.cta} />

      {legendas && <Legenda blocos={blocos} y={legY} />}
      {legendas && T.emojis.map((e) => <Emoji key={e.ini} emoji={e.emoji} ini={e.ini} x={W * 0.86} y={legY - 150} />)}
      {emBruto && <Aviso texto={E.aviso} y={H * L.aviso} />}
      <Progresso />
    </AbsoluteFill>
  );
};
