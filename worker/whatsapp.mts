// Robô do WhatsApp (roda separado do painel: `npm run whatsapp` ou pelo PM2).
//
// O que ele faz:
//  - conecta seu número por QR code (a sessão fica salva na pasta sessions/)
//  - lista os grupos em que você é ADMIN
//  - envia a fila de ofertas SÓ para os grupos que você marcou, com imagem + texto
//  - roda o piloto automático nos horários configurados
//
// Anti-banimento (conservador por padrão):
//  - intervalo aleatório entre um grupo e outro (20–60s)
//  - limite de mensagens por hora
//  - pausa automática de 15 min em qualquer erro de envio
//  - só envia para grupos (@g.us): nunca manda mensagem privada nem adiciona pessoas
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import makeWASocket, {
  areJidsSameUser,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { prisma } from "../src/lib/db";
import { lerConfig, salvarConfig } from "../src/lib/configuracoes";
import { lerPiloto } from "../src/lib/piloto-config";
import { tickPiloto, rodarPiloto } from "../src/services/piloto";

const SESSAO = "principal";
const PASTA = path.resolve("sessions", SESSAO);
const PAUSA_ERRO_MS = 15 * 60_000;
const VALIDADE_JOB_MS = 2 * 3600_000; // oferta na fila há mais de 2h não é enviada (preço pode ter mudado)

let sock: WASocket | null = null;
let conectado = false;
let tentativas = 0;
let proximoEnvioPermitido = 0;
let enviando = false;

// ---------- log (terminal + últimas linhas no painel) ----------
const ultimas: string[] = [];
function log(msg: string) {
  const linha = `[${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}] ${msg}`;
  console.log(linha);
  ultimas.unshift(linha);
  ultimas.splice(60);
  salvarConfig("wa_log", JSON.stringify(ultimas)).catch(() => {});
}

async function status(data: { status?: string; qr?: string | null; phone?: string | null; lastError?: string | null; pausedUntil?: Date | null }) {
  await prisma.whatsAppSession.upsert({ where: { id: SESSAO }, create: { id: SESSAO, ...data }, update: data });
}

// ---------- conexão ----------
async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState(PASTA);
  let version: [number, number, number] | undefined;
  try {
    version = (await fetchLatestBaileysVersion({ signal: AbortSignal.timeout(8000) })).version;
  } catch {
    version = undefined;
  }
  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: "warn" }),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sock.ev.on("creds.update", saveCreds);
  // Se ficar "conectando" sem resposta por 60s, reinicia (evita travar para sempre)
  const atual = sock;
  let respondeu = false;
  setTimeout(() => {
    if (!respondeu && sock === atual && !conectado) {
      log("sem resposta do WhatsApp em 60s — reiniciando a conexão");
      status({ status: "desconectado", lastError: "Sem resposta do WhatsApp. Confira a internet do computador/servidor. Tentando de novo…" }).catch(() => {});
      atual.end(undefined);
    }
  }, 60_000);
  sock.ev.on("connection.update", async (u) => {
    if (u.qr || u.connection === "open" || u.connection === "close") respondeu = true;
    if (u.qr) {
      await status({ status: "aguardando_qr", qr: u.qr });
      log("QR code novo — escaneie pelo painel (WhatsApp → Conectar)");
    }
    if (u.connection === "open") {
      conectado = true;
      tentativas = 0;
      const me = sock?.user;
      await status({ status: "conectado", qr: null, phone: me?.id ? jidNormalizedUser(me.id).split("@")[0] : null, lastError: null });
      log(`conectado como ${me?.id ?? "?"}`);
      await sincronizarGrupos().catch((e) => log(`erro ao listar grupos: ${e?.message ?? e}`));
    }
    if (u.connection === "close") {
      conectado = false;
      const codigo = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      if (codigo === DisconnectReason.loggedOut) {
        log("o número foi desconectado pelo celular (saiu do WhatsApp Web). Conecte de novo pelo QR code.");
        fs.rmSync(PASTA, { recursive: true, force: true });
        await status({ status: "desconectado", qr: null, lastError: "Número desconectado pelo celular. Escaneie o QR de novo." });
        setTimeout(conectar, 3000);
        return;
      }
      tentativas++;
      const espera = Math.min(60_000, 2000 * 2 ** Math.min(tentativas, 5));
      await status({ status: "desconectado", lastError: `Conexão caiu (código ${codigo ?? "?"}). Reconectando em ${Math.round(espera / 1000)}s…` });
      log(`conexão caiu (código ${codigo ?? "?"}), tentando de novo em ${Math.round(espera / 1000)}s`);
      setTimeout(conectar, espera);
    }
  });
}

// ---------- grupos ----------
async function sincronizarGrupos() {
  if (!sock?.user) return;
  const meJid = jidNormalizedUser(sock.user.id);
  const meLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : undefined;
  const grupos = await sock.groupFetchAllParticipating();
  const vistos = new Set<string>();
  let admins = 0;
  for (const g of Object.values(grupos)) {
    vistos.add(g.id);
    const eu = g.participants.find(
      (p) =>
        areJidsSameUser(p.id, meJid) ||
        (meLid && areJidsSameUser(p.id, meLid)) ||
        (p.phoneNumber && areJidsSameUser(p.phoneNumber, meJid)) ||
        (meLid && p.lid && areJidsSameUser(p.lid, meLid)),
    );
    const isAdmin = Boolean(eu?.admin);
    if (isAdmin) admins++;
    await prisma.whatsAppGroup.upsert({
      where: { jid: g.id },
      create: { jid: g.id, sessionId: SESSAO, name: g.subject || g.id, participants: g.participants.length, isAdmin },
      update: { name: g.subject || g.id, participants: g.participants.length, isAdmin },
    });
  }
  // Grupos de que você saiu: deixam de receber
  await prisma.whatsAppGroup.updateMany({ where: { jid: { notIn: [...vistos] } }, data: { isAdmin: false, enabled: false } });
  log(`grupos atualizados: ${vistos.size} no total, você é admin em ${admins}`);
}

