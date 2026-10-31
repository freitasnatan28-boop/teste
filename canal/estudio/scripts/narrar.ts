// Setor de Narração: gera um MP3 por beat com a ElevenLabs, mais o tempo de cada palavra.
// Uso: npm run narrar -- ../roteiros/001-guerra-da-lagosta.md ../videos/001-guerra-da-lagosta
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lerRoteiro, paraFala } from "./roteiro";

const VOZ = process.env.ELEVENLABS_VOZ ?? "acdKA5HckGxoxxvy40dA"; // Nassif - Documentary, History & Thriller
const MODELO = "eleven_multilingual_v2";
const CHAVE = process.env.ELEVENLABS_API_KEY ?? "";

type Alinhamento = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type Palavra = { texto: string; inicio: number; fim: number };

function palavras(al: Alinhamento): Palavra[] {
  const out: Palavra[] = [];
  let atual: Palavra | null = null;
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) {
      atual = null;
      return;
    }
    if (!atual) {
      atual = { texto: "", inicio: al.character_start_times_seconds[i], fim: 0 };
      out.push(atual);
    }
    atual.texto += c;
    atual.fim = al.character_end_times_seconds[i];
  });
  return out;
}

async function main() {
  const [roteiro, pasta] = process.argv.slice(2);
  if (!roteiro || !pasta) throw new Error("Uso: npm run narrar -- <roteiro.md> <pasta-do-video>");

  const beats = lerRoteiro(roteiro);
  const dir = join(pasta, "narracao");
  mkdirSync(dir, { recursive: true });

  for (const [i, beat] of beats.entries()) {
    const mp3 = join(dir, `${beat.id}.mp3`);
    if (existsSync(mp3)) continue; // não gasta crédito de novo

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}/with-timestamps`, {
      method: "POST",
      headers: { "xi-api-key": CHAVE, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: paraFala(beat.texto),
        model_id: MODELO,
        seed: 1963,
        previous_text: beats[i - 1] ? paraFala(beats[i - 1].texto) : undefined,
        next_text: beats[i + 1] ? paraFala(beats[i + 1].texto) : undefined,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} no ${beat.id}: ${await res.text()}`);

    const dados = (await res.json()) as { audio_base64: string; alignment: Alinhamento };
    writeFileSync(mp3, Buffer.from(dados.audio_base64, "base64"));
    writeFileSync(join(dir, `${beat.id}.json`), JSON.stringify({ ...beat, palavras: palavras(dados.alignment) }, null, 1));
    console.log(`${beat.id} ok (${beat.texto.length} caracteres)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
