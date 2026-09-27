"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { salvarConfig } from "@/lib/configuracoes";
import { prisma } from "@/lib/db";
import { cancelarPendentes } from "@/services/envio";

function voltar(tipo: "msg" | "erro", texto: string): never {
  revalidatePath("/whatsapp");
  redirect(`/whatsapp?${tipo}=${encodeURIComponent(texto)}`);
}

export async function comando(formData: FormData) {
  await exigirLogin();
  const cmd = String(formData.get("cmd"));
  if (!["sincronizar", "sair"].includes(cmd)) voltar("erro", "Comando inválido");
  await salvarConfig("wa_comando", cmd);
  voltar("msg", cmd === "sair" ? "Pedido enviado: o robô vai desconectar o número." : "Pedido enviado: a lista de grupos atualiza em alguns segundos.");
}

export async function salvarGrupo(formData: FormData) {
  await exigirLogin();
  const jid = String(formData.get("jid"));
  const enabled = formData.get("enabled") === "on";
  const tags = formData.getAll("tags").map(String);
  const g = await prisma.whatsAppGroup.findUnique({ where: { jid } });
  if (!g) voltar("erro", "Grupo não encontrado");
  if (enabled && !g.isAdmin) voltar("erro", "Só dá para enviar em grupos em que você é admin.");
  await prisma.whatsAppGroup.update({ where: { jid }, data: { enabled, tags: JSON.stringify(tags) } });
  voltar("msg", `Grupo "${g.name}" salvo ✓`);
}

export async function retomar() {
  await exigirLogin();
  await prisma.whatsAppSession.updateMany({ data: { pausedUntil: null, lastError: null } });
  voltar("msg", "Envios retomados.");
}

export async function pausar() {
  await exigirLogin();
  await prisma.whatsAppSession.updateMany({ data: { pausedUntil: new Date(Date.now() + 365 * 86400_000), lastError: "Pausado por você." } });
  voltar("msg", "Envios pausados até você retomar.");
}

export async function cancelarFila() {
  await exigirLogin();
  const n = await cancelarPendentes();
  voltar("msg", `${n} envio(s) pendente(s) cancelado(s).`);
}
