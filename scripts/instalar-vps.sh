#!/usr/bin/env bash
# Instala (ou atualiza) o site Canal Dark numa VPS Ubuntu/Debian.
#
# Uso (cole no terminal da VPS):
#   curl -fsSL https://raw.githubusercontent.com/freitasnatan28-boop/teste/claude/relaxed-ritchie-uuikis/scripts/instalar-vps.sh | bash
#
# Na primeira vez ele pergunta: endereço (domínio ou IP), senha do site e as chaves das IAs.
# Para atualizar depois, rode o mesmo comando: ele baixa a versão nova e reinicia, sem perguntar de novo.
set -euo pipefail

REPO="https://github.com/freitasnatan28-boop/teste.git"
BRANCH="${BRANCH:-claude/relaxed-ritchie-uuikis}"
PASTA="${PASTA:-$HOME/canal-dark}"
# Se já existe a instalação antiga (painel de ofertas), reaproveita a mesma pasta
if [ ! -d "$PASTA/.git" ] && [ -d "$HOME/tia-fifi/.git" ]; then PASTA="$HOME/tia-fifi"; fi

verde() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m%s\033[0m\n' "$*"; }
perguntar() { # perguntar "Texto" VARIAVEL [padrão]
  local resp
  read -r -p "$1 " resp < /dev/tty || true
  printf -v "$2" '%s' "${resp:-${3:-}}"
}

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

verde "1/6 Instalando programas (Node.js 22, Git, Nginx, ffmpeg, PM2)"
$SUDO apt-get update -y
$SUDO apt-get install -y curl git nginx ffmpeg ca-certificates
precisa_node=1
if command -v node >/dev/null 2>&1; then
  maior=$(node -p 'process.versions.node.split(".")[0]')
  [ "$maior" -ge 22 ] && precisa_node=0
fi
if [ "$precisa_node" = 1 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
command -v pm2 >/dev/null 2>&1 || $SUDO npm install -g pm2

verde "2/6 Baixando o código em $PASTA"
if [ -d "$PASTA/.git" ]; then
  git -C "$PASTA" fetch origin "$BRANCH"
  git -C "$PASTA" checkout "$BRANCH"
  git -C "$PASTA" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO" "$PASTA"
fi
cd "$PASTA"

DOMINIO=""
if [ ! -f .env ]; then
  verde "3/6 Configuração (só na primeira vez)"
  if ! (exec < /dev/tty) 2>/dev/null; then
    echo "Não consegui fazer as perguntas (sem terminal). Rode o comando direto no terminal da VPS (SSH)." >&2
    exit 1
  fi
  IP_PUBLICO=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
  echo "Se você tem um domínio (ex.: canaldark.seusite.com) apontando para esta VPS, digite. Se não, só aperte Enter para usar o IP $IP_PUBLICO."
  perguntar "Domínio:" DOMINIO ""
  perguntar "Crie uma senha para entrar no site:" SENHA ""
  while [ -z "$SENHA" ]; do perguntar "A senha não pode ficar vazia. Senha:" SENHA ""; done
  echo "Chaves das IAs (cole e aperte Enter; deixe vazio para pular e colocar depois no arquivo .env):"
  perguntar "OPENAI_API_KEY (imagens e avatares; chat GPT):" OPENAI ""
  perguntar "ELEVENLABS_API_KEY (narração, avatar falando, vídeo IA):" ELEVEN ""
  perguntar "ANTHROPIC_API_KEY (opcional, chat com Claude):" ANTHROPIC ""

  if [ -n "$DOMINIO" ]; then APP_URL="https://$DOMINIO"; else APP_URL="http://$IP_PUBLICO"; fi
  SEGREDO=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cp .env.example .env
  definir() { # definir CHAVE valor  → troca a linha CHAVE=... do .env
    local chave="$1" valor="$2"
    valor=$(printf '%s' "$valor" | sed -e 's/[\/&|]/\\&/g')
    if grep -q "^$chave=" .env; then sed -i "s|^$chave=.*|$chave=$valor|" .env; else echo "$chave=$valor" >> .env; fi
  }
  definir APP_URL "$APP_URL"
  definir PANEL_PASSWORD "$SENHA"
  definir SESSION_SECRET "$SEGREDO"
  definir OPENAI_API_KEY "$OPENAI"
  definir ELEVENLABS_API_KEY "$ELEVEN"
  definir ANTHROPIC_API_KEY "$ANTHROPIC"
  chmod 600 .env
else
  verde "3/6 Arquivo .env já existe (mantido)"
  APP_URL=$(grep '^APP_URL=' .env | cut -d= -f2- | tr -d '"')
  case "$APP_URL" in https://*) DOMINIO="${APP_URL#https://}" ;; esac
fi

verde "4/6 Instalando dependências e preparando o banco"
npm ci
npx prisma migrate deploy
npm run db:seed >/dev/null 2>&1 || true
npm run build

verde "5/6 Ligando o site (PM2)"
if pm2 describe painel >/dev/null 2>&1; then
  pm2 restart painel --update-env
else
  pm2 start ecosystem.config.cjs --only painel
fi
pm2 save
$SUDO env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null || true

verde "6/6 Nginx (endereço público)"
NOME_SERVIDOR="${DOMINIO:-_}"
LISTEN="80"
if [ -z "$DOMINIO" ]; then LISTEN="80 default_server"; fi
CONF=$(cat <<EOF
server {
    listen $LISTEN;
    server_name $NOME_SERVIDOR;
    # Envio de fotos (até 20 MB) e chat/vídeos que podem levar minutos
    client_max_body_size 25m;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }
}
EOF
)
echo "$CONF" | $SUDO tee /etc/nginx/sites-available/canal-dark >/dev/null
$SUDO ln -sf /etc/nginx/sites-available/canal-dark /etc/nginx/sites-enabled/canal-dark
if [ -z "$DOMINIO" ]; then $SUDO rm -f /etc/nginx/sites-enabled/default; fi
$SUDO nginx -t
$SUDO systemctl reload nginx

if command -v ufw >/dev/null 2>&1 && $SUDO ufw status | grep -q "Status: active"; then
  $SUDO ufw allow OpenSSH >/dev/null; $SUDO ufw allow 'Nginx Full' >/dev/null
fi

if [ -n "$DOMINIO" ] && [ ! -d "/etc/letsencrypt/live/$DOMINIO" ]; then
  verde "HTTPS grátis (Let's Encrypt) para $DOMINIO"
  $SUDO apt-get install -y certbot python3-certbot-nginx
  $SUDO certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || aviso "Não consegui ativar o HTTPS agora. Confira se o domínio aponta para o IP desta VPS e rode: sudo certbot --nginx -d $DOMINIO"
fi

verde "Pronto! O Canal Dark está no ar:"
echo "   $APP_URL"
echo
echo "Entre com a senha que você criou. Chaves e senha ficam em: $PASTA/.env"
echo "Depois de mudar o .env:  pm2 restart painel --update-env"
echo "Ver erros:               pm2 logs painel"
echo "Atualizar o site:        rode este mesmo comando de instalação de novo"
