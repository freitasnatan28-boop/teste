"use client";

import { useState } from "react";
import { oferta } from "./config";
import { CarroAntes, CarroDepois } from "./Ilustracoes";
import s from "./oferta.module.css";

// Comparador "antes x depois": arrastar o dedo na foto move a linha.
export function AntesDepois() {
  const [pos, setPos] = useState(55);
  const { antes, depois } = oferta.fotos;

  return (
    <div className={s.comparador}>
      <div className={s.camada}>
        {antes ? <img src={antes} alt="Antes da resina" /> : <CarroAntes />}
      </div>
      <div className={s.camada} style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        {depois ? <img src={depois} alt="Depois da resina" /> : <CarroDepois />}
      </div>
      <span className={`${s.etiqueta} ${s.etiquetaAntes}`}>Antes</span>
      <span className={`${s.etiqueta} ${s.etiquetaDepois}`}>Depois</span>
      <div className={s.linha} style={{ left: `${pos}%` }} aria-hidden="true">
        <span className={s.pega}>‹ ›</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className={s.controle}
        aria-label="Arraste para comparar antes e depois"
      />
    </div>
  );
}
