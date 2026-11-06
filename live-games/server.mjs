// Site ARENIX: cada pessoa cria uma conta, liga o jogo na própria live do TikTok
// e recebe um link exclusivo da tela do jogo para colocar no TikTok LIVE Studio / OBS.
//
//   npm start      -> http://localhost:8080
//
// Variáveis de ambiente (opcionais):
//   PORT           porta (padrão 8080; serviços de hospedagem já definem sozinhos)
//   HOST           padrão 0.0.0.0 quando PORT existe, senão 127.0.0.1
//   DATA_DIR       pasta onde ficam contas e rankings (padrão ./data) — use um disco persistente
//   EULER_API_KEY  chave da Euler Stream (recomendado em produção, ver README)
//   MAX_LIVES      máximo de lives conectadas ao mesmo tempo (padrão 50)
//   CADASTRO       "fechado" para não aceitar novas contas (o admin também pode abrir/fechar no /admin)
//   ADMIN_EMAILS   e-mails com acesso ao /admin, separados por vírgula

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Banco } from './src/banco.mjs';
import { Contas, COOKIE, novoToken } from './src/contas.mjs';
import { Salas } from './src/salas.mjs';
import { MODELOS, PADRAO, validarConfig, validarUsuarioTikTok } from './src/configuracao.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(RAIZ, 'data'));
const PORTA = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const banco = new Banco(path.join(DATA_DIR, 'banco.json'));
const contas = new Contas(banco, { emailsAdmin: String(process.env.ADMIN_EMAILS ?? '').split(',') });
const cadastroAberto = () => banco.ajuste('cadastroAberto', process.env.CADASTRO !== 'fechado');
const INICIO = Date.now();
const salas = new Salas({ banco, eulerApiKey: process.env.EULER_API_KEY || undefined, maxLives: Number(process.env.MAX_LIVES) || 50 });

// ---------- utilidades HTTP ----------

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const SEGURANCA = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };

function json(res, status, corpo, extras = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SEGURANCA, ...extras });
  res.end(JSON.stringify(corpo));
}

function arquivo(res, nome, extras = {}) {
  const caminho = path.normalize(path.join(PUBLICO, nome));
  if (!caminho.startsWith(PUBLICO + path.sep)) return json(res, 403, { erro: 'proibido' });
  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) return arquivo404(res);
    const tipo = TIPOS[path.extname(caminho)] ?? 'application/octet-stream';
    const cache = tipo.startsWith('image/') ? 'public, max-age=86400' : 'no-cache';
    res.writeHead(200, { 'content-type': tipo, 'cache-control': cache, ...SEGURANCA, ...extras });
    res.end(conteudo);
  });
}

function arquivo404(res) {
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Página não encontrada · ARENIX</title><link rel="icon" href="/marca/favicon.svg"><body style="font-family:system-ui,sans-serif;background:#050807;color:#ecfff5;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center;padding:24px"><img src="/marca/simbolo.svg" width="64" height="64" alt="" style="margin:0 auto 20px"><h1 style="margin:0 0 10px">Página não encontrada</h1><p style="color:#a3b8af;margin:0 0 24px">O link pode ter sido trocado ou não existe mais.</p><a style="color:#2bff88;font-weight:700" href="/">Voltar ao início</a></div>');
}

