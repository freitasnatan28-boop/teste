// Textos fixos da tela por idioma (o canal em PT é "Por Trás do Mapa"; o em inglês, "Behind the Map").
import { createContext, useContext } from "react";

export type Idioma = "pt" | "en";

const TEXTOS = {
  pt: { marca: "POR TRÁS DO MAPA", inscreva: "INSCREVA-SE", ia: "ILUSTRAÇÃO (IA)", contato: "CONTATO" },
  en: { marca: "BEHIND THE MAP", inscreva: "SUBSCRIBE", ia: "AI ILLUSTRATION", contato: "CONTACT" },
};

export const IdiomaContexto = createContext<Idioma>("pt");
export const useTextos = () => TEXTOS[useContext(IdiomaContexto)];
