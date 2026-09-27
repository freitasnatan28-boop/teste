# -*- coding: utf-8 -*-
"""
Imagem do produto para o checkout (Kiwify, Hotmart etc.).

  python imagem_checkout.py

Gera em dist/checkout/:
  - produto-1080.png  (1:1, 1080 x 1080, para quem aceita imagem grande)
  - produto-600.png   (1:1, 600 x 600, tamanho padrão das plataformas)
Mesma composição do hero da página: capa na frente e 2 páginas atrás.
"""
import os
from PIL import Image, ImageDraw
import build_site as B

OUT = os.path.join(B.PASTA, "dist", "checkout")


def main():
    P = B.projetos()
    B.gerar_pdf()
    os.makedirs(OUT, exist_ok=True)
    capa = B.render(1, dpi=200)
    pag_a = B.render(B.pagina_do_projeto(P, 1), dpi=150)
    pag_b = B.render(B.pagina_do_projeto(P, 11), dpi=150)

    S = 1080
    im = Image.new("RGBA", (S, S), B.CREAM)
    d = ImageDraw.Draw(im)
    # faixa de papelão embaixo, igual à capa do PDF
    d.rectangle((0, S - 250, S, S), fill=B.KRAFT)
    for y in range(S - 250, S, 7):
        d.line((0, y, S, y), fill=(160, 120, 80, 255), width=1)

    # páginas de projeto inclinadas atrás
    atras_h = 620
    for pag, ang, cx in ((pag_a, 8, 300), (pag_b, -8, 780)):
        p = B.arredondar(pag.resize((round(atras_h / 1.4142), atras_h), Image.LANCZOS), 10)
        p = p.rotate(ang, resample=Image.BICUBIC, expand=True)
        B.com_sombra(im, p, cx - p.width // 2, 175, blur=16, alpha=60)
    # capa na frente
    frente_h = 780
    frente = B.arredondar(capa.resize((round(frente_h / 1.4142), frente_h), Image.LANCZOS), 14)
    B.com_sombra(im, frente, (S - frente.width) // 2, 70, blur=24, dy=18, alpha=95)

    # selo "guia digital em PDF": deixa claro que não é produto físico
    d = ImageDraw.Draw(im)
    txt = "GUIA DIGITAL EM PDF"
    f = B.fonte("B", 34)
    tw = d.textlength(txt, font=f)
    x0, y0 = (S - tw) / 2 - 34, S - 150
    d.rounded_rectangle((x0, y0, x0 + tw + 68, y0 + 74), 37, fill=B.INK)
    d.text(((S - tw) / 2, y0 + 15), txt, font=f, fill="white")

    im = im.convert("RGB")
    im.save(os.path.join(OUT, "produto-1080.png"), optimize=True)
    im.resize((600, 600), Image.LANCZOS).save(os.path.join(OUT, "produto-600.png"), optimize=True)
    print("dist/checkout/produto-1080.png e produto-600.png")


if __name__ == "__main__":
    main()
