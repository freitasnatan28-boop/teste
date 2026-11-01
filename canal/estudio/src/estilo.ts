import { continueRender, delayRender, staticFile } from "remotion";

// Fontes ficam em public/fontes (licença OFL) para o render não depender da internet.
function carregarFonte(familia: string, arquivo: string, peso: string) {
  const handle = delayRender(`fonte ${familia}`);
  const fonte = new FontFace(familia, `url(${staticFile(`fontes/${arquivo}`)})`, { weight: peso });
  fonte
    .load()
    .then(() => {
      document.fonts.add(fonte);
      continueRender(handle);
    })
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
  return familia;
}

export const FONTE_TITULO = carregarFonte("Anton", "Anton-Regular.ttf", "400");
export const FONTE_TEXTO = carregarFonte("Oswald", "Oswald.ttf", "200 700");
export const FONTE_LEGENDA = carregarFonte("Inter", "Inter.ttf", "100 900");

export const COR = {
  fundo: "#07111c",
  oceano: "#0a1826",
  terra: "#3b556f",
  borda: "#7f9bb6",
  texto: "#f4f1ea",
  suave: "#9fb0c2",
  amarelo: "#ffd400",
  vermelho: "#e63946",
  verde: "#1fa45b",
  azul: "#2f6fde",
  franca: "#3a6fe0",
  brasil: "#1fa45b",
};

export const CONTORNO_PRETO = "0 0 2px #000, 0 4px 0 #000, 0 6px 24px rgba(0,0,0,.65)";
