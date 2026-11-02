import Link from "next/link";

const ITENS: { href: string; rotulo: string; curto?: string; icone: string }[] = [
  { href: "/estudio", rotulo: "Vídeos", icone: "🎬" },
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
        <Link href="/estudio" className="marca">
          <span className="logo" aria-hidden />
          <span>
            Canal <em>Dark</em>
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
            <span>{i.curto ?? i.rotulo}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
