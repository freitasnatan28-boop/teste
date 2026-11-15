// Setor de Pesquisa (imagens): baixa as imagens listadas em <pasta>/imagens.json e escreve
// <pasta>/creditos.md para colar na descrição do vídeo. Cada item é um título do Wikimedia Commons
// ("File:...") ou { "url": ..., "credito": ... } para outros acervos (ex.: Library of Congress).
// Baixa o arquivo original (miniaturas em tamanho novo levam 429) e reduz com o FFmpeg.
// Uso: npm run imagens -- ../videos/001-guerra-da-lagosta
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const UA = "PorTrasDoMapaBot/0.1 (https://github.com/freitasnatan28-boop/teste)";
const LARGURA = 1920;
const UMA_TENTATIVA = process.env.IMAGENS_SEM_ESPERA === "1"; // não insiste quando o servidor bloqueia

type Info = { url: string; licenca: string; autor: string; pagina: string };

// O Commons devolve 429 quando chamamos rápido demais: espera e tenta de novo.
async function baixar(url: string): Promise<Response> {
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (res.status !== 429 || tentativa === 8 || UMA_TENTATIVA) return res;
    await new Promise((r) => setTimeout(r, 5000 * tentativa));
  }
}

const semHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function info(titulo: string): Promise<Info> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: titulo,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  const res = await baixar(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Commons ${res.status} em ${titulo}`);
  const dados = (await res.json()) as { query: { pages: Record<string, { imageinfo?: any[] }> } };
  const ii = Object.values(dados.query.pages)[0].imageinfo?.[0];
  if (!ii) throw new Error(`Imagem não encontrada: ${titulo}`);
  const m = ii.extmetadata ?? {};
  return {
    url: ii.url,
    licenca: m.LicenseShortName?.value ?? "?",
    autor: semHtml(m.Artist?.value ?? "desconhecido"),
    pagina: ii.descriptionurl,
  };
}

async function main() {
  const pasta = process.argv[2];
  if (!pasta) throw new Error("Uso: npm run imagens -- <pasta-do-video>");
  const lista = JSON.parse(readFileSync(join(pasta, "imagens.json"), "utf8")) as Record<string, string | { url: string; credito: string }>;
  const dir = join(pasta, "imagens");
  mkdirSync(dir, { recursive: true });

  const creditos: string[] = [];
  const faltando: string[] = [];
  for (const [nome, item] of Object.entries(lista)) {
    const arquivo = join(dir, `${nome}.jpg`);
    try {
      const i = typeof item === "string" ? await info(item) : { url: item.url, licenca: "", autor: item.credito, pagina: "" };
      if (!existsSync(arquivo)) {
        const img = await baixar(i.url);
        if (!img.ok) throw new Error(`download ${img.status}`);
        const original = join(dir, `.${nome}.original`);
        writeFileSync(original, Buffer.from(await img.arrayBuffer()));
        execFileSync("ffmpeg", ["-v", "error", "-y", "-i", original, "-frames:v", "1",
          "-vf", `scale='min(${LARGURA},iw)':-2`, "-q:v", "3", arquivo]);
        rmSync(original);
        await new Promise((r) => setTimeout(r, 3000)); // educação com o servidor
      }
      creditos.push(typeof item === "string" ? `- ${item.replace(/^File:/, "")}: ${i.autor} (${i.licenca}) ${i.pagina}` : `- ${i.autor} ${i.url}`);
      console.log(`${nome} ok`);
    } catch (e) {
      faltando.push(nome);
      console.warn(`${nome} FALTANDO (${(e as Error).message})`);
    }
  }
  writeFileSync(join(pasta, "creditos.md"), `Imagens:\n${creditos.join("\n")}\n`);
  if (faltando.length) console.warn(`Faltando: ${faltando.join(", ")} (o montar troca por cartão de texto)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
