import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Jogo, normalizarTexto } from '../src/jogo.mjs';
import { ContadorDeCombos, lerPresente, lerUsuario } from '../src/tiktok.mjs';
import { PADRAO, validarConfig } from '../src/configuracao.mjs';

const config = validarConfig(PADRAO);

function novoJogo() {
  let t = 1_000_000;
  const relogio = { agora: () => t, avancar: (ms) => (t += ms) };
  const jogo = new Jogo(config, { agora: relogio.agora });
  const fx = [];
  jogo.on('fx', (e) => fx.push(e));
  return { jogo, relogio, fx };
}

const ana = { id: '1', usuario: 'ana', nome: 'Ana' };
const beto = { id: '2', usuario: 'beto', nome: 'Beto' };

test('normaliza acentos e pontuação', () => {
  assert.equal(normalizarTexto('  Vai SÃO-PAULO!!! '), 'vai sao paulo');
});

test('chat com número ou apelido entra no time certo', () => {
  const { jogo } = novoJogo();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '3' });
  assert.equal(jogo.usuarios.get('1').time, 't3');
  jogo.processar({ tipo: 'chat', usuario: ana, texto: 'bora MENGÃO' });
  assert.equal(jogo.usuarios.get('1').time, 't1');
  jogo.processar({ tipo: 'chat', usuario: beto, texto: 'eu tenho 13 anos' });
  assert.equal(jogo.usuarios.get('2').time, null, 'número no meio da frase não entra');
  jogo.processar({ tipo: 'chat', usuario: beto, texto: 'vamo são paulo' });
  assert.equal(jogo.usuarios.get('2').time, 't4');
});

test('presente soma moedas x pontos no time e no ranking; Top 1 dispara efeito', () => {
  const { jogo, fx } = novoJogo();
  jogo.iniciar();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '1' });
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 5, quantidade: 5, nomePresente: 'Rosa' });
  assert.equal(jogo.timePorId('t1').pontos, 50);
  assert.equal(jogo.ranking()[0].moedas, 5);
  assert.ok(fx.some((e) => e.tipo === 'rei' && e.usuario.id === '1'));

  jogo.processar({ tipo: 'chat', usuario: beto, texto: '2' });
  jogo.processar({ tipo: 'presente', usuario: beto, moedas: 99, nomePresente: 'Chapéu' });
  const ultimo = fx.at(-1);
  assert.equal(ultimo.tipo, 'rei');
  assert.equal(ultimo.anterior.id, '1');
  assert.ok(fx.some((e) => e.tipo === 'presente' && e.nivel === 'super'));
  assert.equal(jogo.ranking()[0].id, '2');
});

test('quem não tem time cai no último colocado', () => {
  const { jogo } = novoJogo();
  jogo.iniciar();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '1' });
  jogo.processar({ tipo: 'curtida', usuario: ana, quantidade: 10 });
  jogo.processar({ tipo: 'curtida', usuario: beto, quantidade: 1 });
  assert.notEqual(jogo.usuarios.get('2').time, 't1');
});

test('final da rodada e meta de curtidas dobram os pontos (acumulando)', () => {
  const { jogo, relogio } = novoJogo();
  jogo.iniciar();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '1' });
  relogio.avancar((config.duracaoRodadaSeg - 10) * 1000);
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 1, nomePresente: 'Rosa' });
  assert.equal(jogo.timePorId('t1').pontos, 20);
  jogo.processar({ tipo: 'curtida', usuario: ana, quantidade: config.metaCurtidas.passo });
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 1, nomePresente: 'Rosa' });
  // 20 + curtidas da meta (x2 do final, a meta só bate no fim do lote) + rosa x4
  assert.equal(jogo.timePorId('t1').pontos, 20 + config.metaCurtidas.passo * 2 + 40);
});

test('rodada termina, dá troféu e MVP, e a próxima começa sozinha', () => {
  const { jogo, relogio, fx } = novoJogo();
  jogo.iniciar();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '4' });
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 30, nomePresente: 'Rosquinha' });
  relogio.avancar(config.duracaoRodadaSeg * 1000);
  jogo.tick();
  const fim = fx.find((e) => e.tipo === 'fimRodada');
  assert.equal(fim.vencedor.id, 't4');
  assert.equal(fim.mvp.id, '1');
  assert.equal(jogo.timePorId('t4').trofeus, 1);

  // presente no intervalo vai para a largada da próxima rodada
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 1, nomePresente: 'Rosa' });
  relogio.avancar(config.intervaloSeg * 1000);
  jogo.tick();
  assert.equal(jogo.rodada.numero, 2);
  assert.equal(jogo.timePorId('t4').pontos, 10);
  assert.equal(jogo.ranking()[0].moedas, 31, 'ranking da live continua entre rodadas');
});

test('empate não dá troféu', () => {
  const { jogo, relogio, fx } = novoJogo();
  jogo.iniciar();
  jogo.processar({ tipo: 'chat', usuario: ana, texto: '1' });
  jogo.processar({ tipo: 'chat', usuario: beto, texto: '2' });
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 1 });
  jogo.processar({ tipo: 'presente', usuario: beto, moedas: 1 });
  relogio.avancar(config.duracaoRodadaSeg * 1000);
  jogo.tick();
  assert.equal(fx.find((e) => e.tipo === 'fimRodada').empate, true);
  assert.ok(jogo.times.every((t) => t.trofeus === 0));
});

test('ranking salvo volta depois de reiniciar o programa', () => {
  const { jogo } = novoJogo();
  jogo.processar({ tipo: 'presente', usuario: ana, moedas: 300 });
  const salvo = JSON.parse(JSON.stringify(jogo.exportarRanking()));
  const outro = novoJogo().jogo;
  outro.importarRanking(salvo);
  assert.equal(outro.ranking()[0].moedas, 300);
  assert.equal(outro.reiId, '1');
});

test('combo de presentes conta só a diferença e não duplica no fim', () => {
  const combos = new ContadorDeCombos();
  const base = { user: { userId: '9', uniqueId: 'zé', nickname: 'Zé' }, giftId: 5655, groupId: 'g1', giftDetails: { giftType: 1, diamondCount: 1, giftName: 'Rose' } };
  const somar = (d) => lerPresente({ ...base, ...d }, combos)?.moedas ?? 0;
  const total = somar({ repeatCount: 1, repeatEnd: 0 }) + somar({ repeatCount: 4, repeatEnd: 0 }) + somar({ repeatCount: 7, repeatEnd: 1 });
  assert.equal(total, 7);
  // presente sem combo
  const leao = lerPresente({ ...base, giftDetails: { giftType: 2, diamondCount: 29999, giftName: 'Lion' }, repeatCount: 1, repeatEnd: 1 }, combos);
  assert.equal(leao.moedas, 29999);
});

test('lê usuário nos formatos novo e antigo da biblioteca', () => {
  assert.deepEqual(lerUsuario({ userId: '1', uniqueId: 'a', nickname: 'A', profilePictureUrl: 'x' }), { id: '1', usuario: 'a', nome: 'A', foto: 'x' });
  assert.deepEqual(lerUsuario({ id: '2', displayId: 'b', nickname: 'B', avatarThumb: { urlList: ['y'] } }), { id: '2', usuario: 'b', nome: 'B', foto: 'y' });
});
