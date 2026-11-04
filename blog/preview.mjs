// Builds a single-file, self-contained preview of the whole site (all posts, including scheduled ones).
// Every page becomes a <section>, links become #hash routes, CSS and images are inlined.
// Usage: node preview.mjs   →   dist-preview/index.html
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
const footer = home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];

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

const css = readFileSync(join(D, "assets", "style.css"), "utf8");
const sections = pages
  .map((p) => `<section class="pv-page" id="${p.id}" data-title="${p.title}"${p.id === "home" ? "" : " hidden"}>${p.main}</section>`)
  .join("\n");

const out = `<title>Paws &amp; Cardboard</title>
<meta name="robots" content="noindex">
<style>
${css}
/* preview-only */
.site-header { top: env(safe-area-inset-top, 0px); }
.pv-note { background: #2f6b4f; color: #fff; font: 600 14px/1.4 system-ui, sans-serif; text-align: center; padding-block: 8px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
</style>
<div class="pv-note">Prévia do site completo (21 artigos, incluindo os agendados). Clique à vontade: menu, cards, links e rodapé funcionam.</div>
${rewrite(header)}
<main id="main">
${rewrite(sections)}
</main>
${rewrite(footer)}
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
writeFileSync(join(D, "index.html"), out);
console.log(`Prévia de arquivo único: dist-preview/index.html (${pages.length} páginas, ${Math.round(out.length / 1024)} KB)`);
