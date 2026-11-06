// Garante que contas sobrevivem a um reinício (como acontece a cada deploy no Railway)
// e que o admin é avisado quando os dados não estão sendo guardados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url);

async function subir(env) {
  const porta = 19000 + Math.floor(Math.random() * 900);
  const base = `http://127.0.0.1:${porta}`;
  const limpo = { ...process.env };
  for (const k of ['DATA_DIR', 'RAILWAY_ENVIRONMENT', 'RAILWAY_VOLUME_MOUNT_PATH', 'RAILWAY_PROJECT_ID', 'RAILWAY_SERVICE_ID']) delete limpo[k];
  const proc = spawn(process.execPath, ['server.mjs'], { cwd: RAIZ, env: { ...limpo, PORT: String(porta), HOST: '127.0.0.1', ADMIN_EMAILS: 'adm@exemplo.com', ...env }, stdio: 'pipe' });
  let saida = '';
  proc.stdout.on('data', (d) => (saida += d));
  proc.stderr.on('data', (d) => (saida += d));
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/saude`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    base,
    saida: () => saida,
    async parar() {
      if (proc.exitCode !== null) return;
      const saiu = new Promise((r) => proc.once('exit', r));
      proc.kill('SIGTERM');
      await saiu;
    },
  };
}

async function req(base, metodo, rota, corpo, cookie) {
  const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], corpo: await r.json().catch(() => null) };
}

test('no Railway com volume: usa o volume sozinho e a conta continua depois de reiniciar', async () => {
  const volume = fs.mkdtempSync(path.join(os.tmpdir(), 'arenix-vol-'));
  const env = { RAILWAY_ENVIRONMENT: 'production', RAILWAY_VOLUME_MOUNT_PATH: volume };
  let s = await subir(env);
  assert.equal((await req(s.base, 'POST', '/api/criar-conta', { nome: 'Adm', email: 'adm@exemplo.com', senha: 'senha123' })).status, 200);
  await s.parar();
  assert.ok(fs.existsSync(path.join(volume, 'banco.json')), 'banco salvo dentro do volume');

  s = await subir(env);
  const login = await req(s.base, 'POST', '/api/entrar', { email: 'adm@exemplo.com', senha: 'senha123' });
  assert.equal(login.status, 200, 'conta existe depois de reiniciar');
  const resumo = (await req(s.base, 'GET', '/api/admin/resumo', null, login.cookie)).corpo;
  assert.equal(resumo.armazenamento.seguro, true);
  assert.equal((await (await fetch(`${s.base}/saude`)).json()).dadosSalvando, true);
  await s.parar();
  fs.rmSync(volume, { recursive: true, force: true });
});

test('no Railway sem volume: admin recebe o aviso', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'arenix-sem-vol-'));
  const s = await subir({ RAILWAY_ENVIRONMENT: 'production', DATA_DIR: pasta });
  const c = await req(s.base, 'POST', '/api/criar-conta', { nome: 'Adm', email: 'adm@exemplo.com', senha: 'senha123' });
  const a = (await req(s.base, 'GET', '/api/admin/resumo', null, c.cookie)).corpo.armazenamento;
  assert.equal(a.volume, false);
  assert.equal(a.seguro, false);
  assert.match(s.saida(), /Nenhum volume do Railway/);
  await s.parar();
  fs.rmSync(pasta, { recursive: true, force: true });
});

test('pasta sem permissão de gravação: o site continua no ar e avisa', async () => {
  // uma "pasta" dentro de um arquivo não pode ser criada: simula disco sem permissão
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'arenix-ro-')), 'sou-um-arquivo');
  fs.writeFileSync(arquivo, 'x');
  const s = await subir({ DATA_DIR: path.join(arquivo, 'dados') });
  const c = await req(s.base, 'POST', '/api/criar-conta', { nome: 'Adm', email: 'adm@exemplo.com', senha: 'senha123' });
  assert.equal(c.status, 200);
  const a = (await req(s.base, 'GET', '/api/admin/resumo', null, c.cookie)).corpo.armazenamento;
  assert.equal(a.gravando, false);
  assert.equal(a.seguro, false);
  assert.match(s.saida(), /NÃO CONSIGO GRAVAR/);
  await s.parar();
  fs.rmSync(path.dirname(arquivo), { recursive: true, force: true });
});
