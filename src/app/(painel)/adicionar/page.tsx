import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { adicionarPorLink } from "./actions";

export default async function AdicionarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <Flash msg={sp.msg} erro={sp.erro} />
      <section className="card">
        <h1>Adicionar produto pelo link</h1>
        <p className="muted">
          Achou uma oferta navegando no app ou no site do Mercado Livre? Cole aqui o link do produto <strong>ou</strong> o seu link de afiliado
          (https://meli.la/…). O painel busca os dados oficiais do produto e, se for link de afiliado, já deixa salvo.
        </p>
        <form action={adicionarPorLink} className="linha-form">
          <input name="url" required placeholder="https://www.mercadolivre.com.br/... ou https://meli.la/..." aria-label="Link do produto" />
          <SubmitButton pendente="Buscando…">Adicionar</SubmitButton>
        </form>
      </section>
      <section className="card">
        <h2>Dica para o celular 📱</h2>
        <ol className="passos">
          <li>No Portal do Afiliado (no computador), em Configurações, ative a Barra de Afiliados (só uma vez).</li>
          <li>No app do Mercado Livre, abra o produto e toque em Compartilhar: o link gerado já é de afiliado.</li>
          <li>Cole o link aqui. Pronto: produto + link de afiliado salvos juntos.</li>
        </ol>
      </section>
    </>
  );
}
