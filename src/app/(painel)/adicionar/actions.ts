"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { importarPorLink } from "@/services/ofertas";

export async function adicionarPorLink(formData: FormData) {
  await exigirLogin();
  const url = String(formData.get("url") ?? "").trim();
  let destino: string;
  try {
    const id = await importarPorLink("mercadolivre", url);
    destino = `/ofertas/${id}?msg=${encodeURIComponent("Produto adicionado ✓")}`;
  } catch (e) {
    destino = `/adicionar?erro=${encodeURIComponent(mensagemErro(e))}`;
  }
  revalidatePath("/ofertas");
  redirect(destino);
}
