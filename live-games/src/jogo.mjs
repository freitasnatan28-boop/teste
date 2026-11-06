// Lógica do jogo "Guerra de Times".
// Não sabe nada de TikTok nem de rede: recebe eventos normalizados
// ({ tipo: 'chat' | 'curtida' | 'presente' | 'seguir' | 'compartilhar', usuario, ... })
// e emite 'fx' (animações) para a tela. Isso deixa tudo testável e fácil de trocar a fonte.

import { EventEmitter } from 'node:events';

export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TAMANHO_FEED = 6;

export class Jogo extends EventEmitter {
  constructor(cfg, { agora = Date.now } = {}) {
    super();
    this.cfg = cfg;
    this.agora = agora;
    this.times = cfg.times.map((t, i) => ({
      id: t.id,
      nome: t.nome,
      cores: t.cores,
      numero: i + 1,
      apelidos: [String(i + 1), normalizarTexto(t.nome), ...(t.apelidos ?? []).map(normalizarTexto)],
      pontos: 0,
      reserva: 0,
      trofeus: 0,
    }));
    this.usuarios = new Map();
    this.reiId = null;
    this.zerarPartida();
  }

  // ---------- controle ----------

  zerarPartida() {
    for (const t of this.times) {
      t.pontos = 0;
      t.reserva = 0;
      t.trofeus = 0;
    }
    for (const u of this.usuarios.values()) {
      u.time = null;
      u.pontosRodada = 0;
    }
    this.rodada = {
      numero: 0,
      status: 'aguardando',
      terminaEm: 0,
      restanteMs: this.cfg.duracaoRodadaSeg * 1000,
      proximaEm: 0,
      vencedor: null,
      mvp: null,
    };
    this.curtidasTotal = 0;
    this.proximaMeta = this.cfg.metaCurtidas.passo;
    this.turboAte = 0;
    this.feed = [];
  }

  zerarRanking() {
    this.usuarios.clear();
    this.reiId = null;
  }

  iniciar() {
    const r = this.rodada;
    if (r.status === 'pausado') {
      r.status = 'rodando';
      r.terminaEm = this.agora() + r.restanteMs;
      for (const t of this.times) {
        t.pontos += t.reserva;
        t.reserva = 0;
      }
    } else if (r.status === 'aguardando' || r.status === 'intervalo') {
      this.novaRodada();
    }
  }

  pausar() {
    const r = this.rodada;
    if (r.status !== 'rodando') return;
    r.restanteMs = Math.max(0, r.terminaEm - this.agora());
    r.status = 'pausado';
  }

  novaRodada() {
    const r = this.rodada;
    r.numero += 1;
    r.status = 'rodando';
    r.terminaEm = this.agora() + this.cfg.duracaoRodadaSeg * 1000;
    r.vencedor = null;
    r.mvp = null;
    for (const t of this.times) {
      t.pontos = t.reserva;
      t.reserva = 0;
    }
    for (const u of this.usuarios.values()) u.pontosRodada = 0;
    this.fx({ tipo: 'rodada', numero: r.numero });
  }

  encerrarRodada() {
    const r = this.rodada;
    if (r.status !== 'rodando' && r.status !== 'pausado') return;
    const ordenados = [...this.times].sort((a, b) => b.pontos - a.pontos);
    const lider = ordenados[0];
    const empate = ordenados[1] && ordenados[1].pontos === lider.pontos;
    let vencedor = null;
    let mvp = null;
    if (lider.pontos > 0 && !empate) {
      lider.trofeus += 1;
      vencedor = { id: lider.id, nome: lider.nome, cores: lider.cores, pontos: lider.pontos };
      const craque = [...this.usuarios.values()]
        .filter((u) => u.time === lider.id && u.pontosRodada > 0)
        .sort((a, b) => b.pontosRodada - a.pontosRodada)[0];
      if (craque) mvp = { ...this.publico(craque), pontos: craque.pontosRodada };
    }
    r.status = 'intervalo';
    r.restanteMs = 0;
    r.vencedor = vencedor;
    r.mvp = mvp;
    r.proximaEm = this.agora() + this.cfg.intervaloSeg * 1000;
    this.fx({ tipo: 'fimRodada', vencedor, mvp, empate: Boolean(empate && lider.pontos > 0) });
  }

  tick() {
    const r = this.rodada;
    const agora = this.agora();
    if (r.status === 'rodando' && agora >= r.terminaEm) this.encerrarRodada();
    else if (r.status === 'intervalo' && agora >= r.proximaEm) this.novaRodada();
  }

  // ---------- eventos da live ----------

