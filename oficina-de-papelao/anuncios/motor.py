# -*- coding: utf-8 -*-
"""
Motor de vídeo dos anúncios (Pillow + ffmpeg).

Cada cena tem um "palco" (fundo + itens como páginas do PDF e ilustrações) e uma
câmera que passeia por ele (Ken Burns). Por cima, em coordenadas da tela, vêm os
elementos fixos: faixa do produto, selos, legenda palavra por palavra, preço e CTA.
Tudo é desenhado aqui ou vem do PDF do guia: nenhum frame de terceiros.
"""
import os, sys, math, functools
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(AQUI)
sys.path.insert(0, PROJ)

FPS = 30
AMARELO, VERDE, INK, CREME, KRAFT, KRAFT_D = "#FFD43B", "#8CE99A", "#2B2A33", "#FFF8EE", "#C89B6D", "#8A6440"
VERMELHO, VERDE_BTN = "#E03131", "#2F9E44"


@functools.lru_cache(maxsize=64)
def fonte(tam, peso="B"):
    arq = {"B": "Poppins-Bold", "M": "Poppins-Medium", "R": "Poppins-Regular"}[peso]
    return ImageFont.truetype(os.path.join(PROJ, arq + ".ttf"), int(tam))


def ease(x):  # suave na entrada e na saída
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def ease_out_back(x, s=1.7):  # passa um pouco do ponto e volta ("pop")
    x = max(0.0, min(1.0, x)) - 1
    return 1 + x * x * ((s + 1) * x + s)


# ---------------------------------------------------------------- formatos
class Formato:
    """Posições dos elementos fixos. 9:16 respeita a interface do Instagram
    (topo ~250 px livre além da faixa, 350 px livres embaixo)."""
    def __init__(self, nome, W, H):
        self.nome, self.W, self.H = nome, W, H
        if H / W > 1.5:   # 9:16
            self.faixa_y, self.selo_y, self.preco_y = 190, 330, 800
            self.leg_y, self.cta_y, self.leg_tam = 1215, 1440, 86
        else:             # 4:5
            self.faixa_y, self.selo_y, self.preco_y = 70, 175, 560
            self.leg_y, self.cta_y, self.leg_tam = 930, 1145, 76


FORMATOS = {"9x16": Formato("9x16", 1080, 1920), "4x5": Formato("4x5", 1080, 1350)}


