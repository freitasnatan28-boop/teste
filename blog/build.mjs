// Static site builder for the blog.
// Reads Markdown from content/, writes a ready-to-upload site to dist/.
// Usage: node build.mjs   (then upload the contents of dist/ to public_html)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "dist");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const SITE_URL = config.url.replace(/\/+$/, "");
const TODAY = new Date().toISOString().slice(0, 10);
const INCLUDE_FUTURE = process.argv.includes("--future");

const CATEGORIES = {
  cats: {
    name: "Cats",
    title: "DIY Cardboard Projects for Cats",
    intro:
      "Scratchers, hideouts, castles and food puzzles you can build from the boxes piling up at home. Every project is sized for real cats and tested for the things cats actually do: scratch, chew, sleep and knock things over.",
  },
  dogs: {
    name: "Dogs",
    title: "DIY Enrichment and Puzzle Toys for Dogs",
    intro:
      "Cheap brain games, snuffle boxes and shred-safe puzzles that give dogs a job to do. Each idea includes who it suits, how to make it harder, and when cardboard is not the right choice for your dog.",
  },
  guides: {
    name: "Guides",
    title: "Pet Safety and Enrichment Guides",
    intro:
      "The background behind the projects: which materials are safe, why cats love boxes, how enrichment works, and how to pick the right cardboard. Read these before you start cutting.",
  },
};

const LEGAL_PAGES = [
  ["about", "About"],
  ["contact", "Contact"],
  ["privacy-policy", "Privacy Policy"],
  ["cookie-policy", "Cookie Policy"],
  ["terms", "Terms of Use"],
  ["affiliate-disclosure", "Affiliate Disclosure"],
  ["disclaimer", "Disclaimer"],
];

// ---------- helpers ----------
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripTags = (s) => s.replace(/<[^>]+>/g, "");
const slugify = (s) =>
  stripTags(s)
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const fmtDate = (iso) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const abs = (path) => SITE_URL + path;

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

