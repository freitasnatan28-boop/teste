// Guarda na memória, por poucos minutos, os áudios das falas do personagem (servidos em /voz/<id>.mp3).
import crypto from 'node:crypto';

const VIDA_MS = 10 * 60_000;
const MAXIMO = 300;
const audios = new Map();

export function guardarAudio(buf) {
  const id = crypto.randomBytes(16).toString('base64url');
  audios.set(id, { buf, em: Date.now() });
  if (audios.size > MAXIMO) audios.delete(audios.keys().next().value);
  return `/voz/${id}.mp3`;
}

export function obterAudio(id) {
  const a = audios.get(id);
  if (!a) return null;
  if (Date.now() - a.em > VIDA_MS) {
    audios.delete(id);
    return null;
  }
  return a.buf;
}

setInterval(() => {
  const limite = Date.now() - VIDA_MS;
  for (const [id, a] of audios) if (a.em < limite) audios.delete(id);
}, 60_000).unref();
