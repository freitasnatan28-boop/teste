// Tela do jogo (overlay 1080x1920). Recebe o estado e os efeitos do servidor por WebSocket.
(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const somLigado = params.get('som') !== '0';
  if (params.get('fundo') === 'transparente') document.body.classList.add('transparente');
  const leve = params.get('leve') === '1' || params.get('previa') === '1';
  if (leve) document.body.classList.add('leve');

  // só mexe na tela quando o valor muda (o servidor manda o estado várias vezes por segundo)
  const definir = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
  const estilo = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
  const alternar = (el, classe, on) => { if (el.classList.contains(classe) !== on) el.classList.toggle(classe, on); };

  // ---------- escala do palco ----------
  const palco = $('palco');
  function escalar() {
    const s = Math.min(innerWidth / 1080, innerHeight / 1920);
    palco.style.transform = `scale(${s})`;
    palco.style.left = `${(innerWidth - 1080 * s) / 2}px`;
  }
  addEventListener('resize', escalar);
  escalar();

  // ---------- utilidades ----------
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const corDoNome = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 65% 45%)`;
  };
  function avatar(u, classe = '') {
    const inicial = esc((u?.nome || '?').trim().charAt(0).toUpperCase());
    const foto = u?.foto ? `background-image:url('${esc(u.foto)}');` : '';
    return `<div class="av ${classe}" style="background-color:${corDoNome(u?.nome)};${foto}">${u?.foto ? '' : inicial}</div>`;
  }
  const gradiente = (cores) => `linear-gradient(90deg, ${cores[0]}, ${cores[1] ?? cores[0]})`;
  const timeCores = new Map();

  // ---------- som (sintetizado, sem arquivos) ----------
  let audio;
  function tom(freq, inicio, dur, tipo = 'triangle', vol = 0.12) {
    if (!somLigado) return;
    try {
      audio ??= new AudioContext();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = tipo;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime + inicio);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + inicio + dur);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + inicio);
      o.stop(audio.currentTime + inicio + dur);
    } catch {
      /* navegador bloqueou áudio */
    }
  }
  const sons = {
    presente: () => { tom(880, 0, 0.12); tom(1320, 0.08, 0.18); },
    super: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.09, 0.3, 'square', 0.08)),
    lendario: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, i * 0.11, 0.5, 'sawtooth', 0.07)),
    rei: () => [784, 988, 1175, 1568].forEach((f, i) => tom(f, i * 0.12, 0.35, 'triangle', 0.12)),
    turbo: () => { tom(220, 0, 0.4, 'sawtooth', 0.08); tom(440, 0.15, 0.4, 'sawtooth', 0.08); },
    apito: () => { tom(2100, 0, 0.25, 'square', 0.05); tom(2100, 0.32, 0.6, 'square', 0.05); },
  };

  // ---------- times ----------
  const elTimes = $('times');
  const linhas = new Map();
  const mostrado = new Map();

  function montarTimes(times) {
    elTimes.innerHTML = '';
    linhas.clear();
    mostrado.clear();
    // 2 a 6 times dividem a mesma área da tela
    const altura = Math.min(130, Math.floor((508 - 12 * (times.length - 1)) / times.length));
    elTimes.style.setProperty('--h', `${altura}px`);
    elTimes.classList.toggle('compacto', altura < 100);
    for (const t of times) {
      timeCores.set(t.id, t.cores);
      const el = document.createElement('div');
      el.className = 'time';
      el.innerHTML = `
        <div class="num" style="background:${gradiente(t.cores)}">${t.numero}</div>
        <div class="time-corpo">
          <div class="time-linha"><span class="time-nome">${esc(t.nome)}</span><span class="time-coroa">LÍDER</span><span class="time-info"></span></div>
          <div class="barra"><div class="barra-fill" style="background:${gradiente(t.cores)}"></div></div>
        </div>
        <div class="pontos"><span class="valor">0</span><small>pontos</small></div>`;
      elTimes.appendChild(el);
      linhas.set(t.id, {
        el,
        info: el.querySelector('.time-info'),
        fill: el.querySelector('.barra-fill'),
        valor: el.querySelector('.valor'),
        rotulo: el.querySelector('.pontos small'),
      });
    }
  }

  function atualizarTimes(times, status) {
    const assinatura = JSON.stringify(times.map((t) => [t.id, t.nome, t.cores]));
    if (elTimes.dataset.assinatura !== assinatura) {
      montarTimes(times);
      elTimes.dataset.assinatura = assinatura;
    }
    // no intervalo o placar fica congelado no resultado; o que chega agora vai para a largada da próxima
    const total = (t) => (status === 'intervalo' ? t.pontos : t.pontos + t.reserva);
    const max = Math.max(1, ...times.map(total));
    const ordem = [...times].sort((a, b) => total(b) - total(a));
    const liderId = total(ordem[0]) > 0 && total(ordem[0]) !== total(ordem[1] ?? { pontos: -1, reserva: 0 }) ? ordem[0].id : null;
    for (const t of times) {
      const l = linhas.get(t.id);
      estilo(l.fill, 'width', `${((total(t) / max) * 100).toFixed(2)}%`);
      definir(l.info, `👥 ${t.membros}${t.trofeus ? `  🏆 ${t.trofeus}` : ''}`);
      alternar(l.el, 'lider', t.id === liderId);
      definir(l.rotulo, status === 'aguardando' && t.reserva ? 'na largada' : 'pontos');
      animarNumero(t.id, total(t), l.valor);
    }
  }

  function animarNumero(id, alvo, el) {
    const atual = mostrado.get(id) ?? 0;
    if (atual === alvo) return;
    const prox = alvo < atual ? alvo : atual + Math.max(1, Math.ceil((alvo - atual) * 0.25));
    mostrado.set(id, prox);
    el.textContent = fmt(prox);
    if (prox !== alvo) requestAnimationFrame(() => animarNumero(id, alvo, el));
  }

  function flutuar(timeId, texto) {
    const l = linhas.get(timeId);
    if (!l) return;
    const f = document.createElement('div');
    f.className = 'flutua';
    f.textContent = texto;
    l.el.appendChild(f);
    l.el.classList.remove('bump');
    void l.el.offsetWidth;
    l.el.classList.add('bump');
    setTimeout(() => f.remove(), 1100);
  }

  let chipsAtivos = 0;
  function chipEntrou(timeId, nome) {
    const l = linhas.get(timeId);
    if (!l || chipsAtivos > 6) return;
    chipsAtivos++;
    const c = document.createElement('div');
    c.className = 'chip';
    c.style.left = `${120 + Math.random() * 420}px`;
    c.textContent = `+ ${nome}`;
    l.el.appendChild(c);
    setTimeout(() => { c.remove(); chipsAtivos--; }, 1600);
  }

  // ---------- topo, meta, ranking ----------
  let estadoAtual = null;
  let reiAtual = null;

  function aplicarEstado(e) {
    if (e.modo && e.modo !== 'times') return location.reload();
    estadoAtual = e;
    if ($('titulo').textContent !== e.titulo) {
      $('titulo').textContent = e.titulo;
      ajustarTitulo();
    }
    const r = e.rodada;
    definir($('rodada'), r.status === 'aguardando' ? 'PREPARANDO…' : r.status === 'intervalo' ? `PRÓXIMA EM ${Math.ceil(r.proximaEmMs / 1000)}s` : r.status === 'pausado' ? `RODADA ${r.numero} · PAUSA` : `RODADA ${r.numero}`);

    const seg = Math.ceil(r.restanteMs / 1000);
    definir($('tempo'), `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`);
    estilo($('anel'), 'strokeDashoffset', (276.46 * (1 - r.restanteMs / r.duracaoMs)).toFixed(1));
    alternar($('relogio'), 'urgente', r.dobroFinal);
    alternar($('seloDobro'), 'on', r.dobroFinal);
    alternar($('seloTurbo'), 'on', r.turboMs > 0);
    definir($('turboSeg'), Math.ceil(r.turboMs / 1000));

    atualizarTimes(e.times, r.status);

    const m = e.metaCurtidas;
    const base = m.proxima - m.passo;
    definir($('metaAtual'), fmt(m.total));
    definir($('metaAlvo'), fmt(m.proxima));
    estilo($('metaFill'), 'width', `${Math.min(100, ((m.total - base) / m.passo) * 100).toFixed(2)}%`);

    definir($('ptCurtida'), e.pontos.curtida);
    definir($('ptRosa'), e.pontos.porMoeda);
    definir($('ptMoeda'), e.pontos.porMoeda);
    definir($('segDobro'), e.regras?.finalEmDobroSeg ?? 30);
    definir($('tagTimes'), `1-${e.times.length}`);

    atualizarRanking(e.ranking);
  }

  function atualizarRanking(ranking) {
    const [rei, ...resto] = ranking;
    const elRei = $('rei');
    if (rei) {
      elRei.classList.remove('vazio');
      if (reiAtual !== rei.id) {
        $('reiAv').outerHTML = avatar(rei).replace('class="av ', 'id="reiAv" class="av ');
        if (reiAtual) {
          elRei.classList.remove('novo');
          void elRei.offsetWidth;
          elRei.classList.add('novo');
        }
        reiAtual = rei.id;
      }
      definir($('reiNome'), rei.nome);
      definir($('reiMoedas'), `🪙 ${fmt(rei.moedas)} moedas`);
    } else {
      elRei.classList.add('vazio');
      reiAtual = null;
      $('reiAv').outerHTML = '<div class="av" id="reiAv" style="background-color:#444">?</div>';
      definir($('reiNome'), 'Seja o TOP 1!');
      definir($('reiMoedas'), 'mande uma 🌹');
    }
    const html = resto
      .map((u, i) => `<li><span class="pos">${i + 2}º</span>${avatar(u)}<span class="nome">${esc(u.nome)}</span><span class="moedas">🪙 ${fmt(u.moedas)}</span></li>`)
      .join('');
    const lista = $('listaRanking');
    if (lista.dataset.html !== html) {
      lista.innerHTML = html;
      lista.dataset.html = html;
    }
  }

  function aplicarConexao(c) {
    const el = $('conexao');
    const ok = c.status === 'conectado' || c.status === 'simulando';
    el.className = `conexao ${ok ? 'ok' : 'ruim'}`;
    el.textContent = c.simulacao ? 'modo teste' : c.status === 'conectado' ? 'ao vivo' : c.status;
  }

  // ---------- alertas ----------
  // título longo diminui sozinho para caber
  function ajustarTitulo() {
    const h = $('titulo');
    let tam = 60;
    h.style.fontSize = `${tam}px`;
    while (h.scrollWidth > h.clientWidth && tam > 30) h.style.fontSize = `${(tam -= 2)}px`;
  }

  document.fonts?.ready.then(ajustarTitulo);

  const toasts = $('toasts');
  function toast(html, cor) {
    while (toasts.children.length >= 2) toasts.lastElementChild.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    if (cor) t.style.setProperty('--cor', cor);
    t.innerHTML = html;
    toasts.prepend(t);
    palco.classList.add('com-toast');
    setTimeout(() => t.classList.add('saindo'), 2600);
    setTimeout(() => {
      t.remove();
      if (!toasts.children.length) palco.classList.remove('com-toast');
    }, 2950);
  }

  const fila = [];
  let mostrandoBanner = false;
  let timersBanner = [];
  function banner(html, { cor, classe = '', duracao = 3200, som, urgente = false } = {}) {
    const item = { html, cor, classe, duracao, som };
    if (urgente) {
      // fim de rodada / nova rodada: aparece na hora, passando na frente da fila
      timersBanner.forEach(clearTimeout);
      fila.unshift(item);
      proximoBanner();
      return;
    }
    fila.push(item);
    if (fila.length > 6) fila.splice(0, fila.length - 6);
    if (!mostrandoBanner) proximoBanner();
  }
  function proximoBanner() {
    timersBanner = [];
    const b = fila.shift();
    const area = $('banner');
    if (!b) {
      mostrandoBanner = false;
      area.innerHTML = '';
      return;
    }
    mostrandoBanner = true;
    area.className = `banner ${b.classe}`;
    area.innerHTML = `<div>${b.html}</div>`;
    const caixa = area.firstElementChild;
    if (b.cor) {
      caixa.style.setProperty('--cor', b.cor);
      caixa.style.setProperty('--brilho', b.cor);
    }
    b.som?.();
    timersBanner = [setTimeout(() => caixa.classList.add('saindo'), b.duracao), setTimeout(proximoBanner, b.duracao + 350)];
  }

  function flash() {
    const f = $('flash');
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  }
  function tremer() {
    if (leve) return;
    palco.classList.remove('treme');
    void palco.offsetWidth;
    palco.classList.add('treme');
  }

  // ---------- confete ----------
  const canvas = $('confete');
  const ctx = canvas.getContext('2d');
  let pedacos = [];
  let animando = false;
  function confete(qtd = 160, cores = ['#2bff88', '#d4ff3a', '#ffffff', '#ffcf3d', '#7dffbf']) {
    qtd = Math.round(qtd * (leve ? 0.3 : 0.7));
    for (let i = 0; i < qtd; i++) {
      pedacos.push({
        x: Math.random() * 1080,
        y: -20 - Math.random() * 400,
        vx: (Math.random() - 0.5) * 6,
        vy: 4 + Math.random() * 7,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: 12 + Math.random() * 14,
        h: 8 + Math.random() * 10,
        cor: cores[i % cores.length],
      });
    }
    if (!animando) {
      animando = true;
      requestAnimationFrame(desenhar);
    }
  }
  function desenhar() {
    ctx.clearRect(0, 0, 1080, 1920);
    for (const p of pedacos) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    pedacos = pedacos.filter((p) => p.y < 1980);
    if (pedacos.length) requestAnimationFrame(desenhar);
    else {
      animando = false;
      ctx.clearRect(0, 0, 1080, 1920);
    }
  }

  // ---------- efeitos vindos do servidor ----------
  function nomeTime(id) {
    return estadoAtual?.times.find((t) => t.id === id)?.nome ?? '';
  }

  function aplicarFx(fx) {
    switch (fx.tipo) {
      case 'presente': {
        const cores = timeCores.get(fx.time) ?? ['#2bff88'];
        if (fx.time) flutuar(fx.time, `+${fmt(fx.pontos)}`);
        const img = fx.imagem ? `<img class="pres" src="${esc(fx.imagem)}" alt="">` : '';
        const qtd = fx.quantidade > 1 ? `${fx.quantidade}x ` : '';
        if (fx.nivel === 'normal') {
          toast(`${avatar(fx.usuario)}<span class="txt">${esc(fx.usuario.nome)} mandou ${qtd}${esc(fx.nomePresente)}</span>${img}<span class="pts">+${fmt(fx.pontos)}</span>`, cores[0]);
          sons.presente();
          return;
        }
        const lendario = fx.nivel === 'lendario';
        banner(
          `<div class="chamada">${lendario ? '🔥 LENDÁRIO! 🔥' : '💥 SUPER ATAQUE!'}</div>
           ${avatar(fx.usuario)}
           <div class="quem">${esc(fx.usuario.nome)}</div>
           <div class="oque">mandou ${qtd}${esc(fx.nomePresente)} ${fx.time ? `para o ${esc(nomeTime(fx.time))}` : ''}</div>
           ${img}
           <div class="valor">+${fmt(fx.pontos)} PONTOS</div>`,
          {
            cor: lendario ? '#ffcf3d' : cores[0],
            classe: lendario ? 'lendario' : '',
            duracao: lendario ? 5000 : 3400,
            som: () => {
              (lendario ? sons.lendario : sons.super)();
              flash();
              tremer();
              confete(lendario ? 320 : 120, lendario ? ['#ffcf3d', '#ff9f1c', '#fff3b0', '#ffffff'] : undefined);
            },
          },
        );
        return;
      }
      case 'rei':
        banner(
          `<div class="chamada">👑 NOVO TOP 1</div>
           ${avatar(fx.usuario)}
           <div class="quem">${esc(fx.usuario.nome)}</div>
           <div class="oque">${fx.anterior ? `passou ${esc(fx.anterior.nome)} e agora` : 'agora'} é o maior presenteador da live</div>
           <div class="valor">🪙 ${fmt(fx.moedas)}</div>`,
          { cor: '#ffcf3d', duracao: 3000, som: () => { sons.rei(); confete(90, ['#ffcf3d', '#ffffff', '#ff9f1c']); } },
        );
        return;
      case 'turbo':
        flash();
        sons.turbo();
        toast(`<span class="txt">⚡ META DE ${fmt(fx.curtidas)} CURTIDAS! PONTOS EM DOBRO POR ${fx.segundos}s</span>`, '#d4ff3a');
        return;
      case 'entrou':
        chipEntrou(fx.time, fx.usuario.nome);
        return;
      case 'rodada':
        banner(`<div class="chamada">RODADA ${fx.numero}</div><div class="oque">digite o número do seu time e VALENDO!</div>`, { cor: '#2bff88', duracao: 1800, som: sons.apito, urgente: true });
        return;
      case 'fimRodada': {
        if (!fx.vencedor) {
          banner(`<div class="chamada">${fx.empate ? 'EMPATE!' : 'FIM DA RODADA'}</div><div class="oque">${fx.empate ? 'ninguém leva o troféu' : 'ninguém pontuou'}</div>`, { cor: '#ffffff', duracao: 3500, som: sons.apito, urgente: true });
          return;
        }
        const v = fx.vencedor;
        banner(
          `<div class="chamada" style="color:${v.cores[0]}">🏆 ${esc(v.nome)} VENCEU!</div>
           <div class="valor">${fmt(v.pontos)} pontos</div>
           ${fx.mvp ? `${avatar(fx.mvp)}<div class="quem">⭐ CRAQUE: ${esc(fx.mvp.nome)}</div><div class="oque">${fmt(fx.mvp.pontos)} pontos para o time</div>` : ''}
           <div class="placar">nova rodada já já…</div>`,
          { cor: v.cores[0], duracao: 6000, urgente: true, som: () => { sons.apito(); confete(220, [...v.cores, '#ffffff', '#2bff88']); } },
        );
      }
    }
  }

  // ---------- conexão com o servidor ----------
  const token = location.pathname.split('/')[2] ?? '';
  function conectar() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?o=${encodeURIComponent(token)}${params.get('previa') ? '&previa=1' : ''}`);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.t === 'estado') aplicarEstado(msg.d);
      else if (msg.t === 'fx') aplicarFx(msg.d);
      else if (msg.t === 'conexao') aplicarConexao(msg.d);
      else if (msg.t === 'recarregar') location.reload();
    };
    ws.onclose = (ev) => {
      if (ev.code === 4001) {
        // o dono gerou um link novo no painel: este parou de valer
        $('avisoTela').classList.add('on');
        return;
      }
      aplicarConexao({ status: 'reconectando…' });
      setTimeout(conectar, 2000);
    };
  }
  conectar();
})();
