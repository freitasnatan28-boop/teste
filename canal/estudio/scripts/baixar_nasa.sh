#!/usr/bin/env bash
# Baixa as imagens de satélite NASA Blue Marble (domínio público) usadas como fundo dos mapas.
# Mundo inteiro (60 px/grau) + blocos regionais de 90x90 graus (240 px/grau).
# Blocos: letra = longitude (A -180..-90, B -90..0, C 0..90, D 90..180); número = 1 norte, 2 sul.
# Uso: bash scripts/baixar_nasa.sh B1 B2 C1
set -euo pipefail
cd "$(dirname "$0")/../cache" 2>/dev/null || { mkdir -p "$(dirname "$0")/../cache"; cd "$(dirname "$0")/../cache"; }
mkdir -p nasa && cd nasa
BASE=https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909
arquivos=(world.topo.bathy.200412.3x21600x10800.jpg)
for bloco in "$@"; do arquivos+=("world.topo.bathy.200412.3x21600x21600.${bloco}.jpg"); done
for f in "${arquivos[@]}"; do
  for tentativa in 1 2 3 4 5; do
    curl -sS -C - -o "$f" "$BASE/$f" && break
    sleep 3
  done
  echo "$f ok"
done
