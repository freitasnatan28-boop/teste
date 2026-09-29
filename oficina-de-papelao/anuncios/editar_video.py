# -*- coding: utf-8 -*-
"""
Edição do vídeo da apresentadora (gerado no Veo) – anúncio P.

  python editar_video.py [meus_assets/videos/video_usuario.mp4]

Mantém a fala original dela e acrescenta: legenda palavra por palavra, gancho "PARA TUDO!",
punch-in nos cortes e zoom lento, selos, estrelinhas no carro, "proibido" no celular, ícones das
categorias pulando, preço com "pop", botão de CTA, aviso de "cena
ilustrativa", cartão final com a imagem do produto, trilha baixa com ducking e efeitos sonoros.
Saída: saida/P_9x16.mp4 (+ thumbnail).
"""
import os, sys, math, wave, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw

import motor as M
import audio as AU
import anuncios as A

AQUI = M.AQUI
ENTRADA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "meus_assets", "videos", "video_usuario.mp4")
W, H, FPS = 1080, 1920, 30
FIM_VIDEO = 18.50          # corta antes do escurecimento do final
DUR_CARTAO = 2.5           # cartão final com o produto
CORTES = [4.47, 7.43, 10.60, 12.93]
T_TABLET = 12.93           # daqui em diante ela segura o tablet: legenda sobe

# Frases com tempo (medido no áudio). *amarelo* _verde_ e ~ junta palavras.
FRASES = [
    (1.15, 2.20, "Antes de jogar essa *caixa* fora,"),
    (2.28, 4.40, "olha o que ela *vira* em _meia~hora!_"),
    (4.50, 6.05, "Criança pedindo o *celular* de novo?"),
    (6.15, 7.40, "*Troca* a tela por _isso._"),
    (7.50, 9.00, "Ele *pinta,* *cola* e *decora.*"),
    (9.05, 10.55, "_30~minutos_ juntos,"),
    (10.65, 12.85, "conversando, rindo… *sem~tela* nenhuma."),
    (12.97, 14.70, "Tudo isso por *R$~9,90,*"),
    (14.80, 15.95, "com acesso _na~hora_"),
    (16.25, 17.35, "e _7~dias_ de garantia."),
    (17.55, 18.45, "Toque em *Saiba~mais!*"),
]
SELOS = [(2.60, 4.47, "Projeto 01 · Carro de Corrida"),
         (6.15, 7.43, "Troca a tela por papelão"),
         (7.60, 10.60, "A criança pinta, o adulto corta"),
         (10.75, 12.93, "120 projetos · 12 categorias")]


def ease(x): return M.ease(x)
def pop(x, s=1.9): return M.ease_out_back(x, s)


@functools.lru_cache(maxsize=64)
def txt(texto, tam, cor="white", contorno=M.INK, esp=None):
    return M.texto_contorno(texto, tam, cor, contorno, esp=esp if esp is not None else max(4, int(tam * .09)))


@functools.lru_cache(maxsize=1)
def icones():
    import imagem_checkout as IC
    return IC.icones(300)


@functools.lru_cache(maxsize=1)
def produto():
    im = Image.open(os.path.join(M.PROJ, "dist", "checkout", "produto-sol-1080.png")).convert("RGBA")
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 40, fill=255)
    im.putalpha(m)
    return im


def colar(tela, img, cx, cy, esc=1.0, giro=0.0, alpha=1.0):
    if esc <= 0.01 or alpha <= 0.01:
        return
    im = img
    if abs(esc - 1) > 0.01:
        im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.BILINEAR)
    if abs(giro) > 0.2:
        im = im.rotate(giro, resample=Image.BICUBIC, expand=True)
    if alpha < 0.99:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda a: int(a * alpha)))
    tela.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def estrela(d, cx, cy, r, cor, giro=0):
    pts = []
    for k in range(10):
        a = math.radians(giro) - math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * .42
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=cor)


