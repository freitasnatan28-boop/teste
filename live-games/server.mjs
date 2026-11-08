// Site ARENIX: cada pessoa cria uma conta, liga o jogo na própria live do TikTok
// e recebe um link exclusivo da tela do jogo para colocar no TikTok LIVE Studio / OBS.
//
//   npm start      -> http://localhost:8080
//
// Variáveis de ambiente (opcionais):
//   PORT           porta (padrão 8080; serviços de hospedagem já definem sozinhos)
//   HOST           padrão 0.0.0.0 quando PORT existe, senão 127.0.0.1
//   DATA_DIR       pasta onde ficam contas e rankings — use um disco persistente
//                  (no Railway, se não for definida, usa sozinho o caminho do volume)
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
import { MODELOS, PADRAO, VOZES, ESTILOS_VOZ, CENARIOS, MODOS, PACOTES, CAMPOS_MIDIA, validarConfig, validarUsuarioTikTok } from './src/configuracao.mjs';
import { obterAudio, guardarAudio } from './src/audios.mjs';
import { iaDisponivel, gerarVoz } from './src/ia.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
// Onde ficam as contas: DATA_DIR, ou o volume do Railway (ele avisa o caminho), ou ./data
const VOLUME_RAILWAY = process.env.RAILWAY_VOLUME_MOUNT_PATH || '';
const NO_RAILWAY = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
const DATA_DIR = path.resolve(process.env.DATA_DIR || VOLUME_RAILWAY || path.join(RAIZ, 'data'));
const PORTA = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const banco = new Banco(path.join(DATA_DIR, 'banco.json'));
const PASTA_MIDIA = path.join(DATA_DIR, 'midia');
const ultimaAmostra = new Map();
const URL_MIDIA = /^\/m\/[\w-]{1,80}\.(png|jpg|webp|gif|mp4|webm)$/;
function apagarMidia(url) {
  if (!URL_MIDIA.test(String(url))) return;
  fs.unlink(path.join(PASTA_MIDIA, url.slice(3)), () => {});
}
const contas = new Contas(banco, { emailsAdmin: String(process.env.ADMIN_EMAILS ?? '').split(',') });
const cadastroAberto = () => banco.ajuste('cadastroAberto', process.env.CADASTRO !== 'fechado');
const INICIO = Date.now();

function armazenamento() {
  const noVolume = !NO_RAILWAY || (VOLUME_RAILWAY && (DATA_DIR + path.sep).startsWith(path.resolve(VOLUME_RAILWAY) + path.sep));
  return {
    pasta: DATA_DIR,
    gravando: banco.gravando,
    erro: banco.erroGravacao,
    salvoEm: banco.salvoEm ? new Date(banco.salvoEm).toISOString() : null,
    railway: NO_RAILWAY,
    volume: Boolean(VOLUME_RAILWAY),
    seguro: banco.gravando && Boolean(noVolume),
  };
}
const salas = new Salas({ banco, eulerApiKey: process.env.EULER_API_KEY || undefined, maxLives: Number(process.env.MAX_LIVES) || 50 });

// ---------- utilidades HTTP ----------

const TIPOS = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.gif': 'image/gif', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
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
    // imagens: o navegador pode guardar, mas confere se mudou (assim uma imagem nova aparece logo após publicar)
    const cache = tipo.startsWith('image/') ? 'public, max-age=300, must-revalidate' : 'no-cache';
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

function lerBinario(req, limite) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', (p) => {
      tamanho += p.length;
      if (tamanho > limite) {
        reject(new Error('grande'));
        req.destroy();
      } else partes.push(p);
    });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

