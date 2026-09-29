#!/usr/bin/env bash
# Regenera o anúncio inteiro a partir de work/config.json.
#   bash work/render.sh            (rodar dentro de meu-anuncio/)
# Etapas: preparar (linha do tempo, cor, áudio) -> Remotion (3 versões + capa) -> loudness em 2 passadas -> mux.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=../.venv/bin/python; [ -x "$PY" ] || PY=python3
CH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -1 || true)
BROWSER=${CH:+--browser-executable=$CH}
CRF=${CRF:-20}

echo "== 1. Preparando"; $PY work/preparar.py

cd work/remotion
for id in anuncio-9x16 anuncio-4x5 anuncio-9x16-sem-legenda; do
  echo "== 2. Renderizando $id"
  npx remotion render src/index.js "$id" "out/$id.mp4" --muted $BROWSER --concurrency=4 --crf="$CRF" --log=error
done
npx remotion still src/index.js anuncio-9x16 out/capa.png --frame=40 $BROWSER --log=error
cd ../..

echo "== 3. Loudness (-14 LUFS, pico <= -1 dBTP: alvo -1,5 por causa do AAC) em 2 passadas"
MED=$(ffmpeg -hide_banner -i work/audio_mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
val() { echo "$MED" | $PY -c "import sys,json; print(json.load(sys.stdin)['$1'])"; }
AF="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true"
ffmpeg -y -v error -i work/audio_mix.wav -af "$AF,aresample=48000" -c:a pcm_s16le work/audio_final.wav

echo "== 4. Exportando"
mkdir -p saida
for id in anuncio-9x16 anuncio-4x5 anuncio-9x16-sem-legenda; do
  ffmpeg -y -v error -i "work/remotion/out/$id.mp4" -i work/audio_final.wav -map 0:v -map 1:a -c:v copy \
    -c:a aac -b:a 192k -shortest -movflags +faststart "saida/$id.mp4"
done
ffmpeg -y -v error -i work/remotion/out/capa.png -q:v 2 saida/capa.jpg

for f in saida/*.mp4; do
  printf "%-36s %6.1f MB  %s s\n" "$f" "$(echo "$(stat -c %s "$f") / 1048576" | bc -l)" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done
ffmpeg -hide_banner -i saida/anuncio-9x16.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
