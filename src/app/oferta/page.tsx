// Landing page de venda com pagamento na entrega, pensada primeiro para o celular.
// Textos, preços e links ficam em ./config.ts.
import type { Metadata, Viewport } from "next";
import { AntesDepois } from "./AntesDepois";
import { BarraFixa } from "./BarraFixa";
import { aplicacao, avisos, beneficios, oferta, pagamento, perguntas } from "./config";
import { KitIlustracao } from "./Ilustracoes";
import s from "./oferta.module.css";

export const metadata: Metadata = {
  title: `${oferta.produto} – ${oferta.chamada}`,
  description: `${oferta.subtitulo} ${oferta.kit} por ${oferta.precoPor}. Frete grátis e pagamento na entrega.`,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${oferta.produto} – ${oferta.chamada}`,
    description: `${oferta.kit} por ${oferta.precoPor} · Frete grátis · Pague só na entrega`,
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10",
};

const linkWhatsapp = oferta.whatsapp
  ? `https://wa.me/${oferta.whatsapp}?text=${encodeURIComponent(oferta.mensagemWhatsapp)}`
  : "#duvidas";
const linkPedido = oferta.linkPedido || linkWhatsapp;
const externo = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {});

function Preco({ grande = false }: { grande?: boolean }) {
  return (
    <div className={`${s.preco} ${grande ? s.precoGrande : ""}`}>
      <span className={s.precoDe}>
        2 unidades avulsas: <s>{oferta.precoDe}</s>
      </span>
      <span className={s.precoPor}>
        <small>por</small> {oferta.precoPor}
      </span>
      {oferta.parcelas && <span className={s.parcelas}>{oferta.parcelas}</span>}
      <span className={s.selo}>✅ Frete grátis + pague só na entrega</span>
    </div>
  );
}

function Botoes({ id, final = false }: { id?: string; final?: boolean }) {
  return (
    <div className={s.botoes}>
      <a id={id} href={linkPedido} className={s.botaoComprar} {...externo(linkPedido)}>
        🛒 {final ? "Quero o meu agora" : "Quero o meu"}
      </a>
      <a href={linkWhatsapp} className={s.botaoWhats} {...externo(linkWhatsapp)}>
        <IconeWhats /> {final ? "Tirar dúvida no WhatsApp" : "Tenho uma dúvida – falar no WhatsApp"}
      </a>
    </div>
  );
}

function IconeWhats() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

function Passos({ itens }: { itens: { titulo: string; texto: string }[] }) {
  return (
    <ol className={s.passos}>
      {itens.map((p, i) => (
        <li key={p.titulo}>
          <span className={s.numero}>{i + 1}</span>
          <div>
            <strong>{p.titulo}</strong>
            <p>{p.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Oferta() {
  const faixa = [...avisos, ...avisos];

  return (
    <div className={s.pagina}>
      <div className={s.coluna}>
        <div className={s.faixa} aria-label={avisos.join(" · ")}>
          <div className={s.faixaTrilho} aria-hidden="true">
            {[...faixa, ...faixa].map((a, i) => (
              <span key={i}>{a}</span>
            ))}
          </div>
        </div>

        <header className={s.hero}>
          <p className={s.prova}>
            <span className={s.estrelas} aria-hidden="true">★</span> <strong>{oferta.vendidos}</strong>
          </p>
          <h1>
            {oferta.produto} <span>{oferta.chamada}</span>
          </h1>
          <p className={s.subtitulo}>{oferta.subtitulo}</p>
          <div className={s.foto}>
            {oferta.fotos.produto ? <img src={oferta.fotos.produto} alt={oferta.kit} /> : <KitIlustracao />}
            <span className={s.fitaKit}>Kit 2x</span>
          </div>
        </header>

        <section className={s.cartaoOferta} aria-labelledby="titulo-oferta">
          <h2 id="titulo-oferta" className={s.nomeKit}>
            {oferta.kit}
          </h2>
          <Preco />
          <Botoes id="comprar" />
          <ul className={s.confianca}>
            <li>🔒 Compra segura</li>
            <li>🚚 Frete grátis</li>
            <li>💵 Sem pagar antecipado</li>
          </ul>
        </section>

        <section className={s.secao}>
          <p className={s.sobre}>Benefícios</p>
          <h2>Por que todo mundo está usando</h2>
          <p className={s.subsecao}>{oferta.descricao}</p>
          <div className={s.grade}>
            {beneficios.map((b) => (
              <div key={b.titulo} className={s.beneficio}>
                <span className={s.icone} aria-hidden="true">
                  {b.icone}
                </span>
                <strong>{b.titulo}</strong>
                <p>{b.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${s.secao} ${s.escura}`}>
          <p className={s.sobre}>Resultado</p>
          <h2>Veja a diferença</h2>
          <AntesDepois />
          <p className={s.dica}>👆 Arraste a linha para ver a diferença</p>
        </section>

        <section className={s.secao}>
          <p className={s.sobre}>Sem risco</p>
          <h2>Como funciona o pagamento na entrega</h2>
          <Passos itens={pagamento} />
          <div className={s.garantia}>
            <span aria-hidden="true">🤝</span>
            <p>
              <strong>Você não paga nada agora.</strong> Só paga quando o produto estiver na sua mão.
            </p>
          </div>
        </section>

        <section className={`${s.secao} ${s.clara}`}>
          <p className={s.sobre}>Passo a passo</p>
          <h2>Como aplicar</h2>
          <Passos itens={aplicacao} />
        </section>

        <section className={s.secao}>
          <p className={s.sobre}>Clientes</p>
          <h2>Quem usou aprovou</h2>
          <p className={s.subsecao}>Mensagens reais de clientes no WhatsApp.</p>
          <div className={s.provas}>
            {oferta.provas.length > 0
              ? oferta.provas.map((src, i) => (
                  <img key={src} src={src} alt={`Mensagem de cliente ${i + 1}`} loading="lazy" className={s.print} />
                ))
              : [1, 2, 3, 4].map((n) => (
                  <div key={n} className={`${s.print} ${s.printVazio}`}>
                    <span>Print do cliente {n}</span>
                    <small>Adicione em config.ts → provas</small>
                  </div>
                ))}
          </div>
        </section>

        <section id="duvidas" className={`${s.secao} ${s.clara}`}>
          <p className={s.sobre}>FAQ</p>
          <h2>Dúvidas frequentes</h2>
          <div className={s.faq}>
            {perguntas.map((q, i) => (
              <details key={q.p} open={i === 0}>
                <summary>{q.p}</summary>
                <p>{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${s.secao} ${s.final}`}>
          <h2>Deixe seu carro brilhando ainda esta semana</h2>
          <p className={s.nomeKit}>{oferta.kit}</p>
          <Preco grande />
          <Botoes final />
        </section>

        <footer className={s.rodape}>
          <strong>{oferta.produto}</strong> · Pagamento na entrega
          <br />
          {oferta.rodape}
        </footer>
      </div>

      {oferta.whatsapp && (
        <a href={linkWhatsapp} className={s.flutuante} aria-label="Falar no WhatsApp" {...externo(linkWhatsapp)}>
          <IconeWhats />
        </a>
      )}
      <BarraFixa href={linkPedido} preco={oferta.precoPor} alvo="comprar" />
    </div>
  );
}
