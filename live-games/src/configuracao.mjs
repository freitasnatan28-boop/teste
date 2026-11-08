// Configuração do jogo de cada conta: padrão, modelos prontos e validação do que vem do painel.

const TIMES_FUTEBOL = [
  { nome: 'FLAMENGO', cores: ['#e0102a', '#5a0010'], apelidos: ['flamengo', 'mengo', 'mengao', 'fla', 'urubu'] },
  { nome: 'CORINTHIANS', cores: ['#f5f5f5', '#7a7a7a'], apelidos: ['corinthians', 'corintians', 'timao', 'coringao', 'curintia'] },
  { nome: 'PALMEIRAS', cores: ['#22c063', '#0a5a2c'], apelidos: ['palmeiras', 'verdao', 'porco', 'palestra'] },
  { nome: 'SÃO PAULO', cores: ['#ff3b3b', '#1b1b1b'], apelidos: ['sao paulo', 'spfc', 'tricolor', 'soberano'] },
];

export const MODELOS = {
  futebol: { rotulo: '⚽ Times de futebol', titulo: 'GUERRA DE TIMES', times: TIMES_FUTEBOL },
  paises: {
    rotulo: '🌎 Países',
    titulo: 'BATALHA DE PAÍSES',
    times: [
      { nome: 'BRASIL', cores: ['#19b84a', '#f2c200'], apelidos: ['brasil', 'brazil', 'br'] },
      { nome: 'PORTUGAL', cores: ['#e0102a', '#0b7a33'], apelidos: ['portugal', 'pt', 'tuga'] },
      { nome: 'ARGENTINA', cores: ['#6cc4ff', '#ffffff'], apelidos: ['argentina', 'arg', 'hermanos'] },
      { nome: 'EUA', cores: ['#2b59ff', '#e0102a'], apelidos: ['eua', 'usa', 'estados unidos'] },
    ],
  },
  regioes: {
    rotulo: '🗺️ Regiões do Brasil',
    titulo: 'GUERRA DAS REGIÕES',
    times: [
      { nome: 'NORDESTE', cores: ['#ff9f1c', '#b34700'], apelidos: ['nordeste', 'ne', 'nordestino'] },
      { nome: 'SUDESTE', cores: ['#3d8bff', '#123a8a'], apelidos: ['sudeste', 'se'] },
      { nome: 'SUL', cores: ['#22c063', '#0a5a2c'], apelidos: ['sul', 'gaucho', 'sulista'] },
      { nome: 'NORTE', cores: ['#b84dff', '#4a1380'], apelidos: ['norte', 'nortista'] },
      { nome: 'CENTRO-OESTE', cores: ['#ffd23f', '#8a6d00'], apelidos: ['centro oeste', 'co', 'centro'] },
    ],
  },
  generos: {
    rotulo: '💙💗 Meninos x Meninas',
    titulo: 'MENINOS x MENINAS',
    times: [
      { nome: 'MENINOS', cores: ['#3d8bff', '#123a8a'], apelidos: ['meninos', 'menino', 'homens', 'eles'] },
      { nome: 'MENINAS', cores: ['#ff4fa3', '#8a1250'], apelidos: ['meninas', 'menina', 'mulheres', 'elas'] },
    ],
  },
};

