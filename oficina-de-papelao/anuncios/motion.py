# -*- coding: utf-8 -*-
"""
Anúncio M – versão em MOTION GRAPHICS (sem narração).

  python motion.py            # 9:16 e 4:5
  python motion.py 9x16

Tipografia animada, ícones das categorias pulando, transições de cor e preço com "pop",
tudo no tempo da trilha (112 bpm). Só material do próprio produto: ícones, capa,
páginas do guia e textos verdadeiros (120 projetos, 12 categorias, 3 a 10 anos,
passo a passo com medidas, R$ 9,90, 7 dias de garantia).
"""
import os, sys, math, random, wave, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import motor as M
import audio as AU
import anuncios as A

BPM = 112
BT = 60 / BPM                     # 1 tempo = 0,536 s
CORES, TINTAS, CATS = A.CORES, A.TINTAS, A.CATS
NOMES_CURTOS = ["Veículos", "Céu e Espaço", "Fundo do Mar", "Casas e Cidade", "Castelos", "Fazenda",
                "Bichos da Selva", "Dinossauros", "Robôs", "Casinha", "Jogos", "Música e Arte"]

# cenas em tempos musicais: (nome, número de tempos)
ROTEIRO = [("caixa", 4), ("explode", 2), ("categorias", 6), ("grade", 4), ("guia", 6),
           ("idade", 4), ("preco", 5), ("cta", 6)]


# ---------------------------------------------------------------- utilidades
def ease(x): return M.ease(x)
def pop(x, s=1.9): return M.ease_out_back(x, s)


class Tela:
    """Canvas de um quadro com helpers de posição dentro da área segura do Instagram."""
    def __init__(self, fmt, fundo):
        self.fmt, self.W, self.H = fmt, fmt.W, fmt.H
        self.im = fundo.copy() if isinstance(fundo, Image.Image) else Image.new("RGBA", (fmt.W, fmt.H), fundo)
        if self.H > 1500:
            self.topo, self.base = 250, 1570      # 9:16: livre 250 px em cima e 350 px embaixo
        else:
            self.topo, self.base = 80, 1290       # 4:5
        self.k = (self.base - self.topo) / 1320   # escala dos elementos

    def y(self, f):  # posição vertical proporcional dentro da área segura
        return self.topo + f * (self.base - self.topo)

    def colar(self, img, cx, cy, escala=1.0, giro=0.0, alpha=1.0):
        if escala <= 0.01 or alpha <= 0.01:
            return
        esc = escala * self.k
        im = img
        if abs(esc - 1) > 0.01:
            im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.BILINEAR)
        if abs(giro) > 0.2:
            im = im.rotate(giro, resample=Image.BICUBIC, expand=True)
        if alpha < 0.99:
            im = im.copy(); im.putalpha(im.getchannel("A").point(lambda a: int(a * alpha)))
        self.im.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


@functools.lru_cache(maxsize=128)
def txt(texto, tam, cor="white", contorno=M.INK, esp=None):
    return M.texto_contorno(texto, tam, cor, contorno, esp=esp if esp is not None else max(4, int(tam * .09)))


@functools.lru_cache(maxsize=1)
def icones():
    import imagem_checkout as IC
    return IC.icones(560)


@functools.lru_cache(maxsize=8)
def cartao(pag, altura):
    """Página do PDF como cartão com cantos arredondados e sombra."""
    import build_site as B
    im = A.pagina(pag).resize((int(altura / 1.4142), altura), Image.LANCZOS)
    im = B.arredondar(im, int(altura * .02))
    pad = int(altura * .06)
    out = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    sombra = Image.new("RGBA", out.size, (0, 0, 0, 0))
    sombra.paste((0, 0, 0, 120), (pad, int(pad * 1.3)), im.getchannel("A"))
    out.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(pad / 2.5)))
    out.alpha_composite(im, (pad, pad))
    return out


@functools.lru_cache(maxsize=4)
def fundo_listrado(W, H, cor="#C89B6D", linha=(150, 110, 70, 50)):
    im = Image.new("RGBA", (W, H), cor)
    d = ImageDraw.Draw(im, "RGBA")
    for y in range(0, H, 9):
        d.line((0, y, W, y), fill=linha, width=2)
    return im


@functools.lru_cache(maxsize=4)
def fundo_bolhas(W, H, cor, seed=4):
    return M.fundo_cor(cor, W, H, seed=seed).convert("RGBA")


