#!/usr/bin/env bash
# Gera a pasta site/ (versão para hospedar em qualquer servidor) a partir do index.html.
set -e
cd "$(dirname "$0")"
mkdir -p site
{
  echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<meta name="theme-color" content="#1E58F0"><meta name="apple-mobile-web-app-capable" content="yes">'
  echo '<meta name="apple-mobile-web-app-title" content="Ponte"><meta name="mobile-web-app-capable" content="yes">'
  echo '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="logo.svg" type="image/svg+xml">'
  echo '<link rel="apple-touch-icon" href="icon-192.png">'
  echo '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
  echo '</head><body>'
  cat index.html
  echo '</body></html>'
} > site/index.html
cp logo.svg site/logo.svg
cat > site/manifest.webmanifest <<'JSON'
{"name":"Ponte · Inglês fluente","short_name":"Ponte","start_url":"./","display":"standalone","background_color":"#F2F4F9","theme_color":"#1E58F0","lang":"pt-BR",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
JSON
echo "Pronto: site/"
