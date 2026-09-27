# -*- coding: utf-8 -*-
"""
Imagem do produto para o checkout (Kiwify, Hotmart etc.).

  python imagem_checkout.py

Gera em dist/checkout/ duas versões chamativas, cada uma em 1080 e 600 px (1:1):
  - produto-sol-*.png   fundo amarelo com raios de sol
  - produto-azul-*.png  fundo azul com confete
Só usa informações verdadeiras do produto (120 projetos, 2 bônus, 3 a 10 anos).
"""
import os, math, random, tempfile, subprocess
from PIL import Image, ImageDraw, ImageFilter
import build_site as B

OUT = os.path.join(B.PASTA, "dist", "checkout")
S = 1080


# ---------------------------------------------------------------- peças
def icones(tam=150):
    """Os 12 ícones de categoria do PDF (desenhados pelo build.py) em círculos brancos, com fundo transparente."""
    from reportlab.pdfgen import canvas
    import build as PDF
    with tempfile.TemporaryDirectory() as tmp:
        arq = os.path.join(tmp, "icones.pdf")
        c = canvas.Canvas(arq, pagesize=(1200, 100))
        c.setFillColorRGB(1, 0, 1); c.rect(0, 0, 1200, 100, fill=1, stroke=0)
        for i in range(12):
            c.setFillColorRGB(1, 1, 1); c.circle(50 + i * 100, 50, 48, fill=1, stroke=0)
            PDF.icon(c, i, 50 + i * 100, 50, 66, PDF.col(i))
        c.save()
        escala = 4  # renderiza grande e reduz, para bordas suaves
        dpi = tam * escala / 100 * 72
        subprocess.run(["pdftoppm", "-r", f"{dpi:.2f}", "-png", "-singlefile", arq, os.path.join(tmp, "i")], check=True)
        folha = Image.open(os.path.join(tmp, "i.png")).convert("RGBA")
    lado = folha.height
    mascara = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(mascara).ellipse((lado * .02, lado * .02, lado * .98, lado * .98), fill=255)
    saida = []
    for i in range(12):
        ic = folha.crop((i * lado, 0, (i + 1) * lado, lado))
        ic.putalpha(mascara)
        saida.append(ic.resize((tam, tam), Image.LANCZOS))
    return saida


def raios(cor_a, cor_b, centro, n=28):
    im = Image.new("RGBA", (S, S), cor_a)
    d = ImageDraw.Draw(im)
    cx, cy = centro
    R = S * 1.5
    for k in range(0, n, 2):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=cor_b)
    # brilho claro no centro
    brilho = Image.new("L", (S, S), 0)
    ImageDraw.Draw(brilho).ellipse((cx - 420, cy - 420, cx + 420, cy + 420), fill=150)
    brilho = brilho.filter(ImageFilter.GaussianBlur(140))
    im.paste(Image.new("RGBA", (S, S), (255, 250, 235, 255)), (0, 0), brilho)
    return im


