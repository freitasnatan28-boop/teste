// Gera a pasta hostinger/ com a landing page pronta para subir em qualquer hospedagem
// (Hostinger, por exemplo): index.html, as fotos e o vídeo usados por ela e um .htaccess.
// Uso: npm run landing:exportar
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lerPaginaLanding } from "../src/lib/landing";

const SAIDA = join(process.cwd(), "hostinger", "site");

// Cache longo para fotos e vídeo; a página em si sempre busca a versão nova
const HTACCESS = `AddType video/mp4 .mp4
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType video/mp4 "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html
</IfModule>
`;

async function main() {
  const pagina = await lerPaginaLanding();
  const arquivos = [...new Set(pagina.match(/lp\/[\w.-]+\.\w+/g) ?? [])];

  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(join(SAIDA, "lp"), { recursive: true });
  await writeFile(join(SAIDA, "index.html"), pagina);
  await writeFile(join(SAIDA, ".htaccess"), HTACCESS);
  for (const arquivo of arquivos) {
    await copyFile(join(process.cwd(), "public", arquivo), join(SAIDA, arquivo));
  }
  console.log(`Pronto: ${SAIDA} (index.html, .htaccess e ${arquivos.length} arquivos em lp/)`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
