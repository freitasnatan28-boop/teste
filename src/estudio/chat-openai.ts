// Chat do estúdio usando o GPT (OpenAI Responses API), com as ferramentas do estúdio.
import { env } from "@/lib/env";
import type { EventoChat, MensagemHistorico, ResultadoProvedor } from "./chat-tipos";
import { textoComAnexos } from "./chat-tipos";
import { type ContextoFerramenta, DEFINICOES, executarFerramenta, rotuloFerramenta } from "./ferramentas";

export const MODELO_GPT = "gpt-5.5";
const MAX_RODADAS = 16;

type Item = Record<string, unknown> & { type?: string; role?: string };

function chave(): string {
  const k = env().OPENAI_API_KEY;
  if (!k) throw new Error("Falta a OPENAI_API_KEY no .env.");
  return k;
}

function converterHistorico(hist: MensagemHistorico[]): Item[] {
  const itens: Item[] = [];
  for (const m of hist) {
    if (m.papel === "user") {
      itens.push({
        role: "user",
        content: [
          ...m.anexos.map((a) => ({ type: "input_image", image_url: `data:${a.mime};base64,${a.base64}` })),
          { type: "input_text", text: textoComAnexos(m) },
        ],
      });
    } else if (m.bruto?.length) {
      itens.push(...(m.bruto as Item[]));
    } else {
      itens.push({ role: "assistant", content: [{ type: "output_text", text: m.texto || "(sem resposta)" }] });
    }
  }
  return itens;
}

/** Lê o stream SSE da OpenAI e devolve a resposta final. */
async function stream(corpo: unknown, sinal: AbortSignal, aoTexto: (d: string) => void): Promise<{ output: Item[]; status: string; motivo?: string }> {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave()}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: sinal,
  });
  if (!r.ok || !r.body) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const j = (await r.json()) as { error?: { message?: string } };
      if (j.error?.message) msg = j.error.message;
    } catch {
      /* sem corpo */
    }
    if (r.status === 401) msg = "Chave da OpenAI inválida (OPENAI_API_KEY).";
    throw new Error(`OpenAI: ${msg}`);
  }
  const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let final: { output: Item[]; status: string; motivo?: string } | null = null;
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buffer += value;
    let corte: number;
    while ((corte = buffer.indexOf("\n\n")) >= 0) {
      const bloco = buffer.slice(0, corte);
      buffer = buffer.slice(corte + 2);
      const dados = bloco
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!dados || dados === "[DONE]") continue;
      let ev: { type?: string; delta?: string; response?: { output?: Item[]; status?: string; incomplete_details?: { reason?: string }; error?: { message?: string } } };
      try {
        ev = JSON.parse(dados);
      } catch {
        continue;
      }
      if (ev.type === "response.output_text.delta" && ev.delta) aoTexto(ev.delta);
      else if (ev.type === "response.completed" || ev.type === "response.incomplete") {
        final = { output: ev.response?.output ?? [], status: ev.response?.status ?? "completed", motivo: ev.response?.incomplete_details?.reason };
      } else if (ev.type === "response.failed" || ev.type === "error") {
        throw new Error(`OpenAI: ${ev.response?.error?.message ?? "a resposta falhou"}`);
      }
    }
  }
  if (!final) throw new Error("OpenAI: a conexão terminou antes da resposta.");
  return final;
}

export async function rodarOpenAI(opts: {
  system: string;
  historico: MensagemHistorico[];
  ctx: ContextoFerramenta;
  emitir: (e: EventoChat) => void;
  sinal: AbortSignal;
}): Promise<ResultadoProvedor> {
  const base = converterHistorico(opts.historico);
  const novos: Item[] = [];
  const tools = DEFINICOES.map((d) => ({ type: "function", name: d.name, description: d.description, parameters: d.input_schema, strict: false }));
  let texto = "";
  let terminouLimpo = false;

  try {
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const resp = await stream(
        {
          model: MODELO_GPT,
          stream: true,
          store: false,
          include: ["reasoning.encrypted_content"],
          reasoning: { effort: "medium" },
          instructions: opts.system,
          input: [...base, ...novos],
          tools,
        },
        opts.sinal,
        (delta) => {
          texto += delta;
          opts.emitir({ tipo: "texto", delta });
        },
      );
      novos.push(...resp.output);
      if (resp.status === "incomplete") {
        opts.emitir({ tipo: "aviso", mensagem: resp.motivo === "content_filter" ? "A OpenAI bloqueou parte da resposta." : "A resposta foi cortada. Peça para continuar." });
        break;
      }
      const chamadas = resp.output.filter((o) => o.type === "function_call") as (Item & { call_id: string; name: string; arguments: string })[];
      if (!chamadas.length) {
        terminouLimpo = true;
        break;
      }
      if (texto && !texto.endsWith("\n")) {
        texto += "\n\n";
        opts.emitir({ tipo: "texto", delta: "\n\n" });
      }
      const saidas = await Promise.all(
        chamadas.map(async (c) => {
          opts.emitir({ tipo: "ferramenta", id: c.call_id, nome: c.name, rotulo: rotuloFerramenta(c.name), status: "inicio" });
          let entrada: unknown = {};
          try {
            entrada = JSON.parse(c.arguments || "{}");
          } catch {
            entrada = null;
          }
          const r =
            entrada === null ? { texto: "Argumentos em JSON inválido; tente de novo.", erro: true } : await executarFerramenta(c.name, entrada, opts.ctx);
          opts.emitir({ tipo: "ferramenta", id: c.call_id, nome: c.name, rotulo: rotuloFerramenta(c.name), status: r.erro ? "erro" : "ok", detalhe: r.erro ? r.texto : undefined });
          return { type: "function_call_output", call_id: c.call_id, output: r.erro ? `ERRO: ${r.texto}` : r.texto } as Item;
        }),
      );
      novos.push(...saidas);
    }
  } catch (e) {
    if (opts.sinal.aborted) return { texto, bruto: null };
    opts.emitir({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Erro inesperado no chat" });
    return { texto, bruto: null };
  }
  return { texto, bruto: terminouLimpo ? novos : null };
}
