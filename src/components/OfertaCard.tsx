import Link from "next/link";
import type { Product, Tag } from "@prisma/client";
import { discountPct, formatBRL, formatPct } from "@/lib/format";

export function corScore(score: number) {
  return score >= 70 ? "score-alto" : score >= 45 ? "score-medio" : "score-baixo";
}

export function OfertaCard({ p }: { p: Product & { tags: Tag[] } }) {
  const anunciado = discountPct(p.price, p.originalPrice);
  return (
    <Link href={`/ofertas/${p.id}`} className="card oferta">
      <div className="oferta-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <span aria-hidden>📦</span>}
        <span className={`score ${corScore(p.score)}`} title="Score da oferta (0–100)">
          {p.score}
        </span>
      </div>
      <div className="oferta-info">
        <h3 className="oferta-titulo">{p.title}</h3>
        <div className="precos">
          {p.originalPrice && p.originalPrice > p.price && <s className="muted">{formatBRL(p.originalPrice)}</s>}
          <strong className="preco">{formatBRL(p.price)}</strong>
          {anunciado != null && <span className="badge badge-desconto">-{formatPct(anunciado)}</span>}
        </div>
        <div className="badges">
          {p.suspiciousDiscount && <span className="badge badge-alerta">⚠️ desconto suspeito</span>}
          {p.freeShipping && <span className="badge">🚚 frete grátis</span>}
          {p.officialStore && <span className="badge">🏬 loja oficial</span>}
          {p.rating != null && (
            <span className="badge">
              ★ {p.rating.toFixed(1)}
              {p.reviewsCount ? ` (${p.reviewsCount})` : ""}
            </span>
          )}
          {p.soldQuantity != null && p.soldQuantity > 0 && <span className="badge">+{p.soldQuantity} vendidos</span>}
          {p.bestSellerPosition != null && <span className="badge">🏆 {p.bestSellerPosition}º mais vendido</span>}
          {p.affiliateUrl ? <span className="badge badge-ok">🔗 link pronto</span> : <span className="badge badge-pendente">sem link</span>}
          {p.tags.map((t) => (
            <span key={t.id} className="badge badge-tag">
              #{t.slug}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