def confete(fundo, cores, seed=7):
    im = Image.new("RGBA", (S, S), fundo)
    d = ImageDraw.Draw(im)
    rnd = random.Random(seed)
    for _ in range(90):
        x, y, r = rnd.randint(0, S), rnd.randint(0, S), rnd.randint(5, 14)
        cor = rnd.choice(cores)
        if rnd.random() < .5:
            d.ellipse((x - r, y - r, x + r, y + r), fill=cor)
        else:
            a = rnd.random() * math.pi
            dx, dy = math.cos(a) * r * 1.6, math.sin(a) * r * 1.6
            d.line((x - dx, y - dy, x + dx, y + dy), fill=cor, width=max(5, r // 2))
    # brilho no centro para destacar o guia
    brilho = Image.new("L", (S, S), 0)
    ImageDraw.Draw(brilho).ellipse((140, 260, 940, 1000), fill=120)
    brilho = brilho.filter(ImageFilter.GaussianBlur(120))
    im.paste(Image.new("RGBA", (S, S), (255, 255, 255, 255)), (0, 0), brilho)
    return im


def estrela(d, cx, cy, r_ext, r_int, pontas, cor):
    pts = []
    for k in range(pontas * 2):
        a = -math.pi / 2 + k * math.pi / pontas
        r = r_ext if k % 2 == 0 else r_int
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=cor)


def texto_centro(d, cx, y, txt, fonte, **kw):
    w = d.textlength(txt, font=fonte)
    d.text((cx - w / 2, y), txt, font=fonte, **kw)
    return w


def mockup(im, capa, pag_a, pag_b, topo, frente_h=560, atras_h=470, giro=-4):
    """Capa inclinada na frente e 2 páginas de projeto abertas em leque atrás."""
    for pag, ang, cx in ((pag_a, 11, 330), (pag_b, -11, 750)):
        p = B.arredondar(pag.resize((round(atras_h / 1.4142), atras_h), Image.LANCZOS), 10)
        p = p.rotate(ang, resample=Image.BICUBIC, expand=True)
        B.com_sombra(im, p, cx - p.width // 2, topo + 55, blur=18, dy=16, alpha=90)
    f = B.arredondar(capa.resize((round(frente_h / 1.4142), frente_h), Image.LANCZOS), 14)
    f = f.rotate(giro, resample=Image.BICUBIC, expand=True)
    B.com_sombra(im, f, (S - f.width) // 2, topo, blur=26, dy=22, alpha=120)


def colar_icones(im, ics, posicoes, seed=3):
    rnd = random.Random(seed)
    for (i, x, y, tam) in posicoes:
        ic = ics[i].resize((tam, tam), Image.LANCZOS).rotate(rnd.uniform(-14, 14), resample=Image.BICUBIC, expand=True)
        B.com_sombra(im, ic, x - ic.width // 2, y - ic.height // 2, blur=10, dy=8, alpha=80)


def titulo(im, cor_120, cor_contorno, cor_faixa, cor_texto_faixa):
    d = ImageDraw.Draw(im)
    texto_centro(d, S / 2, 22, "120 BRINQUEDOS", B.fonte("B", 112), fill=cor_120,
                 stroke_width=10, stroke_fill=cor_contorno)
    f = B.fonte("B", 46)
    sub = "com caixas, rolos e tampinhas"
    w = d.textlength(sub, font=f)
    d.rounded_rectangle((S / 2 - w / 2 - 30, 172, S / 2 + w / 2 + 30, 244), 36, fill=cor_faixa)
    texto_centro(d, S / 2, 180, sub, f, fill=cor_texto_faixa)


def selo_bonus(im, cx, cy, cor):
    d = ImageDraw.Draw(im)
    estrela(d, cx + 4, cy + 8, 118, 96, 18, (0, 0, 0, 60))  # sombra
    estrela(d, cx, cy, 118, 96, 18, cor)
    texto_centro(d, cx, cy - 62, "+2", B.fonte("B", 72), fill="white")
    texto_centro(d, cx, cy + 16, "BÔNUS", B.fonte("B", 34), fill="white")


def faixa(im, texto, cor, cor_texto):
    d = ImageDraw.Draw(im)
    f = B.fonte("B", 44)
    w = d.textlength(texto, font=f)
    x0, y0 = (S - w) / 2 - 44, 950
    d.rounded_rectangle((x0 + 6, y0 + 10, x0 + w + 88 + 6, y0 + 96 + 10), 48, fill=(0, 0, 0, 70))
    d.rounded_rectangle((x0, y0, x0 + w + 88, y0 + 96), 48, fill=cor)
    d.text(((S - w) / 2, y0 + 20), texto, font=f, fill=cor_texto)


# ---------------------------------------------------------------- versões
def versao_sol(capa, pag_a, pag_b, ics):
    im = raios("#FFC933", "#FFB300", (540, 600))
    mockup(im, capa, pag_a, pag_b, topo=285)
    colar_icones(im, ics, [(0, 118, 420, 150), (7, 96, 690, 140), (1, 118, 870, 120),
                           (10, 965, 690, 140), (5, 962, 870, 120)])
    selo_bonus(im, 900, 395, "#E03131")
    titulo(im, "white", B.INK, B.INK, "white")
    faixa(im, "PASSO A PASSO · 3 A 10 ANOS", "#E03131", "white")
    return im


def versao_azul(capa, pag_a, pag_b, ics):
    im = confete("#1864AB", ["#FAB005", "#FF6B6B", "#63E6BE", "#FFFFFF", "#74C0FC"])
    mockup(im, capa, pag_a, pag_b, topo=285)
    colar_icones(im, ics, [(6, 118, 420, 150), (2, 96, 690, 140), (9, 118, 870, 120),
                           (4, 965, 690, 140), (11, 962, 870, 120)], seed=5)
    selo_bonus(im, 900, 395, "#E03131")
    titulo(im, "#FAB005", B.INK, "white", B.INK)
    faixa(im, "PASSO A PASSO · 3 A 10 ANOS", "#FAB005", B.INK)
    return im


def main():
    P = B.projetos()
    B.gerar_pdf()
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):  # limpa versões antigas geradas por este script
        if f.startswith("produto-") and f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    capa = B.render(1, dpi=200)
    pag_a = B.render(B.pagina_do_projeto(P, 1), dpi=150)
    pag_b = B.render(B.pagina_do_projeto(P, 11), dpi=150)
    ics = icones(300)
    for nome, fn in (("sol", versao_sol), ("azul", versao_azul)):
        im = fn(capa, pag_a, pag_b, ics).convert("RGB")
        im.save(os.path.join(OUT, f"produto-{nome}-1080.png"), optimize=True)
        im.resize((600, 600), Image.LANCZOS).save(os.path.join(OUT, f"produto-{nome}-600.png"), optimize=True)
        print(f"dist/checkout/produto-{nome}-1080.png e -600.png")


if __name__ == "__main__":
    main()
