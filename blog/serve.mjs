// Tiny local preview server for dist/ (node serve.mjs → http://localhost:4321)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const DIST = join(dirname(fileURLToPath(import.meta.url)), "dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const PORT = Number(process.env.PORT || 4321);
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = join(DIST, p);
  if (!file.startsWith(DIST)) return res.writeHead(400).end();
  try {
    if ((await stat(file)).isDirectory()) return res.writeHead(301, { Location: p + "/" }).end();
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": TYPES[".html"] }).end(await readFile(join(DIST, "404.html")).catch(() => "Not found"));
  }
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
