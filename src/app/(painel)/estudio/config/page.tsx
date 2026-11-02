import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { MODELO_CLAUDE } from "@/estudio/chat-claude";
import { MODELO_GPT } from "@/estudio/chat-openai";
import { FORMATOS, lerConfigEstudio, QUALIDADES, servicos } from "@/estudio/config";
import { MODELO_IMAGEM } from "@/estudio/imagem";
import { listarVozes, MODELOS_VOZ, type Voz } from "@/estudio/voz";
import { restaurarInstrucoes, salvarInstrucoes, salvarPreferencias } from "./actions";

export const dynamic = "force-dynamic";

export default async function EstudioConfigPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const c = await lerConfigEstudio();
  const disp = servicos();
  let vozes: Voz[] = [];
  let erroVozes: string | null = null;
  if (disp.elevenlabs) {
    try {
      vozes = await listarVozes();
    } catch (e) {
      erroVozes = e instanceof Error ? e.message : "Falha ao listar vozes";
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Config do Canal Dark</h1>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card">
        <h2>🧠 Instruções do canal</h2>
        <p className="muted small">
          É o “cérebro” do chat: o mesmo texto que você usa no projeto <strong>CANAL DARK IG/EUA</strong>. Cole aqui as suas instruções (nicho, tom, estrutura dos roteiros,
          regras). O chat segue isso em toda conversa.
        </p>
        <form action={salvarInstrucoes}>
          <textarea name="instrucoes" defaultValue={c.instrucoes} rows={18} className="instrucoes" aria-label="Instruções do canal" />
          <div className="acoes">
            <SubmitButton pendente="Salvando…">Salvar instruções</SubmitButton>
          </div>
        </form>
        <form action={restaurarInstrucoes} className="acoes">
          <button type="submit" className="btn btn-perigo btn-mini">
            Voltar ao modelo padrão
          </button>
        </form>
      </section>

      <section className="card">
        <h2>🎛️ Preferências</h2>
        <form action={salvarPreferencias} className="grid-form">
          <label>
            IA do chat
            <select name="provedorChat" defaultValue={c.provedorChat}>
              <option value="claude" disabled={!disp.claude}>
                Claude ({MODELO_CLAUDE}){disp.claude ? "" : " — falta ANTHROPIC_API_KEY"}
              </option>
              <option value="openai" disabled={!disp.openai}>
                GPT ({MODELO_GPT}){disp.openai ? "" : " — falta OPENAI_API_KEY"}
              </option>
            </select>
          </label>
          <label>
            Formato padrão
            <select name="formatoPadrao" defaultValue={c.formatoPadrao}>
              {Object.entries(FORMATOS).map(([v, f]) => (
                <option key={v} value={v}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qualidade das imagens
            <select name="qualidadeImagem" defaultValue={c.qualidadeImagem}>
              {Object.entries(QUALIDADES).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Modelo de voz
            <select name="modeloVoz" defaultValue={c.modeloVoz}>
              {Object.entries(MODELOS_VOZ).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2">
            Voz do narrador
            {vozes.length ? (
              <select name="vozId" defaultValue={c.vozId}>
                {!vozes.some((v) => v.id === c.vozId) && <option value={c.vozId}>{c.vozNome || c.vozId}</option>}
                {vozes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                    {v.descricao ? ` — ${v.descricao}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input name="vozId" defaultValue={c.vozId} placeholder="ID da voz na ElevenLabs" />
            )}
          </label>
          <input type="hidden" name="vozNomeAtual" value={c.vozNome} />
          {erroVozes && <div className="flash flash-erro col-2">{erroVozes}</div>}
          <div className="acoes col-2">
            <SubmitButton pendente="Salvando…">Salvar preferências</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>🔑 Serviços conectados</h2>
        <ul className="dados">
          <li>
            {disp.claude ? "✅" : "❌"} Claude (chat) — <code>ANTHROPIC_API_KEY</code>
          </li>
          <li>
            {disp.openai ? "✅" : "❌"} OpenAI (imagens {MODELO_IMAGEM} e chat GPT) — <code>OPENAI_API_KEY</code>
          </li>
          <li>
            {disp.elevenlabs ? "✅" : "❌"} ElevenLabs (narração) — <code>ELEVENLABS_API_KEY</code>
          </li>
          <li>✅ Montagem de vídeo (ffmpeg, no próprio servidor)</li>
        </ul>
        <p className="muted small">As chaves ficam só no arquivo .env do servidor. Depois de mudar o .env, reinicie o painel (pm2 restart painel).</p>
      </section>
    </>
  );
}