def zoom(img, esc):
    """Punch-in / zoom lento: recorta o centro e amplia."""
    if esc <= 1.001:
        return img
    w, h = W / esc, H / esc
    return img.resize((W, H), Image.BILINEAR, box=((W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2))


def escala_camera(t):
    ini = max([0.0] + [c for c in CORTES if c <= t])
    k = t - ini
    punch = 0.07 * max(0.0, 1 - k / 0.28) ** 2 if ini > 0 else 0.0
    return 1.0 + 0.02 * min(1.0, k / 3.0) + punch


# ---------------------------------------------------------------- camada por cima do vídeo
LEG = M.Legenda(FRASES)


def legenda(tela, t):
    if t >= 17.45:  # o botão de CTA já diz "Toque em Saiba mais"
        return
    y = 1470
    for idx, (t0, t1, b, ts) in enumerate(LEG.eventos):
        if t0 <= t < t1 + 0.02:
            n = sum(1 for x in ts if x <= t)
            im = LEG._img(idx, n, 84, W - 110)
            dt = t - max(x for x in ts if x <= t)
            colar(tela, im, W / 2, y, 1.0 + 0.06 * max(0.0, 1 - dt / 0.12))
            return


def sobrepor(frame, t):
    tela = frame.convert("RGBA")
    d = ImageDraw.Draw(tela)
    # gancho
    if t < 1.2:
        treme = math.sin(t * 55) * 7 * max(0, 1 - t / 0.5)
        colar(tela, txt("PARA TUDO!", 128, "#FFD43B", M.INK, esp=11), W / 2 + treme, 830, pop(t / 0.3, 2.4), -3)
    # estrelinhas em volta do carro
    if 2.45 <= t < 4.47:
        k = t - 2.45
        for i, (dx, dy, r) in enumerate([(-300, -160, 34), (290, -190, 28), (330, 60, 40), (-320, 90, 30), (0, -250, 26), (180, 170, 22)]):
            e = pop((k - i * 0.07) / 0.3, 2.0)
            if e > 0.02:
                estrela(d, 640 + dx, 1060 + dy, r * e * (1 + .15 * math.sin(k * 9 + i)), "#FFD43B", k * 90 + i * 30)
    # "proibido" sobre o celular
    if 5.0 <= t < 6.15:
        e = pop((t - 5.0) / 0.3, 2.0)
        r = 150 * e
        cx, cy = 275, 950
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline="#E03131", width=int(26 * e) + 1)
        a = math.radians(45)
        d.line((cx - r * math.cos(a), cy - r * math.sin(a), cx + r * math.cos(a), cy + r * math.sin(a)), fill="#E03131", width=int(26 * e) + 1)
    # ícones das categorias pulando no close
    if 10.75 <= t < 12.93:
        for i, ic in enumerate([0, 1, 4, 7, 8]):
            e = pop((t - 10.8 - i * 0.12) / 0.35, 2.0)
            if e > 0.02:
                colar(tela, icones()[ic], 170 + i * 185, 1280 + 10 * math.sin(t * 6 + i), 0.52 * e)
    # selos
    for t0, t1, texto in SELOS:
        if t0 <= t < t1:
            k = t - t0
            a = ease(k / 0.25)
            colar(tela, M.selo_img(texto, 44), W / 2 - (1 - a) * 160, 330, 0.9 + 0.1 * pop(k / 0.3), a)
    # preço e CTA (cena do tablet): preço entre o queixo e o tablet
    if 13.55 <= t < FIM_VIDEO:
        k = t - 13.55
        colar(tela, M.preco_img("R$ 9,90", 125), W / 2, 832, pop(k / 0.4, 2.6) * (1 + .025 * math.sin(max(0, k - .4) * 6)))
    if 17.45 <= t < FIM_VIDEO:
        k = t - 17.45
        colar(tela, M.cta_img(), W / 2, 1505, pop(k / .35) * (1 + .04 * math.sin(max(0, k - .35) * 7)))
    legenda(tela, t)
    colar(tela, txt("cena ilustrativa", 28, "white", "#000000", esp=3), W - 170, 268, 1.0, 0, 0.85)
    colar(tela, M.faixa_produto(W, A.FAIXA), W / 2, 190)
    return tela.convert("RGB")


def cartao_final(t):
    """Cartão final: imagem do produto (a mesma do checkout), preço e CTA."""
    tela = M.fundo_cor("#FFF3E0", W, H, seed=2).convert("RGBA")
    colar(tela, produto(), W / 2, 700, 0.8 * pop(t / .45, 1.7), -2 + 2 * ease(t / .6))
    colar(tela, M.preco_img("R$ 9,90", 150), W / 2, 1250, pop((t - .25) / .4, 2.4))
    colar(tela, txt("Acesso imediato · 7 dias de garantia", 42, M.INK, M.CREME, esp=2), W / 2, 1395, pop((t - .45) / .3))
    colar(tela, M.cta_img(), W / 2, 1505, pop((t - .6) / .35) * (1 + .04 * math.sin(max(0, t - .95) * 7)))
    colar(tela, M.faixa_produto(W, A.FAIXA), W / 2, 190)
    return tela.convert("RGB")


# ---------------------------------------------------------------- áudio
def voz_original():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ENTRADA, "-t", str(FIM_VIDEO), "-ac", "1", "-ar", str(AU.SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    fade = int(0.08 * AU.SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / (np.abs(x).max() + 1e-9) * 0.95


def main():
    dur = FIM_VIDEO + DUR_CARTAO
    eventos = [(c - 0.1, "whoosh") for c in CORTES] + [(FIM_VIDEO - 0.1, "whoosh")]
    eventos += [(0.08, "pop"), (2.5, "tic"), (5.0, "pop"), (13.55, "pop"), (17.45, "pop"),
                (FIM_VIDEO + 0.25, "pop")]
    eventos += [(s[0], "tic") for s in SELOS]
    voz = np.concatenate([voz_original(), np.zeros(int(DUR_CARTAO * AU.SR) + AU.SR)])[:int(dur * AU.SR)]
    som = AU.montar(dur, eventos, A.musica_propria(dur), voz)
    os.makedirs(A.TMP, exist_ok=True)
    wav = os.path.join(A.TMP, "P_9x16.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR)
        w.writeframes((np.clip(som, -1, 1) * 32767).astype(np.int16).tobytes())

    out = os.path.join(A.SAIDA, "P_9x16.mp4")
    os.makedirs(A.SAIDA, exist_ok=True)
    leitor = subprocess.Popen(["ffmpeg", "-v", "error", "-i", ENTRADA, "-t", str(FIM_VIDEO), "-vf", f"scale={W}:{H},fps={FPS}",
                               "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    escritor = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                                 "-i", "-", "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                                 "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                                 "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    n, thumb = 0, None
    tam = W * H * 3
    while True:
        buf = leitor.stdout.read(tam)
        if len(buf) < tam:
            break
        t = n / FPS
        quadro = Image.frombytes("RGB", (W, H), buf)
        quadro = sobrepor(zoom(quadro, escala_camera(t)), t)
        if thumb is None and t >= 2.9:
            thumb = quadro
        escritor.stdin.write(quadro.tobytes()); n += 1
    for i in range(int(DUR_CARTAO * FPS)):
        escritor.stdin.write(cartao_final(i / FPS).tobytes())
    escritor.stdin.close(); escritor.wait(); leitor.wait()
    thumb.save(os.path.join(A.SAIDA, "P_9x16_thumb.jpg"), quality=90)
    print(f"{out}  ({n / FPS + DUR_CARTAO:.1f} s, {os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