// ---------- markdown ----------
const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${text}</h${depth}>\n`;
    },
    image({ href, title, text }) {
      const img = `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy" decoding="async">`;
      return title ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>` : img;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
      const affiliate = /amzn\.to|amazon\.[a-z.]+\/.*tag=|chewy\.com\/.*utm|go\.skimresources|shareasale/.test(href);
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
const posts = allPosts
  .filter((p) => !p.draft && (INCLUDE_FUTURE || p.date <= TODAY))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
const pages = loadDir("pages");

// ---------- layout ----------
const adsenseId = (config.adsensePublisherId || "").trim();
const adsOn = /^pub-\d{10,}$/.test(adsenseId);

function layout({ title, description, path, body, jsonLd = [], ogType = "website", noindex = false, bodyClass = "" }) {
  const fullTitle = path === "/" ? `${config.name}: ${config.tagline}` : `${title} | ${config.name}`;
  const nav = Object.entries(CATEGORIES)
    .map(([k, c]) => `<a href="/category/${k}/"${path.startsWith(`/category/${k}/`) ? ' aria-current="page"' : ""}>${c.name}</a>`)
    .join("");
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
<meta name="theme-color" content="#f7f1e6">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)}" href="/feed.xml">
<link rel="stylesheet" href="/assets/style.css">
${config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">\n` : ""}${
    adsOn
      ? `<meta name="google-adsense-account" content="ca-${adsenseId}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${adsenseId}" crossorigin="anonymous"></script>\n`
      : ""
  }${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/"><img src="/favicon.svg" alt="" width="34" height="34"><span>${esc(config.name)}</span></a>
    <nav class="main-nav" aria-label="Main">${nav}<a href="/about/"${path === "/about/" ? ' aria-current="page"' : ""}>About</a></nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div>
        <p class="footer-brand">${esc(config.name)}</p>
        <p class="muted">${esc(config.tagline)}.</p>
      </div>
      <nav class="footer-links" aria-label="Site information">${footerLinks}${
        adsOn ? '<a href="#" data-consent-settings>Privacy &amp; cookie settings</a>' : ""
      }</nav>
    </div>
    <p class="muted small">Content on this site is for general information and is not a substitute for advice from your veterinarian. Some links may be affiliate links; see our <a href="/affiliate-disclosure/">disclosure</a>.</p>
    <p class="muted small">&copy; ${new Date().getFullYear()} ${esc(config.name)}. All rights reserved.</p>
  </div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

const orgLd = {
  "@type": "Organization",
  name: config.name,
  url: SITE_URL + "/",
  logo: { "@type": "ImageObject", url: abs("/assets/logo.png") },
};
const personLd = { "@type": "Person", name: config.author.name, url: abs("/about/") };

function card(p) {
  const cat = CATEGORIES[p.category];
  return `<article class="card">
  <a class="card-link" href="/${p.slug}/">
    <span class="pill pill-${p.category}">${cat ? cat.name : ""}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.description)}</p>
    <span class="card-meta">${p.difficulty ? `${esc(p.difficulty)} · ` : ""}${Math.max(1, Math.round(p.words / 230))} min read</span>
  </a>
</article>`;
}

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
  const cat = CATEGORIES[p.category];
  const related = posts.filter((x) => x.slug !== p.slug && x.category === p.category).slice(0, 3);
  const fill3 = related.length < 3 ? posts.filter((x) => x.slug !== p.slug && !related.includes(x)).slice(0, 3 - related.length) : [];
  const projectBox =
    p.time || p.difficulty || p.cost
      ? `<dl class="project-box">
  ${p.time ? `<div><dt>Time</dt><dd>${esc(p.time)}</dd></div>` : ""}
  ${p.difficulty ? `<div><dt>Difficulty</dt><dd>${esc(p.difficulty)}</dd></div>` : ""}
  ${p.cost ? `<div><dt>Cost</dt><dd>${esc(p.cost)}</dd></div>` : ""}
  ${p.pet ? `<div><dt>Best for</dt><dd>${esc(p.pet)}</dd></div>` : ""}
</dl>`
      : "";
  const toc =
    p.toc.length >= 4
      ? `<nav class="toc" aria-label="In this article"><p class="toc-title">In this article</p><ol>${p.toc
          .map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`)
          .join("")}</ol></nav>`
      : "";
  const updated = p.updated && p.updated !== p.date ? ` · Updated <time datetime="${p.updated}">${fmtDate(p.updated)}</time>` : "";
  const body = `<article class="wrap post">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/category/${p.category}/">${cat.name}</a></nav>
  <header class="post-header">
    <h1>${esc(p.title)}</h1>
    <p class="lede">${esc(p.description)}</p>
    <p class="byline">By <a href="/about/">${esc(config.author.name)}</a> · <time datetime="${p.date}">${fmtDate(p.date)}</time>${updated} · ${Math.max(1, Math.round(p.words / 230))} min read</p>
  </header>
  ${projectBox}
  ${toc}
  <div class="prose">
${p.html}
  </div>
  <aside class="author-box">
    <img src="/favicon.svg" alt="" width="56" height="56">
    <div>
      <p class="author-name">Written by <a href="/about/">${esc(config.author.name)}</a></p>
      <p>${esc(config.author.shortBio)}</p>
      <p class="small muted">Spotted a mistake or have a safety concern about this article? <a href="/contact/">Tell us</a> and we will review it.</p>
    </div>
  </aside>
  <section class="related">
    <h2>Keep building</h2>
    <div class="grid">${[...related, ...fill3].map(card).join("")}</div>
  </section>
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
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: cat.name, item: abs(`/category/${p.category}/`) },
        { "@type": "ListItem", position: 3, name: p.title, item: abs(path) },
      ],
    },
  ];
  write(path, layout({ title: p.title, description: p.description, path, body, jsonLd: ld, ogType: "article", bodyClass: "is-post" }));
}

// Static pages
for (const pg of pages) {
  const path = `/${pg.slug}/`;
  const body = `<article class="wrap post page">
  <header class="post-header"><h1>${esc(pg.title)}</h1>${
    pg.showUpdated ? `<p class="byline">Last updated: ${fmtDate(config.policiesLastUpdated)}</p>` : ""
  }</header>
  <div class="prose">
${pg.html}
  </div>
</article>`;
  write(path, layout({ title: pg.title, description: pg.description || `${pg.title} for ${config.name}.`, path, body }));
}

