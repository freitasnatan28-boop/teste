"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aplicarLinkAutomatico, atualizarProduto, salvarLinkAfiliado } from "@/services/ofertas";

function voltar(id: string, tipo: "msg" | "erro", texto: string): never {
  revalidatePath(`/ofertas/${id}`);
  revalidatePath("/ofertas");
  redirect(`/ofertas/${id}?${tipo}=${encodeURIComponent(texto)}`);
}

export async function salvarLink(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  const url = String(formData.get("url") ?? "");
  try {
    await salvarLinkAfiliado(id, url);
  } catch (e) {
    voltar(id, "erro", mensagemErro(e));
  }
  voltar(id, "msg", "Link de afiliado salvo ✓");
}

export async function removerLink(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  await prisma.product.update({ where: { id }, data: { affiliateUrl: null, affiliateSource: null, affiliateUpdatedAt: null } });
  // Se o modo automático estiver ligado, volta a usar o link automático
  const auto = await aplicarLinkAutomatico(id);
  voltar(id, "msg", auto ? "Link manual removido — voltou a usar o link automático." : "Link removido.");
}

export async function atualizar(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  let ok = false;
  try {
    ok = await atualizarProduto(id);
  } catch (e) {
    voltar(id, "erro", mensagemErro(e));
  }
  voltar(id, ok ? "msg" : "erro", ok ? "Preço atualizado ✓" : "Produto indisponível no momento (sem estoque ou pausado).");
}

export async function salvarTags(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  const slugs = formData.getAll("tags").map(String);
  await prisma.product.update({ where: { id }, data: { tags: { set: slugs.map((slug) => ({ slug })) } } });
  voltar(id, "msg", "Tags salvas ✓");
}

export async function ocultar(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  await prisma.product.update({ where: { id }, data: { hidden: true } });
  revalidatePath("/ofertas");
  redirect(`/ofertas?msg=${encodeURIComponent("Oferta removida da lista.")}`);
}
