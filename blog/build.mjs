// Static site builder for the blog.
// Reads Markdown from content/, writes a ready-to-upload site to dist/.
// Usage: node build.mjs            → dist/ (only posts whose date has arrived)
//        node build.mjs --future   → dist/ including scheduled posts
//        node build.mjs --preview  → dist-preview/ including scheduled posts (used by preview.mjs)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PREVIEW = process.argv.includes("--preview");
const OUT = join(ROOT, PREVIEW ? "dist-preview" : "dist");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const SITE_URL = config.url.replace(/\/+$/, "");
const TODAY = new Date().toISOString().slice(0, 10);
const INCLUDE_FUTURE = PREVIEW || process.argv.includes("--future");
const SECTIONS = Object.fromEntries(config.sections.map((s) => [s.key, s]));

const LEGAL_PAGES = [
  ["about", "About"],
  ["contact", "Contact"],
  ["privacy-policy", "Privacy"],
  ["cookie-policy", "Cookies"],
  ["terms", "Terms"],
  ["affiliate-disclosure", "Affiliate disclosure"],
  ["disclaimer", "Disclaimer"],
];

// ---------- helpers ----------
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripTags = (s) => s.replace(/<[^>]+>/g, "");
const slugify = (s) =>
  stripTags(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const fmtDate = (iso) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const abs = (path) => SITE_URL + path;
const minutes = (words) => Math.max(1, Math.round(words / 230));

function fill(text) {
  return text
    .replaceAll("{{site.name}}", config.name)
    .replaceAll("{{site.url}}", SITE_URL)
    .replaceAll("{{author.name}}", config.author.name)
    .replaceAll("{{author.shortBio}}", config.author.shortBio)
    .replaceAll("{{contactEmail}}", config.contactEmail)
    .replaceAll("{{ownerCountry}}", config.ownerCountry)
    .replaceAll("{{policiesLastUpdated}}", fmtDate(config.policiesLastUpdated));
}

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
    else if (/^(true|false)$/.test(v)) v = v === "true";
    else v = v.replace(/^["']|["']$/g, "");
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

// A passport-style stamp, drawn inline so it follows the theme colour.
function stamp(section, cls = "stamp") {
  const name = section.name.toUpperCase();
  const size = name.length > 10 ? 7 : 8.5;
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.4 2.4"/>
<text x="50" y="33" text-anchor="middle" fill="currentColor" style="font:500 7px var(--mono);letter-spacing:1.5px">${esc(config.name.toUpperCase())}</text>
<text x="50" y="60" text-anchor="middle" fill="currentColor" style="font:700 24px var(--display);letter-spacing:2px">${esc(section.code)}</text>
<text x="50" y="75" text-anchor="middle" fill="currentColor" style="font:500 ${size}px var(--mono);letter-spacing:0.5px">${esc(name)}</text>
</svg>`;
}

// ---------- markdown ----------
const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${text}</h${depth}>\n`;
    },
    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      return text.startsWith("<strong>Tip</strong>") ? `<p class="tip">${text}</p>\n` : `<p>${text}</p>\n`;
    },
    image({ href, title, text }) {
      const img = `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy" decoding="async">`;
      return title ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>` : img;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
      const affiliate = /amzn\.to|amazon\.[a-z.]+\/.*tag=|booking\.com\/.*aid=|getyourguide\.[a-z]+\/.*partner_id|go\.skimresources|shareasale/.test(href);
      const rel = affiliate ? ' rel="sponsored nofollow noopener" target="_blank"' : external ? ' rel="noopener" target="_blank"' : "";
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${rel}>${text}</a>`;
    },
  },
});

function renderMarkdown(md) {
  const photoSlots = (md.match(/<!--\s*PHOTO:/g) || []).length;
  const html = marked.parse(fill(md)).replace(/<!--[\s\S]*?-->\s*/g, "");
  const toc = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1], text: stripTags(m[2]) }));
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return { html, toc, words, photoSlots };
}

// ---------- load content ----------
function loadDir(dir) {
  const p = join(ROOT, "content", dir);
  return readdirSync(p)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontmatter(readFileSync(join(p, f), "utf8"));
      return { slug: f.replace(/\.md$/, ""), ...data, ...renderMarkdown(body) };
    });
}

const allPosts = loadDir("posts");
for (const p of allPosts) if (!SECTIONS[p.country]) throw new Error(`${p.slug}: unknown country "${p.country}"`);
const posts = allPosts
  .filter((p) => !p.draft && (INCLUDE_FUTURE || p.date <= TODAY))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
const pages = loadDir("pages");

// Links to scheduled (not yet published) posts become plain text until that post goes live.
const unpublished = new Set(allPosts.filter((p) => !posts.includes(p)).map((p) => p.slug));
for (const item of [...posts, ...pages]) {
  item.html = item.html.replace(/<a href="\/([a-z0-9-]+)\/"[^>]*>([\s\S]*?)<\/a>/g, (m, slug, text) => (unpublished.has(slug) ? text : m));
}

