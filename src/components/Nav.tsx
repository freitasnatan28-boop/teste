import Link from "next/link";

const ITENS = [
  { href: "/ofertas", rotulo: "Ofertas", icone: "🏷️" },
  { href: "/adicionar", rotulo: "Adicionar", icone: "➕" },
  { href: "/configuracoes", rotulo: "Config.", icone: "⚙️" },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Menu principal">
      <Link href="/ofertas" className="nav-marca">
        Tia Fifi <span>ofertas</span>
      </Link>
      <div className="nav-itens">
        {ITENS.map((i) => (
          <Link key={i.href} href={i.href} className="nav-item">
            <span aria-hidden>{i.icone}</span>
            <span>{i.rotulo}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
