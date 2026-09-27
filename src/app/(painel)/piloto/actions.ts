"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, mensagemErro } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { salvarPersona } from "@/lib/persona";
import { PILOTO_PADRAO, salvarPiloto } from "@/lib/piloto-config";
import { enfileirar } from "@/services/envio";
import { rodarPiloto } from "@/services/piloto";

function voltar(tipo: "msg" | "erro", texto: string, ancora = ""): never {
  revalidatePath("/piloto");
  revalidatePath("/whatsapp");
  redirect(`/piloto?${tipo}=${encodeURIComponent(texto)}${ancora}`);
}

const num = (v: FormDataEntryValue | null, padrao: number, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const hora = (v: FormDataEntryValue | null, padrao: string) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : padrao);
const linhas = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function salvarConfigPiloto(formData: FormData) {
  await exigirLogin();
  const p = PILOTO_PADRAO;
  const intervaloMin = num(formData.get("intervaloMin"), p.intervaloMin, 10, 600);
  await salvarPiloto({
    ativo: formData.get("ativo") === "on",
    termos: linhas(formData.get("termos")).slice(0, 50),
    ofertasPorDia: num(formData.get("ofertasPorDia"), p.ofertasPorDia, 0, 48),
    inicio: hora(formData.get("inicio"), p.inicio),
    fim: hora(formData.get("fim"), p.fim),
    scoreMinimo: num(formData.get("scoreMinimo"), p.scoreMinimo, 0, 100),
    descontoMinimo: num(formData.get("descontoMinimo"), p.descontoMinimo, 0, 95),
    naoRepetirDias: num(formData.get("naoRepetirDias"), p.naoRepetirDias, 0, 90),
    aprovacao: formData.get("aprovacao") === "on",
    limitePorHora: num(formData.get("limitePorHora"), p.limitePorHora, 1, 60),
    intervaloMin,
    intervaloMax: Math.max(intervaloMin, num(formData.get("intervaloMax"), p.intervaloMax, 10, 900)),
  });
  voltar("msg", "Configuração salva ✓");
}

export async function rodarAgora() {
  await exigirLogin();
  const log: string[] = [];
  let tipo: "msg" | "erro" = "msg";
  try {
    const id = await rodarPiloto((m) => log.push(m), "manual");
    if (!id) tipo = "erro";
  } catch (e) {
    tipo = "erro";
    log.push(mensagemErro(e));
  }
  voltar(tipo, log.join(" · ") || "Nada a fazer agora.");
}

export async function aprovar(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id"));
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) voltar("erro", "A mensagem está vazia.");
  await prisma.offerMessage.update({ where: { id }, data: { text: texto } });
  let n = 0;
  try {
    n = await enfileirar(id);
  } catch (e) {
    voltar("erro", mensagemErro(e));
  }
  voltar("msg", `Aprovada ✓ — na fila para ${n} grupo(s).`);
}

export async function descartar(formData: FormData) {
  await exigirLogin();
  await prisma.offerMessage.update({ where: { id: String(formData.get("id")) }, data: { status: "descartada" } });
  voltar("msg", "Mensagem descartada.");
}

export async function salvarPersonagem(formData: FormData) {
  await exigirLogin();
  const nome = String(formData.get("name") ?? "").trim();
  const personalidade = String(formData.get("personality") ?? "").trim();
  if (!nome || !personalidade) voltar("erro", "Preencha nome e personalidade.", "#personagem");
  await salvarPersona({
    name: nome.slice(0, 60),
    personality: personalidade.slice(0, 1500),
    catchphrases: linhas(formData.get("catchphrases")).slice(0, 20),
    emojis: String(formData.get("emojis") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 20),
    forbidden: linhas(formData.get("forbidden")).slice(0, 50),
  });
  voltar("msg", "Personagem salvo ✓", "#personagem");
}