def raios(W, H, ang, cor_a="#FFC933", cor_b="#FFB300", n=24):
    im = Image.new("RGBA", (W, H), cor_a)
    d = ImageDraw.Draw(im)
    cx, cy, R = W / 2, H * .45, max(W, H) * 1.2
    for k in range(0, n, 2):
        a0 = math.radians(ang) + 2 * math.pi * k / n
        a1 = math.radians(ang) + 2 * math.pi * (k + 1) / n
        d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=cor_b)
    return im


def chip(texto, tam=46, cor_fundo="white", cor_txt=M.INK, check=True):
    return M.selo_img(texto, tam) if check else txt(texto, tam)


# ---------------------------------------------------------------- cenas (t = tempo local em segundos)
def cena_caixa(tl, t, dur):
    """ESSA CAIXA / IA PRO LIXO? — a caixa cai e balança."""
    tl.im = fundo_listrado(tl.W, tl.H).copy()
    cx = tl.W / 2
    caixa = A.ilustra_caixas()
    queda = pop(t / 0.45, 1.4)
    balanco = math.sin(t * 14) * 3 * max(0, 1 - t / 1.2)
    img = caixa.resize((int(caixa.width * .55), int(caixa.height * .55)), Image.LANCZOS)
    tl.colar(img, cx, tl.y(.62) - (1 - queda) * 900, 1.0, balanco)
    s1 = pop((t - 0.05) / 0.3, 2.4)
    tl.colar(txt("ESSA CAIXA", 118), cx, tl.y(.13), max(0, s1))
    if t > 2 * BT:
        k = t - 2 * BT
        treme = math.sin(k * 60) * 6 * max(0, 1 - k / 0.4)
        tl.colar(txt("IA PRO LIXO?", 104, "#FFD43B"), cx + treme, tl.y(.28), pop(k / 0.3, 2.4))


def cena_explode(tl, t, dur):
    """Os brinquedos saem de dentro da caixa."""
    tl.im = fundo_listrado(tl.W, tl.H).copy()
    cx = tl.W / 2
    caixa = A.ilustra_caixas()
    img = caixa.resize((int(caixa.width * .55), int(caixa.height * .55)), Image.LANCZOS)
    tl.colar(img, cx, tl.y(.66), 1.0 - 0.06 * math.sin(min(1, t / .2) * math.pi))
    alvos = [(0, -330, .40), (1, 330, .38), (4, -300, .12), (7, 300, .14)]
    for k, (ic, dx, fy) in enumerate(alvos):
        tk = (t - k * 0.1) / 0.45
        if tk <= 0:
            continue
        e = pop(tk, 1.6)
        x = cx + dx * tl.k * e
        y = tl.y(.62) + (tl.y(fy) - tl.y(.62)) * e
        tl.colar(icones()[ic], x, y, 0.55 * min(1, e), (1 - min(1, tk)) * 90 * (1 if dx > 0 else -1))
    tl.colar(txt("VIRA ISSO!", 112, "#FFD43B"), cx, tl.y(.27), pop((t - .25) / .3, 2.2))


def cena_categorias(tl, t, dur):
    """12 categorias, uma a cada meio tempo, com transição circular de cor."""
    passo = dur / 12
    i = min(11, int(t / passo))
    tk = t - i * passo
    ant = CORES[i - 1] if i > 0 else "#C89B6D"
    tl.im = Image.new("RGBA", (tl.W, tl.H), ant)
    r = ease(tk / (passo * .7)) * math.hypot(tl.W, tl.H)
    d = ImageDraw.Draw(tl.im)
    cy = tl.y(.45)
    d.ellipse((tl.W / 2 - r, cy - r, tl.W / 2 + r, cy + r), fill=CORES[i])
    tl.colar(icones()[i], tl.W / 2, tl.y(.42), 0.95 * pop(tk / (passo * .9), 2.0), (1 - min(1, tk / passo)) * -12)
    tl.colar(txt(NOMES_CURTOS[i].upper(), 84, "white", M.INK), tl.W / 2, tl.y(.78), min(1, pop(tk / (passo * .8), 1.5)))
    tl.colar(txt(f"{i + 1:02d}/12", 50, "#FFD43B"), tl.W / 2, tl.y(.02), 1.0)