# ---------------------------------------------------------------- palco e câmera
class Item:
    """Imagem colocada no palco. caixa = (cx, cy, w, h) normalizados; a imagem cabe dentro, sem distorcer."""
    def __init__(self, img, caixa, giro=0, entra=None, t_entra=0.0, dur_entra=0.35, sombra=True, raio=18):
        self.img, self.caixa, self.giro, self.entra = img, caixa, giro, entra
        self.t_entra, self.dur_entra, self.sombra, self.raio = t_entra, dur_entra, sombra, raio
        self._cache = {}

    def pronto(self, SW, SH):
        chave = (SW, SH)
        if chave not in self._cache:
            cx, cy, w, h = self.caixa
            bw, bh = w * SW, h * SH
            esc = min(bw / self.img.width, bh / self.img.height)
            im = self.img.resize((max(1, int(self.img.width * esc)), max(1, int(self.img.height * esc))), Image.LANCZOS).convert("RGBA")
            if self.raio:
                m = Image.new("L", im.size, 0)
                ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), int(self.raio * SW / 1080), fill=255)
                a = im.getchannel("A"); im.putalpha(Image.composite(a, Image.new("L", im.size, 0), m))
            if self.giro:
                im = im.rotate(self.giro, resample=Image.BICUBIC, expand=True)
            sombra = None
            if self.sombra:
                pad = int(40 * SW / 1080)
                sombra = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
                sombra.paste((0, 0, 0, 110), (pad, pad), im.getchannel("A"))
                sombra = sombra.filter(ImageFilter.GaussianBlur(pad / 2.2))
            self._cache[chave] = (im, sombra)
        return self._cache[chave]

    def ret(self, SW, SH):
        im, _ = self.pronto(SW, SH)
        cx, cy = self.caixa[0] * SW, self.caixa[1] * SH
        return cx - im.width / 2, cy - im.height / 2, im.width, im.height

    def ponto(self, SW, SH, px, py):
        """Ponto (px, py) normalizado dentro da imagem -> coordenada normalizada do palco (sem giro)."""
        x, y, w, h = self.ret(SW, SH)
        return (x + px * w) / SW, (y + py * h) / SH

    def desenhar(self, palco, t):
        SW, SH = palco.size
        im, sombra = self.pronto(SW, SH)
        if t < self.t_entra:
            return
        k = 1.0 if not self.entra else ease((t - self.t_entra) / self.dur_entra)
        x, y, w, h = self.ret(SW, SH)
        dx = dy = 0
        alpha = 1.0
        if self.entra == "direita":
            dx = (1 - k) * SW * 1.1
        elif self.entra == "baixo":
            dy = (1 - k) * SH * 0.9
        elif self.entra == "cima":
            dy = -(1 - k) * SH * 0.9
        elif self.entra == "pop":
            k2 = ease_out_back((t - self.t_entra) / self.dur_entra)
            if k2 <= 0.02:
                return
            im2 = im.resize((max(1, int(im.width * k2)), max(1, int(im.height * k2))), Image.BILINEAR)
            palco.alpha_composite(im2, (int(x + (w - im2.width) / 2), int(y + (h - im2.height) / 2)))
            return
        if sombra is not None:
            pad = (sombra.width - im.width) // 2
            palco.alpha_composite(sombra, (int(x + dx - pad), int(y + dy - pad + 18 * SW / 1080)))
        palco.alpha_composite(im, (int(x + dx), int(y + dy)))

    def animando(self, t):
        return self.entra and self.t_entra <= t < self.t_entra + self.dur_entra + 1 / FPS

    def visivel(self, t):
        return t >= self.t_entra


class Cena:
    """Uma cena: fundo + itens + câmera. camera = [(t, cx, cy, largura_normalizada), ...]."""
    def __init__(self, dur, fundo, itens=(), camera=None, sfx="whoosh"):
        self.dur, self.fundo, self.itens = dur, fundo, list(itens)
        self.camera = camera or [(0, .5, .5, 1.0), (dur, .5, .5, .94)]
        self.sfx = sfx
        self._estatico = None

    def cam(self, t):
        ks = self.camera
        if t <= ks[0][0]:
            return ks[0][1:]
        for a, b in zip(ks, ks[1:]):
            if a[0] <= t <= b[0]:
                k = ease((t - a[0]) / max(1e-6, b[0] - a[0]))
                return tuple(a[i] + (b[i] - a[i]) * k for i in (1, 2, 3))
        return ks[-1][1:]

    def quadro(self, t, fmt, escala):
        SW, SH = int(fmt.W * escala), int(fmt.H * escala)
        if self.fundo.size != (SW, SH):
            self.fundo = self.fundo.resize((SW, SH), Image.LANCZOS)
        animando = any(i.animando(t) for i in self.itens)
        visiveis = tuple(i.visivel(t) for i in self.itens)
        if animando or self._estatico is None or self._estatico[0] != visiveis:
            palco = self.fundo.convert("RGBA").copy()
            for i in self.itens:
                i.desenhar(palco, t)
            if not animando:
                self._estatico = (visiveis, palco)
        else:
            palco = self._estatico[1]
        cx, cy, lw = self.cam(t)
        w = lw * SW
        h = w * fmt.H / fmt.W
        w, h = min(w, SW), min(h, SH)
        x0 = min(max(cx * SW - w / 2, 0), SW - w)   # mantém o recorte dentro do palco
        y0 = min(max(cy * SH - h / 2, 0), SH - h)
        box = (x0, y0, x0 + w, y0 + h)
        return palco.resize((fmt.W, fmt.H), Image.BILINEAR, box=box).convert("RGB")


