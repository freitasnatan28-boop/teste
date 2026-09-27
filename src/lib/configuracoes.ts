// Configurações guardadas no banco e editáveis pela tela Config.
// (Segredos como senhas e chaves de API continuam só no .env.)
import { prisma } from "./db";

export async function lerConfig(chave: string): Promise<string | null> {
  const s = await prisma.setting.findUnique({ where: { key: chave } });
  return s?.value ?? null;
}

export async function salvarConfig(chave: string, valor: string | null) {
  if (valor == null || valor === "") {
    await prisma.setting.deleteMany({ where: { key: chave } });
    return;
  }
  await prisma.setting.upsert({ where: { key: chave }, create: { key: chave, value: valor }, update: { value: valor } });
}

// ----- Código de afiliado do Mercado Livre -----
export interface CodigoAfiliadoML {
  /** ID da sua conta de afiliado (parâmetro matt_tool) */
  mattTool: string;
  /** Etiqueta (parâmetro matt_word) — aparece nos relatórios do Portal do Afiliado */
  mattWord: string;
  ativo: boolean;
}

const CHAVE_ML = "ml_codigo_afiliado";

export async function lerCodigoAfiliadoML(): Promise<CodigoAfiliadoML | null> {
  const v = await lerConfig(CHAVE_ML);
  if (!v) return null;
  try {
    return JSON.parse(v) as CodigoAfiliadoML;
  } catch {
    return null;
  }
}

export async function salvarCodigoAfiliadoML(c: CodigoAfiliadoML | null) {
  await salvarConfig(CHAVE_ML, c ? JSON.stringify(c) : null);
}
