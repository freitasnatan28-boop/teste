// Fila de envio para os grupos do WhatsApp.
// O envio de verdade é feito pelo robô (worker/whatsapp.ts), que lê esta fila.
import type { Product } from "@prisma/client";
import { prisma } from "@/lib/db";
import { lerPiloto } from "@/lib/piloto-config";

/** Grupos que devem receber o produto: ligados, onde você é admin, e com tag compatível. */
export async function gruposDestino(produto: Product & { tags: { slug: string }[] }) {
  const grupos = await prisma.whatsAppGroup.findMany({ where: { enabled: true, isAdmin: true } });
  const tagsProduto = new Set(produto.tags.map((t) => t.slug));
  return grupos.filter((g) => {
    let tags: string[] = [];
    try {
      tags = JSON.parse(g.tags) as string[];
    } catch {
      tags = [];
    }
    return tags.length === 0 || tags.some((t) => tagsProduto.has(t));
  });
}

/**
 * Coloca uma mensagem na fila para todos os grupos de destino,
 * com intervalo aleatório entre um grupo e outro (anti-banimento).
 */
export async function enfileirar(messageId: string, inicio = new Date()): Promise<number> {
  const msg = await prisma.offerMessage.findUniqueOrThrow({ where: { id: messageId } });
  const produto = await prisma.product.findUniqueOrThrow({ where: { id: msg.productId }, include: { tags: true } });
  const grupos = await gruposDestino(produto);
  if (!grupos.length) throw new Error("Nenhum grupo de destino. Vá em WhatsApp e marque os grupos que recebem ofertas (e confira as tags).");
  const cfg = await lerPiloto();
  let quando = inicio.getTime();
  for (const g of grupos) {
    await prisma.sendJob.create({
      data: { messageId, productId: produto.id, groupJid: g.jid, imageUrl: produto.imageUrl, text: msg.text, scheduledAt: new Date(quando) },
    });
    const intervalo = cfg.intervaloMin + Math.random() * Math.max(0, cfg.intervaloMax - cfg.intervaloMin);
    quando += intervalo * 1000;
  }
  await prisma.offerMessage.update({ where: { id: messageId }, data: { status: "aprovada" } });
  return grupos.length;
}

export async function cancelarPendentes() {
  const r = await prisma.sendJob.updateMany({ where: { status: "pendente" }, data: { status: "cancelado" } });
  return r.count;
}
