"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { lerCodigoAfiliadoML, salvarCodigoAfiliadoML, salvarConfig } from "@/lib/configuracoes";
import { mercadoLivre } from "@/marketplaces/registry";
import { detectarCodigosAfiliado } from "@/marketplaces/mercadolivre/links";
import { desconectar, trocarCodigoPorToken } from "@/marketplaces/mercadolivre/oauth";
import { aplicarLinksAutomaticosEmTodas, removerLinksAutomaticos } from "@/services/ofertas";

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

// ---------- Link de afiliado automático ----------

export async function detectarCodigo(formData: FormData) {
  await exigirLogin();
  const link = String(formData.get("link") ?? "").trim();
  let destino: string;
  try {
    const c = await detectarCodigosAfiliado(link);
    if (!c) {
      throw new Error(
        "Não achei o seu código nesse link. Abra o seu link meli.la no navegador, espere a página do produto carregar, copie o endereço completo da barra (ele tem matt_tool=...) e cole aqui.",
      );
    }
    await salvarCodigoAfiliadoML({ mattTool: c.mattTool, mattWord: c.mattWord, ativo: true });
    const n = await aplicarLinksAutomaticosEmTodas();
    destino = "/configuracoes?msg=" + encodeURIComponent(`Código detectado (matt_tool=${c.mattTool}). Link automático ligado: ${n} oferta(s) já receberam link.`);
  } catch (e) {
    destino = "/configuracoes?erro=" + encodeURIComponent(mensagemErro(e));
  }
  revalidatePath("/configuracoes");
  revalidatePath("/ofertas");
  redirect(destino);
}

export async function salvarCodigoManual(formData: FormData) {
  await exigirLogin();
  const mattTool = String(formData.get("matt_tool") ?? "").trim();
  const mattWord = String(formData.get("matt_word") ?? "").trim();
  if (!/^[\w-]{2,64}$/.test(mattTool)) redirect("/configuracoes?erro=" + encodeURIComponent("O matt_tool deve ter só letras, números, - ou _."));
  if (mattWord && !/^[\w-]{1,64}$/.test(mattWord)) redirect("/configuracoes?erro=" + encodeURIComponent("A etiqueta (matt_word) deve ter só letras, números, - ou _."));
  await salvarCodigoAfiliadoML({ mattTool, mattWord, ativo: true });
  const n = await aplicarLinksAutomaticosEmTodas();
  revalidatePath("/configuracoes");
  revalidatePath("/ofertas");
  redirect("/configuracoes?msg=" + encodeURIComponent(`Código salvo. ${n} oferta(s) receberam link automático.`));
}

export async function desligarLinkAutomatico() {
  await exigirLogin();
  const atual = await lerCodigoAfiliadoML();
  if (atual) await salvarCodigoAfiliadoML({ ...atual, ativo: false });
  await removerLinksAutomaticos();
  revalidatePath("/configuracoes");
  revalidatePath("/ofertas");
  redirect("/configuracoes?msg=" + encodeURIComponent("Link automático desligado. Os links que você colou manualmente continuam salvos."));
}

// ---------- Diagnóstico da API do ML ----------

export async function rodarDiagnostico() {
  await exigirLogin();
  let destino = "/configuracoes?msg=" + encodeURIComponent("Diagnóstico concluído — veja a tabela abaixo.") + "#diagnostico";
  try {
    const passos = await mercadoLivre.diagnostico();
    await salvarConfig("ml_diagnostico", JSON.stringify({ em: new Date().toISOString(), passos }));
  } catch (e) {
    destino = "/configuracoes?erro=" + encodeURIComponent(mensagemErro(e));
  }
  revalidatePath("/configuracoes");
  redirect(destino);
}
