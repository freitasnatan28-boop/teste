# -*- coding: utf-8 -*-
"""
Os 3 anúncios da Oficina de Papelão (roteiros em roteiros.md).

  python anuncios.py            # renderiza A, B e C em 9:16 e 4:5
  python anuncios.py C 9x16     # só um anúncio / formato

Versão SEM LOCUÇÃO (o gerador de voz está bloqueado na rede deste ambiente):
o texto do roteiro aparece como legenda palavra por palavra, com trilha e
efeitos gerados por código. Visual: páginas do PDF, capa e ilustrações próprias.
Quando houver fotos das peças prontas em meus_assets/imagens/NNN.(png|jpg),
as cenas de "peça pronta" passam a usar a foto automaticamente.
"""
import os, sys, glob, subprocess, tempfile, functools, wave
import numpy as np
from PIL import Image, ImageDraw

import motor as M
import audio as AU

sys.path.insert(0, M.PROJ)
import build_site as B

SAIDA = os.path.join(M.AQUI, "saida")
TMP = os.path.join(M.AQUI, "tmp")
ESCALA = 2.2  # palco 2,2x maior que a tela, para os zooms ficarem nítidos
FAIXA = "120 PROJETOS DE PAPELÃO PARA CRIANÇAS"
CATS = B.CATS
TINTAS = ["#FFE3E3", "#E3E9FF", "#DDF6F9", "#FFF0D6", "#F6E5FB", "#EAF6D8", "#FFE8D9", "#DDF3E2", "#E9ECEF", "#FFE3EE", "#DCEEFF", "#FFF1CC"]
CORES = ["#E03131", "#3B5BDB", "#0C8599", "#E67700", "#9C36B5", "#5C940D", "#D9480F", "#2B8A3E", "#495057", "#D6336C", "#1971C2", "#F08C00"]
P = B.projetos()
CAT_DO = {p["n"]: p["c"] for p in P}


# ---------------------------------------------------------------- material
@functools.lru_cache(maxsize=64)
def pagina(n, dpi=270):
    """Página n do PDF em alta resolução (cache em tmp/)."""
    os.makedirs(TMP, exist_ok=True)
    arq = os.path.join(TMP, f"pag{n:03d}_{dpi}.png")
    if not os.path.exists(arq):
        subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(n), "-l", str(n), "-png", "-singlefile",
                        B.PDF, arq[:-4]], check=True)
    return Image.open(arq).convert("RGB")


def pag_projeto(n):
    return B.pagina_do_projeto(P, n)


def pag_categoria(ci):
    return 5 + ci * 11


def foto(n):
    for pasta in (os.path.join(M.AQUI, "meus_assets", "imagens"), os.path.join(M.PROJ, "imagens_otimizadas"), os.path.join(M.PROJ, "imagens")):
        for ext in ("png", "jpg", "jpeg", "webp"):
            f = os.path.join(pasta, f"{n:03d}.{ext}")
            if os.path.exists(f):
                return Image.open(f).convert("RGB")
    return None


@functools.lru_cache(maxsize=1)
def ilustra_caixas():
    """Pilha de caixas, rolos e tampinhas (desenho próprio, estilo dos ícones do guia)."""
    W, H = 1600, 1300
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = 10
    def caixa(x, y, w, h, cor="#C89B6D"):
        d.rectangle((x, y, x + w, y + h), fill=cor, outline=M.KRAFT_D, width=lw)
        d.polygon([(x, y), (x + w * .5, y - h * .28), (x + w * .5 + 8, y)], fill="#D8B48A", outline=M.KRAFT_D, width=lw)
        d.polygon([(x + w, y), (x + w * .55, y - h * .22), (x + w * .5, y)], fill="#B9895A", outline=M.KRAFT_D, width=lw)
        d.rectangle((x + w * .42, y, x + w * .58, y + h), fill="#E9D3B6")
    caixa(160, 700, 640, 480)
    caixa(820, 780, 560, 400, "#BF8F60")
    caixa(420, 330, 520, 380, "#CFA276")
    for x, y in ((1150, 520), (1310, 560)):          # rolos de papel em pé
        d.rectangle((x, y, x + 120, y + 260), fill="#E9D3B6", outline=M.KRAFT_D, width=lw)
        d.ellipse((x, y - 30, x + 120, y + 30), fill="#FFF8EE", outline=M.KRAFT_D, width=lw)
        d.ellipse((x + 35, y - 12, x + 85, y + 12), fill="#8A6440")
    for x, y, c in ((230, 1190, "#E03131"), (360, 1215, "#1971C2"), (1250, 1195, "#FAB005"), (1390, 1220, "#2F9E44")):
        d.ellipse((x - 55, y - 28, x + 55, y + 28), fill=c, outline="#2B2A33", width=6)   # tampinhas
    return im


