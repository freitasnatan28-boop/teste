import Link from "next/link";

const ITENS = [
  { href: "/ofertas", rotulo: "Ofertas", icone: "🏷️" },
  { href: "/adicionar", rotulo: "Adicionar", icone: "➕" },
  { href: "/whatsapp", rotulo: "WhatsApp", icone: "💬" },
  { href: "/piloto", rotulo: "Piloto", icone: "🤖" },
  { href: "/configuracoes", rotulo: "Config.", icone: "⚙️" },
];

export function Nav() {
  return (
    <>
      <header className="topo">
        <Link href="/ofertas" className="marca">
          <span className="avatar" aria-hidden />
          <span>
            Tia Fifi <em>ofertas</em>
          </span>
        </Link>
        <nav className="menu-topo" aria-label="Menu principal">
          {ITENS.map((i) => (
            <Link key={i.href} href={i.href}>
              {i.rotulo}
            </Link>
          ))}
        </nav>
      </header>
      <nav className="abas" aria-label="Menu">
        {ITENS.map((i) => (
          <Link key={i.href} href={i.href} className="aba">
            <span aria-hidden>{i.icone}</span>
            <span>{i.rotulo}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
