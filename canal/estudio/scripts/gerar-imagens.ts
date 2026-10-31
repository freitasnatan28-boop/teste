// Gera com IA as imagens listadas em <pasta>/imagens-ia.json ({ nome: descrição }) que ainda não existem
// em <pasta>/imagens. Usa GEMINI_API_KEY (Google) ou OPENAI_API_KEY. Na nuvem do Claude a chave pode estar
// guardada como "Network secret" (o proxy injeta sozinho): aí rode com IMAGENS_IA=openai ou IMAGENS_IA=gemini.
// Estilo de ilustração (não fotográfico) para não passar por foto real de época; nada de pessoas reais.
// Uso: npm run gerar-imagens -- ../videos/001-guerra-da-lagosta
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ESTILO =
  "Ilustração editorial de documentário histórico, estilo pintura digital com pinceladas visíveis, " +
  "paleta azul-escura e âmbar, iluminação dramática e cinematográfica, formato 16:9. " +
  "Sem texto, sem letras, sem logotipos, sem rostos reconhecíveis de pessoas reais. Cena: ";

async function gemini(prompt: string): Promise<Buffer> {
  const modelo = process.env.GEMINI_MODELO ?? "gemini-2.5-flash-image";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const dados = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[] };
  const parte = dados.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!parte?.inlineData) throw new Error("Gemini não devolveu imagem");
  return Buffer.from(parte.inlineData.data, "base64");
}

async function openai(prompt: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? "sk-injetada-pelo-proxy"}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODELO ?? "gpt-image-1", prompt, size: "1536x1024", quality: "medium" }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const dados = (await res.json()) as { data: { b64_json: string }[] };
  return Buffer.from(dados.data[0].b64_json, "base64");
}

async function main() {
  const pasta = process.argv[2];
  if (!pasta) throw new Error("Uso: npm run gerar-imagens -- <pasta-do-video>");
  const escolha = process.env.IMAGENS_IA ?? (process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "");
  const gerar = escolha === "gemini" ? gemini : escolha === "openai" ? openai : null;
  if (!gerar) throw new Error("Defina IMAGENS_IA=openai|gemini (Network secret) ou GEMINI_API_KEY/OPENAI_API_KEY.");

  const lista = JSON.parse(readFileSync(join(pasta, "imagens-ia.json"), "utf8")) as Record<string, string>;
  for (const [nome, descricao] of Object.entries(lista)) {
    const arquivo = join(pasta, "imagens", `${nome}.jpg`);
    if (existsSync(arquivo)) continue; // foto real (ou IA já gerada) tem prioridade
    const bruto = join(pasta, "imagens", `.${nome}.ia`);
    writeFileSync(bruto, await gerar(ESTILO + descricao));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", bruto, "-vf", "scale=1920:-2", "-q:v", "3", arquivo]);
    rmSync(bruto);
    appendFileSync(join(pasta, "creditos.md"), `- ${nome}: ilustração gerada por IA\n`);
    console.log(`${nome} gerada`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