  processar(evento) {
    if (!evento?.usuario?.id) return;
    const u = this.usuario(evento.usuario);
    switch (evento.tipo) {
      case 'chat':
        return this.chat(u, evento.texto);
      case 'curtida':
        return this.curtida(u, Math.max(1, Number(evento.quantidade) || 1));
      case 'presente':
        return this.presente(u, evento);
      case 'seguir':
        this.somar(u, this.cfg.pontos.seguir);
        return this.noFeed('➕', `${u.nome} seguiu (+${this.cfg.pontos.seguir})`);
      case 'compartilhar':
        this.somar(u, this.cfg.pontos.compartilhar);
        return this.noFeed('🔁', `${u.nome} compartilhou (+${this.cfg.pontos.compartilhar})`);
    }
  }

  chat(u, texto) {
    const time = this.timePorTexto(texto);
    if (!time || u.time === time.id) return;
    const trocou = Boolean(u.time);
    u.time = time.id;
    this.fx({ tipo: 'entrou', usuario: this.publico(u), time: time.id, trocou });
    this.noFeed('⚽', `${u.nome} ${trocou ? 'trocou para' : 'entrou no'} ${time.nome}`, time.cores[0]);
  }

  curtida(u, quantidade) {
    u.curtidas += quantidade;
    this.curtidasTotal += quantidade;
    this.somar(u, quantidade * this.cfg.pontos.curtida);
    while (this.curtidasTotal >= this.proximaMeta) {
      this.proximaMeta += this.cfg.metaCurtidas.passo;
      this.turboAte = Math.max(this.turboAte, this.agora()) + this.cfg.metaCurtidas.turboSeg * 1000;
      this.fx({ tipo: 'turbo', segundos: this.cfg.metaCurtidas.turboSeg, curtidas: this.proximaMeta - this.cfg.metaCurtidas.passo });
      this.noFeed('⚡', `META DE CURTIDAS! Pontos em dobro por ${this.cfg.metaCurtidas.turboSeg}s`, '#ffd23f');
    }
  }

  presente(u, { moedas, nomePresente, imagem, quantidade }) {
    moedas = Math.max(0, Number(moedas) || 0);
    if (moedas === 0) return;
    u.moedas += moedas;
    const ganhos = this.somar(u, moedas * this.cfg.pontos.porMoeda);
    const { superAtaqueMoedas, lendarioMoedas } = this.cfg.presentes;
    const nivel = moedas >= lendarioMoedas ? 'lendario' : moedas >= superAtaqueMoedas ? 'super' : 'normal';
    const time = this.timePorId(u.time);
    this.fx({
      tipo: 'presente',
      nivel,
      usuario: this.publico(u),
      time: time?.id ?? null,
      nomePresente,
      imagem,
      quantidade: quantidade ?? 1,
      moedas,
      pontos: ganhos,
    });
    this.noFeed('🎁', `${u.nome}: ${quantidade > 1 ? `${quantidade}x ` : ''}${nomePresente ?? 'presente'} (+${ganhos.toLocaleString('pt-BR')})`, time?.cores[0]);
    this.verificarRei(u);
  }

  // ---------- regras ----------

  multiplicador() {
    const r = this.rodada;
    let m = 1;
    if (r.status === 'rodando' && r.terminaEm - this.agora() <= this.cfg.finalEmDobroSeg * 1000) m *= 2;
    if (this.agora() < this.turboAte) m *= 2;
    return m;
  }

  somar(u, base) {
    if (base <= 0) return 0;
    const time = this.timeDe(u);
    if (!time) return 0;
    const pontos = base * this.multiplicador();
    u.pontosRodada += pontos;
    if (this.rodada.status === 'rodando') time.pontos += pontos;
    else time.reserva += pontos;
    return pontos;
  }

  // Quem ainda não escolheu time cai no último colocado (ajuda a virada e gera disputa).
  timeDe(u) {
    if (u.time) return this.timePorId(u.time);
    if (this.cfg.semTime !== 'ultimo') return null;
    const ultimo = [...this.times].sort((a, b) => a.pontos + a.reserva - (b.pontos + b.reserva))[0];
    u.time = ultimo.id;
    this.fx({ tipo: 'entrou', usuario: this.publico(u), time: ultimo.id, automatico: true });
    return ultimo;
  }

  verificarRei(u) {
    const rei = this.reiId ? this.usuarios.get(this.reiId) : null;
    if (rei && rei.id !== u.id && rei.moedas >= u.moedas) return;
    if (rei?.id === u.id) return;
    this.reiId = u.id;
    this.fx({ tipo: 'rei', usuario: this.publico(u), moedas: u.moedas, anterior: rei ? this.publico(rei) : null });
    this.noFeed('👑', `${u.nome} é o NOVO TOP 1 da live!`, '#ffd23f');
  }