// ---------- layout ----------
const adsenseId = (config.adsensePublisherId || "").trim();
const adsOn = /^pub-\d{10,}$/.test(adsenseId);

function layout({ title, description, path, body, jsonLd = [], ogType = "website", noindex = false }) {
  const fullTitle = path === "/" ? `${config.name}: ${config.tagline}` : `${title} | ${config.name}`;
  const here = (p) => (path === p || (p !== "/" && path.startsWith(p)) ? ' aria-current="page"' : "");
  const footerLinks = LEGAL_PAGES.map(([s, n]) => `<a href="/${s}/">${n}</a>`).join("");
  return `<!doctype html>
<html lang="${config.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(path)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(path)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)}" href="/feed.xml">
<link rel="preload" href="/assets/fonts/literata-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/style.css">
${config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">\n` : ""}${
    adsOn
      ? `<meta name="google-adsense-account" content="ca-${adsenseId}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${adsenseId}" crossorigin="anonymous"></script>\n`
      : ""
  }${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="page">
<header class="masthead">
  <a class="wordmark" href="/">${esc(config.name)}<span>.</span></a>
  <nav class="nav" aria-label="Main"><a href="/"${here("/")}>Destinations</a><a href="/country/brazil/"${here("/country/brazil/")}>Brazil</a><a href="/about/"${here("/about/")}>About</a></nav>
</header>
<main id="main">
${body}
</main>
<footer class="footer">
  <nav aria-label="Site information">${footerLinks}${adsOn ? '<a href="#" data-consent-settings>Privacy &amp; cookie settings</a>' : ""}</nav>
  <p>${esc(config.name)} publishes independent travel guides. Prices, opening hours and entry rules change often; check official sources before you book.</p>
  <p>&copy; ${new Date().getFullYear()} ${esc(config.name)}</p>
</footer>
</div>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

const orgLd = { "@type": "Organization", name: config.name, url: SITE_URL + "/", logo: { "@type": "ImageObject", url: abs("/assets/logo.png") } };
const personLd = { "@type": "Person", name: config.author.name, url: abs("/about/") };

const entry = (p) => `<a class="entry" href="/${p.slug}/">
  <span class="label">${esc(SECTIONS[p.country].name)} · ${minutes(p.words)} min read</span>
  <h3>${esc(p.title)}</h3>
</a>`;

// ---------- writers ----------
function write(path, html) {
  const file = path.endsWith("/") ? join(OUT, path, "index.html") : join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "assets"), join(OUT, "assets"), { recursive: true });
cpSync(join(ROOT, "assets", "favicon.svg"), join(OUT, "favicon.svg"));

// Posts
for (const p of posts) {
  const path = `/${p.slug}/`;
  const sec = SECTIONS[p.country];
  const more = [
    ...posts.filter((x) => x.slug !== p.slug && x.country === p.country),
    ...posts.filter((x) => x.slug !== p.slug && x.country !== p.country),
  ].slice(0, 3);
  const facts = [
    ["Best time to go", p.bestTime],
    ["Currency", p.currency],
    ["Language", p.languageSpoken],
  ].filter(([, v]) => v);
  const factsHtml = facts.length
    ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
    : "";
  const contents =
    p.toc && p.toc.length >= 6 && p.contents !== false
      ? `<nav class="contents" aria-label="In this guide"><p class="label">In this guide</p><ol>${p.toc
          .map((t) => `<li><a href="#${t.id}">${esc(t.text.replace(/^\d+\.\s*/, ""))}</a></li>`)
          .join("")}</ol></nav>`
      : "";
  const updated = p.updated && p.updated !== p.date ? ` · Updated ${fmtDate(p.updated)}` : "";
  const body = `<article>
  <header class="post-head">
    <a class="label crumb" href="/country/${p.country}/">${esc(sec.name)}</a>
    <h1>${esc(p.title)}</h1>
    <p class="dek">${esc(p.description)}</p>
    <p class="label">By ${esc(config.author.name)} · ${fmtDate(p.date)}${updated} · ${minutes(p.words)} min read</p>
    ${stamp(sec)}
  </header>
  ${factsHtml}
  ${contents}
  <div class="prose">
${p.html}
  </div>
  <footer class="post-end">
    <p class="byline-end"><strong>${esc(config.author.name)}</strong> writes ${esc(config.name)} from ${esc(config.ownerCountry)}. ${esc(config.author.shortBio)} Found something out of date? <a href="/contact/">Let us know</a>.</p>
    <section class="block"><p class="label">More guides</p>${more.map(entry).join("")}</section>
  </footer>
</article>`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated || p.date,
      author: personLd,
      publisher: orgLd,
      mainEntityOfPage: abs(path),
      inLanguage: config.language,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Destinations", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: sec.name, item: abs(`/country/${p.country}/`) },
        { "@type": "ListItem", position: 3, name: p.title, item: abs(path) },
      ],
    },
  ];
  write(path, layout({ title: p.title, description: p.description, path, body, jsonLd: ld, ogType: "article" }));
}

