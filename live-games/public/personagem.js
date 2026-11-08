// Tela do modo Personagem IA: recebe as falas do servidor, toca a voz, mexe a boca e mostra a legenda.
(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const previa = params.get('previa') === '1'; // prévia do painel: sem som (o som sai no LIVE Studio/OBS)
  const mudo = previa || params.get('som') === '0';
  if (params.get('leve') === '1' || previa) document.body.classList.add('leve');
  if (params.get('fundo') === 'transparente') definirCenario('transparente');

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
  const corDoNome = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 60% 42%)`;
  };
  function avatarHtml(u, classe = '') {
    const inicial = esc((u?.nome || '?').trim().charAt(0).toUpperCase());
    const foto = u?.foto ? `background-image:url('${esc(u.foto)}');` : '';
    return `<div class="av ${classe}" style="background-color:${corDoNome(u?.nome)};${foto}">${u?.foto ? '' : inicial}</div>`;
  }
  const moedas = (n) => `${fmt(n)} moeda${n === 1 ? '' : 's'}`;

  function definirCenario(c) {
    const forcado = params.get('fundo') === 'transparente' ? 'transparente' : c;
    document.body.className = document.body.className.replace(/cen-\S+/g, '').trim() + ` cen-${forcado}`;
    const transp = forcado === 'transparente';
    document.documentElement.style.background = transp ? 'transparent' : '';
    document.body.style.background = transp ? 'transparent' : '';
  }

  // ---------- estado vindo do servidor ----------
  let cfgAtual = '';
  function aplicarEstado(e) {
    if (e.modo && e.modo !== 'personagem') return location.reload();
    const p = e.personagem;
    if (!p) return;
    const cfg = JSON.stringify([p.nome, p.cenario, p.imagem, p.presentes]);
    if (cfg !== cfgAtual) {
      cfgAtual = cfg;
      definir($('nomeTag'), p.nome.toUpperCase());
      definirCenario(p.cenario);
      const img = $('imgPersonagem');
      if (p.imagem) {
        if (img.getAttribute('src') !== p.imagem) img.src = p.imagem;
        img.hidden = false;
        $('nix').style.display = 'none';
      } else {
        img.hidden = true;
        $('nix').style.display = '';
      }
      definir($('cPrioridade'), moedas(p.presentes.prioridadeMoedas));
      definir($('cSalve'), moedas(p.presentes.salveMoedas));
      definir($('cFoto'), moedas(p.presentes.fotoMoedas));
    }
    $('pensando').hidden = !(p.pensando && !falaAtual);

    let fila;
    if (p.motivo === 'limite') fila = '⏸️ Limite de respostas de hoje atingido';
    else if (p.pausado) fila = '⏸️ Respostas pausadas';
    else if (p.tamanho > 0) fila = `📨 ${p.tamanho} ${p.tamanho === 1 ? 'pergunta' : 'perguntas'} na fila · 🌹 rosa responde primeiro`;
    else fila = '💬 Me pergunte qualquer coisa no chat!';
    definir($('fila'), fila);

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
  }

  // ---------- pergunta da vez ----------
  const SELOS = { pergunta: ['🌹 RESPONDENDO PRIMEIRO', ''], agradecer: ['🎁 PRESENTE', ''], salve: ['📣 SALVE', 'salve'], foto: ['📸 JULGANDO A FOTO', 'foto'] };
  function mostrarPergunta(fx) {
    const card = $('pergunta');
    const av = $('pAv');
    av.outerHTML = avatarHtml(fx.usuario, 'p-av').replace('class="av p-av"', 'id="pAv" class="p-av"');
    definir($('pNome'), fx.usuario.nome);
    let texto = fx.pergunta;
    if (fx.tipoFala === 'agradecer') texto = `mandou ${fx.presente?.quantidade > 1 ? `${fx.presente.quantidade}x ` : ''}${fx.presente?.nome ?? 'um presente'} 🎁`;
    if (fx.tipoFala === 'salve') texto = `pediu um salve 📣`;
    if (fx.tipoFala === 'foto') texto = `pediu para eu julgar a foto de perfil 📸`;
    definir($('pTexto'), texto);
    const [selo, classe] = SELOS[fx.tipoFala] ?? SELOS.pergunta;
    const mostrarSelo = fx.tipoFala !== 'pergunta' || fx.presenteou;
    $('pSelo').hidden = !mostrarSelo;
    $('pSelo').className = `p-selo ${classe}`;
    definir($('pSelo'), selo);
    card.classList.toggle('vip', Boolean(mostrarSelo));
    card.classList.remove('nova');
    void card.offsetWidth;
    card.classList.add('nova');
  }
  function perguntaVazia() {
    $('pAv').outerHTML = '<div id="pAv" class="p-av vazio">💬</div>';
    definir($('pNome'), 'Me pergunte qualquer coisa!');
    definir($('pTexto'), 'Escreva sua pergunta no chat 💬');
    $('pSelo').hidden = true;
    $('pergunta').classList.remove('vip');
  }
  perguntaVazia();

  // ---------- voz e boca ----------
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

  let falaAtual = null;
  let nivelSuave = 0;
  const boca = $('boca');
  const imgP = $('imgPersonagem');
  function animarBoca() {
    let nivel = 0;
    if (falaAtual) {
      if (analisador && !audio.paused) {
        analisador.getByteTimeDomainData(dados);
        let soma = 0;
        for (const v of dados) soma += (v - 128) * (v - 128);
        nivel = Math.min(1, Math.sqrt(soma / dados.length) / 40);
      } else {
        // sem análise de áudio (prévia, voz do navegador): simula a boca falando
        const t = performance.now() / 1000;
        nivel = 0.35 + 0.35 * Math.abs(Math.sin(t * 9)) * (0.6 + 0.4 * Math.sin(t * 2.3));
      }
    }
    nivelSuave += (nivel - nivelSuave) * 0.45;
    boca.setAttribute('transform', `scale(${(1 + nivelSuave * 0.25).toFixed(3)} ${(0.45 + nivelSuave * 2.6).toFixed(3)})`);
    if (!imgP.hidden) imgP.style.transform = `scale(${(1 + nivelSuave * 0.05).toFixed(3)}, ${(1 - nivelSuave * 0.035).toFixed(3)})`;
    requestAnimationFrame(animarBoca);
  }
  requestAnimationFrame(animarBoca);

  // legenda aparece palavra por palavra no ritmo da fala
  let timerLegenda;
  function mostrarLegenda(texto, duracao) {
    const palavras = String(texto).split(/\s+/).filter(Boolean);
    $('legendaTexto').innerHTML = palavras.map((p) => `<span>${esc(p)}</span>`).join(' ');
    $('legenda').hidden = false;
    // texto grande: diminui a letra até caber em ~3 linhas (não invade o rodapé)
    const p = $('legendaTexto');
    let tam = 40;
    p.style.fontSize = `${tam}px`;
    while (p.scrollHeight > 192 && tam > 24) p.style.fontSize = `${(tam -= 2)}px`;
    const spans = [...p.children];
    const passo = Math.max(60, (duracao * 1000 * 0.92) / Math.max(1, spans.length));
    let i = 0;
    clearInterval(timerLegenda);
    timerLegenda = setInterval(() => {
      spans[i++]?.classList.add('on');
      if (i >= spans.length) clearInterval(timerLegenda);
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
    $('pensando').hidden = true;
    $('personagem').classList.add('falando');
    mostrarPergunta(fx);
    mostrarLegenda(fx.resposta, fx.duracao);
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
      const tocar = audio.play();
      tocar?.catch(() => {
        // navegador bloqueou o som até alguém tocar na tela
        $('ativarSom').hidden = false;
        setTimeout(terminar, fx.duracao * 1000);
      });
      ctx?.resume?.();
    } else if ('speechSynthesis' in window) {
      // sem voz de IA no servidor: usa a voz do próprio navegador
      const u = new SpeechSynthesisUtterance(fx.resposta);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      u.pitch = 1.3;
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
    $('personagem').classList.remove('falando');
    setTimeout(() => {
      if (falaAtual) return;
      $('legenda').hidden = true;
      perguntaVazia();
    }, 1800);
  }

  $('ativarSom').onclick = () => {
    $('ativarSom').hidden = true;
    prepararAnalise();
    ctx?.resume?.();
    if (falaAtual?.audio) audio.play().catch(() => {});
  };

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
      case 'pensando':
        if (!falaAtual) $('pensando').hidden = false;
        return;
      case 'presente':
        return toast(`${avatarHtml(fx.usuario)}<span class="txt">${esc(fx.usuario.nome)} mandou ${fx.quantidade > 1 ? `${fx.quantidade}x ` : ''}${esc(fx.nomePresente)} 🎁</span>`);
      case 'rei':
        return toast(`${avatarHtml(fx.usuario)}<span class="txt">👑 ${esc(fx.usuario.nome)} é o novo TOP 1!</span>`);
      case 'turbo':
        return toast(`<span class="txt" style="padding-left:12px">⚡ Meta de curtidas batida! Valeu, galera!</span>`);
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
  conectar();
})();