  // ---------- utilitários ----------

  usuario({ id, usuario, nome, foto }) {
    let u = this.usuarios.get(id);
    if (!u) {
      u = { id, usuario: usuario ?? '', nome: nome || usuario || 'anônimo', foto: foto ?? '', time: null, moedas: 0, curtidas: 0, pontosRodada: 0 };
      this.usuarios.set(id, u);
    } else {
      if (nome) u.nome = nome;
      if (usuario) u.usuario = usuario;
      if (foto) u.foto = foto;
    }
    return u;
  }

  timePorTexto(texto) {
    const t = normalizarTexto(texto);
    if (!t) return null;
    const cercado = ` ${t} `;
    return this.times.find((time) => time.apelidos.some((a) => a && (a.length <= 2 ? t === a : cercado.includes(` ${a} `)))) ?? null;
  }

  timePorId(id) {
    return this.times.find((t) => t.id === id) ?? null;
  }

  publico(u) {
    return { id: u.id, nome: u.nome, usuario: u.usuario, foto: u.foto, time: u.time };
  }

  noFeed(icone, texto, cor) {
    this.feed.unshift({ icone, texto, cor: cor ?? null, em: this.agora() });
    this.feed.length = Math.min(this.feed.length, TAMANHO_FEED);
  }

  fx(efeito) {
    this.emit('fx', efeito);
  }

  ranking(limite = 5) {
    return [...this.usuarios.values()]
      .filter((u) => u.moedas > 0)
      .sort((a, b) => b.moedas - a.moedas)
      .slice(0, limite)
      .map((u) => ({ ...this.publico(u), moedas: u.moedas }));
  }

  topCurtidas(limite = 3) {
    return [...this.usuarios.values()]
      .filter((u) => u.curtidas > 0)
      .sort((a, b) => b.curtidas - a.curtidas)
      .slice(0, limite)
      .map((u) => ({ ...this.publico(u), curtidas: u.curtidas }));
  }

  estado() {
    const r = this.rodada;
    const agora = this.agora();
    const restanteMs = r.status === 'rodando' ? Math.max(0, r.terminaEm - agora) : r.status === 'pausado' ? r.restanteMs : r.status === 'aguardando' ? this.cfg.duracaoRodadaSeg * 1000 : 0;
    const membros = new Map();
    for (const u of this.usuarios.values()) if (u.time) membros.set(u.time, (membros.get(u.time) ?? 0) + 1);
    return {
      titulo: this.cfg.titulo,
      rodada: {
        numero: r.numero,
        status: r.status,
        restanteMs,
        duracaoMs: this.cfg.duracaoRodadaSeg * 1000,
        proximaEmMs: r.status === 'intervalo' ? Math.max(0, r.proximaEm - agora) : 0,
        vencedor: r.vencedor,
        mvp: r.mvp,
        dobroFinal: r.status === 'rodando' && restanteMs <= this.cfg.finalEmDobroSeg * 1000,
        turboMs: Math.max(0, this.turboAte - agora),
        multiplicador: this.multiplicador(),
      },
      times: this.times.map((t) => ({
        id: t.id,
        nome: t.nome,
        cores: t.cores,
        numero: t.numero,
        pontos: t.pontos,
        reserva: t.reserva,
        trofeus: t.trofeus,
        membros: membros.get(t.id) ?? 0,
      })),
      ranking: this.ranking(5),
      topCurtidas: this.topCurtidas(3),
      metaCurtidas: { total: this.curtidasTotal, proxima: this.proximaMeta, passo: this.cfg.metaCurtidas.passo },
      pontos: this.cfg.pontos,
      regras: { finalEmDobroSeg: this.cfg.finalEmDobroSeg },
      feed: this.feed,
    };
  }

  // ---------- persistência do ranking (sobrevive a reiniciar o programa no meio da live) ----------

  exportarRanking() {
    return [...this.usuarios.values()]
      .filter((u) => u.moedas > 0 || u.curtidas > 0)
      .map(({ id, usuario, nome, foto, moedas, curtidas }) => ({ id, usuario, nome, foto, moedas, curtidas }));
  }

  importarRanking(lista) {
    for (const item of lista ?? []) {
      if (!item?.id) continue;
      const u = this.usuario(item);
      u.moedas = Number(item.moedas) || 0;
      u.curtidas = Number(item.curtidas) || 0;
    }
    this.reiId = this.ranking(1)[0]?.id ?? null;
  }
}
