// Configuração do PM2 (mantém o painel rodando no servidor e reinicia se cair).
// Uso na VPS:  pm2 start ecosystem.config.cjs  &&  pm2 save
module.exports = {
  apps: [
    {
      name: "painel",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
    },
    {
      // Robô do WhatsApp: conexão, fila de envio e piloto automático
      name: "whatsapp",
      script: "node_modules/.bin/tsx",
      args: "worker/whatsapp.mts",
      max_memory_restart: "500M",
      restart_delay: 10000,
    },
    {
      // Atualiza os preços de todas as ofertas a cada 6 horas (alimenta o histórico)
      name: "atualizar-precos",
      script: "node_modules/.bin/tsx",
      args: "scripts/atualizar-precos.ts",
      cron_restart: "0 */6 * * *",
      autorestart: false,
    },
  ],
};