// Static pages
for (const pg of pages) {
  const path = `/${pg.slug}/`;
  const body = `<article>
  <header class="post-head"><h1>${esc(pg.title)}</h1>${
    pg.showUpdated ? `<p class="label">Last updated ${fmtDate(config.policiesLastUpdated)}</p>` : ""
  }</header>
  <div class="prose">
${pg.html}
  </div>
</article>`;
  write(path, layout({ title: pg.title, description: pg.description || `${pg.title} for ${config.name}.`, path, body }));
}

// Country pages
for (const sec of config.sections) {
  const list = posts.filter((p) => p.country === sec.key);
  const path = `/country/${sec.key}/`;
  const title = `${sec.name} travel guides`;
  const body = `<header class="post-head">
  <a class="label crumb" href="/">Destinations</a>
  <h1>${esc(sec.name)}</h1>
  <p class="dek">${esc(sec.intro)}</p>
  ${stamp(sec)}
</header>
<section class="block">${list.map(entry).join("") || '<p class="dek">Guides to this country are on the way.</p>'}</section>`;
  write(path, layout({ title, description: sec.intro, path, body }));
}

// Home
{
  const dests = config.sections
    .map(
      (s) => `<a class="dest" href="/country/${s.key}/">
  <span class="code">${esc(s.code)}</span>
  <h2>${esc(s.name)}</h2>
  <p>${esc(s.intro)}</p>
</a>`
    )
    .join("");
  const body = `<section class="intro">
  <p>Travel guides written from Southeast Brazil. Where to go, when to go and what to sort out before you book, for Brazil and five of the most visited countries in the world.</p>
  <p>No sponsored rankings and no invented trips: every guide links to the official sources we used, so you can check the details yourself.</p>
</section>
<section class="block" aria-label="Destinations"><p class="label">Destinations</p>${dests}</section>
<section class="block"><p class="label">Latest guides</p>${posts.slice(0, 8).map(entry).join("")}</section>`;
  const ld = [{ "@context": "https://schema.org", "@type": "WebSite", name: config.name, url: SITE_URL + "/", inLanguage: config.language, publisher: orgLd }];
  write("/", layout({ title: config.name, description: config.description, path: "/", body, jsonLd: ld }));
}

// 404
write(
  "/404.html",
  layout({
    title: "Page not found",
    description: "This page could not be found.",
    path: "/404.html",
    noindex: true,
    body: `<header class="post-head"><h1>Wrong gate.</h1><p class="dek">This page has moved or never existed. <a href="/">Back to all destinations</a>.</p></header>`,
  })
);

// sitemap, robots, feed, ads.txt, .htaccess
const urls = [
  { loc: "/", lastmod: posts[0]?.date || TODAY },
  ...posts.map((p) => ({ loc: `/${p.slug}/`, lastmod: p.updated || p.date })),
  ...config.sections.map((s) => ({ loc: `/country/${s.key}/`, lastmod: posts.find((p) => p.country === s.key)?.date || TODAY })),
  ...pages.map((p) => ({ loc: `/${p.slug}/`, lastmod: config.policiesLastUpdated })),
];
write(
  "/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${abs(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
write("/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
write(
  "/feed.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(config.name)}</title><link>${SITE_URL}/</link><description>${esc(
    config.description
  )}</description><language>${config.language}</language>\n${posts
    .slice(0, 20)
    .map(
      (p) =>
        `<item><title>${esc(p.title)}</title><link>${abs(`/${p.slug}/`)}</link><guid>${abs(`/${p.slug}/`)}</guid><pubDate>${new Date(
          p.date + "T12:00:00Z"
        ).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`
    )
    .join("\n")}\n</channel></rss>\n`
);
if (adsOn) write("/ads.txt", `google.com, ${adsenseId}, DIRECT, f08c47fec0942fa0\n`);
write(
  "/.htaccess",
  `# Generated by build.mjs
DirectoryIndex index.html
ErrorDocument 404 /404.html
Options -Indexes

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`
);

// ---------- report ----------
const warnings = [];
const scan = (label, v) => typeof v === "string" && /\[[^\]]+\]/.test(v) && warnings.push(`${label} ainda é um texto de exemplo: ${v}`);
scan("author.name", config.author.name);
scan("author.shortBio", config.author.shortBio);
scan("contactEmail", config.contactEmail);
if (!adsOn) warnings.push("adsensePublisherId vazio: código do AdSense e ads.txt NÃO foram gerados.");
const hidden = allPosts.length - posts.length;
const photoTotal = posts.reduce((n, p) => n + p.photoSlots, 0);

console.log(`\n✔ Site gerado em ${PREVIEW ? "dist-preview" : "dist"}/  (${posts.length} posts, ${pages.length} páginas${hidden ? `, ${hidden} agendados/rascunho` : ""})`);
for (const p of posts) console.log(`  · ${p.slug.padEnd(48)} ${String(p.words).padStart(5)} palavras  ${p.photoSlots} fotos para adicionar`);
console.log(`  Total de espaços para fotos suas: ${photoTotal}`);
if (warnings.length) console.log("\n⚠ Antes de publicar:\n" + warnings.map((w) => "  - " + w).join("\n"));
