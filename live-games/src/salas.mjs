// Uma "sala" por conta: o jogo, a conexão com a live dela e as telas abertas (overlay e painel).

import { Jogo } from './jogo.mjs';
import { LiveTikTok } from './tiktok.mjs';
import { Simulador, usuarioFalso, presenteFalso, PRESENTES } from './simulador.mjs';
import { mesmosTimes } from './configuracao.mjs';

const OCIOSA_MS = 15 * 60_000; // sem ninguém com a tela ou o painel aberto -> desliga

export class Sala {
  constructor(conta, { banco, eulerApiKey, podeConectar }) {
    this.contaId = conta.id;
    this.banco = banco;
    this.eulerApiKey = eulerApiKey;
    this.podeConectar = podeConectar;
    this.tiktok = conta.tiktok;
    this.config = conta.config;
    this.clientes = new Set();
    this.fonte = null;
    this.modo = 'desligado'; // desligado | tiktok | teste
    this.status = 'desligado';
    this.publicoFalso = null;
    this.ultimoUso = Date.now();
    this.rankingMudou = false;
    this.criarJogo(this.config, banco.ranking(conta.id));
  }

  criarJogo(config, ranking) {
    this.jogo?.removeAllListeners();
    this.jogo = new Jogo(config);
    this.jogo.importarRanking(ranking);
    this.jogo.on('fx', (fx) => this.enviar({ t: 'fx', d: fx }));
  }

  // ---------- telas conectadas ----------
  entrar(ws, tipo) {
    ws.tipo = tipo;
    this.clientes.add(ws);
    this.ultimoUso = Date.now();
    ws.send(JSON.stringify({ t: 'estado', d: this.jogo.estado() }));
    // abriu a tela do jogo no LIVE Studio/OBS -> já tenta ligar na live sozinho
    if (tipo === 'overlay' && this.modo === 'desligado' && this.tiktok) this.ligarTikTok();
    this.enviar({ t: 'conexao', d: this.infoConexao() });
    ws.on('close', () => {
      this.clientes.delete(ws);
      this.ultimoUso = Date.now();
      this.enviar({ t: 'conexao', d: this.infoConexao() });
    });
  }

  enviar(msg) {
    const texto = JSON.stringify(msg);
    for (const c of this.clientes) if (c.readyState === 1) c.send(texto);
  }

  infoConexao() {
    return { modo: this.modo, status: this.status, usuario: this.tiktok, simulacao: this.modo === 'teste', telas: [...this.clientes].filter((c) => c.tipo === 'overlay').length };
  }

  mudarStatus(status) {
    this.status = status;
    if (status === 'conectado' || status === 'simulando') this.jogo.iniciar();
    this.enviar({ t: 'conexao', d: this.infoConexao() });
  }

  // ---------- fontes de eventos ----------
  ligarTikTok() {
    if (!this.tiktok) return { erro: 'Coloque seu @ do TikTok primeiro.' };
    const motivo = this.podeConectar(this);
    if (motivo) {
      this.mudarStatus(motivo);
      return { erro: motivo };
    }
    this.desligar();
    this.modo = 'tiktok';
    const live = new LiveTikTok({ usuario: this.tiktok, eulerApiKey: this.eulerApiKey });
    this.ligarFonte(live);
    live.iniciar().catch((erro) => {
      console.error(`[sala ${this.contaId}]`, erro);
      this.mudarStatus('erro ao conectar');
    });
    return {};
  }

  ligarTeste() {
    this.desligar();
    this.modo = 'teste';
    const sim = new Simulador(this.jogo.times);
    this.ligarFonte(sim);
    sim.iniciar();
    return {};
  }

  ligarFonte(fonte) {
    this.fonte = fonte;
    fonte.on('evento', (e) => this.evento(e));
    fonte.on('status', (s) => this.fonte === fonte && this.mudarStatus(s));
    fonte.on('log', (m) => console.log(`[@${this.tiktok}] ${m}`));
  }

  desligar() {
    const f = this.fonte;
    this.fonte = null;
    this.modo = 'desligado';
    f?.removeAllListeners();
    f?.parar?.();
    this.publicoFalso?.parar();
    this.publicoFalso = null;
    this.mudarStatus('desligado');
  }

  evento(e) {
    this.jogo.processar(e);
    if (e.tipo === 'presente' || e.tipo === 'curtida') this.rankingMudou = true;
  }

  // ---------- configuração ----------
  atualizarConta(conta) {
    const mudouTikTok = conta.tiktok !== this.tiktok;
    this.tiktok = conta.tiktok;
    if (JSON.stringify(conta.config) !== JSON.stringify(this.config)) {
      const timesMudaram = !mesmosTimes(conta.config, this.config);
      const rodando = this.jogo.rodada.status !== 'aguardando';
      this.salvarRanking();
      if (timesMudaram) {
        this.criarJogo(conta.config, this.banco.ranking(this.contaId));
        if (rodando) this.jogo.iniciar();
      } else {
        // só regras mudaram: mantém placar e rodada
        this.jogo.cfg = conta.config;
      }
      this.config = conta.config;
      if (this.fonte instanceof Simulador) this.fonte.times = this.jogo.times;
    }
    if (mudouTikTok && this.modo === 'tiktok') this.ligarTikTok();
    this.enviar({ t: 'estado', d: this.jogo.estado() });
    this.enviar({ t: 'conexao', d: this.infoConexao() });
  }

