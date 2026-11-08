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
  let catalogo = {};
  async function carregar() {
    const j = await api('GET', '/api/eu');
    modelos = j.modelos;
    catalogo = j;
    aplicarConta(j.conta);
    preencherConfig(conta.config);
    montarPersonagem(j);
    preencherPersonagem(conta.config.personagem);
    definirModo(conta.config.modo);
    $('modelos').innerHTML = Object.entries(modelos)
      .map(([id, m]) => `<button type="button" class="btn pequeno" data-modelo="${id}">${esc(m.rotulo)}</button>`)
      .join('');
    conectarWs();
  }

  function linkTela() {
    const p = new URLSearchParams();
    if ($('transparente').checked) p.set('fundo', 'transparente');
    if ($('semSom').checked) p.set('som', '0');
    if ($('leve').checked) p.set('leve', '1');
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

  // ---------- modo da live ----------
  const AJUDA_MODO = {
    times: 'O público escolhe um time pelo chat; curtidas e presentes viram pontos.',
    personagem: 'Um personagem com IA responde em voz alta as perguntas do chat. Quem manda rosa é respondido primeiro.',
  };
  function definirModo(modo) {
    document.body.dataset.modo = modo;
    $('modos').innerHTML = Object.entries(catalogo.modos ?? {})
      .map(([id, rotulo]) => `<button type="button" class="modo ${id === modo ? 'on' : ''}" data-modo-live="${id}"><b>${esc(rotulo)}</b><small>${esc(AJUDA_MODO[id] ?? '')}</small></button>`)
      .join('');
    $('modoAjuda').textContent = modo === 'personagem' ? 'A tela do jogo troca sozinha. Configure o personagem mais abaixo.' : '';
  }
  $('modos').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-modo-live]');
    if (!b || b.classList.contains('on')) return;
    try {
      const j = await api('PUT', '/api/config', { config: { modo: b.dataset.modoLive } });
      aplicarConta(j.conta);
      definirModo(j.conta.config.modo);
      avisar(j.conta.config.modo === 'personagem' ? 'Modo Personagem IA ligado!' : 'Modo Guerra de Times ligado!');
    } catch (e) {
      avisar(e.message);
    }
  });

  // ---------- personagem ----------
  const opcoes = (obj) => Object.entries(obj ?? {}).map(([v, r]) => `<option value="${esc(v)}">${esc(r)}</option>`).join('');
  function montarPersonagem(j) {
    $('persVoz').innerHTML = opcoes(j.vozes);
    $('persEstilo').innerHTML = opcoes(j.estilosVoz);
    $('persCenario').innerHTML = opcoes(j.cenarios);
    $('iaAviso').hidden = Boolean(j.ia);
  }
  function preencherPersonagem(p) {
    $('persNome').value = p.nome;
    $('persCenario').value = p.cenario;
    $('persVoz').value = p.voz;
    $('persEstilo').value = p.estiloVoz;
    $('persPersonalidade').value = p.personalidade;
    $('persPrioridade').value = p.presentes.prioridadeMoedas;
    $('persSalve').value = p.presentes.salveMoedas;
    $('persFoto').value = p.presentes.fotoMoedas;
    mostrarImagem(p.imagem);
  }
  function mostrarImagem(url) {
    $('persImgPrev').hidden = !url;
    if (url) $('persImgPrev').src = url;
    $('persImgVazio').hidden = Boolean(url);
    $('persRemover').hidden = !url;
  }
  function lerPersonagem() {
    return {
      nome: $('persNome').value,
      cenario: $('persCenario').value,
      voz: $('persVoz').value,
      estiloVoz: $('persEstilo').value,
      personalidade: $('persPersonalidade').value,
      presentes: { prioridadeMoedas: Number($('persPrioridade').value), salveMoedas: Number($('persSalve').value), fotoMoedas: Number($('persFoto').value) },
    };
  }
  $('formPersonagem').onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const j = await api('PUT', '/api/config', { config: { personagem: lerPersonagem() } });
      aplicarConta(j.conta);
      preencherPersonagem(j.conta.config.personagem);
      avisar('Personagem salvo!');
    } catch (e) {
      avisar(e.message);
    }
  };
  let amostra;
  $('persOuvir').onclick = async () => {
    const b = $('persOuvir');
    b.disabled = true;
    b.textContent = '⏳ Gerando a voz…';
    try {
      const j = await api('POST', '/api/personagem/ouvir', { personagem: lerPersonagem() });
      amostra?.pause();
      amostra = new Audio(j.audio);
      await amostra.play();
    } catch (e) {
      avisar(e.message);
    } finally {
      b.disabled = false;
      b.textContent = '🔊 Ouvir a voz';
    }
  };
  // reduz a imagem antes de enviar (mantém fundo transparente; GIF animado vai como está)
  function lerImagem(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não consegui ler a imagem.'));
      leitor.onload = () => {
        if (arquivo.type === 'image/gif') return resolve(leitor.result);
        const img = new Image();
        img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
        img.onload = () => {
          const escala = Math.min(1, 1100 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * escala);
          c.height = Math.round(img.height * escala);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/webp', 0.9));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }
  $('persArquivo').onchange = async () => {
    const arquivo = $('persArquivo').files[0];
    $('persArquivo').value = '';
    if (!arquivo) return;
    if (arquivo.size > 8 * 1024 * 1024) return avisar('Imagem grande demais (máximo 8 MB).');
    try {
      avisar('Enviando imagem…');
      const dataUrl = await lerImagem(arquivo);
      const j = await api('POST', '/api/personagem/imagem', { dataUrl });
      aplicarConta(j.conta);
      mostrarImagem(j.conta.config.personagem.imagem);
      avisar('Imagem do personagem atualizada!');
    } catch (e) {
      avisar(e.message);
    }
  };
  $('persRemover').onclick = async () => {
    try {
      const j = await api('POST', '/api/personagem/imagem', {});
      aplicarConta(j.conta);
      mostrarImagem('');
      avisar('Voltou para o Nix.');
    } catch (e) {
      avisar(e.message);
    }
  };
  $('formPergunta').onsubmit = (ev) => {
    ev.preventDefault();
    const texto = $('perguntaTeste').value.trim();
    if (!texto) return;
    enviar({ cmd: 'testar', tipo: 'chat', texto });
    $('perguntaTeste').value = '';
    avisar('Pergunta enviada para a fila.');
  };

  const MOTIVOS = { desligado: 'Desligado: conecte na live ou ligue o modo teste.', 'sem tela': 'Esperando a tela do jogo abrir (LIVE Studio, OBS ou celular).', pausado: 'Respostas pausadas.', limite: 'Limite de respostas de hoje atingido.' };
  function estadoPersonagem(p) {
    if (!p) return;
    let status;
    if (p.motivo && MOTIVOS[p.motivo]) status = MOTIVOS[p.motivo];
    else if (p.falando) status = `🗣️ Respondendo ${p.falando.nome}`;
    else if (p.pensando) status = '💭 Pensando na resposta…';
    else status = '👂 Esperando perguntas do chat';
    if (p.erro) status += ` · ⚠️ ${p.erro}`;
    $('persStatus').textContent = status;
    definirPill($('pillIA'), p.motivo ? (p.motivo === 'limite' ? 'ruim' : '') : 'ok', p.motivo ? 'parado' : 'ativo');
    $('usoFill').style.width = `${Math.min(100, (p.usoHoje / p.limiteDia) * 100)}%`;
    $('usoTxt').textContent = `${fmt(p.usoHoje)} de ${fmt(p.limiteDia)} respostas hoje`;
    const fila = p.fila.length
      ? p.fila.map((i) => `<li>${i.prioridade ? '<span class="vip">🌹 </span>' : ''}<b>${esc(i.nome)}</b>: ${esc(i.tipo === 'pergunta' ? i.texto : { agradecer: 'agradecer presente', salve: 'mandar um salve', foto: 'julgar a foto' }[i.tipo])}</li>`).join('') + (p.tamanho > p.fila.length ? `<li class="vazio">e mais ${p.tamanho - p.fila.length}…</li>` : '')
      : '<li class="vazio">Fila vazia.</li>';
    if ($('filaLista').dataset.html !== fila) {
      $('filaLista').innerHTML = fila;
      $('filaLista').dataset.html = fila;
    }
  }

  const STATUS = { aguardando: 'Aguardando início', rodando: 'Rodando', pausado: 'Pausado', intervalo: 'Intervalo entre rodadas' };
  let ultimoFeed = '';
  function estado(e) {
    if (e.modo && document.body.dataset.modo && e.modo !== document.body.dataset.modo) definirModo(e.modo);
    estadoPersonagem(e.personagem);
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
  $('leve').onchange = atualizarLink;

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