function lerCorpo(req, limite = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', (p) => {
      tamanho += p.length;
      if (tamanho > limite) {
        reject(new Error('corpo grande demais'));
        req.destroy();
      } else partes.push(p);
    });
    req.on('end', () => {
      try {
        resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

const httpsAtras = (req) => req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;

function cookieSessao(req, token, maxAge) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${httpsAtras(req) ? '; Secure' : ''}`;
}

// impede outro site de mandar comandos usando o cookie de quem está logado
function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return true;
  try {
    return new URL(origem).host === req.headers.host;
  } catch {
    return false;
  }
}

// limite simples contra tentativa de adivinhar senha
const tentativas = new Map();
function bloqueado(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  const agora = Date.now();
  const t = tentativas.get(ip) ?? { n: 0, desde: agora };
  if (agora - t.desde > 15 * 60_000) Object.assign(t, { n: 0, desde: agora });
  t.n += 1;
  tentativas.set(ip, t);
  if (tentativas.size > 10_000) tentativas.clear();
  return t.n > 30;
}

const contaLogada = (req) => contas.contaDaSessao(lerCookie(req, COOKIE));

// ---------- rotas ----------

const PAGINAS = { '/': 'index.html', '/entrar': 'entrar.html', '/criar-conta': 'entrar.html', '/painel': 'painel.html', '/admin': 'admin.html' };

async function rotear(req, res) {
  const url = new URL(req.url, 'http://x');
  const rota = url.pathname;

  if (req.method === 'GET' && PAGINAS[rota]) return arquivo(res, PAGINAS[rota]);
  if (req.method === 'GET' && /^\/o\/[\w-]{10,64}$/.test(rota)) {
    const dona = banco.contaPorOverlay(rota.slice(3));
    if (!dona || dona.bloqueada) return arquivo404(res);
    return arquivo(res, 'jogo.html');
  }
  if (req.method === 'GET' && rota === '/saude') return json(res, 200, { ok: true, ...salas.estatisticas() });
  if (!rota.startsWith('/api/')) {
    if (req.method !== 'GET' || rota.endsWith('.html')) return arquivo404(res);
    return arquivo(res, rota);
  }

  // ----- API -----
  if (req.method !== 'GET' && !mesmaOrigem(req)) return json(res, 403, { erro: 'Origem não permitida.' });

  let corpo = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      corpo = await lerCorpo(req);
    } catch (e) {
      return json(res, 400, { erro: e.message });
    }
  }

  if (req.method === 'POST' && rota === '/api/criar-conta') {
    if (!cadastroAberto()) return json(res, 403, { erro: 'Cadastro fechado no momento.' });
    if (bloqueado(req)) return json(res, 429, { erro: 'Muitas tentativas. Espere alguns minutos.' });
    const r = await contas.criar(corpo);
    if (r.erro) return json(res, 400, r);
    const s = contas.abrirSessao(r.conta.id);
    return json(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, s.token, s.maxAge) });
  }

  if (req.method === 'POST' && rota === '/api/entrar') {
    if (bloqueado(req)) return json(res, 429, { erro: 'Muitas tentativas. Espere alguns minutos.' });
    const r = await contas.entrar(corpo);
    if (r.erro) return json(res, 401, r);
    const s = contas.abrirSessao(r.conta.id);
    return json(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, s.token, s.maxAge) });
  }

  if (req.method === 'POST' && rota === '/api/sair') {
    contas.fecharSessao(lerCookie(req, COOKIE));
    return json(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, '', 0) });
  }

  if (req.method === 'GET' && rota === '/api/info') return json(res, 200, { cadastroAberto: cadastroAberto() });

  const conta = contaLogada(req);
  if (!conta) return json(res, 401, { erro: 'Entre na sua conta.' });

  if (req.method === 'GET' && rota === '/api/eu') {
    return json(res, 200, { conta: contas.publica(conta), modelos: MODELOS, padrao: PADRAO });
  }

  if (req.method === 'PUT' && rota === '/api/tiktok') {
    const usuario = corpo.usuario === '' ? '' : validarUsuarioTikTok(corpo.usuario);
    if (usuario === null) return json(res, 400, { erro: 'Usuário do TikTok inválido. Use só o @, por exemplo: seu.usuario' });
    conta.tiktok = usuario;
    banco.gravarConta(conta);
    salas.existente(conta.id)?.atualizarConta(conta);
    return json(res, 200, { conta: contas.publica(conta) });
  }

  if (req.method === 'PUT' && rota === '/api/config') {
    conta.config = validarConfig(corpo.config);
    banco.gravarConta(conta);
    salas.existente(conta.id)?.atualizarConta(conta);
    return json(res, 200, { conta: contas.publica(conta) });
  }

  if (req.method === 'POST' && rota === '/api/novo-link') {
    conta.overlayToken = novoToken(18);
    banco.gravarConta(conta);
    // derruba telas abertas com o link antigo
    for (const c of salas.existente(conta.id)?.clientes ?? []) if (c.tipo === 'overlay' || c.tipo === 'previa') c.close(4001, 'link trocado');
    return json(res, 200, { conta: contas.publica(conta) });
  }

  if (rota.startsWith('/api/admin/')) return rotearAdmin(req, res, rota, conta, corpo);

  return json(res, 404, { erro: 'não encontrado' });
}

// ---------- área do admin ----------

function resumoConta(c) {
  const sala = salas.existente(c.id);
  const ranking = banco.ranking(c.id);
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    tiktok: c.tiktok,
    criadaEm: c.criadaEm,
    ultimoAcesso: c.ultimoAcesso ?? null,
    bloqueada: Boolean(c.bloqueada),
    admin: contas.ehAdmin(c),
    jogo: c.config?.titulo ?? '',
    sala: sala ? sala.infoConexao() : null,
    moedas: ranking.reduce((n, u) => n + (Number(u.moedas) || 0), 0),
    presenteadores: ranking.filter((u) => u.moedas > 0).length,
  };
}

async function rotearAdmin(req, res, rota, admin, corpo) {
  // para quem não é admin a área simplesmente não existe
  if (!contas.ehAdmin(admin)) return json(res, 404, { erro: 'não encontrado' });

  if (req.method === 'GET' && rota === '/api/admin/resumo') {
    const todas = banco.todasContas();
    const agora = Date.now();
    const desde = (ms) => todas.filter((c) => agora - Date.parse(c.criadaEm) < ms).length;
    return json(res, 200, {
      contas: todas.length,
      novas24h: desde(86_400_000),
      novas7d: desde(7 * 86_400_000),
      ativas7d: todas.filter((c) => c.ultimoAcesso && agora - Date.parse(c.ultimoAcesso) < 7 * 86_400_000).length,
      bloqueadas: todas.filter((c) => c.bloqueada).length,
      ...salas.estatisticas(),
      maxLives: salas.maxLives,
      cadastroAberto: cadastroAberto(),
      euler: Boolean(process.env.EULER_API_KEY),
      memoriaMb: Math.round(process.memoryUsage().rss / 1048576),
      noArDesde: new Date(INICIO).toISOString(),
    });
  }

  if (req.method === 'GET' && rota === '/api/admin/contas') {
    const lista = banco.todasContas().map(resumoConta).sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
    return json(res, 200, { contas: lista });
  }

  if (req.method === 'PUT' && rota === '/api/admin/ajustes') {
    if (typeof corpo.cadastroAberto === 'boolean') banco.gravarAjuste('cadastroAberto', corpo.cadastroAberto);
    return json(res, 200, { cadastroAberto: cadastroAberto() });
  }

  const m = rota.match(/^\/api\/admin\/conta\/([\w-]+)(?:\/(bloquear|desligar|senha))?$/);
  const alvo = m ? banco.conta(m[1]) : null;
  if (!alvo) return json(res, 404, { erro: 'Conta não encontrada.' });
  const acao = m[2];
  const ehVoce = alvo.id === admin.id;

  if (req.method === 'POST' && acao === 'bloquear') {
    if (ehVoce) return json(res, 400, { erro: 'Você não pode bloquear a própria conta.' });
    alvo.bloqueada = Boolean(corpo.bloqueada);
    banco.gravarConta(alvo);
    if (alvo.bloqueada) {
      banco.apagarSessoesDe(alvo.id);
      salas.encerrar(alvo.id);
    }
    return json(res, 200, { conta: resumoConta(alvo) });
  }

  if (req.method === 'POST' && acao === 'desligar') {
    salas.encerrar(alvo.id);
    return json(res, 200, { conta: resumoConta(alvo) });
  }

  if (req.method === 'POST' && acao === 'senha') {
    if (ehVoce) return json(res, 400, { erro: 'Para a sua conta, use uma senha que você escolheu.' });
    const senha = await contas.senhaTemporaria(alvo);
    return json(res, 200, { senha });
  }

  if (req.method === 'DELETE' && !acao) {
    if (ehVoce) return json(res, 400, { erro: 'Você não pode excluir a própria conta.' });
    salas.encerrar(alvo.id);
    banco.apagarConta(alvo.id);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { erro: 'não encontrado' });
}

const servidor = http.createServer((req, res) => {
  rotear(req, res).catch((erro) => {
    console.error(erro);
    if (!res.headersSent) json(res, 500, { erro: 'Erro interno.' });
  });
});

// ---------- tempo real (WebSocket) ----------
//   /ws?o=TOKEN   tela do jogo (só recebe)
//   /ws?painel=1  painel de quem está logado (recebe e manda comandos)

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

servidor.on('upgrade', (req, socket, cabeca) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws') return socket.destroy();
  let conta = null;
  let tipo = null;
  if (url.searchParams.get('o')) {
    conta = banco.contaPorOverlay(url.searchParams.get('o'));
    if (conta?.bloqueada) conta = null;
    // a prévia do painel não conta como tela da live e não liga a conexão sozinha
    tipo = url.searchParams.get('previa') ? 'previa' : 'overlay';
  } else if (url.searchParams.get('painel') && mesmaOrigem(req)) {
    conta = contaLogada(req);
    tipo = 'painel';
  }
  if (!conta) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, cabeca, (ws) => {
    const sala = salas.obter(conta);
    sala.entrar(ws, tipo);
    if (tipo !== 'painel') return;
    ws.on('message', (bruto) => {
      let msg;
      try {
        msg = JSON.parse(bruto);
      } catch {
        return;
      }
      const r = sala.comando(msg);
      if (r?.erro) ws.send(JSON.stringify({ t: 'aviso', d: r.erro }));
      sala.enviar({ t: 'estado', d: sala.jogo.estado() });
    });
  });
});

// mantém conexões vivas atrás de proxies que derrubam conexões paradas
setInterval(() => {
  for (const ws of wss.clients) if (ws.readyState === 1) ws.ping();
}, 25_000);

servidor.listen(PORTA, HOST, () => {
  console.log(`\n  🎮 ARENIX no ar: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORTA}`);
  console.log(`  📁 dados em ${DATA_DIR}\n`);
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    salas.fecharTodas();
    banco.salvarAgora();
    process.exit(0);
  });
}
