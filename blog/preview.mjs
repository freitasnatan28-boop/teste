// Builds a single-file, self-contained preview of the whole site (all posts, including scheduled ones).
// Every page becomes a <section>, links become #hash routes, CSS and images are inlined.
// Usage: node preview.mjs   →   dist-preview/carimbo-preview.html
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
const config = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "site.config.json"), "utf8"));

const ROOT = dirname(fileURLToPath(import.meta.url));
const D = join(ROOT, "dist-preview");
execFileSync(process.execPath, [join(ROOT, "build.mjs"), "--preview"], { stdio: "inherit" });

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const routeOf = (file) => "/" + relative(D, file).replace(/\\/g, "/").replace(/index\.html$/, "");
const idOf = (route) => (route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-"));

const files = walk(D).filter((f) => f.endsWith("index.html"));
const pages = files.map((f) => {
  const html = readFileSync(f, "utf8");
  const route = routeOf(f);
  const id = idOf(route);
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  let main = html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
  // Heading ids repeat across articles, so namespace them per page.
  main = main.replace(/ id="([^"]+)"/g, (_, x) => ` id="${id}--${x}"`).replace(/href="#([^"]+)"/g, (_, x) => `href="#${id}--${x}"`);
  return { id, route, title, main, html };
});
const home = pages.find((p) => p.id === "home").html;
const header = home.match(/<header class="masthead">[\s\S]*?<\/header>/)[0];
const footer = home.match(/<footer class="footer">[\s\S]*?<\/footer>/)[0];

const dataUri = (p) => {
  const buf = readFileSync(join(D, p));
  const type = p.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${type};base64,${buf.toString("base64")}`;
};
const known = new Set(pages.map((p) => p.route));
const rewrite = (s) =>
  s
    .replace(/src="\/([^"]+\.(?:svg|png))"/g, (_, p) => `src="${dataUri(p)}"`)
    .replace(/href="(\/[^"#]*)"/g, (m, r) => (known.has(r) ? `href="#${idOf(r)}"` : m));

const css = readFileSync(join(D, "assets", "style.css"), "utf8").replace(/url\("\/assets\/fonts\/([^"]+)"\)/g, (_, f) => `url("data:font/woff2;base64,${readFileSync(join(D, "assets", "fonts", f)).toString("base64")}")`);
const sections = pages
  .map((p) => `<section class="pv-page" id="${p.id}" data-title="${p.title}"${p.id === "home" ? "" : " hidden"}>${p.main}</section>`)
  .join("\n");

const out = `<title>${config.name}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex">
<style>
${css}
/* preview-only */
.pv-note { font: 500 0.75rem/1.5 var(--mono); letter-spacing: 0.04em; color: var(--ink-soft); padding-block: 10px; border-bottom: 1px dashed var(--rule); }
</style>
<div class="page">
<p class="pv-note">PRÉVIA · todos os links funcionam aqui dentro · nome, e-mail e anúncios entram quando você enviar seus dados</p>
${rewrite(header)}
<main id="main">
${rewrite(sections)}
</main>
${rewrite(footer)}
</div>
<script>
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll(".pv-page"));
  function show() {
    var h = decodeURIComponent(location.hash.slice(1));
    var pageId = h.split("--")[0] || "home";
    var page = document.getElementById(pageId);
    if (!page || !page.classList.contains("pv-page")) page = document.getElementById("home");
    pages.forEach(function (s) { s.hidden = s !== page; });
    document.title = page.getAttribute("data-title");
    var target = h.indexOf("--") > -1 ? document.getElementById(h) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", show);
  show();
})();
</script>
`;
writeFileSync(join(D, "carimbo-preview.html"), out);
console.log(`Prévia de arquivo único: dist-preview/carimbo-preview.html (${pages.length} páginas, ${Math.round(out.length / 1024)} KB)`);
