// "Banco de dados" simples em um arquivo JSON. Aguenta bem centenas de contas;
// se o site crescer muito, dá para trocar por Postgres sem mexer no resto (mesmos métodos).

import fs from 'node:fs';
import path from 'node:path';

const hoje = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // dia no horário de Brasília

const VAZIO = () => ({ versao: 1, contas: {}, sessoes: {}, rankings: {}, ajustes: {}, usoIA: {} });

export class Banco {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.erroGravacao = null;
    this.salvoEm = null;
    try {
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    } catch (erro) {
      this.erroGravacao = erro.message;
    }
    try {
      this.dados = { ...VAZIO(), ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
    } catch (erro) {
      if (erro.code !== 'ENOENT') {
        // arquivo corrompido: guarda uma cópia em vez de apagar
        try {
          fs.copyFileSync(arquivo, `${arquivo}.corrompido-${Date.now()}`);
        } catch {}
      }
      this.dados = VAZIO();
    }
    this.timer = null;
    this.testarGravacao();
  }

  // confere na hora de ligar se a pasta aceita gravação (senão as contas somem ao reiniciar)
  testarGravacao() {
    const teste = path.join(path.dirname(this.arquivo), '.teste-gravacao');
    try {
      fs.writeFileSync(teste, String(Date.now()));
      fs.unlinkSync(teste);
      this.erroGravacao = null;
    } catch (erro) {
      this.erroGravacao = erro.message;
      console.error(`\n  ⚠️  NÃO CONSIGO GRAVAR EM ${path.dirname(this.arquivo)}: ${erro.message}`);
      console.error('  ⚠️  Contas e rankings vão se perder quando o site reiniciar. Veja "Colocar no ar" no README.\n');
    }
    return !this.erroGravacao;
  }

  get gravando() {
    return !this.erroGravacao;
  }

  // grava no máximo 1x por segundo, sem travar o servidor
  salvar() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = `${this.arquivo}.tmp`;
      const falhou = (erro) => {
        this.erroGravacao = erro.message;
        console.error('[banco] erro ao salvar', erro.message);
      };
      fs.writeFile(tmp, JSON.stringify(this.dados), (erro) => {
        if (erro) return falhou(erro);
        fs.rename(tmp, this.arquivo, (e2) => {
          if (e2) return falhou(e2);
          this.erroGravacao = null;
          this.salvoEm = Date.now();
        });
      });
    }, 1000);
  }

  salvarAgora() {
    clearTimeout(this.timer);
    this.timer = null;
    const tmp = `${this.arquivo}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.dados));
      fs.renameSync(tmp, this.arquivo);
    } catch (erro) {
      console.error('[banco] erro ao salvar', erro.message);
    }
  }

  // ---------- contas ----------
  conta(id) {
    return this.dados.contas[id] ?? null;
  }
  contaPorEmail(email) {
    return Object.values(this.dados.contas).find((c) => c.email === email) ?? null;
  }
  contaPorOverlay(token) {
    return Object.values(this.dados.contas).find((c) => c.overlayToken === token) ?? null;
  }
  gravarConta(conta) {
    this.dados.contas[conta.id] = conta;
    this.salvar();
  }
  todasContas() {
    return Object.values(this.dados.contas);
  }
  apagarConta(id) {
    delete this.dados.contas[id];
    if (this.dados.usoIA) delete this.dados.usoIA[id];
    delete this.dados.rankings[id];
    this.apagarSessoesDe(id);
  }

  // ---------- sessões ----------
  sessao(hash) {
    const s = this.dados.sessoes[hash];
    if (!s) return null;
    if (s.expira < Date.now()) {
      delete this.dados.sessoes[hash];
      this.salvar();
      return null;
    }
    return s;
  }
  gravarSessao(hash, sessao) {
    this.dados.sessoes[hash] = sessao;
    for (const [h, s] of Object.entries(this.dados.sessoes)) if (s.expira < Date.now()) delete this.dados.sessoes[h];
    this.salvar();
  }
  apagarSessao(hash) {
    delete this.dados.sessoes[hash];
    this.salvar();
  }
  apagarSessoesDe(contaId) {
    for (const [h, s] of Object.entries(this.dados.sessoes)) if (s.contaId === contaId) delete this.dados.sessoes[h];
    this.salvar();
  }

  // ---------- ajustes do site (mudados pelo admin) ----------
  ajuste(nome, padrao) {
    return this.dados.ajustes?.[nome] ?? padrao;
  }
  gravarAjuste(nome, valor) {
    this.dados.ajustes ??= {};
    this.dados.ajustes[nome] = valor;
    this.salvar();
  }

  // ---------- uso da IA (respostas do personagem por dia) ----------
  respostasIAHoje(contaId) {
    const u = this.dados.usoIA?.[contaId];
    return u && u.dia === hoje() ? u.n : 0;
  }
  contarRespostaIA(contaId, limite) {
    this.dados.usoIA ??= {};
    const dia = hoje();
    const u = this.dados.usoIA[contaId];
    const n = u && u.dia === dia ? u.n : 0;
    if (n >= limite) return false;
    this.dados.usoIA[contaId] = { dia, n: n + 1 };
    this.salvar();
    return true;
  }

  // ---------- ranking de cada live ----------
  ranking(contaId) {
    return this.dados.rankings[contaId] ?? [];
  }
  gravarRanking(contaId, lista) {
    this.dados.rankings[contaId] = lista;
    this.salvar();
  }
}
