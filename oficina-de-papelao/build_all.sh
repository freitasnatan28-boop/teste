#!/usr/bin/env bash
# Regenera tudo com um comando: ./build_all.sh
# Requisitos: Python 3 com requirements.txt, poppler-utils (pdftoppm) e Node (npm install).
set -euo pipefail
cd "$(dirname "$0")"
PY=python3; [ -x .venv/bin/python ] && PY=.venv/bin/python

echo "== 1. Inventário das imagens";   $PY inventario_imagens.py
echo "== 2. PDF principal";            $PY build.py
echo "== 3. Página de vendas";         $PY build_site.py
echo "== 4. Validação da página";      [ -d node_modules ] || npm install --silent
node qa/verificar_site.cjs
echo
echo "Pronto. Página em dist/site/, capturas em dist/qa/."
echo "Lighthouse: (cd dist/site && python3 -m http.server 8765) & npm run lighthouse"
