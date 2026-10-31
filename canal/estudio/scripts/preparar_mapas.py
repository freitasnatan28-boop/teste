"""Recorta o fundo de satélite (NASA Blue Marble, domínio público) que cada cena de mapa precisa.

Lê <video>/timeline.json, calcula a área vista pela câmera em cada cena "mapa" e salva um recorte em
<video>/mapas/<hash>.jpg na resolução certa (mundo inteiro: 60 px/grau; blocos regionais: 240 px/grau).
Grava em cada cena o campo "fundo" com a imagem e os limites (oeste, leste, norte, sul).
Projeção equirretangular: x = lon * px/grau, y = -lat * px/grau.

Uso: python3 scripts/preparar_mapas.py ../videos/NNN-slug
Os arquivos da NASA ficam em cache/nasa (veja scripts/baixar_nasa.sh).
"""

import hashlib
import json
import math
import os
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NASA = os.path.join(RAIZ, "cache", "nasa")
MUNDO = ("world.topo.bathy.200412.3x21600x10800.jpg", -180, 180, 90, -90, 60)
# Blocos 90x90 graus em 240 px/grau: letra = faixa de longitude (A=-180), número = 1 norte / 2 sul.
BLOCOS = {
    f"{letra}{num}": (f"world.topo.bathy.200412.3x21600x21600.{letra}{num}.jpg", -180 + 90 * i, -90 + 90 * i, 90 if num == 1 else 0, 0 if num == 1 else -90, 240)
    for i, letra in enumerate("ABCD")
    for num in (1, 2)
}
MAX_LADO = 5000  # px: acima disso o Chrome fica pesado no render
MARGEM = 0.08


def area_vista(vista, largura, altura, deriva=1.0):
    ppg = largura / 360 * vista["zoom"] * deriva
    cx, cy = vista["centro"]
    return cx - largura / 2 / ppg, cx + largura / 2 / ppg, cy + altura / 2 / ppg, cy - altura / 2 / ppg, ppg


def recortar(fonte, oeste, leste, norte, sul, ppg_saida):
    arquivo, f_oeste, f_leste, f_norte, f_sul, f_ppg = fonte
    caminho = os.path.join(NASA, arquivo)
    if not os.path.exists(caminho):
        return None
    o, l = max(oeste, f_oeste), min(leste, f_leste)
    n, s = min(norte, f_norte), max(sul, f_sul)
    if o >= l or s >= n:
        return None
    img = Image.open(caminho)
    # Decodifica o JPEG já reduzido quando a saída não precisa da resolução toda (bem mais rápido).
    fator = max(1, int(f_ppg / ppg_saida))
    img.draft("RGB", (img.width // fator, img.height // fator))
    escala = img.width / ((f_leste - f_oeste) * f_ppg)
    caixa = tuple(
        round(v * f_ppg * escala)
        for v in ((o - f_oeste), (f_norte - n), (l - f_oeste), (f_norte - s))
    )
    pedaco = img.crop(caixa).resize((max(1, round((l - o) * ppg_saida)), max(1, round((n - s) * ppg_saida))), Image.LANCZOS)
    return pedaco, o, n


def montar_fundo(oeste, leste, norte, sul, ppg):
    usar_blocos = ppg > MUNDO[5]
    ppg_saida = min(ppg, 240 if usar_blocos else 60)
    lado = max(leste - oeste, norte - sul) * ppg_saida
    if lado > MAX_LADO:
        ppg_saida *= MAX_LADO / lado
    canvas = Image.new("RGB", (round((leste - oeste) * ppg_saida), round((norte - sul) * ppg_saida)), (8, 24, 40))
    # O mundo inteiro vai por baixo; os blocos de alta resolução (se baixados) entram por cima.
    fontes = [MUNDO] + (list(BLOCOS.values()) if usar_blocos else [])
    for fonte in fontes:
        r = recortar(fonte, oeste, leste, norte, sul, ppg_saida)
        if r:
            pedaco, o, n = r
            canvas.paste(pedaco, (round((o - oeste) * ppg_saida), round((norte - n) * ppg_saida)))
    return canvas


def main():
    pasta = sys.argv[1]
    caminho = os.path.join(pasta, "timeline.json")
    tl = json.load(open(caminho, encoding="utf-8"))
    largura, altura = tl.get("largura", 1920), tl.get("altura", 1080)
    os.makedirs(os.path.join(pasta, "mapas"), exist_ok=True)
    feitos = {}
    for c in tl["cenas"]:
        cena = c["cena"]
        if cena["tipo"] != "mapa" or cena.get("estilo") == "antigo":
            continue
        vistas = [cena.get("de") or cena["para"], cena["para"]]
        areas = [area_vista(v, largura, altura) for v in vistas]
        oeste = min(a[0] for a in areas)
        leste = max(a[1] for a in areas)
        norte = max(a[2] for a in areas)
        sul = min(a[3] for a in areas)
        mx, my = (leste - oeste) * MARGEM, (norte - sul) * MARGEM
        oeste, leste = max(-180, oeste - mx), min(180, leste + mx)
        norte, sul = min(90, norte + my), max(-90, sul - my)
        ppg = max(a[4] for a in areas) * 1.08
        chave = hashlib.md5(json.dumps([round(oeste, 2), round(leste, 2), round(norte, 2), round(sul, 2), round(ppg, 1)]).encode()).hexdigest()[:12]
        arquivo = os.path.join(pasta, "mapas", f"{chave}.jpg")
        if chave not in feitos and not os.path.exists(arquivo):
            montar_fundo(oeste, leste, norte, sul, ppg).save(arquivo, quality=88)
            print(f"mapa {chave}: {leste - oeste:.1f}x{norte - sul:.1f} graus")
        feitos[chave] = True
        cena["fundo"] = {"img": f"{tl['pasta']}/mapas/{chave}.jpg", "oeste": oeste, "leste": leste, "norte": norte, "sul": sul}
    json.dump(tl, open(caminho, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(feitos)} fundos de satélite")


if __name__ == "__main__":
    main()
