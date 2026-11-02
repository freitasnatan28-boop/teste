// Chat do estúdio: responde em "streaming" (uma linha JSON por evento).
import { z } from "zod";
import { semLogin } from "@/estudio/api";
import { conversar } from "@/estudio/chat";
import type { EventoChat } from "@/estudio/chat-tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const Corpo = z.object({
  conversaId: z.string().nullish(),
  texto: z.string().max(20000).default(""),
  anexos: z.array(z.string()).max(10).default([]),
});

export async function POST(req: Request) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.texto.trim() && !parsed.data.anexos.length)) {
    return Response.json({ erro: "Escreva uma mensagem ou anexe uma imagem." }, { status: 400 });
  }
  const { conversaId, texto, anexos } = parsed.data;
  const enc = new TextEncoder();
  let fechado = false;

  const corpo = new ReadableStream<Uint8Array>({
    start(controller) {
      const emitir = (e: EventoChat) => {
        if (fechado) return;
        try {
          controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
        } catch {
          fechado = true;
        }
      };
      const ping = setInterval(() => emitir({ tipo: "ping" }), 15000);
      conversar({ conversaId, texto, anexos, emitir })
        .catch((e: unknown) => emitir({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Erro inesperado" }))
        .finally(() => {
          clearInterval(ping);
          if (fechado) return;
          fechado = true;
          try {
            controller.close();
          } catch {
            /* já fechado */
          }
        });
    },
    cancel() {
      // Você fechou a página: a resposta continua sendo gerada e salva na conversa.
      fechado = true;
    },
  });

  return new Response(corpo, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
