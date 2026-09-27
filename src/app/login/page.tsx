import { SubmitButton } from "@/components/SubmitButton";
import { entrar } from "./actions";

const ERROS: Record<string, string> = {
  senha: "Senha incorreta.",
  bloqueado: "Muitas tentativas. Espere 15 minutos e tente de novo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <form action={entrar} className="card login-card">
        <h1>Tia Fifi 💅</h1>
        <p className="muted">Painel de ofertas</p>
        {sp.erro && (
          <div className="flash flash-erro" role="alert">
            {ERROS[sp.erro] ?? "Erro ao entrar."}
          </div>
        )}
        <input type="hidden" name="de" value={sp.de ?? "/ofertas"} />
        <label>
          Senha
          <input type="password" name="senha" required autoFocus autoComplete="current-password" />
        </label>
        <SubmitButton pendente="Entrando…">Entrar</SubmitButton>
      </form>
    </main>
  );
}
