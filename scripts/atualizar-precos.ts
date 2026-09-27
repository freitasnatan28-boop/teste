// Atualiza o preço de todas as ofertas salvas (alimenta o histórico de preços).
// Uso: npm run precos:atualizar
// No servidor, o PM2 pode rodar isto automaticamente (veja ecosystem.config.cjs).
import "dotenv/config";
import { atualizarTodos } from "../src/services/ofertas";
import { prisma } from "../src/lib/db";

atualizarTodos()
  .then((r) => console.log(`[${new Date().toISOString()}] Preços atualizados: ${r.ok}/${r.total} (falhas: ${r.falhas})`))
  .catch((e) => {
    console.error("Erro ao atualizar preços:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
