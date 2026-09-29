// Carrega a Poppins (600 a 900) do próprio projeto antes de renderizar qualquer frame.
import {continueRender, delayRender, staticFile} from 'remotion';

const PESOS = [600, 700, 800, 900];
const espera = delayRender('Carregando a fonte Poppins');

Promise.all(
  PESOS.map((peso) =>
    new FontFace('Poppins', `url(${staticFile(`fontes/poppins-${peso}.woff2`)}) format('woff2')`, {
      weight: String(peso),
    })
      .load()
      .then((f) => document.fonts.add(f))
  )
)
  .then(() => continueRender(espera))
  .catch((e) => {
    console.error(e);
    continueRender(espera);
  });
