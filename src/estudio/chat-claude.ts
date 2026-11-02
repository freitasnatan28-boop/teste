// Chat do estúdio usando o Claude (Anthropic), com as ferramentas do estúdio.
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { EventoChat, MensagemHistorico, ResultadoProvedor } from "./chat-tipos";
import { textoComAnexos } from "./chat-tipos";
import { type ContextoFerramenta, DEFINICOES, executarFerramenta, rotuloFerramenta } from "./ferramentas";

export const MODELO_CLAUDE = "claude-opus-5-5";
const MAX_RODADAS = 16;

type Param = Anthropic.Beta.BetaMessageParam;

let cliente: Anthropic | null = null;
function claude(): Anthropic {
  const apiKey = env().ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta a ANTHROPIC_API_KEY no .env (ou troque o chat para GPT em Canal Dark > Config).");
  cliente ??= new Anthropic({ apiKey });
  return cliente;
}

function converterHistorico(hist: MensagemHistorico[]): Param[] {
  const msgs: Param[] = [];
  for (const m of hist) {
    if (m.papel === "user") {
      const imagens: Anthropic.Beta.BetaImageBlockParam[] = m.anexos.map((a) => ({
        type: "image",
        source: { type: "base64", media_type: a.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: a.base64 },
      }));
      msgs.push({ role: "user", content: [...imagens, { type: "text", text: textoComAnexos(m) }] });
    } else if (m.bruto?.length) {
      msgs.push(...(m.bruto as Param[]));
    } else {
      msgs.push({ role: "assistant", content: m.texto || "(sem resposta)" });
    }
  }
  return msgs;
}

function mensagemErro(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Chave da Anthropic inválida (ANTHROPIC_API_KEY).";
  if (e instanceof Anthropic.RateLimitError) return "Limite da Anthropic atingido; tente em instantes.";
  if (e instanceof Anthropic.BadRequestError) return `Claude recusou o pedido: ${e.message}`;
  if (e instanceof Anthropic.APIError) return `Erro da Anthropic (${e.status ?? "rede"}): ${e.message}`;
  return e instanceof Error ? e.message : "Erro inesperado no chat";
}

export async function rodarClaude(opts: {
  system: string;
  historico: MensagemHistorico[];
  ctx: ContextoFerramenta;
  emitir: (e: EventoChat) => void;
  sinal: AbortSignal;
}): Promise<ResultadoProvedor> {
  const client = claude();
  const base = converterHistorico(opts.historico);
  const novos: Param[] = [];
  const tools: Anthropic.Beta.BetaTool[] = DEFINICOES.map((d) => ({ name: d.name, description: d.description, input_schema: d.input_schema }));
  let texto = "";

  try {
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const stream = client.beta.messages.stream(
        {
          model: MODELO_CLAUDE,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          cache_control: { type: "ephemeral" },
          system: [{ type: "text", text: opts.system }],
          tools,
          messages: [...base, ...novos],
        },
        { signal: opts.sinal },
      );
      stream.on("text", (delta) => {
        texto += delta;
        opts.emitir({ tipo: "texto", delta });
      });
      const msg = await stream.finalMessage();
      novos.push({ role: "assistant", content: msg.content as Anthropic.Beta.BetaContentBlockParam[] });

      if (msg.stop_reason === "refusal") {
        opts.emitir({ tipo: "aviso", mensagem: "O Claude recusou continuar este pedido. Reformule ou troque o chat para GPT em Config." });
        break;
      }
      if (msg.stop_reason === "pause_turn") continue;
      if (msg.stop_reason === "max_tokens") {
        opts.emitir({ tipo: "aviso", mensagem: "A resposta ficou longa demais e foi cortada. Peça para continuar." });
        break;
      }
      if (msg.stop_reason !== "tool_use") break;

      const usos = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (texto && !texto.endsWith("\n")) {
        texto += "\n\n";
        opts.emitir({ tipo: "texto", delta: "\n\n" });
      }
      const resultados = await Promise.all(
        usos.map(async (u) => {
          opts.emitir({ tipo: "ferramenta", id: u.id, nome: u.name, rotulo: rotuloFerramenta(u.name), status: "inicio" });
          const r = await executarFerramenta(u.name, u.input, opts.ctx);
          opts.emitir({ tipo: "ferramenta", id: u.id, nome: u.name, rotulo: rotuloFerramenta(u.name), status: r.erro ? "erro" : "ok", detalhe: r.erro ? r.texto : undefined });
          const bloco: Anthropic.Beta.BetaToolResultBlockParam = { type: "tool_result", tool_use_id: u.id, content: r.texto, is_error: r.erro || undefined };
          return bloco;
        }),
      );
      novos.push({ role: "user", content: resultados });
    }
  } catch (e) {
    if (opts.sinal.aborted) return { texto, bruto: null };
    opts.emitir({ tipo: "erro", mensagem: mensagemErro(e) });
    return { texto, bruto: null };
  }
  // Só guarda o histórico "bruto" se terminou numa resposta da IA (sem ferramenta pendente)
  const ultimo = novos[novos.length - 1];
  return { texto, bruto: ultimo?.role === "assistant" ? novos : null };
}