// descobre o tipo pelo conteúdo do arquivo (não confia no nome nem no que o navegador diz)
function tipoDoArquivo(b) {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (b.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  return null;
}

// entrega arquivos com suporte a pedaços (Range): vídeos tocam e repetem sem travar
function servirMidia(req, res, caminho) {
  fs.stat(caminho, (erro, info) => {
    if (erro || !info.isFile()) return arquivo404(res);
    const tipo = TIPOS[path.extname(caminho)] ?? 'application/octet-stream';
    const base = { 'content-type': tipo, 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable', ...SEGURANCA };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (m && (m[1] || m[2])) {
      let ini = m[1] ? Number(m[1]) : info.size - Number(m[2]);
      let fim = m[1] && m[2] ? Number(m[2]) : info.size - 1;
      ini = Math.max(0, ini);
      fim = Math.min(fim, info.size - 1);
      if (ini > fim) {
        res.writeHead(416, { 'content-range': `bytes */${info.size}` });
        return res.end();
      }
      res.writeHead(206, { ...base, 'content-range': `bytes ${ini}-${fim}/${info.size}`, 'content-length': fim - ini + 1 });
      return fs.createReadStream(caminho, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { ...base, 'content-length': info.size });
    fs.createReadStream(caminho).pipe(res);
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
    return arquivo(res, validarConfig(dona.config).modo === 'personagem' ? 'personagem.html' : 'jogo.html');
  }
  // voz do personagem (gerada na hora, guardada por poucos minutos)
  if (req.method === 'GET' && /^\/voz\/[\w-]{10,40}\.mp3$/.test(rota)) {
    const audio = obterAudio(rota.slice(5, -4));
    if (!audio) return json(res, 404, { erro: 'áudio expirou' });
    res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': audio.length, 'cache-control': 'private, max-age=600', ...SEGURANCA });
    return res.end(audio);
  }
  // imagens e vídeos enviados pelos usuários (personagem e fundo)
  if (req.method === 'GET' && URL_MIDIA.test(rota)) return servirMidia(req, res, path.join(PASTA_MIDIA, rota.slice(3)));
  if (req.method === 'GET' && rota === '/saude') return json(res, 200, { ok: true, dadosSalvando: armazenamento().seguro, ...salas.estatisticas() });
  if (!rota.startsWith('/api/')) {
    if (req.method !== 'GET' || rota.endsWith('.html')) return arquivo404(res);
    return arquivo(res, rota);
  }

  // ----- API -----
  if (req.method !== 'GET' && !mesmaOrigem(req)) return json(res, 403, { erro: 'Origem não permitida.' });

  let corpo = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      if (rota !== '/api/personagem/arquivo') corpo = await lerCorpo(req);
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
    return json(res, 200, { conta: contas.publica(conta), modelos: MODELOS, padrao: PADRAO, modos: MODOS, vozes: VOZES, estilosVoz: Object.fromEntries(Object.entries(ESTILOS_VOZ).map(([k, v]) => [k, v.rotulo])), cenarios: CENARIOS, pacotes: PACOTES, ia: iaDisponivel() });
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
    // junta com o que já existe: o painel pode mandar só uma parte (ex.: só o personagem)
    const atual = validarConfig(conta.config);
    const novo = corpo.config && typeof corpo.config === 'object' ? corpo.config : {};
    // arquivos do personagem só mudam pelo envio de arquivo
    const personagem = { ...atual.personagem, ...(novo.personagem ?? {}), midia: atual.personagem.midia };
    conta.config = validarConfig({ ...atual, ...novo, personagem });
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

  if (req.method === 'POST' && rota === '/api/personagem/arquivo') {
    const campo = url.searchParams.get('campo');
    if (!CAMPOS_MIDIA.includes(campo)) return json(res, 400, { erro: 'Campo de arquivo inválido.' });
    const atual = validarConfig(conta.config);
    let novoUrl = '';
    if (url.searchParams.get('remover') !== '1') {
      const video = campo.startsWith('video');
      const limite = video || campo === 'fundo' ? 40 * 1024 * 1024 : 8 * 1024 * 1024;
      let buf;
      try {
        buf = await lerBinario(req, limite);
      } catch (e) {
        return json(res, 400, { erro: e.message === 'grande' ? `Arquivo grande demais (máximo ${limite / 1048576} MB).` : 'Não consegui receber o arquivo.' });
      }
      const ext = tipoDoArquivo(buf);
      const aceitos = video ? ['mp4', 'webm'] : campo === 'fundo' ? ['png', 'jpg', 'webp', 'gif', 'mp4', 'webm'] : ['png', 'jpg', 'webp', 'gif'];
      if (!ext || !aceitos.includes(ext)) return json(res, 400, { erro: video ? 'Envie um vídeo MP4 ou WEBM.' : campo === 'fundo' ? 'Envie uma imagem (PNG, JPG, WEBP, GIF) ou vídeo (MP4, WEBM).' : 'Envie uma imagem PNG, JPG, WEBP ou GIF.' });
      const nome = `${conta.id}-${campo}-${novoToken(6)}.${ext}`;
      try {
        fs.mkdirSync(PASTA_MIDIA, { recursive: true });
        fs.writeFileSync(path.join(PASTA_MIDIA, nome), buf);
      } catch (erro) {
        return json(res, 500, { erro: `Não consegui salvar o arquivo: ${erro.message}` });
      }
      novoUrl = `/m/${nome}`;
    }
    apagarMidia(atual.personagem.midia[campo]);
    const personagem = { ...atual.personagem, midia: { ...atual.personagem.midia, [campo]: novoUrl } };
    // mandou o próprio personagem ou o próprio fundo: já passa a usar
    if (novoUrl && campo !== 'fundo') personagem.pacote = 'proprio';
    if (novoUrl && campo === 'fundo') personagem.cenario = 'proprio';
    conta.config = validarConfig({ ...atual, personagem });
    banco.gravarConta(conta);
    salas.existente(conta.id)?.atualizarConta(conta);
    return json(res, 200, { conta: contas.publica(conta) });
  }

  if (req.method === 'POST' && rota === '/api/personagem/ouvir') {
    if (!iaDisponivel()) return json(res, 400, { erro: 'A voz com IA ainda não está ligada no site (falta a chave OPENAI_API_KEY).' });
    const agora = Date.now();
    if (agora - (ultimaAmostra.get(conta.id) ?? 0) < 3000) return json(res, 429, { erro: 'Espere uns segundinhos para ouvir de novo.' });
    ultimaAmostra.set(conta.id, agora);
    const p = validarConfig({ personagem: corpo.personagem }).personagem;
    try {
      const audio = await gerarVoz(p, `Oi, pessoal! Eu sou ${p.nome}, e essa é a minha voz. Me pergunte qualquer coisa no chat!`);
      return json(res, 200, { audio: guardarAudio(audio) });
    } catch (erro) {
      return json(res, 502, { erro: `A voz não respondeu: ${erro.message}` });
    }
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
    modoJogo: validarConfig(c.config).modo,
    respostasIAHoje: banco.respostasIAHoje(c.id),
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
      ia: iaDisponivel(),
      memoriaMb: Math.round(process.memoryUsage().rss / 1048576),
      noArDesde: new Date(INICIO).toISOString(),
      armazenamento: armazenamento(),
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
    for (const url of Object.values(validarConfig(alvo.config).personagem.midia)) apagarMidia(url);
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
    if (tipo !== 'painel') {
      // a tela do jogo só pode avisar que terminou de tocar uma fala
      ws.on('message', (bruto) => {
        try {
          const msg = JSON.parse(bruto);
          if (msg?.cmd === 'falaTerminou' && tipo === 'overlay') sala.atendente.falaTerminou(String(msg.id));
        } catch {}
      });
      return;
    }
    ws.on('message', (bruto) => {
      let msg;
      try {
        msg = JSON.parse(bruto);
      } catch {
        return;
      }
      const r = sala.comando(msg);
      if (r?.erro) ws.send(JSON.stringify({ t: 'aviso', d: r.erro }));
      sala.enviar({ t: 'estado', d: sala.estado() });
    });
  });
});

// mantém conexões vivas atrás de proxies que derrubam conexões paradas
setInterval(() => {
  for (const ws of wss.clients) if (ws.readyState === 1) ws.ping();
}, 25_000);

servidor.listen(PORTA, HOST, () => {
  console.log(`\n  🎮 ARENIX no ar: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORTA}`);
  const a = armazenamento();
  console.log(`  📁 dados em ${DATA_DIR} ${a.seguro ? '(gravando ✅)' : '(⚠️ NÃO estão sendo guardados com segurança)'}\n`);
  if (NO_RAILWAY && !VOLUME_RAILWAY) console.error('  ⚠️  Nenhum volume do Railway ligado a este serviço: as contas somem a cada atualização.\n');
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    salas.fecharTodas();
    banco.salvarAgora();
    process.exit(0);
  });
}
