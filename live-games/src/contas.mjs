// Contas, senhas e sessões (cookie). Senha guardada só como hash scrypt com sal.

import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { PADRAO, validarConfig } from './configuracao.mjs';

const scrypt = promisify(crypto.scrypt);
const DIAS_SESSAO = 30;
export const COOKIE = 'lg_sessao';

export const novoToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `${sal.toString('hex')}:${hash.toString('hex')}`;
}

export async function conferirSenha(senha, guardado) {
  const [salHex, hashHex] = String(guardado).split(':');
  if (!salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const hash = await scrypt(senha, Buffer.from(salHex, 'hex'), esperado.length);
  return crypto.timingSafeEqual(hash, esperado);
}

export function validarCadastro({ nome, email, senha }) {
  const e = String(email ?? '').trim().toLowerCase();
  const n = String(nome ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 120) return { erro: 'E-mail inválido.' };
  if (!n) return { erro: 'Digite seu nome.' };
  if (String(senha ?? '').length < 6 || String(senha).length > 200) return { erro: 'A senha precisa ter pelo menos 6 caracteres.' };
  return { nome: n, email: e, senha: String(senha) };
}

export class Contas {
  constructor(banco) {
    this.banco = banco;
  }

  async criar({ nome, email, senha }) {
    const dados = validarCadastro({ nome, email, senha });
    if (dados.erro) return dados;
    if (this.banco.contaPorEmail(dados.email)) return { erro: 'Já existe uma conta com esse e-mail. Clique em "Entrar".' };
    const conta = {
      id: novoToken(9),
      nome: dados.nome,
      email: dados.email,
      senha: await hashSenha(dados.senha),
      tiktok: '',
      overlayToken: novoToken(18),
      config: validarConfig(PADRAO),
      criadaEm: new Date().toISOString(),
    };
    this.banco.gravarConta(conta);
    return { conta };
  }

  async entrar({ email, senha }) {
    const conta = this.banco.contaPorEmail(String(email ?? '').trim().toLowerCase());
    // compara mesmo sem conta, para não revelar quais e-mails existem pelo tempo de resposta
    const ok = await conferirSenha(String(senha ?? ''), conta?.senha ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`);
    return ok && conta ? { conta } : { erro: 'E-mail ou senha incorretos.' };
  }

  abrirSessao(contaId) {
    const token = novoToken(32);
    this.banco.gravarSessao(sha256(token), { contaId, expira: Date.now() + DIAS_SESSAO * 86_400_000 });
    return { token, maxAge: DIAS_SESSAO * 86_400 };
  }

  contaDaSessao(token) {
    if (!token) return null;
    const s = this.banco.sessao(sha256(token));
    return s ? this.banco.conta(s.contaId) : null;
  }

  fecharSessao(token) {
    if (token) this.banco.apagarSessao(sha256(token));
  }

  publica(conta) {
    return { id: conta.id, nome: conta.nome, email: conta.email, tiktok: conta.tiktok, overlayToken: conta.overlayToken, config: conta.config };
  }
}
