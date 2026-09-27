import Link from "next/link";
import { Flash } from "@/components/Flash";
import { OfertaCard } from "@/components/OfertaCard";
import { SubmitButton } from "@/components/SubmitButton";
import { lerCodigoAfiliadoML } from "@/lib/configuracoes";
import { prisma } from "@/lib/db";
import { mercadoLivre } from "@/marketplaces/registry";
import { listarOfertas, type FiltrosLista } from "@/services/ofertas";
import { atualizarPrecos, buscarNovas } from "./actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const num = (v?: string) => (v && v.trim() !== "" && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : undefined);

export default async function OfertasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filtros: FiltrosLista = {
    categoria: sp.cat || undefined,
    precoMin: num(sp.pmin),
    precoMax: num(sp.pmax),
    descontoMin: num(sp.dmin),
    tag: sp.tag || undefined,
    freteGratis: sp.frete === "1",
    semSuspeitos: sp.semsusp === "1",
    comLink: sp.comlink === "1",
    ordem: (["score", "desconto", "preco", "recentes"] as const).find((o) => o === sp.ordem) ?? "score",
  };

  const [ofertas, tags, categoriasSalvas, categoriasML, total, comLink, codigo] = await Promise.all([
    listarOfertas(filtros),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.categoryCache.findMany({ distinct: ["rootId"], select: { rootId: true, rootName: true }, orderBy: { rootName: "asc" } }),
    mercadoLivre.habilitado() ? mercadoLivre.listarCategorias() : Promise.resolve([]),
    prisma.product.count({ where: { hidden: false } }),
    prisma.product.count({ where: { hidden: false, affiliateUrl: { not: null } } }),
    lerCodigoAfiliadoML(),
  ]);

  return (
    <>
      <section className="hero">
        <div className="hero-texto">
          <p className="sobretitulo">Painel de ofertas</p>
          <h1>Oi, afilhada! 💅</h1>
          <p>Parece caro, né? A Tia acha o barato pra você divulgar.</p>
          <div className="hero-numeros">
            <span>{total} ofertas</span>
            <span>{comLink} com link</span>
            <span>{codigo?.ativo ? "⚡ link automático ligado" : "link automático desligado"}</span>
          </div>
        </div>
        <div className="hero-foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tia-fifi.webp" alt="Tia Fifi com caixas do Mercado Livre e da Shopee" />
        </div>
      </section>

      <Flash msg={sp.msg} erro={sp.erro} />

      {!codigo?.ativo && (
        <div className="aviso">
          ⚡ <strong>Dica:</strong> ligue o <Link href="/configuracoes">link de afiliado automático</Link> e toda oferta já chega com o seu link.
        </div>
      )}

      <section className="card">
        <h2>🔎 Buscar ofertas no Mercado Livre</h2>
        {!mercadoLivre.habilitado() ? (
          <p className="muted">
            O Mercado Livre ainda não está configurado. Veja <Link href="/configuracoes">Configurações</Link>.
          </p>
        ) : (
          <form action={buscarNovas} className="grid-form">
            <label className="col-2">
              Palavra-chave
              <input name="q" placeholder="ex.: air fryer, pisca pisca, fralda" />
            </label>
            <label>
              Categoria (mais vendidos)
              <select name="categoria" defaultValue="">
                <option value="">— nenhuma —</option>
                {categoriasML.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ID de subcategoria (opcional)
              <input name="subcategoria" placeholder="ex.: MLB432825" />
            </label>
            <p className="muted small col-2">
              Com palavra-chave: busca no catálogo oficial. Só categoria: traz os 20 mais vendidos (algumas categorias grandes exigem uma subcategoria).
            </p>
            <SubmitButton pendente="Buscando no ML… (pode levar ~30s)" className="btn col-2">
              🔎 Buscar e salvar ofertas
            </SubmitButton>
          </form>
        )}
      </section>

      <details className="card filtros" open={Object.keys(sp).some((k) => ["cat", "pmin", "pmax", "dmin", "tag", "frete", "semsusp", "comlink"].includes(k))}>
        <summary>Filtros e ordem</summary>
        <form method="get" className="grid-form">
          <label>
            Categoria
            <select name="cat" defaultValue={filtros.categoria ?? ""}>
              <option value="">Todas</option>
              {categoriasSalvas.map((c) => (
                <option key={c.rootId} value={c.rootId}>
                  {c.rootName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tag
            <select name="tag" defaultValue={filtros.tag ?? ""}>
              <option value="">Todas</option>
              {tags.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preço mín. (R$)
            <input name="pmin" inputMode="decimal" defaultValue={sp.pmin ?? ""} />
          </label>
          <label>
            Preço máx. (R$)
            <input name="pmax" inputMode="decimal" defaultValue={sp.pmax ?? ""} />
          </label>
          <label>
            Desconto real mín. (%)
            <input name="dmin" inputMode="numeric" defaultValue={sp.dmin ?? ""} />
          </label>
          <label>
            Ordenar por
            <select name="ordem" defaultValue={filtros.ordem}>
              <option value="score">Melhor score</option>
              <option value="desconto">Maior desconto</option>
              <option value="preco">Menor preço</option>
              <option value="recentes">Consultadas por último</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="frete" value="1" defaultChecked={filtros.freteGratis} /> Só frete grátis
          </label>
          <label className="check">
            <input type="checkbox" name="semsusp" value="1" defaultChecked={filtros.semSuspeitos} /> Esconder desconto suspeito
          </label>
          <label className="check">
            <input type="checkbox" name="comlink" value="1" defaultChecked={filtros.comLink} /> Só com link de afiliado
          </label>
          <div className="acoes col-2">
            <button className="btn" type="submit">
              Aplicar
            </button>
            <Link className="btn btn-sec" href="/ofertas">
              Limpar
            </Link>
          </div>
        </form>
      </details>

      <div className="lista-topo">
        <h2>
          {ofertas.length} oferta{ofertas.length === 1 ? "" : "s"}
        </h2>
        {mercadoLivre.habilitado() && ofertas.length > 0 && (
          <form action={atualizarPrecos}>
            <SubmitButton className="btn btn-sec" pendente="Atualizando…">
              ↻ Atualizar preços
            </SubmitButton>
          </form>
        )}
      </div>

      {ofertas.length === 0 ? (
        <p className="muted vazio">Nenhuma oferta ainda. Faça uma busca acima ou adicione um produto pelo link.</p>
      ) : (
        <div className="lista">
          {ofertas.map((p) => (
            <OfertaCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