// ---------- envio da fila ----------
async function processarFila() {
  if (enviando || !conectado || !sock) return;
  if (Date.now() < proximoEnvioPermitido) return;
  const sessao = await prisma.whatsAppSession.findUnique({ where: { id: SESSAO } });
  if (sessao?.pausedUntil && sessao.pausedUntil.getTime() > Date.now()) return;

  const cfg = await lerPiloto();
  const umaHora = new Date(Date.now() - 3600_000);
  const naUltimaHora = await prisma.sendJob.count({ where: { status: "enviado", sentAt: { gte: umaHora } } });
  if (naUltimaHora >= cfg.limitePorHora) return;

  const job = await prisma.sendJob.findFirst({ where: { status: "pendente", scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" } });
  if (!job) return;

  // Regras de segurança antes de enviar
  if (Date.now() - job.scheduledAt.getTime() > VALIDADE_JOB_MS) {
    await prisma.sendJob.update({ where: { id: job.id }, data: { status: "cancelado", error: "expirou na fila (mais de 2h de atraso)" } });
    return;
  }
  const grupo = await prisma.whatsAppGroup.findUnique({ where: { jid: job.groupJid } });
  if (!job.groupJid.endsWith("@g.us") || !grupo?.enabled || !grupo.isAdmin) {
    await prisma.sendJob.update({ where: { id: job.id }, data: { status: "cancelado", error: "grupo desligado ou você não é mais admin" } });
    return;
  }

  enviando = true;
  try {
    if (job.imageUrl) {
      try {
        await sock.sendMessage(job.groupJid, { image: { url: job.imageUrl }, caption: job.text });
      } catch (e) {
        log(`imagem falhou (${(e as Error)?.message ?? e}), enviando só o texto`);
        await sock.sendMessage(job.groupJid, { text: job.text });
      }
    } else {
      await sock.sendMessage(job.groupJid, { text: job.text });
    }
    await prisma.sendJob.update({ where: { id: job.id }, data: { status: "enviado", sentAt: new Date(), attempts: { increment: 1 } } });
    await prisma.whatsAppGroup.update({ where: { jid: job.groupJid }, data: { lastSentAt: new Date() } });
    const restantes = await prisma.sendJob.count({ where: { messageId: job.messageId, status: "pendente" } });
    if (restantes === 0) await prisma.offerMessage.update({ where: { id: job.messageId }, data: { status: "enviada", sentAt: new Date() } });
    log(`enviado para "${grupo.name}"`);
    const intervalo = cfg.intervaloMin + Math.random() * Math.max(0, cfg.intervaloMax - cfg.intervaloMin);
    proximoEnvioPermitido = Date.now() + intervalo * 1000;
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    await prisma.sendJob.update({ where: { id: job.id }, data: { status: job.attempts >= 1 ? "erro" : "pendente", attempts: { increment: 1 }, error: msg.slice(0, 300) } });
    const ate = new Date(Date.now() + PAUSA_ERRO_MS);
    await status({ pausedUntil: ate, lastError: `Erro ao enviar para "${grupo.name}": ${msg.slice(0, 200)}. Envios pausados por 15 min.` });
    log(`ERRO ao enviar para "${grupo.name}": ${msg} — pausando envios por 15 min`);
  } finally {
    enviando = false;
  }
}

// ---------- comandos vindos do painel ----------
async function lerComandos() {
  const cmd = await lerConfig("wa_comando");
  if (!cmd) return;
  await salvarConfig("wa_comando", null);
  if (cmd === "sincronizar") await sincronizarGrupos().catch((e) => log(`erro ao listar grupos: ${e?.message ?? e}`));
  if (cmd === "sair") {
    log("desconectando o número a pedido do painel");
    try {
      await sock?.logout();
    } catch {
      fs.rmSync(PASTA, { recursive: true, force: true });
    }
  }
  if (cmd === "piloto_agora") {
    log("piloto: rodada manual pedida pelo painel");
    await rodarPiloto(log, "manual").catch((e) => log(`piloto falhou: ${e?.message ?? e}`));
  }
}

// ---------- laço principal ----------
async function main() {
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  await status({ status: "desconectado", qr: null });
  log("robô do WhatsApp iniciado");
  await conectar();
  setInterval(() => processarFila().catch((e) => log(`fila: ${e?.message ?? e}`)), 5_000);
  setInterval(() => lerComandos().catch((e) => log(`comando: ${e?.message ?? e}`)), 3_000);
  setInterval(() => tickPiloto(log).catch((e) => log(`piloto: ${e?.message ?? e}`)), 60_000);
  // Sinal de vida: o painel usa para saber se o robô está ligado
  const batimento = () => salvarConfig("wa_heartbeat", String(Date.now())).catch(() => {});
  batimento();
  setInterval(batimento, 20_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
