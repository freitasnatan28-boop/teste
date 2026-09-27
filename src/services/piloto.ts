// Piloto automático: nos horários configurados, busca ofertas, escolhe a melhor
// que ainda não foi enviada, confere o preço de novo, escreve a mensagem e põe na fila.
import { lerConfig, salvarConfig } from "@/lib/configuracoes";
import { prisma } from "@/lib/db";
import { agoraBrasilia, horariosDoDia, lerPiloto, type PilotoConfig } from "@/lib/piloto-config";
import { enfileirar } from "./envio";
import { gerarVariacoes, montarMensagem } from "./mensagens";
import { atualizarProduto, buscarEImportar } from "./ofertas";

interface Estado {
  data: string;
  feitos: number[];
  proximoTermo: number;
}
const CHAVE_ESTADO = "piloto_estado";

async function lerEstado(): Promise<Estado> {
  const v = await lerConfig(CHAVE_ESTADO);
  try {
    return v ? (JSON.parse(v) as Estado) : { data: "", feitos: [], proximoTermo: 0 };
  } catch {
    return { data: "", feitos: [], proximoTermo: 0 };
  }
}

export type LogFn = (msg: string) => void;

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Escolhe a melhor oferta ainda não enviada recentemente. */
async function escolherOferta(cfg: PilotoConfig, log: LogFn) {
  const limite = new Date(Date.now() - cfg.naoRepetirDias * 86400_000);
  const recentes = await prisma.offerMessage.findMany({
    where: { createdAt: { gte: limite }, status: { in: ["aguardando_aprovacao", "aprovada", "enviada"] } },
    select: { productId: true },
  });
  const jaUsados = new Set(recentes.map((r) => r.productId));
  // O mesmo produto pode existir 2x (como produto de catálogo e como anúncio): compara também nome e anúncio
  const usados = await prisma.product.findMany({ where: { id: { in: [...jaUsados] } }, select: { title: true, itemId: true } });
  const titulosUsados = new Set(usados.map((u) => normalizar(u.title)));
  const itensUsados = new Set(usados.map((u) => u.itemId).filter(Boolean));
  const candidatos = await prisma.product.findMany({
    where: {
      hidden: false,
      affiliateUrl: { not: null },
      suspiciousDiscount: false,
      score: { gte: cfg.scoreMinimo },
      OR: [{ realDiscountPct: { gte: cfg.descontoMinimo } }, ...(cfg.descontoMinimo <= 0 ? [{ realDiscountPct: null }] : [])],
    },
    orderBy: [{ score: "desc" }],
    take: 30,
  });
  for (const c of candidatos) {
    if (jaUsados.has(c.id) || titulosUsados.has(normalizar(c.title)) || (c.itemId && itensUsados.has(c.itemId))) continue;
    // Confere o preço de novo antes de divulgar
    try {
      const ok = await atualizarProduto(c.id);
      if (!ok) continue;
    } catch (e) {
      log(`não consegui reconsultar ${c.title}: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const atual = await prisma.product.findUniqueOrThrow({ where: { id: c.id } });
    if (!atual.affiliateUrl || atual.suspiciousDiscount || atual.score < cfg.scoreMinimo) continue;
    return atual;
  }
  return null;
}

/** Uma rodada completa: buscar → escolher → escrever → enfileirar (ou deixar para aprovação). */
export async function rodarPiloto(log: LogFn = () => {}, origem: "piloto" | "manual" = "piloto") {
  const cfg = await lerPiloto();
  const estado = await lerEstado();

  // 1) Busca ofertas novas com a próxima palavra-chave (rodízio)
  if (cfg.termos.length) {
    const termo = cfg.termos[estado.proximoTermo % cfg.termos.length];
    estado.proximoTermo = (estado.proximoTermo + 1) % cfg.termos.length;
    await salvarConfig(CHAVE_ESTADO, JSON.stringify(estado));
    try {
      const r = await buscarEImportar("mercadolivre", { palavraChave: termo, limite: 20 });
      log(`busca "${termo}": ${r.importados} oferta(s)`);
    } catch (e) {
      log(`busca "${termo}" falhou: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 2) Escolhe a melhor
  const produto = await escolherOferta(cfg, log);
  if (!produto) {
    log("nenhuma oferta boa o suficiente agora (confira score mínimo, desconto mínimo e se as ofertas têm link)");
    return null;
  }

  // 3) Escreve a mensagem
  const { variacoes, aviso } = await gerarVariacoes(produto);
  if (aviso) log(aviso);
  const escolhida = variacoes[Math.floor(Math.random() * variacoes.length)];
  const texto = montarMensagem(produto, escolhida);
  const msg = await prisma.offerMessage.create({
    data: {
      productId: produto.id,
      text: texto,
      variants: JSON.stringify(variacoes.map((v) => montarMensagem(produto, v))),
      status: cfg.aprovacao ? "aguardando_aprovacao" : "aprovada",
      origin: origem,
    },
  });

  // 4) Enfileira (ou espera aprovação)
  if (cfg.aprovacao) {
    log(`"${produto.title}" aguardando sua aprovação no painel`);
  } else {
    const n = await enfileirar(msg.id);
    log(`"${produto.title}" na fila para ${n} grupo(s)`);
  }
  return msg.id;
}

/** Chamado pelo robô a cada minuto: roda o piloto quando chega um horário. */
export async function tickPiloto(log: LogFn) {
  const cfg = await lerPiloto();
  if (!cfg.ativo) return;
  const { data, min } = agoraBrasilia();
  const estado = await lerEstado();
  if (estado.data !== data) {
    estado.data = data;
    estado.feitos = [];
  }
  const horarios = horariosDoDia(cfg);
  // Horário que chegou (tolerância de 30 min, para não disparar tudo de uma vez ao ligar)
  const idx = horarios.findIndex((h, i) => !estado.feitos.includes(i) && min >= h && min - h <= 30);
  // Marca como "perdidos" os horários que passaram há mais de 30 min
  horarios.forEach((h, i) => {
    if (min - h > 30 && !estado.feitos.includes(i)) estado.feitos.push(i);
  });
  if (idx === -1) {
    await salvarConfig(CHAVE_ESTADO, JSON.stringify(estado));
    return;
  }
  estado.feitos.push(idx);
  await salvarConfig(CHAVE_ESTADO, JSON.stringify(estado));
  log(`piloto: horário ${Math.floor(horarios[idx] / 60)}:${String(horarios[idx] % 60).padStart(2, "0")}`);
  await rodarPiloto(log, "piloto");
}
