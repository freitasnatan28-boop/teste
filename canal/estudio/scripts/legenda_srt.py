"""Gera a legenda .srt (para subir no YouTube) a partir da timeline.json do vídeo.

Junta os blocos curtos da legenda da tela em frases de até 2 linhas (42 letras por linha).
Uso: python3 scripts/legenda_srt.py ../videos/NNN-slug saida.srt
"""
import json
import sys

pasta, saida = sys.argv[1], sys.argv[2]
t = json.load(open(f"{pasta}/timeline.json", encoding="utf-8"))
fps = t["fps"]
grupos, cur = [], None
for bloco in t["legendas"]:
    txt = " ".join(w["t"] for w in bloco["palavras"])
    if cur and len(cur["txt"]) + 1 + len(txt) <= 84 and not cur["txt"].rstrip().endswith((".", "?", "!")) and bloco["inicio"] - cur["fim"] < 15:
        cur["txt"] += " " + txt
        cur["fim"] = bloco["fim"]
    else:
        cur = {"ini": bloco["inicio"], "fim": bloco["fim"], "txt": txt}
        grupos.append(cur)


def ts(f):
    ms = round(f / fps * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def quebra(x):
    if len(x) <= 42:
        return x
    p = x.split(" ")
    melhor = min(range(1, len(p)), key=lambda i: abs(len(" ".join(p[:i])) - len(" ".join(p[i:]))))
    return " ".join(p[:melhor]) + "\n" + " ".join(p[melhor:])


linhas = []
for i, g in enumerate(grupos, 1):
    ini = max(0, g["ini"] + 2)
    fim = max(g["fim"], ini + 20)
    if i < len(grupos):
        fim = min(fim, grupos[i]["ini"] + 2)
    linhas.append(f"{i}\n{ts(ini)} --> {ts(fim)}\n{quebra(g['txt'])}\n")
open(saida, "w", encoding="utf-8").write("\n".join(linhas))
print(f"{len(grupos)} legendas em {saida}")
