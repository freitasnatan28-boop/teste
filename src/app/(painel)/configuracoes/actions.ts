"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { desconectar, trocarCodigoPorToken } from "@/marketplaces/mercadolivre/oauth";

/** Modo "colar código": quando o Redirect URI do app não aponta para este painel. */
export async function colarCodigo(formData: FormData) {
  await exigirLogin();
  let entrada = String(formData.get("codigo") ?? "").trim();
  let state: string | null = null;
  // Aceita tanto o código puro quanto a URL inteira (…?code=TG-xxx&state=yyy)
  try {
    const u = new URL(entrada);
    state = u.searchParams.get("state");
    entrada = u.searchParams.get("code") ?? entrada;
  } catch {
    /* era só o código */
  }
  let destino = "/configuracoes?msg=" + encodeURIComponent("Mercado Livre conectado ✓");
  try {
    await trocarCodigoPorToken(entrada, state);
  } catch (e) {
    destino = "/configuracoes?erro=" + encodeURIComponent(mensagemErro(e));
  }
  revalidatePath("/configuracoes");
  redirect(destino);
}

export async function desconectarML() {
  await exigirLogin();
  await desconectar();
  revalidatePath("/configuracoes");
  redirect("/configuracoes?msg=" + encodeURIComponent("Mercado Livre desconectado."));
}
