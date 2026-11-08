// Modo Personagem IA: fila de perguntas do chat, prioridade para quem manda presente,
// salve e "julgo sua foto". Prepara a próxima fala enquanto a atual ainda está tocando.

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import * as iaPadrao from './ia.mjs';

const MAX_FILA = 50;
const EXPIRA_NORMAL_MS = 120_000; // pergunta comum velha demais perde a graça
const EXPIRA_PRIORIDADE_MS = 10 * 60_000;
const INTERVALO_MESMA_PESSOA_MS = 45_000; // sem presente, a mesma pessoa espera um pouco para perguntar de novo
const PAUSA_ENTRE_FALAS_MS = 600;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const letras = (t) => (String(t).match(/\p{L}/gu) ?? []).length;

export function ehPergunta(texto) {
  const t = String(texto ?? '').trim();
  if (letras(t) < 3) return false; // "1", "kkk", só emoji
  if (/^@\S+$/.test(t)) return false;
  return true;
}

export class Atendente extends EventEmitter {
  constructor({ personagem, podeFalar, contarUso, guardarAudio, ia = iaPadrao, duracao } = {}) {
    super();
    this.personagem = personagem; // função que devolve a config atual do personagem
    this.podeFalar = podeFalar ?? (() => null); // devolve um motivo para NÃO falar, ou null
    this.contarUso = contarUso ?? (() => true);
    this.guardarAudio = guardarAudio ?? (() => null);
    this.ia = ia;
    this.duracao = duracao ?? ((texto, audio) => (audio ? ia.duracaoMp3(audio) : ia.duracaoTexto(texto)));
    this.fila = [];
    this.bonus = new Map(); // moedas mandadas por quem ainda não foi respondido
    this.respondidoEm = new Map();
    this.falaAtual = null;
    this.pensando = null;
    this.pausado = false;
    this.parado = false;
    this.motivo = null;
    this.respostas = 0;
    this.ultimoErro = null;
  }

  // ---------- entradas ----------
  chat(usuario, texto) {
    if (!usuario?.id || !ehPergunta(texto)) return false;
    const agora = Date.now();
    const bonus = this.bonus.get(usuario.id) ?? 0;
    const pendente = this.fila.find((i) => i.tipo === 'pergunta' && i.usuario.id === usuario.id);
    if (pendente) {
      // a pessoa mandou outra mensagem: vale a mais recente, sem perder o lugar na fila
      pendente.texto = String(texto).slice(0, 300);
      return true;
    }
    if (!bonus && agora - (this.respondidoEm.get(usuario.id) ?? 0) < INTERVALO_MESMA_PESSOA_MS) return false;
    this.adicionar({ tipo: 'pergunta', usuario, texto: String(texto).slice(0, 300), prioridade: bonus ? 1000 + bonus : 0, presenteou: bonus > 0 });
    return true;
  }

  presente(usuario, { moedas = 0, nomePresente = '', quantidade = 1 } = {}) {
    if (!usuario?.id || moedas <= 0) return;
    const regras = this.personagem().presentes;
    const total = (this.bonus.get(usuario.id) ?? 0) + moedas;
    this.bonus.set(usuario.id, total);
    const presente = { nome: nomePresente, quantidade, moedas };

    if (moedas >= regras.fotoMoedas && !this.temPendente(usuario.id, 'foto')) {
      return this.adicionar({ tipo: 'foto', usuario, presente, prioridade: 1_000_000 + moedas });
    }
    if (moedas >= regras.salveMoedas && !this.temPendente(usuario.id, 'salve')) {
      return this.adicionar({ tipo: 'salve', usuario, presente, prioridade: 1_000_000 + moedas });
    }
    if (total < regras.prioridadeMoedas) return;
    // "Me responda primeiro": a pergunta que já está na fila sobe; se não tem, agradece e convida a perguntar
    const pergunta = this.fila.find((i) => i.tipo === 'pergunta' && i.usuario.id === usuario.id);
    if (pergunta) {
      pergunta.prioridade = 1000 + total;
      pergunta.presenteou = true;
      return;
    }
    const agradecer = this.fila.find((i) => i.tipo === 'agradecer' && i.usuario.id === usuario.id);
    if (agradecer) {
      agradecer.presente.quantidade += quantidade;
      agradecer.prioridade = 1000 + total;
      return;
    }
    if (this.falaAtual?.usuario?.id === usuario.id || this.pensando?.usuario?.id === usuario.id) return;
    this.adicionar({ tipo: 'agradecer', usuario, presente, prioridade: 1000 + total });
  }

  temPendente(usuarioId, tipo) {
    return this.fila.some((i) => i.tipo === tipo && i.usuario.id === usuarioId);
  }

  adicionar(item) {
    this.fila.push({ id: crypto.randomUUID(), em: Date.now(), presenteou: false, ...item });
    if (this.fila.length > MAX_FILA) {
      const i = this.fila.findIndex((x) => x.prioridade === 0);
      this.fila.splice(i === -1 ? 0 : i, 1);
    }
  }

