// Lista de temas do Story Akte guardada no banco (tabela Setting, como as outras configurações do painel).
import { lerConfig, salvarConfig } from "./configuracoes";
import { TEMAS_INICIAIS, type TemaSA } from "./story-akte";

const CHAVE = "story_akte_temas";

export async function lerTemas(): Promise<TemaSA[]> {
  const v = await lerConfig(CHAVE);
  if (!v) return TEMAS_INICIAIS;
  try {
    const lista = JSON.parse(v);
    return Array.isArray(lista) ? (lista as TemaSA[]) : TEMAS_INICIAIS;
  } catch {
    return TEMAS_INICIAIS;
  }
}

export async function salvarTemas(temas: TemaSA[]) {
  await salvarConfig(CHAVE, JSON.stringify(temas));
}