def cena_grade(tl, t, dur):
    """Os 12 ícones montam uma grade e o contador sobe até 120."""
    tl.im = fundo_bolhas(tl.W, tl.H, "#FFF3E0").copy()
    n = int(120 * ease(min(1, t / (dur * .75))))
    tl.colar(txt(str(n), 190, "white", M.INK), tl.W / 2, tl.y(.06), 1.0 + 0.08 * (n == 120) * math.sin(min(1, (t - dur * .75) / .2) * math.pi))
    tl.colar(txt("PROJETOS", 80, "#FFD43B", M.INK), tl.W / 2, tl.y(.19), pop(t / .3))
    cols, lado = 3, 220
    for k in range(12):
        tk = (t - 0.08 * k) / 0.35
        if tk <= 0:
            continue
        c, l = k % cols, k // cols
        x = tl.W / 2 + (c - 1) * lado * tl.k * 1.12
        y = tl.y(.32) + l * lado * tl.k * 1.05
        tl.colar(icones()[k], x, y, 0.42 * pop(tk, 2.0))
    tl.colar(txt("EM 12 CATEGORIAS", 60, "white", M.INK), tl.W / 2, tl.y(.98), pop((t - 1.2) / .3))


def cena_guia(tl, t, dur):
    """Guia: capa sobe, páginas abrem em leque, 3 selos entram no ritmo."""
    tl.im = fundo_bolhas(tl.W, tl.H, "#FFE8CC", seed=7).copy()
    alt = int(900 * tl.k)
    e = ease(t / .45)
    leque = ease((t - .3) / .5)
    for pag, lado in ((A.pag_projeto(1), -1), (A.pag_projeto(11), 1)):
        tl.colar(cartao(pag, alt), tl.W / 2 + lado * 210 * tl.k * leque, tl.y(.34) + (1 - e) * 1400, 1 / tl.k, -lado * 11 * leque)
    tl.colar(cartao(1, alt), tl.W / 2, tl.y(.32) + (1 - e) * 1400, 1 / tl.k, -2)
    for k, texto in enumerate(("Passo a passo simples", "Peças com medidas", "Material que tem em casa")):
        tk = t - (1.5 + k) * BT
        if tk > 0:
            tl.colar(chip(texto, 54), tl.W / 2 - (1 - ease(tk / .25)) * 250, tl.y(.75) + k * 128 * tl.k, pop(tk / .3, 1.6))


def cena_idade(tl, t, dur):
    tl.im = fundo_bolhas(tl.W, tl.H, "#1971C2", seed=11).copy()
    tl.colar(txt("PARA CRIANÇAS DE", 62, "white"), tl.W / 2, tl.y(.16), pop(t / .3))
    tl.colar(txt("3 A 10", 260, "#FFD43B", M.INK, esp=16), tl.W / 2, tl.y(.38), pop((t - .2) / .35, 2.4))
    tl.colar(txt("ANOS", 120, "white"), tl.W / 2, tl.y(.57), pop((t - .35) / .3))
    for k, texto in enumerate(("Idade", "Tempo", "Nível")):
        tk = t - (1.8 + k * .5) * BT
        if tk > 0:
            tl.colar(chip(texto, 54), tl.W / 2 + (k - 1) * 320 * tl.k, tl.y(.8), pop(tk / .3, 1.8))
    tl.colar(txt("em cada projeto", 50, "white"), tl.W / 2, tl.y(.91), pop((t - 3 * BT) / .3))


def cena_preco(tl, t, dur):
    tl.im = raios(tl.W, tl.H, t * 25)
    tl.colar(cartao(1, int(560 * tl.k)), tl.W / 2, tl.y(.72), 1 / tl.k * (1 + .02 * math.sin(t * 3)), -3)
    tl.colar(txt("POR APENAS", 84, "white"), tl.W / 2, tl.y(.07), pop(t / .3))
    tk = t - BT
    if tk > 0:
        tl.colar(M.preco_img("R$ 9,90", 215), tl.W / 2, tl.y(.28), pop(tk / .4, 2.6) * (1 + .03 * math.sin(tk * 7)))
        rnd = random.Random(5)  # confete saindo do preço
        d = ImageDraw.Draw(tl.im)
        for _ in range(26):
            a, v = rnd.uniform(0, 2 * math.pi), rnd.uniform(500, 1100)
            x = tl.W / 2 + math.cos(a) * v * min(tk, .8)
            y = tl.y(.28) + math.sin(a) * v * min(tk, .8) + 900 * min(tk, .8) ** 2
            c = rnd.choice(["#E03131", "#1971C2", "#2F9E44", "#FFFFFF", "#9C36B5"])
            if tk < 1.4:
                d.rectangle((x - 9, y - 5, x + 9, y + 5), fill=c)


