(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

  let contas = [];
  let timerToast;
  function avisar(texto) {
    $('toast').textContent = texto;
    $('toast').classList.add('on');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => $('toast').classList.remove('on'), 3000);
  }

  async function api(metodo, rota, corpo) {
    const r = await fetch(rota, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status === 401) {
      location.href = '/entrar';
      throw new Error('Entre na sua conta.');
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Algo deu errado.'), { status: r.status });
    return j;
  }

  function haQuanto(iso) {
    if (!iso) return '—';
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} dia${s >= 172800 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  // ---------- números ----------
  function numeros(r) {
    const cartoes = [
      ['Contas', fmt(r.contas), `${r.bloqueadas} bloqueada${r.bloqueadas === 1 ? '' : 's'}`],
      ['Novas', fmt(r.novas24h), `nas últimas 24h · ${fmt(r.novas7d)} em 7 dias`],
      ['Ativas', fmt(r.ativas7d), 'entraram nos últimos 7 dias'],
      ['Ao vivo agora', fmt(r.livesConectadas), `limite de ${r.maxLives} lives`, 'destaque'],
      ['Em modo teste', fmt(r.emTeste), 'testando o jogo'],
      ['Telas abertas', fmt(r.telasAbertas), 'no LIVE Studio/OBS'],
    ];
    $('numeros').innerHTML = cartoes
      .map(([t, v, sub, classe]) => `<div class="num ${classe ?? ''}"><small>${t}</small><b>${v}</b><span>${sub}</span></div>`)
      .join('');
    const botao = $('cadastro');
    botao.textContent = r.cadastroAberto ? '🔓 Aberto · clique para fechar' : '🔒 Fechado · clique para abrir';
    botao.className = `btn ${r.cadastroAberto ? 'verde' : 'perigo'}`;
    botao.dataset.aberto = r.cadastroAberto ? '1' : '';
    const a = r.armazenamento ?? {};
    const alerta = $('alertaDados');
    if (!a.seguro) {
      let motivo;
      if (a.railway && !a.volume) motivo = 'Este serviço do Railway <b>não tem um volume ligado</b>. Crie um volume (botão <b>+ Add → Volume</b>) e conecte ao serviço.';
      else if (!a.gravando) motivo = `O servidor <b>não consegue gravar</b> em <code>${esc(a.pasta)}</code>${a.erro ? ` (${esc(a.erro)})` : ''}.`;
      else motivo = `Os dados estão em <code>${esc(a.pasta)}</code>, que <b>não é o volume</b>. Apague a variável <code>DATA_DIR</code> no Railway para usar o volume automaticamente.`;
      alerta.innerHTML = `<h2>⚠️ As contas NÃO estão sendo salvas com segurança</h2><p>${motivo}</p><p>Enquanto isso não for resolvido, contas e rankings somem toda vez que o site atualiza ou reinicia.</p>`;
      alerta.hidden = false;
    } else alerta.hidden = true;
    $('servidor').innerHTML = `
      <span>Servidor no ar <b>${haQuanto(r.noArDesde)}</b></span>
      <span>Memória <b>${r.memoriaMb} MB</b></span>
      <span>Dados ${a.seguro ? '<b>✅ salvando</b>' : '<b style="color:var(--ruim)">⚠️ não estão sendo salvos</b>'}</span>
      <span>Chave Euler ${r.euler ? '<b>✅ configurada</b>' : '<b style="color:var(--ouro)">⚠️ não configurada</b>'}</span>`;
  }

  // ---------- contas ----------
  function statusSala(c) {
    if (!c.sala || c.sala.modo === 'desligado') return '<span class="pill">desligado</span>';
    if (c.sala.modo === 'teste') return '<span class="pill ok">modo teste</span>';
    if (c.sala.status === 'conectado') return '<span class="pill ok">🔴 ao vivo</span>';
    return `<span class="pill espera">${esc(c.sala.status)}</span>`;
  }

  function desenhar() {
    const busca = $('busca').value.trim().toLowerCase();
    const filtro = $('filtro').value;
    const visiveis = contas.filter((c) => {
      if (busca && !`${c.nome} ${c.email} ${c.tiktok}`.toLowerCase().includes(busca)) return false;
      if (filtro === 'aovivo') return c.sala?.status === 'conectado';
      if (filtro === 'ativas') return c.sala && c.sala.modo !== 'desligado';
      if (filtro === 'bloqueadas') return c.bloqueada;
      return true;
    });
    if (!visiveis.length) {
      $('lista').innerHTML = `<tr><td colspan="7" class="vazio">Nenhuma conta ${busca || filtro !== 'todas' ? 'com esse filtro' : 'ainda'}.</td></tr>`;
      return;
    }
    $('lista').innerHTML = visiveis
      .map((c) => {
        const aoVivo = c.sala && c.sala.modo !== 'desligado';
        return `<tr class="${c.bloqueada ? 'bloqueada' : ''}">
          <td class="quem"><b>${esc(c.nome)}${c.admin ? '<span class="tag adm">admin</span>' : ''}${c.bloqueada ? '<span class="tag blq">bloqueada</span>' : ''}</b><span>${esc(c.email)}</span></td>
          <td data-r="TikTok">${c.tiktok ? `<a href="https://www.tiktok.com/@${encodeURIComponent(c.tiktok)}/live" target="_blank" rel="noopener">@${esc(c.tiktok)}</a>` : '<span class="fraco">—</span>'}</td>
          <td data-r="Agora">${statusSala(c)}</td>
          <td data-r="Criada" class="fraco">${haQuanto(c.criadaEm)}</td>
          <td data-r="Último acesso" class="fraco">${haQuanto(c.ultimoAcesso)}</td>
          <td data-r="Presentes"><span class="moedas">🪙 ${fmt(c.moedas)}</span> <span class="fraco">· ${c.presenteadores} pessoas</span></td>
          <td><div class="acoes">
            ${aoVivo ? `<button class="btn pequeno" data-acao="desligar" data-id="${c.id}">⏹️ Desligar</button>` : ''}
            ${c.admin ? '' : `<button class="btn pequeno" data-acao="senha" data-id="${c.id}">🔑 Senha nova</button>
            <button class="btn pequeno ${c.bloqueada ? 'verde' : ''}" data-acao="bloquear" data-id="${c.id}">${c.bloqueada ? '✅ Desbloquear' : '🚫 Bloquear'}</button>
            <button class="btn pequeno perigo" data-acao="excluir" data-id="${c.id}">🗑️</button>`}
          </div></td>
        </tr>`;
      })
      .join('');
  }

  async function atualizar() {
    const [r, l] = await Promise.all([api('GET', '/api/admin/resumo'), api('GET', '/api/admin/contas')]);
    numeros(r);
    contas = l.contas;
    desenhar();
  }

  $('busca').oninput = desenhar;
  $('filtro').onchange = desenhar;

  $('cadastro').onclick = async () => {
    const abrir = !$('cadastro').dataset.aberto;
    if (!abrir && !confirm('Fechar o cadastro? Ninguém novo vai conseguir criar conta.')) return;
    await api('PUT', '/api/admin/ajustes', { cadastroAberto: abrir });
    avisar(abrir ? 'Cadastro aberto.' : 'Cadastro fechado.');
    atualizar();
  };

  $('lista').onclick = async (ev) => {
    const b = ev.target.closest('button[data-acao]');
    if (!b) return;
    const c = contas.find((x) => x.id === b.dataset.id);
    if (!c) return;
    try {
      if (b.dataset.acao === 'desligar') {
        if (!confirm(`Desligar o jogo de ${c.nome} agora? A tela do jogo sai da live dela.`)) return;
        await api('POST', `/api/admin/conta/${c.id}/desligar`);
        avisar('Jogo desligado.');
      } else if (b.dataset.acao === 'senha') {
        if (!confirm(`Gerar uma senha nova para ${c.nome}? A senha antiga para de funcionar.`)) return;
        const { senha } = await api('POST', `/api/admin/conta/${c.id}/senha`);
        prompt(`Senha nova de ${c.email}. Copie e mande para a pessoa (ela pode entrar e usar normalmente):`, senha);
      } else if (b.dataset.acao === 'bloquear') {
        const bloquear = !c.bloqueada;
        if (bloquear && !confirm(`Bloquear ${c.nome}? A pessoa é desconectada e não consegue mais entrar nem usar o jogo.`)) return;
        await api('POST', `/api/admin/conta/${c.id}/bloquear`, { bloqueada: bloquear });
        avisar(bloquear ? 'Conta bloqueada.' : 'Conta desbloqueada.');
      } else if (b.dataset.acao === 'excluir') {
        const digitado = prompt(`EXCLUIR a conta de ${c.nome} para sempre (inclui o ranking)?\nPara confirmar, digite o e-mail: ${c.email}`);
        if (digitado === null) return;
        if (digitado.trim().toLowerCase() !== c.email) return avisar('E-mail não confere. Nada foi excluído.');
        await api('DELETE', `/api/admin/conta/${c.id}`);
        avisar('Conta excluída.');
      }
      atualizar();
    } catch (e) {
      avisar(e.message);
    }
  };

  $('sair').onclick = async () => {
    await api('POST', '/api/sair').catch(() => {});
    location.href = '/';
  };

  atualizar()
    .then(() => {
      $('conteudo').hidden = false;
      setInterval(() => atualizar().catch(() => {}), 10_000);
    })
    .catch((e) => {
      if (e.status === 404) $('negado').hidden = false;
      else avisar(e.message);
    });
})();
