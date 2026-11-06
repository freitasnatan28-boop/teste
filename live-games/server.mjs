// Servidor do jogo: lê a live (ou o simulador), roda o jogo e manda tudo para a tela por WebSocket.
//
//   npm start                      -> conecta na live do usuário em config.json
//   npm start -- --usuario=fulano  -> conecta na live de @fulano
//   npm run simular                -> live falsa para testar
//
// Tela do jogo:     http://localhost:8080/
// Painel de controle: http://localhost:8080/controle

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Jogo } from './src/jogo.mjs';
import { LiveTikTok } from './src/tiktok.mjs';
import { Simulador, usuarioFalso, presenteFalso, PRESENTES } from './src/simulador.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const ARQ_RANKING = path.join(RAIZ, 'data', 'ranking.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));
const usuarioTikTok = String(args.usuario || process.env.TIKTOK_USUARIO || config.tiktok.usuario || '');
const modoSimulacao = Boolean(args.simular) || !usuarioTikTok || usuarioTikTok === 'SEU_USUARIO_AQUI';
const porta = Number(args.porta || process.env.PORTA || config.servidor.porta || 8080);
const host = String(args.host || config.servidor.host || '127.0.0.1');

// ---------- jogo + ranking salvo ----------

const jogo = new Jogo(config.jogo);
try {
  jogo.importarRanking(JSON.parse(fs.readFileSync(ARQ_RANKING, 'utf8')));
  console.log('ranking anterior carregado (use "Nova live" no painel para zerar)');
} catch {
  /* primeira vez */
}

let rankingMudou = false;
setInterval(() => {
  if (!rankingMudou) return;
  rankingMudou = false;
  fs.mkdirSync(path.dirname(ARQ_RANKING), { recursive: true });
  fs.writeFile(ARQ_RANKING, JSON.stringify(jogo.exportarRanking()), () => {});
}, 5000);

// ---------- fonte dos eventos ----------

const fonte = modoSimulacao ? new Simulador(jogo.times) : new LiveTikTok({ usuario: usuarioTikTok, eulerApiKey: config.tiktok.eulerApiKey || process.env.EULER_API_KEY });
let statusConexao = modoSimulacao ? 'simulando' : 'desconectado';

fonte.on('evento', (evento) => {
  jogo.processar(evento);
  if (evento.tipo === 'presente' || evento.tipo === 'curtida') rankingMudou = true;
});
fonte.on('status', (s) => {
  statusConexao = s;
  enviarTodos({ t: 'conexao', d: infoConexao() });
});
fonte.on('log', (msg) => console.log(`[tiktok] ${msg}`));

const infoConexao = () => ({ status: statusConexao, simulacao: modoSimulacao, usuario: usuarioTikTok });

// ---------- servidor web ----------

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const ROTAS = { '/': '/index.html', '/controle': '/controle.html' };

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const caminho = ROTAS[url.pathname] ?? url.pathname;
  const arquivo = path.normalize(path.join(PUBLICO, caminho));
  if (!arquivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404).end('não encontrado');
      return;
    }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arquivo)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(conteudo);
  });
});

const wss = new WebSocketServer({ server: servidor });

function enviarTodos(msg) {
  const texto = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(texto);
}

jogo.on('fx', (fx) => {
  enviarTodos({ t: 'fx', d: fx });
  if (fx.tipo === 'fimRodada') console.log(fx.vencedor ? `rodada: ${fx.vencedor.nome} venceu` : 'rodada sem vencedor');
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ t: 'estado', d: jogo.estado() }));
  ws.send(JSON.stringify({ t: 'conexao', d: infoConexao() }));
  ws.on('message', (bruto) => {
    let msg;
    try {
      msg = JSON.parse(bruto);
    } catch {
      return;
    }
    comando(msg);
    enviarTodos({ t: 'estado', d: jogo.estado() });
  });
});

let simuladorManual = null;

function comando({ cmd, ...dados }) {
  switch (cmd) {
    case 'iniciar':
      return jogo.iniciar();
    case 'pausar':
      return jogo.pausar();
    case 'encerrar':
      return jogo.encerrarRodada();
    case 'zerarPartida':
      return jogo.zerarPartida();
    case 'novaLive':
      jogo.zerarRanking();
      jogo.zerarPartida();
      rankingMudou = true;
      return;
    case 'testar': {
      // botões de teste do painel (funcionam mesmo conectado na live de verdade)
      const usuario = dados.usuarioId ? { id: dados.usuarioId, nome: dados.nome, usuario: dados.nome, foto: '' } : usuarioFalso();
      if (dados.tipo === 'presente') {
        const presente = PRESENTES.find((p) => p.nome === dados.presente) ?? PRESENTES[0];
        jogo.processar(presenteFalso(usuario, presente, Number(dados.quantidade) || 1));
        rankingMudou = true;
      } else if (dados.tipo === 'curtida') jogo.processar({ tipo: 'curtida', usuario, quantidade: Number(dados.quantidade) || 50 });
      else if (dados.tipo === 'chat') jogo.processar({ tipo: 'chat', usuario, texto: String(dados.texto ?? '') });
      return;
    }
    case 'simularAuto':
      if (simuladorManual) {
        simuladorManual.parar();
        simuladorManual = null;
      } else if (!modoSimulacao) {
        simuladorManual = new Simulador(jogo.times);
        simuladorManual.on('evento', (e) => jogo.processar(e));
        simuladorManual.iniciar();
      }
      return;
  }
}

// estado para a tela ~6x por segundo
setInterval(() => {
  jogo.tick();
  if (wss.clients.size) enviarTodos({ t: 'estado', d: jogo.estado() });
}, 160);

servidor.listen(porta, host, async () => {
  const base = `http://${host === '0.0.0.0' ? 'localhost' : host}:${porta}`;
  console.log('');
  console.log(`  🎮 Tela do jogo ........ ${base}/`);
  console.log(`  🎛️  Painel de controle .. ${base}/controle`);
  console.log(modoSimulacao ? '  🧪 MODO SIMULAÇÃO (live falsa)' : `  📡 Lendo a live de @${usuarioTikTok}`);
  console.log('');
  jogo.iniciar();
  await fonte.iniciar();
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => {
    fs.mkdirSync(path.dirname(ARQ_RANKING), { recursive: true });
    fs.writeFileSync(ARQ_RANKING, JSON.stringify(jogo.exportarRanking()));
    await fonte.parar();
    process.exit(0);
  });
}