def cena_cta(tl, t, dur):
    tl.im = fundo_bolhas(tl.W, tl.H, "#FFF3E0", seed=2).copy()
    alt = int(640 * tl.k)
    tl.colar(cartao(137, alt), tl.W / 2 - 230 * tl.k, tl.y(.33), 1 / tl.k, 10)
    tl.colar(cartao(138, alt), tl.W / 2 + 230 * tl.k, tl.y(.33), 1 / tl.k, -10)
    tl.colar(cartao(1, alt + 40), tl.W / 2, tl.y(.31), 1 / tl.k * pop(t / .4, 1.6), -2)
    tl.colar(txt("+ 2 BÔNUS", 64, "#FFD43B"), tl.W / 2, tl.y(.02), pop((t - .3) / .3))
    tl.colar(M.cta_img(), tl.W / 2, tl.y(.78), pop((t - .5) / .35) * (1 + .04 * math.sin(max(0, t - .8) * 7)))
    tl.colar(txt("Acesso imediato no e-mail", 52, M.INK, M.CREME, esp=2), tl.W / 2, tl.y(.9), pop((t - .9) / .3))
    tl.colar(txt("7 dias de garantia", 52, M.INK, M.CREME, esp=2), tl.W / 2, tl.y(.97), pop((t - 1.1) / .3))


CENAS = {"caixa": cena_caixa, "explode": cena_explode, "categorias": cena_categorias, "grade": cena_grade,
         "guia": cena_guia, "idade": cena_idade, "preco": cena_preco, "cta": cena_cta}


# ---------------------------------------------------------------- render
def renderizar(fmt_nome):
    fmt = M.FORMATOS[fmt_nome]
    blocos, t0 = [], 0.0
    for nome, tempos in ROTEIRO:
        blocos.append((nome, t0, tempos * BT)); t0 += tempos * BT
    dur = t0

    eventos = [(b[1] - .1, "whoosh") for b in blocos[1:]]
    eventos += [(0.35, "pop"), (2 * BT, "tic")]
    eventos += [(blocos[1][1] + k * .1 + .1, "pop") for k in range(4)]
    eventos += [(blocos[2][1] + k * blocos[2][2] / 12, "tic") for k in range(12)]
    eventos += [(blocos[3][1] + .08 * k, "tic") for k in range(0, 12, 2)]
    eventos += [(blocos[4][1] + (1.5 + k) * BT, "tic") for k in range(3)]
    eventos += [(blocos[5][1] + .2, "pop"), (blocos[6][1] + BT, "pop"), (blocos[7][1] + .5, "pop")]
    wav = os.path.join(A.TMP, f"M_{fmt_nome}.wav")
    os.makedirs(A.TMP, exist_ok=True)
    som = AU.montar(dur, eventos, A.musica_propria(dur))
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR)
        w.writeframes((np.clip(som, -1, 1) * 32767).astype(np.int16).tobytes())

    os.makedirs(A.SAIDA, exist_ok=True)
    out = os.path.join(A.SAIDA, f"M_{fmt_nome}.mp4")
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{fmt.W}x{fmt.H}", "-r", str(M.FPS), "-i", "-",
           "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-shortest", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    thumb = None
    for i in range(int(round(dur * M.FPS))):
        t = i / M.FPS
        nome, b0, bd = next(b for b in reversed(blocos) if t >= b[1])
        tl = Tela(fmt, "#000000")
        CENAS[nome](tl, t - b0, bd)
        quadro = tl.im.convert("RGB")
        if thumb is None and t >= blocos[6][1] + BT + .6:  # capa: o preço
            thumb = quadro
        proc.stdin.write(quadro.tobytes())
    proc.stdin.close(); proc.wait()
    if thumb is not None:
        thumb.save(os.path.join(A.SAIDA, f"M_{fmt_nome}_thumb.jpg"), quality=90)
    print(f"{out}  ({dur:.1f} s, {os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    for f in [a for a in sys.argv[1:] if a in M.FORMATOS] or list(M.FORMATOS):
        renderizar(f)
