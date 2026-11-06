// Conexão com a live do TikTok (biblioteca não oficial "tiktok-live-connector")
// e tradução dos eventos para o formato simples que o jogo entende.

import { EventEmitter } from 'node:events';

const primeiro = (...valores) => valores.find((v) => v !== undefined && v !== null && v !== '');

export function lerUsuario(user) {
  if (!user) return null;
  const usuario = primeiro(user.uniqueId, user.displayId, user.username);
  const id = String(primeiro(user.userId, user.id, usuario) ?? '');
  if (!id) return null;
  return {
    id,
    usuario: usuario ?? '',
    nome: primeiro(user.nickname, usuario) ?? 'anônimo',
    foto: primeiro(user.profilePictureUrl, user.profilePicture?.urls?.[0], user.avatarThumb?.urlList?.[0], user.avatarMedium?.urlList?.[0]) ?? '',
  };
}

// Presentes em sequência ("combo", giftType 1) chegam várias vezes com repeatCount crescente
// e uma última vez com repeatEnd. Contamos só a diferença a cada evento: os pontos sobem na hora
// e nada é contado duas vezes.
export class ContadorDeCombos {
  constructor(agora = Date.now) {
    this.agora = agora;
    this.vistos = new Map();
  }

  novos(chave, repeatCount, fim) {
    const anterior = this.vistos.get(chave)?.qtd ?? 0;
    const delta = Math.max(0, repeatCount - anterior);
    if (fim) this.vistos.delete(chave);
    else this.vistos.set(chave, { qtd: Math.max(anterior, repeatCount), em: this.agora() });
    if (this.vistos.size > 500) {
      const limite = this.agora() - 120_000;
      for (const [k, v] of this.vistos) if (v.em < limite) this.vistos.delete(k);
    }
    return delta;
  }
}

export function lerPresente(data, combos) {
  const usuario = lerUsuario(data.user);
  if (!usuario) return null;
  const info = data.extendedGiftInfo ?? {};
  const det = data.giftDetails ?? {};
  const gift = data.gift ?? {};
  const moedasUnidade = Number(primeiro(det.diamondCount, gift.diamondCount, info.diamond_count, info.diamondCount, 0));
  const tipo = Number(primeiro(det.giftType, gift.type, info.type, 0));
  const repeatCount = Math.max(1, Number(data.repeatCount) || 1);
  const fim = Boolean(data.repeatEnd);
  const giftId = String(primeiro(data.giftId, gift.id, ''));

  let quantidade = repeatCount;
  if (tipo === 1) {
    const chave = `${usuario.id}:${giftId}:${data.groupId ?? ''}`;
    quantidade = combos.novos(chave, repeatCount, fim);
    if (quantidade === 0) return null;
  }

  return {
    tipo: 'presente',
    usuario,
    quantidade,
    moedas: moedasUnidade * quantidade,
    nomePresente: primeiro(det.giftName, gift.name, info.name, 'presente'),
    imagem: primeiro(det.giftImage?.giftPictureUrl, gift.image?.urlList?.[0], gift.icon?.urlList?.[0], info.image?.url_list?.[0]) ?? '',
  };
}

export class LiveTikTok extends EventEmitter {
  constructor({ usuario, eulerApiKey }) {
    super();
    this.usuario = usuario.replace(/^@/, '').trim();
    this.eulerApiKey = eulerApiKey || undefined;
    this.combos = new ContadorDeCombos();
    this.conexao = null;
    this.parado = false;
    this.tentativas = 0;
    this.status = 'desconectado';
  }

  async iniciar() {
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
    this.conexao = new TikTokLiveConnection(this.usuario, {
      enableExtendedGiftInfo: true,
      processInitialData: false,
      ...(this.eulerApiKey ? { signApiKey: this.eulerApiKey } : {}),
    });
    const c = this.conexao;

    c.on(WebcastEvent.CHAT, (d) => {
      const usuario = lerUsuario(d.user);
      const texto = primeiro(d.comment, d.content);
      if (usuario && texto) this.emit('evento', { tipo: 'chat', usuario, texto });
    });
    c.on(WebcastEvent.LIKE, (d) => {
      const usuario = lerUsuario(d.user);
      const quantidade = Number(primeiro(d.likeCount, d.count, 1));
      if (usuario) this.emit('evento', { tipo: 'curtida', usuario, quantidade });
    });
    c.on(WebcastEvent.GIFT, (d) => {
      const presente = lerPresente(d, this.combos);
      if (presente) this.emit('evento', presente);
    });
    c.on(WebcastEvent.FOLLOW, (d) => {
      const usuario = lerUsuario(d.user);
      if (usuario) this.emit('evento', { tipo: 'seguir', usuario });
    });
    c.on(WebcastEvent.SHARE, (d) => {
      const usuario = lerUsuario(d.user);
      if (usuario) this.emit('evento', { tipo: 'compartilhar', usuario });
    });
    c.on(WebcastEvent.STREAM_END, () => {
      this.mudarStatus('live encerrada');
    });
    c.on(ControlEvent.DISCONNECTED, () => {
      if (!this.parado) this.reconectarDepois();
    });
    c.on(ControlEvent.ERROR, (erro) => {
      const msg = erro?.exception?.message ?? erro?.message ?? erro?.info;
      // falhas de conexão já são avisadas em conectar(); aqui só o que acontece durante a live
      if (msg && this.status === 'conectado') this.emit('log', `erro: ${msg}`);
    });

    await this.conectar();
  }

  async conectar() {
    this.mudarStatus('conectando');
    try {
      const estado = await this.conexao.connect();
      this.tentativas = 0;
      this.mudarStatus('conectado');
      this.emit('log', `conectado à live de @${this.usuario} (sala ${estado.roomId})`);
    } catch (erro) {
      const msg = erro?.message ?? String(erro);
      this.emit('log', `não conectou em @${this.usuario}: ${msg}`);
      this.mudarStatus(/online|offline|not.*live/i.test(msg) || erro?.name === 'UserOfflineError' ? 'você não está ao vivo' : 'erro ao conectar');
      this.reconectarDepois();
    }
  }

  reconectarDepois() {
    if (this.parado || this.timer) return;
    this.tentativas += 1;
    const espera = Math.min(60, 5 * this.tentativas);
    this.emit('log', `tentando de novo em ${espera}s…`);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.conectar();
    }, espera * 1000);
  }

  mudarStatus(status) {
    this.status = status;
    this.emit('status', status);
  }

  async parar() {
    this.parado = true;
    clearTimeout(this.timer);
    await this.conexao?.disconnect().catch(() => {});
  }
}
