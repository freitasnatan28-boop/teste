import Link from "next/link";
import { ChatEstudio } from "@/components/estudio/ChatEstudio";
import { MODELO_CLAUDE } from "@/estudio/chat-claude";
import { MODELO_GPT } from "@/estudio/chat-openai";
import { lerConfigEstudio, servicos } from "@/estudio/config";

export const dynamic = "force-dynamic";

export default async function EstudioChatPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [config, disp] = [await lerConfigEstudio(), servicos()];
  const usaClaude = config.provedorChat === "claude" ? disp.claude || !disp.openai : !disp.openai && disp.claude;
  const provedor = usaClaude ? `Claude (${MODELO_CLAUDE})` : `GPT (${MODELO_GPT})`;
  const faltando = [
    !disp.claude && !disp.openai ? "uma IA de chat (ANTHROPIC_API_KEY ou OPENAI_API_KEY)" : null,
    !disp.openai ? "imagens (OPENAI_API_KEY)" : null,
    !disp.elevenlabs ? "narração (ELEVENLABS_API_KEY)" : null,
  ].filter(Boolean);
  const aviso = faltando.length ? `Faltam chaves no .env para: ${faltando.join(", ")}. Veja Config.` : null;
  return (
    <>
      <ChatEstudio conversaInicial={sp.c ?? null} provedor={provedor} avisoConfig={aviso} />
      <p className="muted small rodape-estudio">
        As instruções do canal ficam em <Link href="/estudio/config">Config</Link>.
      </p>
    </>
  );
}
