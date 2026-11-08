// Tela do modo Personagem IA (estilo cena): personagem vivo no cenário, voz, boca sincronizada e legenda.
(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const previa = params.get('previa') === '1'; // prévia do painel: sem som (o som sai no LIVE Studio/OBS)
  const mudo = previa || params.get('som') === '0';
  const leve = params.get('leve') === '1' || previa;
  if (leve) document.body.classList.add('leve');
  let falaAtual = null; // fala tocando agora
  let nivelSuave = 0; // volume da voz (0 a 1), suavizado

  // ---------- escala ----------
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
  const definir = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
  const sortear = (a, b) => a + Math.random() * (b - a);
  const corDoNome = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 55% 42%)`;
  };
  function avatarHtml(u, classe = 'av', id = '') {
    const inicial = esc((u?.nome || '?').trim().charAt(0).toUpperCase());
    const foto = u?.foto ? `background-image:url('${esc(u.foto)}');` : '';
    return `<div ${id ? `id="${id}" ` : ''}class="${classe}" style="background-color:${corDoNome(u?.nome)};${foto}">${u?.foto ? '' : inicial}</div>`;
  }
  const moedas = (n) => `${fmt(n)} moeda${n === 1 ? '' : 's'}`;
  const ehVideo = (url) => /\.(mp4|webm)$/i.test(url ?? '');

  // ---------- visual: cenário e personagem ----------
  const PACOTE_CAPI = { parado: '/personagens/capi/parado.webp', meio: '/personagens/capi/meio.webp', falando: '/personagens/capi/falando.webp', piscando: '/personagens/capi/piscando.webp' };
  let visual = { tipo: 'imagens', quadros: PACOTE_CAPI };

  function aplicarCenario(cenario, fundo) {
    const forcado = params.get('fundo') === 'transparente' ? 'transparente' : cenario === 'proprio' && !fundo ? 'praia' : cenario;
    document.body.className = `${leve ? 'leve ' : ''}cen-${forcado}`;
    const transp = forcado === 'transparente';
    document.documentElement.style.background = document.body.style.background = transp ? 'transparent' : '';
    const v = $('fundoVideo');
    const div = $('fundo');
    if (forcado === 'proprio') {
      if (ehVideo(fundo)) {
        div.style.backgroundImage = 'none';
        if (v.getAttribute('src') !== fundo) v.src = fundo;
        v.hidden = false;
        v.play().catch(() => {});
      } else {
        v.hidden = true;
        div.style.backgroundImage = `url('${fundo}')`;
      }
    } else {
      v.hidden = true;
      v.removeAttribute('src');
      div.style.backgroundImage = '';
    }
  }

  function aplicarPersonagem(p) {
    const m = p.midia ?? {};
    if (p.pacote === 'proprio' && m.videoParado) {
      visual = { tipo: 'video', parado: m.videoParado, falando: m.videoFalando || m.videoParado };
    } else if (p.pacote === 'proprio' && m.parado) {
      visual = { tipo: 'imagens', quadros: { parado: m.parado, meio: m.meio || m.falando || '', falando: m.falando || m.meio || '', piscando: m.piscando || '' } };
    } else visual = { tipo: 'imagens', quadros: PACOTE_CAPI };

    const imgs = { parado: $('fParado'), meio: $('fMeio'), falando: $('fFalando'), piscando: $('fPiscando') };
    const vids = { parado: $('vParado'), falando: $('vFalando') };
    if (visual.tipo === 'imagens') {
      for (const [k, el] of Object.entries(imgs)) {
        const src = visual.quadros[k];
        el.hidden = !src;
        if (src && el.getAttribute('src') !== src) el.src = src;
      }
      for (const v of Object.values(vids)) {
        v.hidden = true;
        v.pause();
      }
    } else {
      for (const el of Object.values(imgs)) el.hidden = true;
      for (const [k, v] of Object.entries(vids)) {
        v.hidden = false;
        if (v.getAttribute('src') !== visual[k]) v.src = visual[k];
        v.play().catch(() => {});
      }
    }
    mostrarQuadro('parado');
  }

  let quadroAtual = '';
  function mostrarQuadro(nome) {
    if (visual.tipo === 'video') {
      const falando = nome !== 'parado' && nome !== 'piscando';
      $('vFalando').classList.toggle('on', falando);
      $('vParado').classList.toggle('on', !falando);
      return;
    }
    if (!visual.quadros[nome]) nome = nome === 'meio' ? 'falando' : 'parado';
    if (!visual.quadros[nome]) nome = 'parado';
    if (nome === quadroAtual) return;
    quadroAtual = nome;
    for (const [k, id] of [['parado', 'fParado'], ['meio', 'fMeio'], ['falando', 'fFalando'], ['piscando', 'fPiscando']]) $(id).classList.toggle('on', k === nome);
  }

  // ---------- estado vindo do servidor ----------
  let cfgAtual = '';
  let estadoFila = '';
  function aplicarEstado(e) {
    if (e.modo && e.modo !== 'personagem') return location.reload();
    const p = e.personagem;
    if (!p) return;
    const cfg = JSON.stringify([p.cenario, p.placa, p.pacote, p.midia, p.presentes]);
    if (cfg !== cfgAtual) {
      cfgAtual = cfg;
      aplicarCenario(p.cenario, p.midia?.fundo);
      aplicarPersonagem(p);
      $('placa').hidden = !p.placa;
      definir($('placaTexto'), p.placa ?? '');
      definir($('cPrioridade'), moedas(p.presentes.prioridadeMoedas));
      definir($('cSalve'), moedas(p.presentes.salveMoedas));
      definir($('cFoto'), moedas(p.presentes.fotoMoedas));
    }

    if (p.motivo === 'limite') estadoFila = '⏸️ Volto amanhã! Limite de respostas de hoje.';
    else if (p.pausado) estadoFila = '⏸️ Já volto a responder!';
    else if (p.tamanho > 0) estadoFila = `📨 ${p.tamanho} ${p.tamanho === 1 ? 'pergunta' : 'perguntas'} na fila · 🌹 rosa responde primeiro`;
    else estadoFila = 'Escreva sua pergunta no chat 💬';
    if (!falaAtual) perguntaVazia();

    const m = e.metaCurtidas;
    const base = m.proxima - m.passo;
    definir($('metaAtual'), fmt(m.total));
    definir($('metaAlvo'), `/ ${fmt(m.proxima)}`);
    $('metaFill').style.height = `${Math.min(100, ((m.total - base) / m.passo) * 100).toFixed(1)}%`;

    const top = e.ranking.slice(0, 3).map((u) => `<li>${avatarHtml(u)}<span class="n">${esc(u.nome)}</span><span class="m">🪙${fmt(u.moedas)}</span></li>`).join('');
    if ($('top').dataset.html !== top) {
      $('top').innerHTML = top;
      $('top').dataset.html = top;
    }
    if (typeof e.metaCurtidas.total === 'number') curtidasNovas(e.metaCurtidas.total);
  }

  // ---------- pergunta da vez ----------
  const SELOS = { pergunta: ['🌹 Respondendo primeiro', ''], agradecer: ['🎁 Presente', ''], salve: ['📣 Salve', 'salve'], foto: ['📸 Julgando a foto', 'foto'] };
  function mostrarPergunta(fx) {
    $('pAv').outerHTML = avatarHtml(fx.usuario, 'p-av', 'pAv');
    definir($('pNome'), fx.usuario.nome);
    let texto = fx.pergunta;
    if (fx.tipoFala === 'agradecer') texto = `mandou ${fx.presente?.quantidade > 1 ? `${fx.presente.quantidade}x ` : ''}${fx.presente?.nome ?? 'um presente'} 🎁`;
    if (fx.tipoFala === 'salve') texto = 'pediu um salve 📣';
    if (fx.tipoFala === 'foto') texto = 'pediu para eu julgar a foto de perfil 📸';
    definir($('pTexto'), texto);
    const [selo, classe] = SELOS[fx.tipoFala] ?? SELOS.pergunta;
    const mostrarSelo = fx.tipoFala !== 'pergunta' || fx.presenteou;
    $('pSelo').hidden = !mostrarSelo;
    $('pSelo').className = `p-selo ${classe}`;
    definir($('pSelo'), selo);
    const card = $('pergunta');
    card.classList.toggle('vip', Boolean(mostrarSelo));
    card.classList.remove('nova');
    void card.offsetWidth;
    card.classList.add('nova');
  }
  function perguntaVazia() {
    if ($('pAv').className !== 'p-av vazio') $('pAv').outerHTML = '<div id="pAv" class="p-av vazio">💬</div>';
    definir($('pNome'), 'Me pergunte qualquer coisa!');
    definir($('pTexto'), estadoFila || 'Escreva sua pergunta no chat 💬');
    $('pSelo').hidden = true;
    $('pergunta').classList.remove('vip');
  }

  // ---------- vida do personagem: gestos e piscadas ----------
  const ator = $('ator');
  let gestoAte = 0;
  function gesto(nome, ms) {
    if (leve && nome !== 'pulo' && nome !== 'festa') return;
    ator.classList.remove('olhar-esq', 'olhar-dir', 'balanco', 'pulo', 'festa');
    void ator.offsetWidth;
    ator.classList.add(nome);
    gestoAte = performance.now() + ms;
    setTimeout(() => ator.classList.remove(nome), ms);
  }
  (function gestosAleatorios() {
    if (performance.now() > gestoAte) {
      const opcoes = falaAtual ? ['balanco', 'olhar-esq', 'olhar-dir'] : ['olhar-esq', 'olhar-dir', 'balanco', 'balanco'];
      const g = opcoes[Math.floor(Math.random() * opcoes.length)];
      gesto(g, g === 'balanco' ? 1400 : 1600);
    }
    setTimeout(gestosAleatorios, falaAtual ? sortear(2500, 4500) : sortear(5000, 9000));
  })();

  let piscando = false;
  (function piscar() {
    const podePiscar = visual.tipo === 'imagens' && visual.quadros.piscando && nivelSuave < 0.15;
    if (podePiscar) {
      piscando = true;
      mostrarQuadro('piscando');
      setTimeout(() => {
        piscando = false;
        // às vezes pisca duas vezes seguidas, como gente
        if (Math.random() < 0.2) setTimeout(() => { piscando = true; mostrarQuadro('piscando'); setTimeout(() => (piscando = false), 110); }, 160);
      }, 120);
    }
    setTimeout(piscar, sortear(2400, 5600));
  })();

  // ---------- voz, boca e corpo falando ----------
  const audio = new Audio();
  audio.preload = 'auto';
  let ctx;
  let analisador;
  let dados;
  function prepararAnalise() {
    if (analisador || mudo) return;
    try {
      ctx = new AudioContext();
      const fonte = ctx.createMediaElementSource(audio);
      analisador = ctx.createAnalyser();
      analisador.fftSize = 512;
      dados = new Uint8Array(analisador.fftSize);
      fonte.connect(analisador).connect(ctx.destination);
    } catch {
      analisador = null;
    }
  }

  const atorFala = $('atorFala');
  function animar() {
    let nivel = 0;
    const t = performance.now() / 1000;
    if (falaAtual) {
      if (analisador && !audio.paused) {
        analisador.getByteTimeDomainData(dados);
        let soma = 0;
        for (const v of dados) soma += (v - 128) * (v - 128);
        nivel = Math.min(1, Math.sqrt(soma / dados.length) / 28);
      } else {
        // sem análise do áudio (prévia, voz do navegador): imita o ritmo de uma fala
        nivel = Math.max(0, 0.25 + 0.45 * Math.sin(t * 11) * Math.sin(t * 3.1) + 0.2 * Math.sin(t * 17));
      }
    }
    nivelSuave += (nivel - nivelSuave) * (nivel > nivelSuave ? 0.55 : 0.3);
    if (!piscando) mostrarQuadro(nivelSuave > 0.36 ? 'falando' : nivelSuave > 0.1 ? 'meio' : 'parado');
    // cabeça e corpo acompanham a fala: leve sobe-e-desce e inclinação
    const sobe = nivelSuave * 16;
    const gira = falaAtual ? Math.sin(t * 2.2) * 1.6 * (0.4 + nivelSuave) : 0;
    atorFala.style.transform = `translateY(${(-sobe).toFixed(1)}px) rotate(${gira.toFixed(2)}deg) scale(${(1 + nivelSuave * 0.018).toFixed(4)}, ${(1 - nivelSuave * 0.012).toFixed(4)})`;
    requestAnimationFrame(animar);
  }
  requestAnimationFrame(animar);

  // legenda: no máximo ~3 linhas, palavra por palavra, a palavra da vez em destaque
  let timerLegenda;
  function mostrarLegenda(texto, duracao) {
    const palavras = String(texto).split(/\s+/).filter(Boolean);
    const p = $('legendaTexto');
    p.innerHTML = palavras.map((w) => `<span>${esc(w)}</span>`).join(' ');
    $('legenda').hidden = false;
    let tam = 60;
    p.style.fontSize = `${tam}px`;
    for (const s of p.children) s.style.opacity = 1;
    while (p.scrollHeight > 222 && tam > 34) p.style.fontSize = `${(tam -= 3)}px`;
    for (const s of p.children) s.style.opacity = '';
    const spans = [...p.children];
    const passo = Math.max(60, (duracao * 1000 * 0.9) / Math.max(1, spans.length));
    let i = 0;
    clearInterval(timerLegenda);
    timerLegenda = setInterval(() => {
      spans[i - 1]?.classList.remove('agora');
      spans[i]?.classList.add('on', 'agora');
      i += 1;
      if (i > spans.length) clearInterval(timerLegenda);
    }, passo);
  }

  let ws;
  function avisarFim(id) {
    if (previa || ws?.readyState !== 1) return;
    ws.send(JSON.stringify({ cmd: 'falaTerminou', id }));
  }

  function falar(fx) {
    pararFala();
    falaAtual = fx;
    mostrarPergunta(fx);
    mostrarLegenda(fx.resposta, fx.duracao);
    if (fx.tipoFala !== 'pergunta') {
      gesto('festa', 1300);
      chuva(fx.tipoFala === 'foto' ? ['📸', '✨', '🤩'] : fx.tipoFala === 'salve' ? ['📣', '🎉', '✨'] : ['🌹', '💖', '✨'], 14);
    }
    const terminar = () => {
      if (falaAtual?.id !== fx.id) return;
      avisarFim(fx.id);
    };
    if (mudo) return void setTimeout(terminar, fx.duracao * 1000);
    if (fx.audio) {
      prepararAnalise();
      audio.src = fx.audio;
      audio.onended = terminar;
      audio.onerror = () => setTimeout(terminar, 500);
      audio.play()?.catch(() => {
        $('ativarSom').hidden = false; // navegador bloqueou o som até alguém tocar na tela
        setTimeout(terminar, fx.duracao * 1000);
      });
      ctx?.resume?.();
    } else if ('speechSynthesis' in window) {
      // sem voz de IA no servidor: usa a voz do próprio navegador
      const u = new SpeechSynthesisUtterance(fx.resposta);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      const voz = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt'));
      if (voz) u.voice = voz;
      u.onend = terminar;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setTimeout(terminar, (fx.duracao + 4) * 1000);
    } else setTimeout(terminar, fx.duracao * 1000);
  }

  function pararFala() {
    audio.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function fimDaFala(id) {
    if (falaAtual?.id !== id) return;
    falaAtual = null;
    setTimeout(() => {
      if (falaAtual) return;
      $('legenda').hidden = true;
      perguntaVazia();
    }, 1500);
  }

  $('ativarSom').onclick = () => {
    $('ativarSom').hidden = true;
    prepararAnalise();
    ctx?.resume?.();
    if (falaAtual?.audio) audio.play().catch(() => {});
  };

  // ---------- partículas (corações, rosas) ----------
  const camada = $('particulas');
  function particula(emoji, x, y, t = 2.6) {
    if (camada.childElementCount > 40) return;
    const el = document.createElement('span');
    el.className = 'particula';
    el.textContent = emoji;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--t', `${t}s`);
    el.style.setProperty('--dx', `${sortear(-120, 120).toFixed(0)}px`);
    el.style.setProperty('--r', `${sortear(-40, 40).toFixed(0)}deg`);
    el.style.fontSize = `${sortear(40, 70).toFixed(0)}px`;
    camada.appendChild(el);
    setTimeout(() => el.remove(), t * 1000);
  }
  function chuva(emojis, qtd) {
    for (let i = 0; i < (leve ? Math.ceil(qtd / 3) : qtd); i++) {
      setTimeout(() => particula(emojis[i % emojis.length], sortear(260, 820), sortear(700, 1000), sortear(2, 3.2)), i * 70);
    }
  }
  let ultimasCurtidas = null;
  let ultimoCoracao = 0;
  function curtidasNovas(total) {
    if (ultimasCurtidas !== null && total > ultimasCurtidas && performance.now() - ultimoCoracao > 350) {
      ultimoCoracao = performance.now();
      particula(['❤️', '💖', '💕'][Math.floor(Math.random() * 3)], sortear(880, 1010), sortear(1180, 1300), 2.4);
    }
    ultimasCurtidas = total;
  }

  // ---------- alertas de presente ----------
  function toast(html) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    const area = $('toasts');
    while (area.children.length >= 2) area.lastElementChild.remove();
    area.prepend(t);
    setTimeout(() => t.classList.add('saindo'), 2600);
    setTimeout(() => t.remove(), 2950);
  }

  function aplicarFx(fx) {
    switch (fx.tipo) {
      case 'fala':
        return falar(fx);
      case 'falaFim':
        return fimDaFala(fx.id);
      case 'falaPular':
        pararFala();
        return fimDaFala(fx.id);
      case 'presente':
        gesto('pulo', 750);
        chuva(['🌹', '💖', '✨'], fx.nivel === 'normal' ? 5 : 16);
        return toast(`${avatarHtml(fx.usuario)}<span class="txt">${esc(fx.usuario.nome)} enviou ${fx.quantidade > 1 ? `${fx.quantidade}x ` : ''}${esc(fx.nomePresente)}</span>`);
      case 'rei':
        return toast(`${avatarHtml(fx.usuario)}<span class="txt">👑 ${esc(fx.usuario.nome)} é o novo TOP 1!</span>`);
      case 'turbo':
        gesto('festa', 1300);
        return chuva(['❤️', '💖', '🎉'], 18);
    }
  }

  // ---------- conexão ----------
  const token = location.pathname.split('/')[2] ?? '';
  function conectar() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?o=${encodeURIComponent(token)}${previa ? '&previa=1' : ''}`);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.t === 'estado') aplicarEstado(msg.d);
      else if (msg.t === 'fx') aplicarFx(msg.d);
      else if (msg.t === 'recarregar') location.reload();
    };
    ws.onclose = (ev) => {
      if (ev.code === 4001) return void $('avisoTela').classList.add('on');
      setTimeout(conectar, 2000);
    };
  }
  aplicarCenario('praia');
  perguntaVazia();
  conectar();
})();
