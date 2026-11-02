"use server";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { FORMATOS, type Formato, INSTRUCOES_PADRAO, QUALIDADES, type Qualidade, salvarConfigEstudio } from "@/estudio/config";
import { listarVozes, MODELOS_VOZ } from "@/estudio/voz";

export async function salvarInstrucoes(form: FormData) {
  await exigirLogin();
  const instrucoes = String(form.get("instrucoes") ?? "").trim();
  await salvarConfigEstudio({ instrucoes: instrucoes || INSTRUCOES_PADRAO });
  redirect("/estudio/config?msg=" + encodeURIComponent("Instruções do canal salvas."));
}

export async function restaurarInstrucoes() {
  await exigirLogin();
  await salvarConfigEstudio({ instrucoes: INSTRUCOES_PADRAO });
  redirect("/estudio/config?msg=" + encodeURIComponent("Instruções voltaram para o modelo padrão."));
}

export async function salvarPreferencias(form: FormData) {
  await exigirLogin();
  const provedor = form.get("provedorChat") === "claude" ? "claude" : "openai";
  const formato = String(form.get("formatoPadrao"));
  const qualidade = String(form.get("qualidadeImagem"));
  const modeloVoz = String(form.get("modeloVoz"));
  const vozId = String(form.get("vozId") ?? "").trim();
  let vozNome = String(form.get("vozNomeAtual") ?? "");
  if (vozId) {
    try {
      vozNome = (await listarVozes()).find((v) => v.id === vozId)?.nome ?? vozNome;
    } catch {
      /* mantém o nome antigo */
    }
  }
  await salvarConfigEstudio({
    provedorChat: provedor,
    formatoPadrao: (formato in FORMATOS ? formato : "9:16") as Formato,
    qualidadeImagem: (qualidade in QUALIDADES ? qualidade : "medium") as Qualidade,
    modeloVoz: modeloVoz in MODELOS_VOZ ? modeloVoz : "eleven_multilingual_v2",
    ...(vozId ? { vozId, vozNome } : {}),
  });
  redirect("/estudio/config?msg=" + encodeURIComponent("Preferências salvas."));
}
