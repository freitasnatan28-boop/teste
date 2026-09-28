# -*- coding: utf-8 -*-
"""
Controle de qualidade dos anúncios.

  python qa_anuncios.py

1. Contact sheet com 1 frame por segundo de cada vídeo (saida/qa/).
2. ffprobe: duração, resolução, fps, codecs, tamanho e loudness; Whisper no áudio final.
3. Direitos: hash perceptual (pHash) de todos os frames finais (2 por segundo)
   contra todos os frames das referências (2 por segundo). Distância de Hamming
   <= 10 indicaria frame reaproveitado.
Gera saida/qa/relatorio-qa.md.
"""
import os, glob, json, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
import imagehash

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "saida")
QA = os.path.join(SAIDA, "qa")
REFS = sorted(glob.glob(os.path.join(AQUI, "referencias", "ref*.mp4")))
LIMIAR = 10


def frames(video, fps):
    tmp = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={fps}", os.path.join(tmp, "f%04d.png")], check=True)
    return [Image.open(f).convert("RGB") for f in sorted(glob.glob(os.path.join(tmp, "*.png")))]


def probe(video):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                   "format=duration,size:stream=codec_name,width,height,r_frame_rate,codec_type",
                                   "-of", "json", video], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    return dict(dur=float(j["format"]["duration"]), mb=int(j["format"]["size"]) / 1e6, w=v["width"], h=v["height"],
                fps=v["r_frame_rate"], vcodec=v["codec_name"], acodec=a["codec_name"] if a else "—")


def loudness(video):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", video, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    linhas = [l for l in r.splitlines() if l.strip().startswith("I:")]
    return linhas[-1].split("I:")[1].strip() if linhas else "?"


def conferir_fala(video):
    """Transcreve o áudio final com Whisper e compara com o texto falado do roteiro (0 a 1)."""
    import re, difflib, unicodedata, numpy as np
    import narracao as N, anuncios as A
    nome = os.path.basename(video)[0]
    if nome not in A.FALA:  # anúncio sem narração (ex.: M, motion graphics)
        return "(sem narração)", 1.0
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    texto = N.transcrever(np.frombuffer(raw, np.float32), 16000)
    norm = lambda s: re.sub(r"[^a-z0-9 ]", " ", unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()).split()
    return texto, difflib.SequenceMatcher(None, norm(" ".join(A.FALA[nome])), norm(texto)).ratio()


def contact_sheet(video, destino):
    fs = frames(video, 1)
    w = 270
    h = int(fs[0].height * w / fs[0].width)
    cols = 8
    rows = (len(fs) + cols - 1) // cols
    f = ImageFont.truetype(os.path.join(os.path.dirname(AQUI), "Poppins-Bold.ttf"), 18)
    s = Image.new("RGB", (cols * (w + 6), rows * (h + 30)), "#222")
    d = ImageDraw.Draw(s)
    for k, im in enumerate(fs):
        x, y = (k % cols) * (w + 6), (k // cols) * (h + 30)
        s.paste(im.resize((w, h), Image.LANCZOS), (x, y + 26))
        d.text((x + 4, y + 3), f"{k:02d} s", font=f, fill="#FFD43B")
    s.save(destino)


def main():
    os.makedirs(QA, exist_ok=True)
    videos = sorted(glob.glob(os.path.join(SAIDA, "*.mp4")))
    print("Calculando hashes das referências…")
    ref_hashes = []
    for r in REFS:
        for k, im in enumerate(frames(r, 2)):
            ref_hashes.append((os.path.basename(r), k / 2, imagehash.phash(im)))
    L = ["# Controle de qualidade dos anúncios", "",
         "| Vídeo | Duração | Resolução | FPS | Vídeo/Áudio | Tamanho | Loudness | Menor distância pHash vs. referências |",
         "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    alertas, falas = [], []
    for v in videos:
        nome = os.path.basename(v)
        p = probe(v)
        contact_sheet(v, os.path.join(QA, nome.replace(".mp4", "_sheet.png")))
        menor = (99, None)
        for k, im in enumerate(frames(v, 2)):
            h = imagehash.phash(im)
            for rn, rt, rh in ref_hashes:
                dist = h - rh
                if dist < menor[0]:
                    menor = (dist, f"{k / 2:.1f}s × {rn} {rt:.1f}s")
        if menor[0] <= LIMIAR:
            alertas.append(f"{nome}: {menor}")
        texto, sim = conferir_fala(v)
        falas.append(f"- **{nome}** ({sim:.0%} igual ao roteiro): {texto}")
        L.append(f"| {nome} | {p['dur']:.2f} s | {p['w']}x{p['h']} | {p['fps']} | {p['vcodec']}/{p['acodec']} | {p['mb']:.1f} MB | {loudness(v)} | "
                 f"{menor[0]} ({menor[1]}) {'⚠️' if menor[0] <= LIMIAR else '✅'} |")
        print(L[-1])
    L += ["", "## Transcrição do áudio final (Whisper base, sherpa-onnx)", ""] + falas
    L += ["", f"Referências: {len(ref_hashes)} frames (2 por segundo). Limiar de alerta: distância ≤ {LIMIAR} (de 64 bits).",
          "Resultado da verificação de direitos: " + ("**nenhum frame parecido com as referências.** ✅" if not alertas else "⚠️ " + "; ".join(alertas))]
    with open(os.path.join(QA, "relatorio-qa.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
