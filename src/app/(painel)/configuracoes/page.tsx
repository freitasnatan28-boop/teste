import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { lerCodigoAfiliadoML } from "@/lib/configuracoes";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { mlConfigurado, statusConexao } from "@/marketplaces/mercadolivre/oauth";
import { todosAdapters } from "@/marketplaces/registry";
import { sair } from "../../login/actions";
import { colarCodigo, desconectarML, desligarLinkAutomatico, detectarCodigo, salvarCodigoManual } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const e = env();
  const [status, codigo] = await Promise.all([statusConexao(), lerCodigoAfiliadoML()]);
  const adapters = todosAdapters();

  return (
    <>
      <h1 className="titulo-pagina">Configurações</h1>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card">
        <h2>🔗 Link de afiliado automático</h2>
        {codigo?.ativo ? (
          <>
            <p>
              ✅ <strong>Ligado.</strong> Toda oferta nova já recebe o seu link de afiliado.
            </p>
            <ul className="dados">
              <li>
                ID da conta (matt_tool): <code>{codigo.mattTool}</code>
              </li>
              <li>
                Etiqueta (matt_word): <code>{codigo.mattWord || "—"}</code>
              </li>
            </ul>
            <div className="aviso">
              <strong>Faça um teste:</strong> abra o link de uma oferta numa aba anônima e compare com um link gerado pelo Portal do Afiliado. Depois de 24–48h, confira no
              relatório do Portal se os cliques aparecem na etiqueta <code>{codigo.mattWord || "(sem etiqueta)"}</code>. Links que você colar manualmente sempre têm prioridade.
            </div>
            <form action={desligarLinkAutomatico} className="acoes">
              <button className="btn btn-perigo" type="submit">
                Desligar link automático
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="muted">
              Cole <strong>um</strong> link de afiliado seu (qualquer produto, gerado no Portal do Afiliado ou no botão Compartilhar do app). O painel descobre o seu código e passa a montar
              o link de todas as ofertas sozinho — sem login e sem acessar o seu Portal.
            </p>
            <form action={detectarCodigo} className="linha-form">
              <input name="link" required placeholder="https://meli.la/..." aria-label="Um link de afiliado seu" />
              <SubmitButton pendente="Detectando…">Detectar meu código</SubmitButton>
            </form>
            <details className="mt">
              <summary>Prefiro digitar o código</summary>
              <p className="muted small">
                Abra um link seu no navegador. Na barra de endereço aparece <code>matt_tool=XXXX</code> e <code>matt_word=YYYY</code>. Copie esses valores.
              </p>
              <form action={salvarCodigoManual} className="grid-form">
                <label>
                  matt_tool (ID da conta)
                  <input name="matt_tool" required defaultValue={codigo?.mattTool ?? ""} />
                </label>
                <label>
                  matt_word (etiqueta)
                  <input name="matt_word" defaultValue={codigo?.mattWord ?? ""} placeholder="ex.: tiafifi" />
                </label>
                <SubmitButton className="btn col-2">Salvar e ligar</SubmitButton>
              </form>
            </details>
          </>
        )}
      </section>

      <section className="card">
        <h2>🛒 Conexão com o Mercado Livre (busca de ofertas)</h2>
        {e.ML_MOCK && <div className="aviso">Modo demonstração ligado (ML_MOCK=true): os produtos são de exemplo. Para ofertas reais, coloque ML_MOCK=false no .env.</div>}
        {!mlConfigurado() ? (
          <p className="muted">
            Falta colocar as chaves do seu app no arquivo <code>.env</code>: <code>ML_CLIENT_ID</code>, <code>ML_CLIENT_SECRET</code> e <code>ML_REDIRECT_URI</code>. Depois reinicie o painel
            (Ctrl+C e <code>npm run dev</code>).
          </p>
        ) : status.conectado ? (
          <>
            <p>
              ✅ Conectado{status.nickname ? ` como ${status.nickname}` : ""}. Acesso renovado em {formatDate(status.atualizadoEm)} (renova sozinho a cada 6h).
            </p>
            <form action={desconectarML}>
              <button className="btn btn-perigo" type="submit">
                Desconectar
              </button>
            </form>
          </>
        ) : (
          <>
            <p>❌ Chaves ok, falta autorizar.</p>
            <a className="btn" href="/api/ml/oauth/start">
              Conectar Mercado Livre
            </a>
            <details className="mt">
              <summary>O retorno não voltou para o painel? Cole o endereço aqui</summary>
              <p className="muted small">
                Depois de autorizar, o ML abre o seu Redirect URI com <code>?code=TG-…</code> na barra de endereço (mesmo que a página dê erro). Copie o endereço inteiro e cole abaixo —
                vale poucos minutos.
              </p>
              <form action={colarCodigo} className="linha-form">
                <input name="codigo" required placeholder="https://…/?code=TG-…&state=…" aria-label="Código de autorização" />
                <SubmitButton pendente="Conectando…">Conectar</SubmitButton>
              </form>
            </details>
          </>
        )}
      </section>

      <section className="card">
        <h2>🏪 Marketplaces</h2>
        <ul className="dados">
          {adapters.map((a) => (
            <li key={a.id}>
              {a.habilitado() ? "🟢" : "⚪"} <strong>{a.nome}</strong> — {a.habilitado() ? "ligado" : a.motivoDesabilitado()}
            </li>
          ))}
        </ul>
      </section>

      <form action={sair} className="acoes fim">
        <button className="btn btn-sec" type="submit">
          Sair do painel
        </button>
      </form>
    </>
  );
}