// ---------- modo Personagem IA ----------
export const VOZES = {
  coral: 'Coral (feminina, animada)',
  nova: 'Nova (feminina, jovem)',
  shimmer: 'Shimmer (feminina, suave)',
  sage: 'Sage (feminina, calma)',
  alloy: 'Alloy (neutra)',
  fable: 'Fable (masculina, expressiva)',
  ash: 'Ash (masculina)',
  echo: 'Echo (masculina, suave)',
  verse: 'Verse (masculina, versátil)',
  ballad: 'Ballad (masculina, dramática)',
  onyx: 'Onyx (masculina, grave)',
};
export const ESTILOS_VOZ = {
  natural: { rotulo: '🙂 Natural', instrucao: 'Fale de forma natural e descontraída, como uma pessoa de verdade conversando com amigos numa live: emoção real, sorrindo na voz, ritmo dinâmico, sem soar como robô ou locutor. Português do Brasil.' },
  animada: { rotulo: '🎉 Animada', instrucao: 'Voz de personagem de desenho animado: muito animada, alegre, expressiva e com energia alta, num ritmo rápido e dinâmico. Português do Brasil.' },
  engracada: { rotulo: '😂 Engraçada', instrucao: 'Voz cômica e exagerada de personagem de desenho, cheia de expressão e entonações divertidas, ritmo rápido. Português do Brasil.' },
  fofa: { rotulo: '🥰 Fofa', instrucao: 'Voz fofa, doce e carinhosa, sorridente, ritmo leve. Português do Brasil.' },
  calma: { rotulo: '😌 Calma', instrucao: 'Voz calma, simpática e acolhedora, como um amigo tranquilo. Português do Brasil.' },
  narrador: { rotulo: '🎬 Narrador', instrucao: 'Voz grave e épica de narrador de trailer, mas bem-humorada. Português do Brasil.' },
};
export const CENARIOS = {
  praia: '🏝️ Quiosque na praia',
  quarto: '🎮 Quarto gamer',
  estudio: '🎤 Estúdio de TV',
  transparente: '🔲 Sem fundo (por cima da câmera)',
  proprio: '🖼️ Meu fundo (enviar imagem ou vídeo)',
};
export const PACOTES = { capi: '🦫 Capi, a capivara (pronto)', proprio: '📤 Meu personagem (enviar imagens ou vídeos)' };
// arquivos que cada conta pode enviar para o personagem
export const CAMPOS_MIDIA = ['parado', 'meio', 'falando', 'piscando', 'videoParado', 'videoFalando', 'fundo'];
const MIDIA_VAZIA = Object.fromEntries(CAMPOS_MIDIA.map((c) => [c, '']));
const URL_MIDIA = /^\/m\/[\w-]{1,80}\.(png|jpg|webp|gif|mp4|webm)$/;

export const PADRAO_PERSONAGEM = {
  nome: 'Capi',
  personalidade: 'Capi, uma capivara brasileira super gente boa, tranquila e engraçada. Ama praia, açaí, música e bater papo com a galera da live. Fala como um amigo de verdade, com gírias leves e muito carinho.',
  voz: 'coral',
  estiloVoz: 'natural',
  cenario: 'praia',
  placa: 'ME PERGUNTE QUALQUER COISA!',
  pacote: 'capi',
  midia: MIDIA_VAZIA,
  presentes: { prioridadeMoedas: 1, salveMoedas: 5, fotoMoedas: 30 },
};

export const MODOS = { times: '⚔️ Guerra de Times', personagem: '🤖 Personagem IA' };

export const PADRAO = {
  modo: 'times',
  personagem: PADRAO_PERSONAGEM,
  titulo: 'GUERRA DE TIMES',
  duracaoRodadaSeg: 180,
  finalEmDobroSeg: 30,
  intervaloSeg: 12,
  pontos: { curtida: 1, porMoeda: 10, seguir: 30, compartilhar: 20 },
  metaCurtidas: { passo: 500, turboSeg: 20 },
  presentes: { superAtaqueMoedas: 99, lendarioMoedas: 1000 },
  semTime: 'ultimo',
  times: TIMES_FUTEBOL,
};

const CORES_RESERVA = [['#ff3d7f', '#7a1038'], ['#3de0ff', '#0e5a6b'], ['#ffd23f', '#8a6d00'], ['#b84dff', '#4a1380'], ['#22c063', '#0a5a2c'], ['#ff9f1c', '#b34700']];

const inteiro = (v, min, max, padrao) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const texto = (v, max, padrao) => {
  const s = String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
  return s || padrao;
};
const cor = (v, padrao) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : padrao);

