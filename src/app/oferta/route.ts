// Serve a landing page de landing/oferta.html em /oferta.
// O arquivo é só o conteúdo da página (sem <html>/<head>/<body>), para poder ser publicado
// em qualquer lugar; aqui ele ganha o esqueleto do documento. Tudo antes de "<!-- /head -->" vai no <head>.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const html = await readFile(join(process.cwd(), "landing", "oferta.html"), "utf8");
  const [cabeca, corpo] = html.split("<!-- /head -->");
  const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${cabeca}
</head>
<body>
${corpo ?? ""}
</body>
</html>`;
  return new Response(pagina, { headers: { "content-type": "text/html; charset=utf-8" } });
}