  // ---------- comandos do painel ----------
  comando({ cmd, ...dados }) {
    switch (cmd) {
      case 'ligarTikTok':
        return this.ligarTikTok();
      case 'ligarTeste':
        return this.ligarTeste();
      case 'desligar':
        return this.desligar();
      case 'iniciar':
        return this.jogo.iniciar();
      case 'pausar':
        return this.jogo.pausar();
      case 'encerrar':
        return this.jogo.encerrarRodada();
      case 'zerarPartida':
        return this.jogo.zerarPartida();
      case 'novaLive':
        this.jogo.zerarRanking();
        this.jogo.zerarPartida();
        this.rankingMudou = true;
        return;
      case 'testar': {
        const usuario = dados.tipo === 'chat' ? { id: 'painel', nome: 'Você (teste)', usuario: 'voce', foto: '' } : usuarioFalso();
        if (dados.tipo === 'presente') {
          const presente = PRESENTES.find((p) => p.nome === dados.presente) ?? PRESENTES[0];
          this.evento(presenteFalso(usuario, presente, 1));
        } else if (dados.tipo === 'curtida') this.evento({ tipo: 'curtida', usuario, quantidade: 50 });
        else if (dados.tipo === 'chat') this.evento({ tipo: 'chat', usuario, texto: String(dados.texto ?? '').slice(0, 200) });
        return;
      }
      case 'publicoFalso':
        // liga/desliga um público de teste por cima da live real
        if (this.publicoFalso) {
          this.publicoFalso.parar();
          this.publicoFalso = null;
        } else if (this.modo !== 'teste') {
          this.publicoFalso = new Simulador(this.jogo.times);
          this.publicoFalso.on('evento', (e) => this.evento(e));
          this.publicoFalso.iniciar();
        }
        return;
    }
  }

  // ---------- manutenção ----------
  tick() {
    this.jogo.tick();
    if (this.clientes.size) this.enviar({ t: 'estado', d: this.jogo.estado() });
  }

  salvarRanking() {
    if (!this.rankingMudou) return;
    this.rankingMudou = false;
    this.banco.gravarRanking(this.contaId, this.jogo.exportarRanking());
  }

  ociosa(agora = Date.now()) {
    return this.clientes.size === 0 && agora - this.ultimoUso > OCIOSA_MS;
  }

  fechar() {
    this.rankingMudou = true;
    this.salvarRanking();
    this.desligar();
    for (const c of this.clientes) c.close();
  }
}

export class Salas {
  constructor({ banco, eulerApiKey, maxLives = 50 }) {
    this.banco = banco;
    this.eulerApiKey = eulerApiKey;
    this.maxLives = maxLives;
    this.mapa = new Map();
    this.relogio = setInterval(() => this.tick(), 160);
    this.faxina = setInterval(() => this.limpar(), 5000);
  }

  obter(conta) {
    let sala = this.mapa.get(conta.id);
    if (!sala) {
      sala = new Sala(conta, { banco: this.banco, eulerApiKey: this.eulerApiKey, podeConectar: (s) => this.podeConectar(s) });
      this.mapa.set(conta.id, sala);
    }
    return sala;
  }

  existente(contaId) {
    return this.mapa.get(contaId) ?? null;
  }

  // usado pelo admin: derruba a live, fecha as telas e tira a sala da memória
  encerrar(contaId) {
    const sala = this.mapa.get(contaId);
    if (!sala) return;
    sala.fechar();
    this.mapa.delete(contaId);
  }

  podeConectar(sala) {
    const ativas = [...this.mapa.values()].filter((s) => s !== sala && s.modo === 'tiktok').length;
    return ativas >= this.maxLives ? 'servidor lotado, tente em alguns minutos' : null;
  }

  tick() {
    for (const s of this.mapa.values()) s.tick();
  }

  limpar() {
    const agora = Date.now();
    for (const [id, s] of this.mapa) {
      s.salvarRanking();
      if (s.ociosa(agora)) {
        s.fechar();
        this.mapa.delete(id);
      }
    }
  }

  estatisticas() {
    const salas = [...this.mapa.values()];
    return {
      salas: salas.length,
      livesConectadas: salas.filter((s) => s.status === 'conectado').length,
      emTeste: salas.filter((s) => s.modo === 'teste').length,
      telasAbertas: salas.reduce((n, s) => n + [...s.clientes].filter((c) => c.tipo === 'overlay').length, 0),
    };
  }

  fecharTodas() {
    clearInterval(this.relogio);
    clearInterval(this.faxina);
    for (const s of this.mapa.values()) s.fechar();
  }
}
