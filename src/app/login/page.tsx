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
      <div className="login-marca" aria-hidden>
        <span className="logo logo-grande" />
        <strong>
          Canal <em>Dark</em>
        </strong>
        <span>Vídeos com IA para TikTok Shop</span>
      </div>
      <form action={entrar} className="card login-card">
        <p className="sobretitulo">Canal Dark · TikTok Shop</p>
        <h1>Entrar</h1>
        <p className="muted">Roteiros, imagens do produto, narração e vídeos prontos para postar.</p>
        {sp.erro && (
          <div className="flash flash-erro" role="alert">
            {ERROS[sp.erro] ?? "Erro ao entrar."}
          </div>
        )}
        <input type="hidden" name="de" value={sp.de ?? "/estudio"} />
        <label>
          Senha
          <input type="password" name="senha" required autoFocus autoComplete="current-password" />
        </label>
        <SubmitButton pendente="Entrando…">Entrar</SubmitButton>
      </form>
    </main>
  );
}
