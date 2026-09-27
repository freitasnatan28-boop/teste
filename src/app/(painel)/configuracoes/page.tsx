import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { mlConfigurado, statusConexao } from "@/marketplaces/mercadolivre/oauth";
import { todosAdapters } from "@/marketplaces/registry";
import { sair } from "../../login/actions";
import { colarCodigo, desconectarML } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const e = env();
  const status = await statusConexao();
  const adapters = todosAdapters();

  return (
    <>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card">
        <h1>Mercado Livre</h1>
        {e.ML_MOCK && <div className="flash flash-ok">Modo demonstração ligado (ML_MOCK=true): os produtos são de exemplo.</div>}
        {!mlConfigurado() ? (
          <p className="muted">
            Preencha <code>ML_CLIENT_ID</code>, <code>ML_CLIENT_SECRET</code> e <code>ML_REDIRECT_URI</code> no arquivo <code>.env</code> e reinicie o painel.
            O passo a passo está no README.
          </p>
        ) : status.conectado ? (
          <>
            <p>
              ✅ Conectado{status.nickname ? ` como ${status.nickname}` : ""}. Token renovado em {formatDate(status.atualizadoEm)} (renova sozinho a cada 6h).
            </p>
            <form action={desconectarML}>
              <button className="btn btn-perigo" type="submit">
                Desconectar
              </button>
            </form>
          </>
        ) : (
          <>
            <p>❌ Ainda não conectado.</p>
            <a className="btn" href="/api/ml/oauth/start">
              Conectar Mercado Livre
            </a>
            <details className="mt">
              <summary>O retorno não voltou para o painel? Cole o código aqui</summary>
              <p className="muted small">
                Depois de autorizar, o ML abre o endereço do Redirect URI com <code>?code=TG-…</code> na barra de endereço. Copie o endereço inteiro (ou só o código) e cole abaixo.
                O código vale poucos minutos.
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
        <h2>Marketplaces</h2>
        <ul className="dados">
          {adapters.map((a) => (
            <li key={a.id}>
              {a.habilitado() ? "🟢" : "⚪"} <strong>{a.nome}</strong> — {a.habilitado() ? "ligado" : a.motivoDesabilitado()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Sessão</h2>
        <form action={sair}>
          <button className="btn btn-sec" type="submit">
            Sair do painel
          </button>
        </form>
      </section>
    </>
  );
}