# ---------------------------------------------------------------- fundos
def fundo_cor(cor, SW=2376, SH=4224, pontos=True, seed=1):
    im = Image.new("RGB", (SW, SH), cor)
    if pontos:
        d = ImageDraw.Draw(im, "RGBA")
        import random
        r = random.Random(seed)
        for _ in range(26):
            x, y, rr = r.randint(0, SW), r.randint(0, SH), r.randint(60, 260)
            d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 255, 255, 38))
    return im


def fundo_raios(cor_a="#FFC933", cor_b="#FFB300", SW=2376, SH=4224, n=30):
    im = Image.new("RGB", (SW, SH), cor_a)
    d = ImageDraw.Draw(im)
    cx, cy, R = SW / 2, SH * 0.45, max(SW, SH) * 1.3
    for k in range(0, n, 2):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=cor_b)
    brilho = Image.new("L", (SW // 4, SH // 4), 0)
    ImageDraw.Draw(brilho).ellipse((SW / 8 - SW / 5, SH * .45 / 4 - SW / 5, SW / 8 + SW / 5, SH * .45 / 4 + SW / 5), fill=160)
    brilho = brilho.filter(ImageFilter.GaussianBlur(SW / 16)).resize((SW, SH), Image.BILINEAR)
    im.paste(Image.new("RGB", (SW, SH), (255, 250, 235)), (0, 0), brilho)
    return im


# ---------------------------------------------------------------- textos fixos (camada da tela)
def texto_contorno(txt, tam, cor="white", contorno=INK, esp=None, peso="B"):
    f = fonte(tam, peso)
    esp = esp if esp is not None else max(3, int(tam * 0.11))
    l, t, r, b = f.getbbox(txt, stroke_width=esp)
    im = Image.new("RGBA", (r - l + 4, b - t + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2 - t), txt, font=f, fill=cor, stroke_width=esp, stroke_fill=contorno)
    return im


@functools.lru_cache(maxsize=8)
def faixa_produto(W, texto):
    f_tam = 46
    while fonte(f_tam).getlength(texto) > W - 150 and f_tam > 24:
        f_tam -= 1
    f = fonte(f_tam)
    tw = f.getlength(texto)
    h = int(f_tam * 1.9)
    im = Image.new("RGBA", (int(tw + 64 + 24), h + 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 10, im.width - 6, h + 10), h // 2, fill=(0, 0, 0, 90))
    d.rounded_rectangle((0, 0, im.width - 12, h), h // 2, fill=VERMELHO)
    d.text(((im.width - 12 - tw) / 2, h / 2), texto, font=f, fill="white", anchor="lm")
    return im


@functools.lru_cache(maxsize=32)
def selo_img(texto, tam=44):
    f = fonte(tam)
    tw = f.getlength(texto)
    h = int(tam * 1.9)
    w = int(tw + h + 50)
    im = Image.new("RGBA", (w + 10, h + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((5, 10, w + 5, h + 10), h // 2, fill=(0, 0, 0, 70))
    d.rounded_rectangle((0, 0, w, h), h // 2, fill="white")
    r = h * 0.34
    cx, cy = h * 0.55, h / 2
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=VERDE_BTN)
    d.line([(cx - r * .45, cy + r * .02), (cx - r * .1, cy + r * .38), (cx + r * .5, cy - r * .35)], fill="white", width=int(tam * .16), joint="curve")
    d.text((h * 0.55 + r + 18, h / 2), texto, font=f, fill=INK, anchor="lm")
    return im


def colar_centro(tela, im, cx, cy, escala=1.0, alpha=1.0):
    if escala != 1.0:
        im = im.resize((max(1, int(im.width * escala)), max(1, int(im.height * escala))), Image.BILINEAR)
    if alpha < 1.0:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda a: int(a * alpha)))
    tela.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


@functools.lru_cache(maxsize=16)
def preco_img(texto, tam):
    base = texto_contorno(texto, tam, "white", INK, esp=int(tam * .07))
    pad = int(tam * .45)
    brilho = Image.new("RGBA", (base.width + 2 * pad, base.height + 2 * pad), (0, 0, 0, 0))
    brilho.paste((255, 212, 59, 255), (pad, pad), base.getchannel("A"))
    brilho = brilho.filter(ImageFilter.GaussianBlur(tam * .16))
    brilho.alpha_composite(brilho)  # reforça o brilho
    brilho.alpha_composite(base, (pad, pad))
    return brilho


@functools.lru_cache(maxsize=8)
def faixa_diagonal(W, texto):
    f = fonte(92)
    tw = f.getlength(texto)
    h = 170
    im = Image.new("RGBA", (int(W * 1.5), h), VERMELHO)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, im.width, 10), fill="#B02525"); d.rectangle((0, h - 10, im.width, h), fill="#B02525")
    d.text((im.width / 2, h / 2), texto, font=f, fill="white", anchor="mm", stroke_width=3, stroke_fill="#8E1B1B")
    return im.rotate(10, resample=Image.BICUBIC, expand=True)


@functools.lru_cache(maxsize=4)
def cta_img(texto="TOQUE EM SAIBA MAIS"):
    f = fonte(50)
    tw = f.getlength(texto)
    h = 110
    w = int(tw + 150)
    im = Image.new("RGBA", (w + 12, h + 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 14, w + 6, h + 14), h // 2, fill="#185C26")
    d.rounded_rectangle((0, 0, w, h), h // 2, fill=VERDE_BTN)
    d.text((58, h / 2), texto, font=f, fill="white", anchor="lm")
    ax, ay = w - 58, h / 2
    d.polygon([(ax - 20, ay - 10), (ax + 20, ay - 10), (ax, ay + 16)], fill="white")
    return im


# ---------------------------------------------------------------- legenda palavra por palavra
def tokens(frase):
    """'Esse *carro* de _corrida_' -> [(palavra, cor)]. *amarelo*, _verde_; ~ junta palavras (R$~9,90)."""
    out = []
    for p in frase.split():
        cor = "white"
        if p.startswith("*") and "*" in p[1:]:
            cor = AMARELO; p = p[1:].replace("*", "", 1)
        elif p.startswith("_") and "_" in p[1:]:
            cor = VERDE; p = p[1:].replace("_", "", 1)
        out.append((p.replace("~", " "), cor))
    return out


def blocos(toks, max_pal=3, max_chars=17):
    """Agrupa em blocos de até 3 palavras, quebrando depois de pontuação."""
    out, atual = [], []
    for w, c in toks:
        atual.append((w, c))
        chars = sum(len(x) for x, _ in atual) + len(atual) - 1
        if len(atual) >= max_pal or chars >= max_chars or w[-1] in ".,:!?…":
            out.append(atual); atual = []
    if atual:
        out.append(atual)
    return out


class Legenda:
    """Linha do tempo da legenda: frases com (início, fim); cada palavra ganha um tempo proporcional ao tamanho."""
    def __init__(self, frases):
        self.eventos = []  # (t0, t1, bloco, [tempos de cada palavra])
        for t0, t1, frase in frases:
            toks = tokens(frase)
            pesos = [len(w) + 3 for w, _ in toks]
            total = sum(pesos)
            tempos, acc = [], t0
            for p in pesos:
                tempos.append(acc); acc += (t1 - t0) * p / total
            i = 0
            for b in blocos(toks):
                ts = tempos[i:i + len(b)]
                fim = tempos[i + len(b)] if i + len(b) < len(tempos) else t1
                self.eventos.append((ts[0], fim, b, ts))
                i += len(b)

    @functools.lru_cache(maxsize=512)
    def _img(self, idx, n, tam, larg):
        _, _, b, _ = self.eventos[idx]
        f = fonte(tam)
        esp = int(tam * 0.13)
        palavras = [(w, c, f.getlength(w)) for w, c in b]
        spc = f.getlength(" ")
        linhas, lin, lw = [], [], 0
        for w, c, wl in palavras:
            if lin and lw + spc + wl > larg:
                linhas.append(lin); lin, lw = [], 0
            lin.append((w, c, wl)); lw += (spc if lin[:-1] else 0) + wl
        linhas.append(lin)
        alt = int(tam * 1.22)
        margem = int(tam * 0.5)
        im = Image.new("RGBA", (larg + 2 * esp + 20 + 2 * margem, alt * len(linhas) + 2 * esp + 10 + 2 * margem), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        k = 0
        for li, lin in enumerate(linhas):
            lw = sum(wl for _, _, wl in lin) + spc * (len(lin) - 1)
            x = (im.width - lw) / 2
            y = margem + esp + 5 + li * alt + alt / 2
            for w, c, wl in lin:
                if k < n:
                    d.text((x, y), w, font=f, fill=c, anchor="lm", stroke_width=esp, stroke_fill="black")
                x += wl + spc; k += 1
        # sombra suave atrás do texto, para ler bem sobre as páginas do guia
        sombra = Image.new("RGBA", im.size, (0, 0, 0, 0))
        sombra.putalpha(im.getchannel("A").point(lambda v: int(v * 0.75)))
        sombra = sombra.filter(ImageFilter.GaussianBlur(tam * 0.18))
        sombra.alpha_composite(im)
        return sombra

    def desenhar(self, tela, t, fmt):
        for idx, (t0, t1, b, ts) in enumerate(self.eventos):
            if t0 <= t < t1 + 0.02:
                n = sum(1 for x in ts if x <= t)
                im = self._img(idx, n, fmt.leg_tam, fmt.W - 110)
                # pequeno "pop" na palavra nova
                dt = t - max(x for x in ts if x <= t)
                esc = 1.0 + 0.06 * max(0.0, 1 - dt / 0.12)
                colar_centro(tela, im, fmt.W / 2, fmt.leg_y, esc)
                return


# ---------------------------------------------------------------- camada da tela
class Sobreposicao:
    """Elementos de tela com janela de tempo: ('selo', t0, t1, texto, linha) · ('preco', t0, t1, texto, rotulo)
    · ('diagonal', t0, t1, texto) · ('cta', t0, t1)."""
    def __init__(self, faixa_texto, elementos, legenda):
        self.faixa_texto, self.el, self.legenda = faixa_texto, elementos, legenda

    def desenhar(self, img, t, fmt):
        tela = img.convert("RGBA")
        W = fmt.W
        for e in self.el:
            tipo, t0, t1 = e[0], e[1], e[2]
            if not (t0 <= t < t1):
                continue
            k = (t - t0)
            if tipo == "selo":
                texto, linha = e[3], e[4]
                im = selo_img(texto, 44 if fmt.H > 1500 else 38)
                a = ease(k / 0.28)
                cx = W / 2 - (1 - a) * 140
                colar_centro(tela, im, cx, fmt.selo_y + linha * (im.height + 14), 0.9 + 0.1 * ease_out_back(k / 0.3), a)
            elif tipo == "preco":
                texto, rotulo = e[3], e[4]
                tam = 230 if fmt.H > 1500 else 190
                im = preco_img(texto, tam)
                esc = ease_out_back(k / 0.4, 2.2)
                esc *= 1 + 0.025 * math.sin(max(0, k - 0.4) * 5)
                if esc > 0.02:
                    colar_centro(tela, im, W / 2, fmt.preco_y, esc)
                if rotulo:
                    r = texto_contorno(rotulo, 64 if fmt.H > 1500 else 54, AMARELO, "black", esp=8)
                    colar_centro(tela, r, W / 2, fmt.preco_y - tam * 0.78, 1.0, ease(k / 0.25))
            elif tipo == "diagonal":
                im = faixa_diagonal(W, e[3])
                dx = (1 - ease(k / 0.3)) * -W * 1.4
                colar_centro(tela, im, W / 2 + dx, fmt.preco_y)
            elif tipo == "cta":
                im = cta_img()
                esc = ease_out_back(k / 0.35) * (1 + 0.035 * math.sin(max(0, k - 0.35) * 6))
                if esc > 0.02:
                    colar_centro(tela, im, W / 2, fmt.cta_y, esc)
        colar_centro(tela, faixa_produto(W, self.faixa_texto), W / 2, fmt.faixa_y)
        self.legenda.desenhar(tela, t, fmt)
        return tela.convert("RGB")
