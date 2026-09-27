import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { corScore } from "@/components/OfertaCard";
import { Sparkline } from "@/components/Sparkline";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { discountPct, formatBRL, formatDate, formatPct } from "@/lib/format";
import { ML_LINK_BUILDER_URL } from "@/marketplaces/mercadolivre/constants";
import { adapter } from "@/marketplaces/registry";
import { atualizar, ocultar, removerLink, salvarLink, salvarTags } from "./actions";

export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  desconto: "Desconto real (máx. 35)",
  avaliacao: "Avaliação (máx. 20)",
  vendas: "Vendas (máx. 20)",
  frete: "Frete grátis (15)",
  loja: "Loja oficial (10)",
  penalidade: "Penalidade por desconto suspeito",
};

export default async function OfertaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await prisma.product.findUnique({
    where: { id },
    include: { tags: true, priceHistory: { orderBy: { capturedAt: "asc" } } },
  });
  if (!p) notFound();
  const todasTags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  const detalhes = p.scoreDetails ? (JSON.parse(p.scoreDetails) as Record<string, number | boolean>) : {};
  const anunciado = discountPct(p.price, p.originalPrice);
  const instrucoesLink = await adapter(p.marketplace).gerarLinkAfiliado({ idExterno: p.externalId, urlProduto: p.permalink });
  const historicoDesc = [...p.priceHistory].reverse();

  return (
    <>
      <p>
        <Link href="/ofertas">← Voltar</Link>
      </p>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card detalhe">
        <div className="detalhe-topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.imageUrl && <img src={p.imageUrl} alt="" className="detalhe-img" />}
          <div>
            <h1 className="detalhe-titulo">{p.title}</h1>
            <div className="precos grande">
              {p.originalPrice && p.originalPrice > p.price && <s className="muted">{formatBRL(p.originalPrice)}</s>}
              <strong className="preco">{formatBRL(p.price)}</strong>
              {anunciado != null && <span className="badge badge-desconto">-{formatPct(anunciado)}</span>}
            </div>
            <p className="muted small">
              {p.categoryName ?? "Categoria desconhecida"} · {p.marketplace === "mercadolivre" ? "Mercado Livre" : p.marketplace} · consultado em {formatDate(p.lastCheckedAt)}
            </p>
            {p.permalink && (
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="small">
                Ver produto no site ↗
              </a>
            )}
          </div>
        </div>
        {p.suspiciousDiscount && (
          <div className="flash flash-erro">
            ⚠️ <strong>Desconto suspeito.</strong> {p.suspiciousReason}
          </div>
        )}
        <form action={atualizar} className="acoes">
          <input type="hidden" name="id" value={p.id} />
          <SubmitButton className="btn btn-sec" pendente="Consultando…">
            ↻ Consultar preço agora
          </SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2>🔗 Link de afiliado</h2>
        {p.affiliateUrl ? (
          <>
            <p className="link-salvo">
              <a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer">
                {p.affiliateUrl}
              </a>
            </p>
            <p className="small">
              {p.affiliateSource === "auto" ? (
                <span className="badge badge-ok">⚡ automático</span>
              ) : (
                <span className="badge">✋ colado por você</span>
              )}{" "}
              <span className="muted">em {p.affiliateUpdatedAt ? formatDate(p.affiliateUpdatedAt) : "—"}</span>
            </p>
            <div className="acoes">
              <CopyButton texto={p.affiliateUrl} rotulo="Copiar link" />
              {p.affiliateSource !== "auto" && (
                <form action={removerLink}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn btn-perigo" type="submit">
                    Remover
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <p className="muted">
            Ainda sem link de afiliado. Dica: ligue o <Link href="/configuracoes">link automático</Link> e todas as ofertas ganham link sozinhas.
          </p>
        )}
        <details className="mt" open={!p.affiliateUrl}>
          <summary>{p.affiliateUrl ? "Usar outro link (manual)" : "Gerar o link manualmente"}</summary>
          {instrucoesLink.tipo === "manual" && (
            <ol className="passos">
              {instrucoesLink.instrucoes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ol>
          )}
          <div className="acoes">
            {p.permalink && <CopyButton texto={p.permalink} rotulo="Copiar link do produto" />}
            <a className="btn btn-sec" href={ML_LINK_BUILDER_URL} target="_blank" rel="noopener noreferrer">
              Abrir Gerador de Links ↗
            </a>
          </div>
          <form action={salvarLink} className="linha-form">
            <input type="hidden" name="id" value={p.id} />
            <input name="url" type="url" required placeholder="https://meli.la/..." aria-label="Link de afiliado" />
            <SubmitButton pendente="Salvando…">Salvar link</SubmitButton>
          </form>
        </details>
      </section>

      <section className="card">
        <h2>
          Score <span className={`score inline ${corScore(p.score)}`}>{p.score}</span>
        </h2>
        <table className="tabela">
          <tbody>
            {Object.entries(ROTULOS).map(([k, rotulo]) =>
              typeof detalhes[k] === "number" && (k !== "penalidade" || detalhes[k] !== 0) ? (
                <tr key={k}>
                  <td>{rotulo}</td>
                  <td className="num">{String(detalhes[k])}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
        <ul className="dados">
          <li>Desconto anunciado: {formatPct(anunciado)}</li>
          <li>Desconto real considerado: {formatPct(p.realDiscountPct)}</li>
          <li>Avaliação: {p.rating != null ? `★ ${p.rating.toFixed(1)} (${p.reviewsCount ?? 0} avaliações)` : "sem dados"}</li>
          <li>Vendidos: {p.soldQuantity != null ? `+${p.soldQuantity}` : "sem dados"}</li>
          {p.bestSellerPosition != null && <li>Ranking: {p.bestSellerPosition}º mais vendido da categoria</li>}
          <li>Frete grátis: {p.freeShipping ? "sim" : "não"}</li>
          <li>Loja oficial: {p.officialStore ? (p.officialStoreName ?? "sim") : "não"}</li>
        </ul>
        {detalhes.historicoInsuficiente === true && (
          <p className="muted small">Histórico ainda curto (precisa de 3+ consultas em 3+ dias) para julgar se o &quot;preço de&quot; é real.</p>
        )}
      </section>

      <section className="card">
        <h2>📈 Histórico de preços</h2>
        <Sparkline pontos={p.priceHistory} />
        <table className="tabela">
          <thead>
            <tr>
              <th>Quando</th>
              <th className="num">Preço</th>
              <th className="num">Preço de</th>
            </tr>
          </thead>
          <tbody>
            {historicoDesc.slice(0, 30).map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.capturedAt)}</td>
                <td className="num">{formatBRL(h.price)}</td>
                <td className="num">{formatBRL(h.originalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>🏷️ Tags</h2>
        <form action={salvarTags}>
          <input type="hidden" name="id" value={p.id} />
          <div className="tags-check">
            {todasTags.map((t) => (
              <label key={t.id} className="check">
                <input type="checkbox" name="tags" value={t.slug} defaultChecked={p.tags.some((x) => x.id === t.id)} /> {t.name}
              </label>
            ))}
          </div>
          <SubmitButton className="btn btn-sec">Salvar tags</SubmitButton>
        </form>
      </section>

      <form action={ocultar} className="acoes fim">
        <input type="hidden" name="id" value={p.id} />
        <button className="btn btn-perigo" type="submit">
          Remover oferta da lista
        </button>
      </form>
    </>
  );
}