export function validarConfig(entrada = {}) {
  const e = entrada && typeof entrada === 'object' ? entrada : {};
  const p = PADRAO;
  const duracao = inteiro(e.duracaoRodadaSeg, 30, 1800, p.duracaoRodadaSeg);

  let timesEntrada = Array.isArray(e.times) ? e.times.slice(0, 6) : p.times;
  if (timesEntrada.length < 2) timesEntrada = p.times;
  const times = timesEntrada.map((t, i) => {
    const reserva = CORES_RESERVA[i % CORES_RESERVA.length];
    const cores = Array.isArray(t?.cores) ? t.cores : [];
    const apelidos = (Array.isArray(t?.apelidos) ? t.apelidos : String(t?.apelidos ?? '').split(','))
      .map((a) => texto(a, 24, ''))
      .filter(Boolean)
      .slice(0, 10);
    return {
      id: `t${i + 1}`,
      nome: texto(t?.nome, 18, `TIME ${i + 1}`),
      cores: [cor(cores[0], reserva[0]), cor(cores[1], reserva[1])],
      apelidos,
    };
  });

  const superAtaque = inteiro(e.presentes?.superAtaqueMoedas, 1, 1_000_000, p.presentes.superAtaqueMoedas);
  const pe = e.personagem && typeof e.personagem === 'object' ? e.personagem : {};
  const pp = PADRAO_PERSONAGEM;
  const salve = inteiro(pe.presentes?.salveMoedas, 1, 1_000_000, pp.presentes.salveMoedas);
  const personagem = {
    nome: texto(pe.nome, 24, pp.nome),
    personalidade: texto(pe.personalidade, 400, pp.personalidade),
    voz: Object.hasOwn(VOZES, pe.voz) ? pe.voz : pp.voz,
    estiloVoz: Object.hasOwn(ESTILOS_VOZ, pe.estiloVoz) ? pe.estiloVoz : pp.estiloVoz,
    cenario: Object.hasOwn(CENARIOS, pe.cenario) ? pe.cenario : pp.cenario,
    placa: texto(pe.placa ?? pp.placa, 60, ''),
    pacote: Object.hasOwn(PACOTES, pe.pacote) ? pe.pacote : pp.pacote,
    // só aceita arquivos enviados para o próprio site (/m/...)
    midia: Object.fromEntries(CAMPOS_MIDIA.map((c) => {
      const v = String(pe.midia?.[c] ?? (c === 'parado' ? pe.imagem ?? '' : ''));
      return [c, URL_MIDIA.test(v) ? v : ''];
    })),
    presentes: {
      prioridadeMoedas: inteiro(pe.presentes?.prioridadeMoedas, 1, 1_000_000, pp.presentes.prioridadeMoedas),
      salveMoedas: salve,
      fotoMoedas: Math.max(salve, inteiro(pe.presentes?.fotoMoedas, 1, 1_000_000, pp.presentes.fotoMoedas)),
    },
  };
  return {
    modo: Object.hasOwn(MODOS, e.modo) ? e.modo : p.modo,
    personagem,
    titulo: texto(e.titulo, 28, p.titulo),
    duracaoRodadaSeg: duracao,
    finalEmDobroSeg: inteiro(e.finalEmDobroSeg, 0, duracao, Math.min(p.finalEmDobroSeg, duracao)),
    intervaloSeg: inteiro(e.intervaloSeg, 3, 120, p.intervaloSeg),
    pontos: {
      curtida: inteiro(e.pontos?.curtida, 0, 1000, p.pontos.curtida),
      porMoeda: inteiro(e.pontos?.porMoeda, 0, 10_000, p.pontos.porMoeda),
      seguir: inteiro(e.pontos?.seguir, 0, 10_000, p.pontos.seguir),
      compartilhar: inteiro(e.pontos?.compartilhar, 0, 10_000, p.pontos.compartilhar),
    },
    metaCurtidas: {
      passo: inteiro(e.metaCurtidas?.passo, 10, 10_000_000, p.metaCurtidas.passo),
      turboSeg: inteiro(e.metaCurtidas?.turboSeg, 0, 300, p.metaCurtidas.turboSeg),
    },
    presentes: {
      superAtaqueMoedas: superAtaque,
      lendarioMoedas: Math.max(superAtaque, inteiro(e.presentes?.lendarioMoedas, 1, 10_000_000, p.presentes.lendarioMoedas)),
    },
    semTime: e.semTime === 'nenhum' ? 'nenhum' : 'ultimo',
    times,
  };
}

export function mesmosTimes(a, b) {
  return JSON.stringify(a.times) === JSON.stringify(b.times);
}

export function validarUsuarioTikTok(v) {
  const s = String(v ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '')
    .replace(/\/live\/?$/i, '')
    .replace(/^@/, '');
  return /^[a-zA-Z0-9._]{2,24}$/.test(s) ? s : null;
}