  // ---------- controle ----------
  pausar() {
    this.pausado = true;
  }
  continuar() {
    this.pausado = false;
  }
  limparFila() {
    this.fila = [];
  }
  pular() {
    if (!this.falaAtual) return;
    this.emit('fx', { tipo: 'falaPular', id: this.falaAtual.id });
    this.terminarFala(this.falaAtual.id, 0);
  }
  falaTerminou(id) {
    // a tela do jogo avisa quando o áudio acabou de tocar
    if (this.falaAtual?.id === id) this.terminarFala(id, PAUSA_ENTRE_FALAS_MS);
  }
  parar() {
    this.parado = true;
    if (this.falaAtual) this.terminarFala(this.falaAtual.id, 0);
  }

  // ---------- fila ----------
  expirar(agora = Date.now()) {
    this.fila = this.fila.filter((i) => agora - i.em < (i.prioridade > 0 ? EXPIRA_PRIORIDADE_MS : EXPIRA_NORMAL_MS));
  }

  retirar() {
    if (!this.fila.length) return null;
    let melhor = 0;
    for (let i = 1; i < this.fila.length; i++) {
      const a = this.fila[i];
      const b = this.fila[melhor];
      if (a.prioridade > b.prioridade || (a.prioridade === b.prioridade && a.em < b.em)) melhor = i;
    }
    return this.fila.splice(melhor, 1)[0];
  }

  // ---------- falas ----------
  iniciar() {
    if (this.rodando) return;
    this.rodando = true;
    this.parado = false;
    this.ciclo().finally(() => (this.rodando = false));
  }

  async ciclo() {
    while (!this.parado) {
      const motivo = this.pausado ? 'pausado' : this.podeFalar();
      if (motivo !== this.motivo) {
        this.motivo = motivo;
        this.emit('mudou');
      }
      if (motivo) {
        await dormir(400);
        continue;
      }
      this.expirar();
      const item = this.retirar();
      if (!item) {
        await dormir(250);
        continue;
      }
      if (!this.contarUso()) {
        this.fila.unshift(item);
        this.motivo = 'limite';
        this.emit('mudou');
        await dormir(5000);
        continue;
      }
      this.pensando = item;
      if (!this.falaAtual) this.emit('fx', { tipo: 'pensando', usuario: publico(item.usuario) });
      let texto;
      let audio = null;
      try {
        texto = await this.ia.escreverResposta(this.personagem(), item);
        audio = await this.ia.gerarVoz(this.personagem(), texto);
        this.ultimoErro = null;
      } catch (erro) {
        this.ultimoErro = erro.message;
        this.emit('erro', erro);
        this.pensando = null;
        if (!audio && !texto) {
          await dormir(1500);
          continue;
        }
      }
      await this.esperarFimDaFala();
      this.pensando = null;
      if (this.parado) break;
      this.falar(item, texto, audio);
    }
  }

  falar(item, texto, audio) {
    const id = crypto.randomBytes(9).toString('base64url');
    const duracao = this.duracao(texto, audio);
    const url = audio ? this.guardarAudio(audio) : null;
    this.respostas += 1;
    this.respondidoEm.set(item.usuario.id, Date.now());
    this.bonus.delete(item.usuario.id);
    this.falaAtual = { id, usuario: item.usuario, tipo: item.tipo, pergunta: item.texto ?? '', resposta: texto, presenteou: item.presenteou || item.tipo !== 'pergunta', duracao, inicio: Date.now() };
    // se a tela não avisar que terminou (ou não houver tela tocando), segue sozinho depois do tempo do áudio
    this.timerFala = setTimeout(() => this.terminarFala(id, 0), (duracao + 1.5) * 1000);
    this.emit('fx', { tipo: 'fala', id, usuario: publico(item.usuario), tipoFala: item.tipo, pergunta: this.falaAtual.pergunta, resposta: texto, presente: item.presente ?? null, presenteou: this.falaAtual.presenteou, audio: url, duracao });
  }

  terminarFala(id, espera) {
    if (this.falaAtual?.id !== id) return;
    clearTimeout(this.timerFala);
    const fim = () => {
      if (this.falaAtual?.id !== id) return;
      this.falaAtual = null;
      this.emit('fx', { tipo: 'falaFim', id });
      for (const r of this.aguardando ?? []) r();
      this.aguardando = [];
    };
    if (espera) setTimeout(fim, espera);
    else fim();
  }

  esperarFimDaFala() {
    if (!this.falaAtual) return Promise.resolve();
    return new Promise((r) => (this.aguardando ??= []).push(r));
  }

  estado() {
    const ordenada = [...this.fila].sort((a, b) => b.prioridade - a.prioridade || a.em - b.em);
    return {
      fila: ordenada.slice(0, 6).map((i) => ({ tipo: i.tipo, nome: i.usuario.nome, texto: i.texto ?? '', prioridade: i.prioridade > 0 })),
      tamanho: this.fila.length,
      falando: this.falaAtual ? { id: this.falaAtual.id, nome: this.falaAtual.usuario.nome, tipo: this.falaAtual.tipo } : null,
      pensando: Boolean(this.pensando),
      pausado: this.pausado,
      motivo: this.motivo,
      respostas: this.respostas,
      erro: this.ultimoErro,
    };
  }
}

const publico = (u) => ({ id: u.id, nome: u.nome, usuario: u.usuario, foto: u.foto });
