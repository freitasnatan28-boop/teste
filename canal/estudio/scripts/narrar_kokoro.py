"""Narração GRÁTIS com o Kokoro (modelo de voz aberto, roda no próprio servidor, sem créditos da ElevenLabs).

Gera, igual ao narrar.ts: <video>/narracao/bNN.mp3 + bNN.json com o tempo de cada palavra.
Não regera o que já existe.

Instalação (uma vez): python3.12 -m venv <venv> && <venv>/bin/pip install "kokoro>=0.9.4" soundfile
Uso: <venv>/bin/python scripts/narrar_kokoro.py ../roteiros/NNN-slug.md ../videos/NNN-slug [voz]
Voz padrão: am_michael (narrador americano). Outras: am_fenrir, bm_george.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

roteiro, pasta = sys.argv[1], sys.argv[2]
voz = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
TAXA = 24000
PAUSA = 0.12  # s entre frases


def ler_roteiro(caminho):
    """Mesma regra do roteiro.ts: cada **[VISUAL]** abre um beat; '### N. Título' define o capítulo."""
    corpo = re.split(r"^## Roteiro\s*$", open(caminho, encoding="utf-8").read(), flags=re.M)[1]
    beats, capitulo, atual = [], "", None
    for linha in corpo.split("\n"):
        l = linha.strip()
        if not l or l.startswith(">"):
            continue
        if l.startswith("### "):
            capitulo = re.sub(r"^\d+\.\s*", "", re.sub(r"\s*\(.*\)\s*$", "", l[4:]))
            continue
        if l.startswith("**[VISUAL]**"):
            atual = {"id": f"b{len(beats) + 1:02d}", "capitulo": capitulo, "visual": l.replace("**[VISUAL]**", "").strip(), "texto": ""}
            beats.append(atual)
            continue
        if atual:
            atual["texto"] = (atual["texto"] + " " + l.replace("*", "")).strip()
    return [b for b in beats if b["texto"]]


pipe = KPipeline(lang_code="a")
dir_ = os.path.join(pasta, "narracao")
os.makedirs(dir_, exist_ok=True)
for beat in ler_roteiro(roteiro):
    mp3 = os.path.join(dir_, f"{beat['id']}.mp3")
    if os.path.exists(mp3):
        continue
    partes, palavras, t0 = [], [], 0.0
    for r in pipe(beat["texto"], voice=voz, speed=1.0):
        audio = r.audio.numpy()
        for tok in r.tokens or []:
            if tok.start_ts is None:
                continue
            # Pontuação gruda na palavra anterior ("2025," igual à ElevenLabs).
            if palavras and re.fullmatch(r"[^\w$]+", tok.text):
                palavras[-1]["texto"] += tok.text
                continue
            palavras.append({"texto": tok.text, "inicio": round(t0 + tok.start_ts, 3), "fim": round(t0 + tok.end_ts, 3)})
        partes += [audio, np.zeros(int(PAUSA * TAXA), dtype=audio.dtype)]
        t0 += len(audio) / TAXA + PAUSA
    wav = mp3[:-4] + ".wav"
    sf.write(wav, np.concatenate(partes), TAXA)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ar", "44100", "-b:a", "192k", mp3], check=True)
    os.remove(wav)
    json.dump({**beat, "palavras": palavras}, open(os.path.join(dir_, f"{beat['id']}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{beat['id']} ok ({len(beat['texto'])} caracteres, {t0:.1f} s)")
