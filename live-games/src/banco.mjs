// "Banco de dados" simples em um arquivo JSON. Aguenta bem centenas de contas;
// se o site crescer muito, dá para trocar por Postgres sem mexer no resto (mesmos métodos).

import fs from 'node:fs';
import path from 'node:path';

const VAZIO = () => ({ versao: 1, contas: {}, sessoes: {}, rankings: {}, ajustes: {} });

export class Banco {
  constructor(arquivo) {
    this.arquivo = arquivo;
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    try {
      this.dados = { ...VAZIO(), ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
    } catch (erro) {
      if (erro.code !== 'ENOENT') {
        // arquivo corrompido: guarda uma cópia em vez de apagar
        fs.copyFileSync(arquivo, `${arquivo}.corrompido-${Date.now()}`);
      }
      this.dados = VAZIO();
    }
    this.timer = null;
  }

  // grava no máximo 1x por segundo, sem travar o servidor
  salvar() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = `${this.arquivo}.tmp`;
      fs.writeFile(tmp, JSON.stringify(this.dados), (erro) => {
        if (erro) return console.error('[banco] erro ao salvar', erro);
        fs.rename(tmp, this.arquivo, (e2) => e2 && console.error('[banco] erro ao salvar', e2));
      });
    }, 1000);
  }

  salvarAgora() {
    clearTimeout(this.timer);
    this.timer = null;
    const tmp = `${this.arquivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.dados));
    fs.renameSync(tmp, this.arquivo);
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

  // ---------- ranking de cada live ----------
  ranking(contaId) {
    return this.dados.rankings[contaId] ?? [];
  }
  gravarRanking(contaId, lista) {
    this.dados.rankings[contaId] = lista;
    this.salvar();
  }
}
