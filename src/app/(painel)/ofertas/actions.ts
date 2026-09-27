"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { atualizarTodos, buscarEImportar } from "@/services/ofertas";

export async function buscarNovas(formData: FormData) {
  await exigirLogin();
  const palavraChave = String(formData.get("q") ?? "").trim() || undefined;
  const sub = String(formData.get("subcategoria") ?? "").trim().toUpperCase();
  const categoriaId = sub || String(formData.get("categoria") ?? "").trim() || undefined;
  let destino: string;
  try {
    const r = await buscarEImportar("mercadolivre", { palavraChave, categoriaId, limite: 20 });
    const msg = `${r.importados} oferta(s) importada(s)/atualizada(s).${r.avisos.length ? " " + r.avisos.join(" ") : ""}`;
    destino = `/ofertas?ordem=recentes&msg=${encodeURIComponent(msg)}`;
  } catch (e) {
    destino = `/ofertas?erro=${encodeURIComponent(mensagemErro(e))}`;
  }
  revalidatePath("/ofertas");
  redirect(destino);
}

export async function atualizarPrecos() {
  await exigirLogin();
  let destino: string;
  try {
    const r = await atualizarTodos();
    destino = `/ofertas?msg=${encodeURIComponent(`Preços atualizados: ${r.ok} de ${r.total}${r.falhas ? ` (${r.falhas} com erro)` : ""}.`)}`;
  } catch (e) {
    destino = `/ofertas?erro=${encodeURIComponent(mensagemErro(e))}`;
  }
  revalidatePath("/ofertas");
  redirect(destino);
}
