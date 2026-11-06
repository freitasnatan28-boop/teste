FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Roda como root de propósito: os volumes do Railway (e de outras hospedagens)
# são montados com dono root, e um usuário restrito não conseguiria gravar as contas.
# A pasta dos dados vem de DATA_DIR ou, no Railway, do caminho do volume (RAILWAY_VOLUME_MOUNT_PATH).
EXPOSE 8080
CMD ["node", "server.mjs"]