@functools.lru_cache(maxsize=1)
def ilustra_celular():
    W, H = 760, 1400
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W, H), 110, fill="#2B2A33")
    d.rounded_rectangle((40, 60, W - 40, H - 60), 80, fill="#F1F3F5")
    d.rounded_rectangle((W / 2 - 90, 90, W / 2 + 90, 128), 19, fill="#2B2A33")
    f = M.fonte(64)
    d.rounded_rectangle((90, 440, W - 90, 720), 60, fill="#1971C2")
    d.polygon([(150, 700), (120, 790), (240, 710)], fill="#1971C2")
    d.text((W / 2, 530), "Me empresta", font=f, fill="white", anchor="mm")
    d.text((W / 2, 625), "o celular?", font=f, fill="white", anchor="mm")
    return im


# ---------------------------------------------------------------- construtores de cena
class Palco:
    def __init__(self, fmt):
        self.fmt = fmt
        self.SW, self.SH = int(fmt.W * ESCALA), int(fmt.H * ESCALA)

    def cor(self, cor, seed=1):
        return M.fundo_cor(cor, self.SW, self.SH, seed=seed)

    def raios(self):
        return M.fundo_raios(SW=self.SW, SH=self.SH)

    def cartao(self, img, cx=.5, cy=.5, w=.94, h=.9, **kw):
        return M.Item(img, (cx, cy, w, h), **kw)

    def vista(self, item, t, px, py, wf):
        """Câmera centrada no ponto (px, py) da página, mostrando wf da largura da página."""
        x, y, w, h = item.ret(self.SW, self.SH)
        lw = min(1.0, wf * w / self.SW)
        cx, cy = item.ponto(self.SW, self.SH, px, py)
        cx = min(max(cx, lw / 2), 1 - lw / 2)
        cy = min(max(cy, lw / 2), 1 - lw / 2)
        return (t, cx, cy, lw)


