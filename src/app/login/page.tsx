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
      <div className="login-foto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tia-fifi.webp" alt="Tia Fifi segurando caixas do Mercado Livre e da Shopee" />
      </div>
      <form action={entrar} className="card login-card">
        <p className="sobretitulo">Painel de ofertas</p>
        <h1>Oi, afilhada! 💅</h1>
        <p className="muted">Parece caro, né? Entra aqui que a Tia te mostra onde está o barato.</p>
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
