// Testa o site de ponta a ponta: sobe o servidor numa pasta temporária e usa a API como o navegador usaria.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { validarConfig, validarUsuarioTikTok } from '../src/configuracao.mjs';
import { hashSenha, conferirSenha } from '../src/contas.mjs';

const PORTA = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORTA}`;
let servidor;
let pasta;

before(async () => {
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'live-games-'));
  servidor = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(PORTA), HOST: '127.0.0.1', DATA_DIR: pasta },
    stdio: 'pipe',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/saude`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('servidor não subiu');
});

after(async () => {
  if (servidor && servidor.exitCode === null) {
    const saiu = new Promise((r) => servidor.once('exit', r));
    servidor.kill();
    await saiu;
  }
  fs.rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function cliente() {
  let cookie = '';
  return {
    async req(metodo, rota, corpo) {
      const r = await fetch(BASE + rota, {
        method: metodo,
        headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), origin: BASE },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const c = r.headers.get('set-cookie');
      if (c) cookie = c.split(';')[0];
      const tipo = r.headers.get('content-type') ?? '';
      return { status: r.status, corpo: tipo.includes('json') ? await r.json() : await r.text() };
    },
    get cookie() {
      return cookie;
    },
  };
}

function abrirWs(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers });
    const msgs = [];
    ws.on('message', (m) => msgs.push(JSON.parse(m)));
    ws.on('open', () => resolve({ ws, msgs }));
    ws.on('error', reject);
    ws.on('unexpected-response', (_, res) => reject(new Error(`HTTP ${res.statusCode}`)));
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('validação de configuração limita valores e corrige cores', () => {
  const c = validarConfig({ duracaoRodadaSeg: 5, times: [{ nome: '<b>A</b>', cores: ['red', '#00FF00'] }, { nome: 'B' }, ...Array(10).fill({ nome: 'X' })] });
  assert.equal(c.duracaoRodadaSeg, 30);
  assert.equal(c.times.length, 6);
  assert.equal(c.times[0].nome, 'bA/b');
  assert.match(c.times[0].cores[0], /^#[0-9a-f]{6}$/);
  assert.equal(c.times[0].cores[1], '#00ff00');
  assert.equal(validarConfig({ times: [{ nome: 'só um' }] }).times.length, 4, 'menos de 2 times volta ao padrão');
});

test('usuário do TikTok aceita @, link e rejeita lixo', () => {
  assert.equal(validarUsuarioTikTok('@fulano.123'), 'fulano.123');
  assert.equal(validarUsuarioTikTok('https://www.tiktok.com/@fulano/live'), 'fulano');
  assert.equal(validarUsuarioTikTok('nome com espaço'), null);
});

test('senha é guardada como hash e conferida', async () => {
  const h = await hashSenha('segredo1');
  assert.ok(!h.includes('segredo1'));
  assert.equal(await conferirSenha('segredo1', h), true);
  assert.equal(await conferirSenha('errada', h), false);
});

test('páginas públicas abrem', async () => {
  for (const rota of ['/', '/entrar', '/criar-conta', '/painel', '/site.css', '/jogo.js']) {
    const r = await fetch(BASE + rota);
    assert.equal(r.status, 200, rota);
  }
  assert.equal((await fetch(`${BASE}/jogo.html`)).status, 404, 'tela do jogo só pelo link com token');
  assert.equal((await fetch(`${BASE}/../server.mjs`)).status, 404);
  assert.equal((await fetch(`${BASE}/o/tokenquenaoexiste123`)).status, 404);
});

test('fluxo completo: conta, login, @, configuração, link da tela e tempo real', async () => {
  const ana = cliente();
  assert.equal((await ana.req('GET', '/api/eu')).status, 401);
  assert.equal((await ana.req('POST', '/api/criar-conta', { nome: 'Ana', email: 'ana@exemplo.com', senha: '123' })).status, 400, 'senha curta');
  assert.equal((await ana.req('POST', '/api/criar-conta', { nome: 'Ana', email: 'ANA@exemplo.com', senha: 'senha123' })).status, 200);
  assert.equal((await cliente().req('POST', '/api/criar-conta', { nome: 'Ana 2', email: 'ana@exemplo.com', senha: 'senha123' })).status, 400, 'e-mail repetido');

  const eu = (await ana.req('GET', '/api/eu')).corpo;
  assert.equal(eu.conta.email, 'ana@exemplo.com');
  assert.ok(!('senha' in eu.conta), 'nunca devolve a senha');
  assert.ok(eu.modelos.paises);

  assert.equal((await ana.req('PUT', '/api/tiktok', { usuario: 'nome inválido!' })).status, 400);
  assert.equal((await ana.req('PUT', '/api/tiktok', { usuario: '@ana.live' })).corpo.conta.tiktok, 'ana.live');

  const nova = { ...eu.modelos.generos, duracaoRodadaSeg: 60 };
  const salvo = (await ana.req('PUT', '/api/config', { config: nova })).corpo.conta.config;
  assert.equal(salvo.times.length, 2);
  assert.equal(salvo.duracaoRodadaSeg, 60);

  // outra pessoa não vê nem mexe na conta da Ana
  const beto = cliente();
  await beto.req('POST', '/api/criar-conta', { nome: 'Beto', email: 'beto@exemplo.com', senha: 'senha123' });
  const betoEu = (await beto.req('GET', '/api/eu')).corpo.conta;
  assert.notEqual(betoEu.overlayToken, eu.conta.overlayToken);
  assert.equal(betoEu.config.times.length, 4);

  // tela do jogo pelo link + painel em tempo real
  assert.equal((await fetch(`${BASE}/o/${eu.conta.overlayToken}`)).status, 200);
  const tela = await abrirWs(`ws://127.0.0.1:${PORTA}/ws?o=${eu.conta.overlayToken}`);
  const painel = await abrirWs(`ws://127.0.0.1:${PORTA}/ws?painel=1`, { cookie: ana.cookie, origin: BASE });
  const previa = await abrirWs(`ws://127.0.0.1:${PORTA}/ws?o=${eu.conta.overlayToken}&previa=1`);
  await esperar(200);
  assert.equal(painel.msgs.filter((m) => m.t === 'conexao').at(-1).d.telas, 1, 'prévia do painel não conta como tela');
  previa.ws.close();
  await assert.rejects(abrirWs(`ws://127.0.0.1:${PORTA}/ws?painel=1`), /401/, 'painel sem login é recusado');
  await assert.rejects(abrirWs(`ws://127.0.0.1:${PORTA}/ws?painel=1`, { cookie: ana.cookie, origin: 'https://site-malicioso.com' }), /401/, 'outro site não usa o login da Ana');

  painel.ws.send(JSON.stringify({ cmd: 'ligarTeste' }));
  painel.ws.send(JSON.stringify({ cmd: 'testar', tipo: 'presente', presente: 'Carro Esportivo' }));
  await esperar(600);
  const estado = tela.msgs.filter((m) => m.t === 'estado').at(-1).d;
  assert.equal(estado.times.length, 2);
  assert.equal(estado.times[0].nome, 'MENINOS');
  assert.ok(estado.ranking[0].moedas >= 1000);
  assert.ok(tela.msgs.some((m) => m.t === 'fx' && m.d.tipo === 'presente' && m.d.nivel === 'lendario'));
  assert.ok(tela.msgs.some((m) => m.t === 'conexao' && m.d.status === 'simulando'));

  // a tela de comandos não aceita comandos vindos da tela do jogo
  tela.ws.send(JSON.stringify({ cmd: 'novaLive' }));
  await esperar(300);
  assert.ok(tela.msgs.filter((m) => m.t === 'estado').at(-1).d.ranking.length > 0);

  // gerar link novo derruba a tela antiga
  const fechou = new Promise((r) => tela.ws.on('close', (codigo) => r(codigo)));
  const novo = (await ana.req('POST', '/api/novo-link')).corpo.conta.overlayToken;
  assert.notEqual(novo, eu.conta.overlayToken);
  assert.equal(await fechou, 4001);
  assert.equal((await fetch(`${BASE}/o/${eu.conta.overlayToken}`)).status, 404);

  painel.ws.send(JSON.stringify({ cmd: 'desligar' }));
  painel.ws.close();

  // sair encerra a sessão
  await ana.req('POST', '/api/sair');
  assert.equal((await ana.req('GET', '/api/eu')).status, 401);
  assert.equal((await ana.req('POST', '/api/entrar', { email: 'ana@exemplo.com', senha: 'errada' })).status, 401);
  assert.equal((await ana.req('POST', '/api/entrar', { email: 'ana@exemplo.com', senha: 'senha123' })).status, 200);
});

test('pedido de outro site é bloqueado', async () => {
  const r = await fetch(`${BASE}/api/entrar`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://site-malicioso.com' }, body: '{}' });
  assert.equal(r.status, 403);
});
