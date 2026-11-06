(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

  let conta = null;
  let modelos = {};
  let ws = null;

  // ---------- avisos ----------
  let timerToast;
  function avisar(texto) {
    const t = $('toast');
    t.textContent = texto;
    t.classList.add('on');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove('on'), 2800);
  }

  async function api(metodo, rota, corpo) {
    const r = await fetch(rota, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status === 401) {
      location.href = '/entrar';
      throw new Error('sessão expirada');
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || 'Algo deu errado.');
    return j;
  }

  // ---------- carregar conta ----------
  async function carregar() {
    const j = await api('GET', '/api/eu');
    modelos = j.modelos;
    aplicarConta(j.conta);
    preencherConfig(conta.config);
    $('modelos').innerHTML = Object.entries(modelos)
      .map(([id, m]) => `<button type="button" class="btn pequeno" data-modelo="${id}">${esc(m.rotulo)}</button>`)
      .join('');
    conectarWs();
  }

  function linkTela() {
    const p = new URLSearchParams();
    if ($('transparente').checked) p.set('fundo', 'transparente');
    if ($('semSom').checked) p.set('som', '0');
    const q = p.toString();
    return `${location.origin}/o/${conta.overlayToken}${q ? `?${q}` : ''}`;
  }

  function aplicarConta(c) {
    const tokenMudou = conta?.overlayToken !== c.overlayToken;
    conta = c;
    $('nomeConta').textContent = c.nome;
    $('linkAdmin').hidden = !c.admin;
    $('tiktok').value = c.tiktok || '';
    atualizarLink();
    if (tokenMudou) $('previa').src = `/o/${c.overlayToken}?som=0&previa=1`;
  }

  function atualizarLink() {
    $('linkTela').value = linkTela();
    $('abrirTela').href = linkTela();
  }

  // ---------- tempo real ----------
  function conectarWs() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?painel=1`);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.t === 'estado') estado(msg.d);
      else if (msg.t === 'conexao') conexao(msg.d);
      else if (msg.t === 'aviso') avisar(msg.d);
    };
    ws.onclose = () => {
      definirPill($('pillStatus'), 'ruim', 'reconectando ao servidor…');
      setTimeout(conectarWs, 2000);
    };
  }
  const enviar = (o) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify(o));
    else avisar('Sem conexão com o servidor, tente de novo.');
  };

  function definirPill(el, tipo, texto) {
    el.className = `pill ${tipo}`;
    el.textContent = texto;
  }

  function conexao(c) {
    let tipo = 'ruim';
    let texto = c.status;
    if (c.modo === 'desligado') [tipo, texto] = ['', 'Desligado'];
    else if (c.modo === 'teste') [tipo, texto] = ['ok', 'Modo teste (público falso)'];
    else if (c.status === 'conectado') [tipo, texto] = ['ok', `Conectado na live @${c.usuario}`];
    else if (c.status === 'conectando') [tipo, texto] = ['espera', 'Conectando…'];
    else if (/ao vivo|encerrada/.test(c.status)) [tipo, texto] = ['espera', 'Esperando você entrar ao vivo…'];
    definirPill($('pillStatus'), tipo, texto);
    definirPill($('pillTelas'), c.telas > 0 ? 'ok' : '', c.telas === 1 ? '1 tela aberta' : `${c.telas} telas abertas`);
  }

  const STATUS = { aguardando: 'Aguardando início', rodando: 'Rodando', pausado: 'Pausado', intervalo: 'Intervalo entre rodadas' };
  let ultimoFeed = '';
  function estado(e) {
    const r = e.rodada;
    $('rodada').textContent = `Rodada ${r.numero} · ${STATUS[r.status]}${r.multiplicador > 1 ? ` · pontos x${r.multiplicador}` : ''}`;
    const s = Math.ceil((r.status === 'intervalo' ? r.proximaEmMs : r.restanteMs) / 1000);
    $('relogio').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const total = (t) => t.pontos + t.reserva;
    $('placar').innerHTML = [...e.times]
      .sort((a, b) => total(b) - total(a))
      .map((t) => `<div class="t"><span class="cor" style="background:${esc(t.cores[0])}"></span><span class="nome">${t.numero}. ${esc(t.nome)}</span><span class="info">👥 ${t.membros} · 🏆 ${t.trofeus}</span><b>${fmt(total(t))}</b></div>`)
      .join('');
    $('ranking').innerHTML = e.ranking.length
      ? e.ranking.map((u) => `<li>${esc(u.nome)}<span class="moedas">🪙 ${fmt(u.moedas)}</span></li>`).join('')
      : '<p class="vazio" style="margin-left:-22px">Ninguém presenteou ainda.</p>';
    const feed = e.feed.map((f) => `<div>${f.icone} ${esc(f.texto)}</div>`).join('');
    if (feed && feed !== ultimoFeed) {
      $('feed').innerHTML = feed;
      ultimoFeed = feed;
    }
  }

  // ---------- botões de comando ----------
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.cmd) {
      if (b.dataset.confirma && !confirm(b.dataset.confirma)) return;
      if (b.dataset.cmd === 'ligarTikTok' && !conta.tiktok) {
        avisar('Coloque seu @ do TikTok e clique em Salvar primeiro.');
        $('tiktok').focus();
        return;
      }
      enviar({ cmd: b.dataset.cmd });
    } else if (b.dataset.teste) {
      enviar({ cmd: 'testar', tipo: b.dataset.teste, presente: b.dataset.presente });
    } else if (b.dataset.modelo) {
      const m = modelos[b.dataset.modelo];
      $('cTitulo').value = m.titulo;
      montarTimes(m.times);
      avisar('Modelo aplicado. Clique em "Salvar configuração".');
    }
  });

  $('formTikTok').onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const j = await api('PUT', '/api/tiktok', { usuario: $('tiktok').value.trim() });
      aplicarConta(j.conta);
      avisar(j.conta.tiktok ? `Salvo: @${j.conta.tiktok}` : 'Usuário removido.');
    } catch (e) {
      avisar(e.message);
    }
  };

  $('formChat').onsubmit = (ev) => {
    ev.preventDefault();
    const texto = $('msg').value.trim();
    if (!texto) return;
    enviar({ cmd: 'testar', tipo: 'chat', texto });
    $('msg').value = '';
  };

  $('copiar').onclick = async () => {
    try {
      await navigator.clipboard.writeText(linkTela());
    } catch {
      $('linkTela').select();
      document.execCommand('copy');
    }
    avisar('Link copiado! Cole no LIVE Studio ou no OBS.');
  };
  $('transparente').onchange = atualizarLink;
  $('semSom').onchange = atualizarLink;

  $('novoLink').onclick = async () => {
    if (!confirm('Gerar um link novo? O link antigo para de funcionar. Use isso se alguém pegou o seu link.')) return;
    try {
      aplicarConta((await api('POST', '/api/novo-link')).conta);
      avisar('Link novo gerado. Atualize no LIVE Studio/OBS.');
    } catch (e) {
      avisar(e.message);
    }
  };

  $('sair').onclick = async () => {
    await api('POST', '/api/sair').catch(() => {});
    location.href = '/';
  };

  // ---------- editor de configuração ----------
  function linhaTime(t, i) {
    const div = document.createElement('div');
    div.className = 'time-ed';
    div.innerHTML = `
      <span class="n"></span>
      <input class="nome" maxlength="18" placeholder="Nome do time" aria-label="Nome do time ${i + 1}">
      <input class="c1" type="color" aria-label="Cor principal">
      <input class="c2" type="color" aria-label="Cor secundária">
      <input class="apelidos" placeholder="apelidos: mengo, fla, urubu" aria-label="Apelidos">
      <button type="button" class="btn perigo remover" title="Remover time" aria-label="Remover time">✕</button>`;
    div.querySelector('.nome').value = t.nome ?? '';
    div.querySelector('.c1').value = t.cores?.[0] ?? '#ff3d7f';
    div.querySelector('.c2').value = t.cores?.[1] ?? '#7a1038';
    div.querySelector('.apelidos').value = (t.apelidos ?? []).join(', ');
    const pintar = () => {
      div.querySelector('.n').style.background = `linear-gradient(135deg, ${div.querySelector('.c1').value}, ${div.querySelector('.c2').value})`;
    };
    div.querySelector('.c1').oninput = pintar;
    div.querySelector('.c2').oninput = pintar;
    pintar();
    div.querySelector('.remover').onclick = () => {
      if ($('times').children.length <= 2) return avisar('O jogo precisa de pelo menos 2 times.');
      div.remove();
      numerar();
    };
    return div;
  }

  function numerar() {
    [...$('times').children].forEach((d, i) => (d.querySelector('.n').textContent = i + 1));
    $('addTime').disabled = $('times').children.length >= 6;
  }

  function montarTimes(times) {
    $('times').innerHTML = '';
    times.forEach((t, i) => $('times').appendChild(linhaTime(t, i)));
    numerar();
  }

  $('addTime').onclick = () => {
    const n = $('times').children.length;
    if (n >= 6) return;
    $('times').appendChild(linhaTime({ nome: `TIME ${n + 1}`, apelidos: [] }, n));
    numerar();
  };

  const CAMPOS = {
    cDuracao: ['duracaoRodadaSeg'],
    cDobro: ['finalEmDobroSeg'],
    cIntervalo: ['intervaloSeg'],
    cCurtida: ['pontos', 'curtida'],
    cMoeda: ['pontos', 'porMoeda'],
    cSeguir: ['pontos', 'seguir'],
    cCompartilhar: ['pontos', 'compartilhar'],
    cMeta: ['metaCurtidas', 'passo'],
    cTurbo: ['metaCurtidas', 'turboSeg'],
    cSuper: ['presentes', 'superAtaqueMoedas'],
    cLendario: ['presentes', 'lendarioMoedas'],
  };

  function preencherConfig(c) {
    $('cTitulo').value = c.titulo;
    for (const [id, caminho] of Object.entries(CAMPOS)) $(id).value = caminho.reduce((o, k) => o[k], c);
    $('cSemTime').value = c.semTime;
    montarTimes(c.times);
  }

  function lerConfig() {
    const c = { titulo: $('cTitulo').value, semTime: $('cSemTime').value, pontos: {}, metaCurtidas: {}, presentes: {} };
    for (const [id, caminho] of Object.entries(CAMPOS)) {
      if (caminho.length === 1) c[caminho[0]] = Number($(id).value);
      else c[caminho[0]][caminho[1]] = Number($(id).value);
    }
    c.times = [...$('times').children].map((d) => ({
      nome: d.querySelector('.nome').value,
      cores: [d.querySelector('.c1').value, d.querySelector('.c2').value],
      apelidos: d.querySelector('.apelidos').value.split(',').map((a) => a.trim()).filter(Boolean),
    }));
    return c;
  }

  $('formConfig').onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const j = await api('PUT', '/api/config', { config: lerConfig() });
      aplicarConta(j.conta);
      preencherConfig(j.conta.config);
      avisar('Configuração salva!');
    } catch (e) {
      avisar(e.message);
    }
  };

  carregar().catch((e) => avisar(e.message));
})();
