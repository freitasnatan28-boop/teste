// Validação visual e funcional da página de vendas (Fase 5).
// Uso: node qa/verificar_site.cjs [URL]   (padrão: sobe um servidor local para dist/site)
// Gera capturas de página inteira em dist/qa/ e imprime um resumo dos testes.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const SITE = path.join(__dirname, '..', 'dist', 'site');
const SAIDA = path.join(__dirname, '..', 'dist', 'qa');
const LARGURAS = [360, 390, 768, 1280];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function servidor() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      let f = path.join(SITE, decodeURIComponent(req.url.split('?')[0]));
      if (f.endsWith('/')) f += 'index.html';
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
        res.end(data);
      });
    }).listen(0, () => ok(s));
  });
}

(async () => {
  let url = process.argv[2], srv;
  if (!url) { srv = await servidor(); url = `http://localhost:${srv.address().port}/`; }
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch();
  const falhas = [];
  const teste = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) falhas.push(msg); };

  for (const w of LARGURAS) {
    console.log(`\n${w}px`);
    const page = await browser.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
    const erros = [];
    page.on('pageerror', e => erros.push(e.message));
    page.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`); });
    await page.goto(url + '?utm_source=facebook&utm_campaign=teste&utm_content=video1&fbclid=ABC123', { waitUntil: 'networkidle' });

    // rola devagar para carregar as imagens com lazy-loading
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 80)); }
    });
    await page.waitForLoadState('networkidle');

    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const vazando = [...document.querySelectorAll('body *')].filter(el => {
        const b = el.getBoundingClientRect(); const st = getComputedStyle(el);
        return b.width > 0 && st.position !== 'fixed' && (b.right > vw + 1 || b.left < -1);
      }).map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      const imgs = [...document.images];
      const visiveis = imgs.filter(i => i.getClientRects().length > 0); // imagens com display:none no celular não carregam
      const pequenos = [...document.querySelectorAll('a, summary')].filter(el => {
        const b = el.getBoundingClientRect(); return b.width > 0 && getComputedStyle(el).display !== 'none' && b.height < 44;
      }).map(el => `${el.textContent.trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().height)}px)`);
      return {
        rolagemH: document.documentElement.scrollWidth > vw,
        vazando: [...new Set(vazando)].slice(0, 8),
        imgsQuebradas: visiveis.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
        semAlt: imgs.filter(i => !i.hasAttribute('alt')).length,
        semDim: imgs.filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length,
        nImgs: visiveis.length,
        botoes: [...document.querySelectorAll('a.js-checkout')].map(a => a.getAttribute('href')),
        pequenos,
        fonte: document.fonts.check('700 16px Poppins'),
        eventos: (window.__eventos || []).slice(),
      };
    });
    teste(!r.rolagemH, 'sem rolagem horizontal');
    teste(r.vazando.length === 0, 'nenhum elemento saindo da tela' + (r.vazando.length ? ': ' + r.vazando.join(', ') : ''));
    teste(r.imgsQuebradas.length === 0, `${r.nImgs} imagens carregadas` + (r.imgsQuebradas.length ? ' | quebradas: ' + r.imgsQuebradas.join(', ') : ''));
    teste(r.semAlt === 0 && r.semDim === 0, 'todas as imagens com alt, width e height');
    teste(r.pequenos.length === 0, 'links e botões com altura ≥ 44px' + (r.pequenos.length ? ': ' + r.pequenos.join(' | ') : ''));
    teste(r.fonte, 'fonte Poppins carregada');
    teste(erros.length === 0, 'sem erros de JavaScript nem arquivos faltando' + (erros.length ? ': ' + erros.join(' | ') : ''));
    teste(r.eventos.filter(e => e === 'ViewContent').length === 1, `ViewContent disparou 1 vez ao rolar até a oferta (${r.eventos.join(', ') || 'nenhum'})`);

    if (w === LARGURAS[0]) {
      console.log(`  • ${r.botoes.length} botões de compra: ${[...new Set(r.botoes)].join(', ')}`);
      const externos = r.botoes.filter(h => /^https?:/.test(h));
      if (externos.length) {
        const todosComUtm = externos.every(h => { const u = new URL(h); return u.searchParams.get('utm_source') === 'facebook' && u.searchParams.get('fbclid') === 'ABC123'; });
        teste(todosComUtm, 'UTM e fbclid repassados para o checkout');
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.click('.hero a.js-checkout', { force: true, noWaitAfter: true });
      const ev = await page.evaluate(() => window.__eventos || []);
      teste(ev.includes('InitiateCheckout'), 'InitiateCheckout disparou no clique');
      await page.goto(url, { waitUntil: 'networkidle' });
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    // a barra fixa do celular aparece no meio da captura de página inteira; ela é testada à parte
    await page.addStyleTag({ content: '.sticky{display:none!important}' });
    await page.screenshot({ path: path.join(SAIDA, `pagina-${w}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
  if (srv) srv.close();
  console.log(falhas.length ? `\n${falhas.length} problema(s).` : '\nTudo certo.');
  process.exit(falhas.length ? 1 : 0);
})();