def cena_peca(pal, n, dur, direcao=1):
    """'Peça pronta': usa a foto se existir; senão, a página do projeto com zoom no título e na figura."""
    f = foto(n)
    if f is not None:
        esc = max(pal.SW / f.width, pal.SH / f.height)
        fundo = f.resize((int(f.width * esc) + 1, int(f.height * esc) + 1), Image.LANCZOS)
        fundo = fundo.crop(((fundo.width - pal.SW) // 2, (fundo.height - pal.SH) // 2,
                            (fundo.width - pal.SW) // 2 + pal.SW, (fundo.height - pal.SH) // 2 + pal.SH))
        cam = [(0, .5, .5, 1.0), (dur, .5 + .03 * direcao, .47, .86)] if direcao > 0 else [(0, .5, .47, .86), (dur, .5, .5, 1.0)]
        return M.Cena(dur, fundo, [], cam)
    ci = CAT_DO[n]
    it = pal.cartao(pagina(pag_projeto(n)))
    a, b = (pal.vista(it, 0, .5, .26, .96), pal.vista(it, dur, .5, .22, .80))
    cam = [a, b] if direcao > 0 else [(0,) + b[1:], (dur,) + a[1:]]
    return M.Cena(dur, pal.cor(TINTAS[ci], seed=n), [it], cam)


def cena_folheando(pal, dur, n_pag, t_troca=1.0, vista_final=(.5, .62, .78)):
    """Capa do guia; a página do projeto desliza por cima; a câmera aproxima do passo a passo."""
    capa = pal.cartao(pagina(1), giro=2)
    pg = pal.cartao(pagina(n_pag), entra="direita", t_entra=t_troca, dur_entra=0.4, giro=-1)
    cam = [pal.vista(capa, 0, .5, .45, 1.08), pal.vista(capa, t_troca, .5, .45, 1.02),
           pal.vista(pg, t_troca + .45, .5, .45, 1.02), pal.vista(pg, dur, *vista_final)]
    return M.Cena(dur, pal.cor("#FFE8CC", seed=3), [capa, pg], cam)


def cena_pagina(pal, pg, dur, vistas, cor="#FFE8CC", entra=None):
    it = pal.cartao(pagina(pg), entra=entra, dur_entra=.35)
    return M.Cena(dur, pal.cor(cor, seed=pg), [it], [pal.vista(it, t, px, py, wf) for t, px, py, wf in vistas])


def cenas_categorias(pal, cats, duracoes):
    """Capas de categoria em sequência rápida, com a câmera só no ícone (o nome fica por conta da legenda)."""
    out = []
    for k, (ci, dur_cada) in enumerate(zip(cats, duracoes)):
        it = pal.cartao(pagina(pag_categoria(ci)), raio=0, sombra=False, w=1.0, h=1.0)
        cam = [pal.vista(it, 0, .5, .275, .60), pal.vista(it, dur_cada, .5, .275, .52)]
        out.append(M.Cena(dur_cada, Image.new("RGB", (pal.SW, pal.SH), CORES[ci]), [it], cam, sfx="whoosh" if k == 0 else None))
    return out


def cena_hero(pal, dur, com_bonus=False):
    """Capa na frente e 2 páginas atrás, em leque, sobre raios de sol (mesma cara da página de vendas)."""
    itens = [pal.cartao(pagina(pag_projeto(1)), cx=.27, cy=.55, w=.52, h=.5, giro=9),
             pal.cartao(pagina(pag_projeto(11)), cx=.73, cy=.55, w=.52, h=.5, giro=-9),
             pal.cartao(pagina(1), cx=.5, cy=.52, w=.62, h=.56, giro=-2, entra="pop", dur_entra=.45)]
    if com_bonus:
        itens = [pal.cartao(pagina(137), cx=.27, cy=.55, w=.5, h=.48, giro=10, entra="pop", dur_entra=.35),
                 pal.cartao(pagina(138), cx=.73, cy=.55, w=.5, h=.48, giro=-10, entra="pop", t_entra=.15, dur_entra=.35),
                 pal.cartao(pagina(1), cx=.5, cy=.52, w=.58, h=.52, giro=-2, entra="pop", t_entra=.3, dur_entra=.45)]
    return M.Cena(dur, pal.raios(), itens, [(0, .5, .5, 1.0), (dur, .5, .5, .93)])


def cena_ilustracao(pal, img, dur, cor=M.CREME, entra="pop", escala=.86):
    it = M.Item(img, (.5, .5, escala, escala * .9), entra=entra, dur_entra=.45, sombra=True, raio=0)
    return M.Cena(dur, pal.cor(cor, seed=9), [it], [(0, .5, .5, 1.0), (dur, .5, .5, .9)])


# ---------------------------------------------------------------- roteiros
def anuncio_A(pal):
    cenas = [
        cena_peca(pal, 1, 3.0, +1),
        cena_peca(pal, 11, 1.7, -1),
        cena_peca(pal, 91, 1.7, +1),
        cena_ilustracao(pal, ilustra_caixas(), 2.4),
        cena_folheando(pal, 3.8, pag_projeto(1), t_troca=0.9),
        # cada categoria entra junto com a palavra da legenda; "são 12 categorias" mostra a capa com os 12 ícones
        *cenas_categorias(pal, [0, 4, 7, 8, 9], [0.32, 0.40, 0.50, 0.29, 0.39]),
        cena_pagina(pal, 1, 0.9, [(0, .5, .6, 1.0), (0.9, .5, .66, .9)]),
        cena_pagina(pal, 2, 1.6, [(0, .5, .36, .80), (1.6, .5, .34, .68)]),
        cena_hero(pal, 6.5),
    ]
    legenda = [
        (0.15, 2.9, "Esse *carro* de corrida era uma *caixa~de~sapato.*"),
        (3.0, 4.65, "Esse *foguete,* um rolo de papel."),
        (4.7, 6.35, "E o *fogãozinho,* uma caixa."),
        (6.45, 8.75, "A gente quase joga isso *fora* toda semana."),
        (8.85, 12.6, "Esse guia ensina *120~brinquedos* assim, com _passo~a~passo_ e _medidas._"),
        (12.6, 15.4, "*Carro,* *castelo,* *dinossauro,* *robô,* *casinha:* são 12 categorias."),
        (15.45, 16.95, "Tudo com _material~de~casa._"),
        (17.05, 19.5, "E custa só *R$~9,90.*"),
        (19.7, 23.3, "_Toca_ em *Saiba~mais* e recebe agora no e-mail."),
    ]
    el = [("selo", 9.3, 12.6, "Passo a passo com medidas", 0),
          ("selo", 12.6, 15.4, "12 categorias", 0),
          ("selo", 15.45, 17.0, "Materiais que você tem em casa", 0),
          ("preco", 17.05, 23.5, "R$ 9,90", "SÓ"),
          ("cta", 19.7, 23.5)]
    return cenas, legenda, el


def anuncio_B(pal):
    cenas = [
        cena_ilustracao(pal, ilustra_celular(), 1.2, cor="#DCEEFF", escala=.62),
        cena_ilustracao(pal, ilustra_caixas(), 1.0, cor=M.CREME, entra="cima"),
        cena_peca(pal, 102, 5.0, +1),
        cena_peca(pal, 101, 2.2, -1),
        cena_peca(pal, 81, 1.8, +1),
        cena_pagina(pal, pag_projeto(102), 4.2, [(0, .5, .5, 1.02), (1.6, .5, .40, .70), (4.2, .38, .40, .58)], cor=TINTAS[10], entra="direita"),
        cena_hero(pal, 5.1),
    ]
    legenda = [
        (0.1, 1.15, "Me empresta o _celular?_"),
        (1.25, 2.15, "Hoje *não.*"),
        (2.3, 7.1, "Ideia pra hoje à tarde, *sem~tela:* uma *pista~de~carrinhos* com rolo de papel toalha."),
        (7.25, 9.35, "Um *labirinto* de bolinha na tampa da caixa."),
        (9.45, 11.1, "Um *robô* de caixas."),
        (11.25, 15.35, "Tá tudo nesse guia: *120~projetos,* com _idade_ e _tempo_ de cada um."),
        (15.5, 17.4, "Por apenas *R$~9,90.*"),
        (17.6, 20.2, "_Toca_ em *Saiba~mais.*"),
    ]
    el = [("selo", 12.4, 15.4, "Idade e tempo de cada projeto", 0),
          ("preco", 15.5, 20.5, "R$ 9,90", "POR APENAS"),
          ("cta", 17.6, 20.5)]
    return cenas, legenda, el


def anuncio_C(pal):
    cenas = [
        # carro, foguete, castelo e dinossauro no ritmo da legenda; as outras 8 passam rápido em "tudo de papelão"
        *cenas_categorias(pal, [0, 1, 4, 7, 2, 3, 5, 6, 8, 9, 10, 11], [0.48, 0.46, 0.46, 0.60] + [0.125] * 8),
        cena_peca(pal, 41, 3.4, +1),
        cena_folheando(pal, 4.8, pag_projeto(41), t_troca=1.3, vista_final=(.5, .55, .9)),
        cena_pagina(pal, pag_projeto(41), 5.6, [(0, .28, .56, .62), (2.6, .28, .57, .56), (5.6, .72, .58, .56)], cor=TINTAS[4]),
        cena_hero(pal, 4.0),
        cena_hero(pal, 2.7, com_bonus=True),
    ]
    legenda = [
        (0.1, 2.95, "*Carro,* *foguete,* *castelo,* *dinossauro…* tudo de _papelão._"),
        (3.05, 6.35, "Olha que *ideia* pra tirar as crianças um pouco das _telas._"),
        (6.45, 11.15, "É um guia com *120~projetos:* carrinhos, bichos, casinha, jogos e instrumentos."),
        (11.25, 16.75, "E não precisa ter _jeito_ pra artesanato: tem a *lista~de~materiais* e as *medidas* de cada peça."),
        (16.9, 20.7, "Por apenas *R$~9,90,* com acesso na hora e _7~dias_ de garantia."),
        (20.85, 23.3, "_Toca_ em *Saiba~mais.*"),
    ]
    el = [("selo", 12.0, 16.8, "Passo a passo com medidas", 0),
          ("selo", 13.2, 16.8, "Materiais que você tem em casa", 1),
          ("diagonal", 16.9, 20.8, "POR APENAS R$ 9,90"),
          ("cta", 20.85, 23.5)]
    return cenas, legenda, el


ANUNCIOS = {"A": anuncio_A, "B": anuncio_B, "C": anuncio_C}


# ---------------------------------------------------------------- render
def musica_propria(dur):
    arqs = sorted(glob.glob(os.path.join(M.AQUI, "meus_assets", "musica", "*")))
    if not arqs:
        return None
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", arqs[0], "-t", str(dur), "-ac", "1", "-ar", str(AU.SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x / (np.abs(x).max() + 1e-9) * 0.5


def renderizar(nome, fmt_nome):
    fmt = M.FORMATOS[fmt_nome]
    pal = Palco(fmt)
    cenas, frases, el = ANUNCIOS[nome](pal)
    dur = sum(c.dur for c in cenas)
    leg = M.Legenda(frases)
    sob = M.Sobreposicao(FAIXA, el, leg)

    # áudio: trilha + efeitos nos cortes, selos e preço
    eventos, t = [], 0.0
    for c in cenas:
        if t > 0 and c.sfx:
            eventos.append((t - 0.12, c.sfx))
        t += c.dur
    for e in el:
        eventos.append((e[1], {"selo": "tic", "preco": "pop", "cta": "tic", "diagonal": "whoosh"}[e[0]]))
    wav = os.path.join(TMP, f"{nome}_{fmt_nome}.wav")
    som = AU.montar(dur, eventos, musica_propria(dur))
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR)
        w.writeframes((np.clip(som, -1, 1) * 32767).astype(np.int16).tobytes())

    os.makedirs(SAIDA, exist_ok=True)
    out = os.path.join(SAIDA, f"{nome}_{fmt_nome}.mp4")
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{fmt.W}x{fmt.H}", "-r", str(M.FPS), "-i", "-",
           "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
           "-shortest", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n_frames = int(round(dur * M.FPS))
    idx, t0 = 0, 0.0
    thumb = None
    for i in range(n_frames):
        t = i / M.FPS
        while idx < len(cenas) - 1 and t >= t0 + cenas[idx].dur:
            t0 += cenas[idx].dur; idx += 1
        quadro = cenas[idx].quadro(t - t0, fmt, ESCALA)
        quadro = sob.desenhar(quadro, t, fmt)
        if abs(t - 1.5) < 1 / (2 * M.FPS):
            thumb = quadro
        proc.stdin.write(quadro.tobytes())
    proc.stdin.close(); proc.wait()
    if proc.returncode:
        raise SystemExit(f"ffmpeg falhou em {out}")
    if thumb is not None:
        thumb.save(os.path.join(SAIDA, f"{nome}_{fmt_nome}_thumb.jpg"), quality=90)
    print(f"{out}  ({dur:.1f} s, {os.path.getsize(out) / 1e6:.1f} MB)")
    return out


def main():
    B.gerar_pdf()
    nomes = [a for a in sys.argv[1:] if a in ANUNCIOS] or list(ANUNCIOS)
    fmts = [a for a in sys.argv[1:] if a in M.FORMATOS] or list(M.FORMATOS)
    for n in nomes:
        for f in fmts:
            renderizar(n, f)


if __name__ == "__main__":
    main()
