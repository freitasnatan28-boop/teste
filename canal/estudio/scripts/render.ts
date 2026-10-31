// Renderiza o vídeo ou as imagens da identidade.
// Uso:
//   npm run render -- video 001-guerra-da-lagosta            (vídeo inteiro)
//   npm run render -- video 001-guerra-da-lagosta 0 600      (só os frames 0 a 600, para conferir)
//   npm run render -- imagens                                (avatar, banner e thumbnails)
//   npm run render -- quadros 001-guerra-da-lagosta 300,900  (só alguns quadros em PNG, para conferir)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { Timeline } from "../src/tipos";

const RAIZ = join(import.meta.dirname, "..");
const SAIDA = join(RAIZ, "out");
// Chrome já instalado na máquina (evita baixar outro); troque pela variável se precisar.
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

async function main() {
  const [modo, video, de, ate] = process.argv.slice(2);
  mkdirSync(SAIDA, { recursive: true });
  const serveUrl = await bundle({ entryPoint: join(RAIZ, "src", "index.ts"), publicDir: join(RAIZ, "public") });
  // gl padrão: no servidor sem GPU foi ~4x mais rápido que "swangle".
  const comum = { serveUrl, browserExecutable: CHROME };

  if (modo === "imagens") {
    for (const id of ["Avatar", "Banner", "Thumb-001"]) {
      const composition = await selectComposition({ ...comum, id, inputProps: {} });
      await renderStill({ ...comum, composition, output: join(SAIDA, `${id}.png`), inputProps: {} });
      console.log(`${id}.png ok`);
    }
    return;
  }

  if ((modo !== "video" && modo !== "quadros") || !video) throw new Error("Uso: npm run render -- video <pasta> [de] [ate] | quadros <pasta> <f1,f2> | imagens");
  const timeline = JSON.parse(readFileSync(join(RAIZ, "..", "videos", video, "timeline.json"), "utf8")) as Timeline;
  const inputProps = { timeline, video };
  const composition = await selectComposition({ ...comum, id: "Video", inputProps });

  if (modo === "quadros") {
    for (const q of (de ?? "0").split(",").map(Number)) {
      await renderStill({ ...comum, composition, inputProps, frame: q, output: join(SAIDA, `quadro-${q}.png`) });
      console.log(`quadro-${q}.png ok`);
    }
    return;
  }
  const trecho = de ? ([Number(de), Number(ate ?? composition.durationInFrames - 1)] as [number, number]) : undefined;
  const nome = trecho ? `${video}_${trecho[0]}-${trecho[1]}.mp4` : `${video}.mp4`;
  let ultimo = -1;
  await renderMedia({
    ...comum,
    composition,
    inputProps,
    codec: "h264",
    crf: 20,
    frameRange: trecho,
    concurrency: Number(process.env.CONCORRENCIA ?? 4),
    outputLocation: join(SAIDA, nome),
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== ultimo) console.log(`${Math.round(progress * 100)}%`);
      ultimo = p;
    },
  });
  // Masterização: áudio final em -14 LUFS (padrão do YouTube), vídeo copiado sem recomprimir.
  const bruto = join(SAIDA, nome);
  const temp = join(SAIDA, `.${nome}`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", bruto, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", temp]);
  renameSync(temp, bruto);
  console.log(`pronto: out/${nome}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
