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
  "whoosh-2": { texto: "soft airy swoosh transition, gentle", segundos: 0.8 },
  "whoosh-3": { texto: "quick light swipe whoosh, short and crisp", segundos: 0.6 },
  hit: { texto: "soft cinematic hit, deep short thud for title text", segundos: 1 },
  obturador: { texto: "vintage film camera shutter click", segundos: 0.6 },
  papel: { texto: "paper sheet sliding on a desk, short", segundos: 0.8 },
  tique: { texto: "fast mechanical counter ticking, numbers rolling", segundos: 1.2 },
  mapa: { texto: "soft digital map zoom swoosh with subtle electronic shimmer", segundos: 1.2 },
  // Estilo dos vídeos de mapa (referência do dono): pops de balão, digitação, câmera e flash de luz.
  "balao-pop": { texto: "cute cartoon bubble pop, short, bright and clean, UI notification", segundos: 0.5 },
  "balao-pop-2": { texto: "soft plop pop sound, speech bubble appearing, short", segundos: 0.5 },
  teclado: { texto: "fast laptop keyboard typing, light clicky keys, short burst", segundos: 1.2 },
  "camera-zoom": { texto: "smooth cinematic zoom whoosh, airy and soft, rising", segundos: 1.4 },
  "camera-zoom-2": { texto: "fast swoosh pass, light wind whoosh, short", segundos: 0.9 },
  ding: { texto: "bright single ding chime, clean bell, short", segundos: 1 },
  "luz-flash": { texto: "magical shimmer swoosh with soft reverse cymbal, light flash transition", segundos: 1.4 },
  canhao: { texto: "distant naval cannon shot boom with short echo", segundos: 1.6 },
  // Vídeos de dinheiro (canal em inglês): caixa registradora no preço, carimbo, gelo.
  "caixa": { texto: "old cash register cha-ching with coins, short and satisfying", segundos: 1.2 },
  "contagem": { texto: "fast digital number counter rolling up, slot machine ticks accelerating", segundos: 1.2 },
  "carimbo": { texto: "heavy rubber stamp slammed hard on paper on a wooden desk", segundos: 0.8 },
  "gelo": { texto: "glacier ice cracking with deep low rumble, short", segundos: 2 },
  "moedas": { texto: "pile of gold coins pouring and clinking, short", segundos: 1.2 },
};

const TRILHAS = [
  {
    nome: "trilha-tensao",
    prompt:
      "Instrumental dark documentary underscore for a history and geopolitics video. Tense but steady, " +
      "low strings ostinato, soft taiko drums, subtle synth pads, no vocals, loopable, 95 bpm.",
    ms: 90_000,
  },
  {
    // Trilha leve e curiosa, no estilo dos vídeos de mapa/geopolítica (referência do dono).
    nome: "trilha-mapa",
    prompt:
      "Instrumental soft and curious background music for an educational geopolitics map video. Light pizzicato strings, " +
      "soft marimba, warm pads, gentle pulse, calm but engaging, minimal, no vocals, loopable, 100 bpm.",
    ms: 120_000,
  },
];

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

  for (const t of TRILHAS) {
    const trilha = join(DIR, `${t.nome}.mp3`);
    if (existsSync(trilha)) continue;
    writeFileSync(trilha, await post("https://api.elevenlabs.io/v1/music", { prompt: t.prompt, music_length_ms: t.ms, force_instrumental: true }));
    console.log(`${t.nome} ok`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
