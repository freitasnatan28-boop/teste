// Gera uma "live falsa" para testar o jogo sem estar ao vivo.

import { EventEmitter } from 'node:events';

const NOMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Duda', 'Enzo', 'Fernanda', 'Gabi', 'Gui', 'Helena', 'Igor', 'Ju', 'Kaique',
  'Larissa', 'Leo', 'Malu', 'Mari', 'Nando', 'Paulinha', 'Pedro', 'Rafa', 'Rebeca', 'Sofia', 'Thiago', 'Vini', 'Yasmin',
];

export const PRESENTES = [
  { nome: 'Rosa', moedas: 1, peso: 50 },
  { nome: 'TikTok', moedas: 1, peso: 15 },
  { nome: 'Dedo Coração', moedas: 5, peso: 12 },
  { nome: 'Rosquinha', moedas: 30, peso: 8 },
  { nome: 'Chapéu', moedas: 99, peso: 6 },
  { nome: 'Coração Gigante', moedas: 199, peso: 4 },
  { nome: 'Carro Esportivo', moedas: 1000, peso: 1.5 },
  { nome: 'Leão', moedas: 29999, peso: 0.2 },
];

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

function sortearPresente() {
  const total = PRESENTES.reduce((s, p) => s + p.peso, 0);
  let x = Math.random() * total;
  for (const p of PRESENTES) if ((x -= p.peso) <= 0) return p;
  return PRESENTES[0];
}

export function usuarioFalso(i = Math.floor(Math.random() * NOMES.length * 3)) {
  const nome = `${NOMES[i % NOMES.length]}${i >= NOMES.length ? Math.floor(i / NOMES.length) : ''}`;
  return { id: `sim-${i}`, usuario: nome.toLowerCase(), nome, foto: '' };
}

export function presenteFalso(usuario, presente = sortearPresente(), quantidade = 1) {
  return { tipo: 'presente', usuario, quantidade, moedas: presente.moedas * quantidade, nomePresente: presente.nome, imagem: '' };
}

const PERGUNTAS = [
  'oi! de onde você é?', 'qual sua comida favorita?', 'manda um oi pra minha mãe', 'você gosta de música?',
  'qual seu jogo preferido?', 'me conta uma piada', 'qual seu time do coração?', 'você dorme?',
  'o que você faz no fim de semana?', 'qual o melhor sabor de pizza?', 'canta uma música pra mim',
  'qual seu animal favorito?', 'tô com sono, me anima', 'você prefere praia ou piscina?', 'é meu aniversário hoje!',
  'qual seu superpoder?', 'manda um salve pro meu irmão', 'você tem medo de quê?', 'qual a cor mais bonita?',
];

export class Simulador extends EventEmitter {
  constructor(times, { modo = 'times' } = {}) {
    super();
    this.times = times;
    this.modo = modo;
  }

  iniciar() {
    this.status = 'simulando';
    this.emit('status', this.status);
    this.timer = setInterval(() => this.passo(), 400);
  }

  passo() {
    const usuario = usuarioFalso();
    const r = Math.random();
    if (this.modo === 'personagem') {
      // menos presentes e uma pergunta a cada ~10 s (cada resposta usa a IA)
      if (r < 0.04) this.emit('evento', { tipo: 'chat', usuario, texto: sortear(PERGUNTAS) });
      else if (r < 0.07) this.emit('evento', presenteFalso(usuario, sortearPresente(), 1));
      else if (r < 0.75) this.emit('evento', { tipo: 'curtida', usuario, quantidade: 1 + Math.floor(Math.random() * 15) });
      return;
    }
    if (r < 0.12) {
      const time = sortear(this.times);
      const texto = Math.random() < 0.5 ? String(time.numero) : `vai ${time.apelidos[1]}`;
      this.emit('evento', { tipo: 'chat', usuario, texto });
    } else if (r < 0.8) {
      this.emit('evento', { tipo: 'curtida', usuario, quantidade: 1 + Math.floor(Math.random() * 15) });
    } else if (r < 0.97) {
      const presente = sortearPresente();
      const quantidade = presente.moedas <= 5 ? 1 + Math.floor(Math.random() * 5) : 1;
      this.emit('evento', presenteFalso(usuario, presente, quantidade));
    } else if (r < 0.985) {
      this.emit('evento', { tipo: 'seguir', usuario });
    } else {
      this.emit('evento', { tipo: 'compartilhar', usuario });
    }
  }

  parar() {
    clearInterval(this.timer);
  }
}