// Category pages
for (const [key, c] of Object.entries(CATEGORIES)) {
  const list = posts.filter((p) => p.category === key);
  const path = `/category/${key}/`;
  const body = `<section class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>›</span> ${c.name}</nav>
  <header class="section-header"><h1>${esc(c.title)}</h1><p class="lede">${esc(c.intro)}</p></header>
  <div class="grid">${list.map(card).join("") || "<p>New articles are on the way.</p>"}</div>
</section>`;
  write(path, layout({ title: c.title, description: c.intro, path, body }));
}

// Home
{
  const start = ["safe-glue-paint-and-tape-for-pet-diy", "how-to-make-a-cardboard-cat-scratcher", "diy-dog-puzzle-toys-from-cardboard"]
    .map((s) => posts.find((p) => p.slug === s))
    .filter(Boolean);
  const body = `<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <p class="eyebrow">DIY for cats &amp; dogs</p>
      <h1>Turn the box your package came in into your pet&rsquo;s favorite thing.</h1>
      <p class="lede">${esc(config.description)}</p>
      <p class="hero-actions"><a class="btn" href="/category/cats/">Projects for cats</a><a class="btn btn-ghost" href="/category/dogs/">Projects for dogs</a></p>
    </div>
    <img class="hero-art" src="/assets/img/hero.svg" alt="Illustration of a cat peeking out of a cardboard box next to a dog with a puzzle toy" width="420" height="320">
  </div>
</section>
${start.length ? `<section class="wrap"><h2 class="section-title">Start here</h2><div class="grid">${start.map(card).join("")}</div></section>` : ""}
<section class="wrap"><h2 class="section-title">Latest articles</h2><div class="grid">${posts.filter((p) => !start.includes(p)).map(card).join("")}</div></section>
<section class="wrap promise">
  <h2>How we make our projects</h2>
  <ul>
    <li><strong>Safety first.</strong> Every project lists the materials to avoid and when to skip it entirely.</li>
    <li><strong>Built from what you have.</strong> Most projects need a box, scissors and a few minutes.</li>
    <li><strong>No miracle claims.</strong> We are pet owners, not vets. Health questions go to your veterinarian.</li>
  </ul>
  <p><a href="/about/">Read more about us and our editorial standards →</a></p>
</section>`;
  const ld = [
    { "@context": "https://schema.org", "@type": "WebSite", name: config.name, url: SITE_URL + "/", inLanguage: config.language, publisher: orgLd },
  ];
  write("/", layout({ title: config.name, description: config.description, path: "/", body, jsonLd: ld, bodyClass: "is-home" }));
}

// 404
write(
  "/404.html",
  layout({
    title: "Page not found",
    description: "This page could not be found.",
    path: "/404.html",
    noindex: true,
    body: `<section class="wrap post"><h1>This box is empty.</h1><p class="lede">The page you were looking for has moved or never existed.</p><p><a class="btn" href="/">Back to the homepage</a></p></section>`,
  })
);

// sitemap, robots, feed, ads.txt, .htaccess
const urls = [
  { loc: "/", lastmod: posts[0]?.date || TODAY },
  ...posts.map((p) => ({ loc: `/${p.slug}/`, lastmod: p.updated || p.date })),
  ...Object.keys(CATEGORIES).map((k) => ({ loc: `/category/${k}/`, lastmod: posts.find((p) => p.category === k)?.date || TODAY })),
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

console.log(`\n✔ Site gerado em dist/  (${posts.length} posts, ${pages.length} páginas${hidden ? `, ${hidden} agendados/rascunho` : ""})`);
for (const p of posts) console.log(`  · ${p.slug.padEnd(48)} ${String(p.words).padStart(5)} palavras  ${p.photoSlots} fotos para adicionar`);
console.log(`  Total de espaços para fotos suas: ${photoTotal}`);
if (!existsSync(join(ROOT, "assets", "logo.png"))) warnings.push("assets/logo.png não existe (usado nos dados estruturados do Google).");
if (warnings.length) console.log("\n⚠ Antes de publicar:\n" + warnings.map((w) => "  - " + w).join("\n"));
