// Biblioteca de efeitos sonoros e trilha do canal, gerada uma vez com a ElevenLabs.
// Os arquivos ficam em public/sons/ e são reaproveitados em todos os vídeos.
// Uso: npm run sons
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHAVE = process.env.ELEVENLABS_API_KEY ?? "";
const DIR = join(import.meta.dirname, "..", "public", "sons");

const EFEITOS: Record<string, { texto: string; segundos: number }> = {
  whoosh: { texto: "fast cinematic whoosh transition, short swoosh", segundos: 0.8 },
  "whoosh-grave": { texto: "deep cinematic whoosh with low rumble, documentary transition", segundos: 1.2 },
  impacto: { texto: "cinematic trailer boom impact hit with deep sub bass", segundos: 2 },
  riser: { texto: "tense cinematic riser building suspense", segundos: 3 },
  radar: { texto: "sonar radar ping, single clean beep with echo", segundos: 2 },
  aviao: { texto: "propeller bomber airplane flying low overhead, fly-by", segundos: 4 },
  flash: { texto: "old camera flash pop with click", segundos: 1 },
  digitar: { texto: "old typewriter typing a short word quickly", segundos: 1.5 },
  pop: { texto: "short soft UI pop for text appearing", segundos: 0.5 },
};

const TRILHA = {
  nome: "trilha-tensao",
  prompt:
    "Instrumental dark documentary underscore for a history and geopolitics video. Tense but steady, " +
    "low strings ostinato, soft taiko drums, subtle synth pads, no vocals, loopable, 95 bpm.",
  ms: 90_000,
};

async function post(url: string, corpo: unknown): Promise<Buffer> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": CHAVE, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  for (const [nome, e] of Object.entries(EFEITOS)) {
    const arquivo = join(DIR, `${nome}.mp3`);
    if (existsSync(arquivo)) continue;
    writeFileSync(
      arquivo,
      await post("https://api.elevenlabs.io/v1/sound-generation", {
        text: e.texto,
        duration_seconds: e.segundos,
        prompt_influence: 0.6,
      }),
    );
    console.log(`${nome} ok`);
  }

  const trilha = join(DIR, `${TRILHA.nome}.mp3`);
  if (!existsSync(trilha)) {
    writeFileSync(
      trilha,
      await post("https://api.elevenlabs.io/v1/music", {
        prompt: TRILHA.prompt,
        music_length_ms: TRILHA.ms,
        force_instrumental: true,
      }),
    );
    console.log(`${TRILHA.nome} ok`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
