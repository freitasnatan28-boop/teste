"use client";

import { useEffect, useState } from "react";
import s from "./oferta.module.css";

// Barra de compra presa no rodapé do celular. Só aparece quando o botão principal
// da oferta sai da tela, para não repetir o mesmo botão duas vezes à vista.
export function BarraFixa({ href, preco, alvo }: { href: string; preco: string; alvo: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = document.getElementById(alvo);
    if (!el) return setVisivel(true);
    const obs = new IntersectionObserver(([e]) => setVisivel(!e.isIntersecting && e.boundingClientRect.top < 0));
    obs.observe(el);
    return () => obs.disconnect();
  }, [alvo]);

  return (
    <div className={`${s.barraFixa} ${visivel ? s.barraVisivel : ""}`} aria-hidden={!visivel}>
      <div className={s.barraPreco}>
        <small>Pague na entrega</small>
        <strong>{preco}</strong>
      </div>
      <a href={href} className={s.botaoComprar} tabIndex={visivel ? 0 : -1}>
        Quero o meu
      </a>
    </div>
  );
}
