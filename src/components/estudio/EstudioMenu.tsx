"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/estudio", rotulo: "💬 Chat" },
  { href: "/estudio/gerar", rotulo: "✨ Gerar" },
  { href: "/estudio/biblioteca", rotulo: "📁 Biblioteca" },
  { href: "/estudio/config", rotulo: "⚙️ Config" },
];

export function EstudioMenu() {
  const atual = usePathname();
  return (
    <nav className="estudio-menu" aria-label="Canal Dark">
      <span className="estudio-marca">
        <span aria-hidden>🌑</span> Canal Dark <em>IG/EUA</em>
      </span>
      <div className="estudio-links">
        {ITENS.map((i) => (
          <Link key={i.href} href={i.href} aria-current={atual === i.href ? "page" : undefined}>
            {i.rotulo}
          </Link>
        ))}
      </div>
    </nav>
  );
}
