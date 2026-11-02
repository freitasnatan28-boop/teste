// Tipos compartilhados entre o chat, os provedores (Claude/GPT) e a tela.
import type { ArquivoPublico } from "./armazenamento";

export type EventoChat =
  | { tipo: "conversa"; conversaId: string; titulo: string }
  | { tipo: "texto"; delta: string }
  | { tipo: "ferramenta"; id: string; nome: string; rotulo: string; status: "inicio" | "ok" | "erro"; detalhe?: string }
  | { tipo: "arquivo"; arquivo: ArquivoPublico }
  | { tipo: "aviso"; mensagem: string }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "fim"; mensagemId: string }
  /** Sinal de vida enquanto uma imagem/narração demora (evita o Nginx cortar a conexão) */
  | { tipo: "ping" };

export interface AnexoHistorico {
  id: string;
  mime: string;
  base64: string;
  rotulo: string;
  avatar: boolean;
}

/** Uma mensagem do histórico, pronta para ser convertida no formato de cada provedor. */
export interface MensagemHistorico {
  papel: "user" | "assistant";
  texto: string;
  anexos: AnexoHistorico[];
  /** Mensagens originais do provedor (só quando foi o mesmo provedor) */
  bruto: unknown[] | null;
}

export interface ResultadoProvedor {
  texto: string;
  /** Mensagens novas no formato do provedor (para reenviar nas próximas rodadas) */
  bruto: unknown[] | null;
}

/** Texto que acompanha as imagens enviadas, para a IA saber o ID de cada uma. */
export function textoComAnexos(m: MensagemHistorico): string {
  if (!m.anexos.length) return m.texto || "(sem texto)";
  const linhas = m.anexos.map(
    (a, i) => `- Imagem ${i + 1}: id=${a.id}${a.rotulo ? ` · nome "${a.rotulo}"` : ""}${a.avatar ? " · salvo como avatar" : ""}`,
  );
  return `${m.texto || "(sem texto)"}\n\n[Imagens anexadas nesta mensagem — use o id em "referencias" para gerar a partir delas]\n${linhas.join("\n")}`;
}
