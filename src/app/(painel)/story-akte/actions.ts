"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { hojeBR, proximoNumero, SITUACOES, temasParecidos, type DonoTema, type SituacaoTema, type TemaSA } from "@/lib/story-akte";
import { lerTemas, salvarTemas } from "@/lib/story-akte-dados";

function voltar(tipo: "msg" | "erro", texto: string): never {
  revalidatePath("/story-akte");
  redirect(`/story-akte?${tipo}=${encodeURIComponent(texto)}#temas`);
}

const texto = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);
const dono = (v: FormDataEntryValue | null): DonoTema => (v === "Felipe" ? "Felipe" : "Amigo");
const situacao = (v: FormDataEntryValue | null, padrao: SituacaoTema): SituacaoTema =>
  typeof v === "string" && v in SITUACOES ? (v as SituacaoTema) : padrao;

export async function adicionarTema(formData: FormData) {
  await exigirLogin();
  const tema = texto(formData.get("tema"));
  const jogo = texto(formData.get("jogo"), 80);
  if (!tema) voltar("erro", "Escreva o tema.");
  const d = dono(formData.get("dono"));
  const temas = await lerTemas();

  const parecidos = temasParecidos({ tema, jogo }, temas);
  if (parecidos.length && formData.get("forcar") !== "on") {
    voltar("erro", `Parece repetido: ${parecidos.map((t) => `${t.numero} (${t.tema}, ${t.dono})`).join("; ")}. Se tiver certeza, marque "salvar mesmo assim".`);
  }

  const novo: TemaSA = {
    numero: proximoNumero(temas, d),
    tema,
    jogo: jogo || "—",
    dono: d,
    situacao: situacao(formData.get("situacao"), d === "Felipe" ? "reservado" : "planejado"),
    criadoEm: hojeBR(),
  };
  if (novo.situacao === "pronto") novo.prontoEm = novo.criadoEm;
  await salvarTemas([...temas, novo]);
  voltar("msg", `${novo.numero} salvo ✓ — ${novo.tema}`);
}

export async function atualizarTema(formData: FormData) {
  await exigirLogin();
  const numero = texto(formData.get("numero"), 20);
  const temas = await lerTemas();
  const t = temas.find((x) => x.numero === numero);
  if (!t) voltar("erro", "Tema não encontrado.");
  const nova = situacao(formData.get("situacao"), t.situacao);
  const atualizado: TemaSA = {
    ...t,
    situacao: nova,
    tituloDE: texto(formData.get("tituloDE")) || undefined,
    duracao: texto(formData.get("duracao"), 10) || undefined,
    pasta: texto(formData.get("pasta"), 120) || undefined,
    prontoEm: nova === "pronto" ? (t.prontoEm ?? hojeBR()) : undefined,
  };
  await salvarTemas(temas.map((x) => (x.numero === numero ? atualizado : x)));
  voltar("msg", `${numero} atualizado ✓`);
}

export async function removerTema(formData: FormData) {
  await exigirLogin();
  const numero = texto(formData.get("numero"), 20);
  const temas = await lerTemas();
  await salvarTemas(temas.filter((x) => x.numero !== numero));
  voltar("msg", `${numero} removido.`);
}
