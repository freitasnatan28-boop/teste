// Monta o documento completo da landing page a partir de landing/oferta.html.
// O arquivo é só o conteúdo da página (sem <html>/<head>/<body>), para poder ser publicado
// em qualquer lugar; aqui ele ganha o esqueleto. Tudo antes de "<!-- /head -->" vai no <head>.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ARQUIVO_LANDING = join(process.cwd(), "landing", "oferta.html");

export function montarPagina(html: string): string {
  const [cabeca, corpo] = html.split("<!-- /head -->");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${cabeca.replace(/<meta name="claude:[^>]*>\n?/g, "")}
</head>
<body>
${corpo ?? ""}
</body>
</html>`;
}

export async function lerPaginaLanding(): Promise<string> {
  return montarPagina(await readFile(ARQUIVO_LANDING, "utf8"));
}
