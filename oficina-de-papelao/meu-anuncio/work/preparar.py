# -*- coding: utf-8 -*-
"""
Prepara a edição a partir de work/config.json e work/transcricao.json:

1. correção de cor do bruto (contraste/saturação) -> remotion/public/bruto.mp4
2. linha do tempo da saída (trechos, inserção, cartão) em frames -> remotion/src/timeline.json
   - legenda em blocos de 2 a 4 palavras, no máx. 18 caracteres por linha e 2 linhas, retimada
   - elementos e emojis convertidos do tempo do bruto para o tempo da saída
3. áudio: voz do bruto nos novos tempos + trilha própria com ducking + efeitos -> work/audio_mix.wav
4. copia imagens e fontes para remotion/public/

Uso: python work/preparar.py   (a partir da pasta meu-anuncio/)
"""
import os, re, sys, json, shutil, wave, subprocess
import numpy as np

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # meu-anuncio/
WORK = os.path.join(BASE, "work")
REM = os.path.join(WORK, "remotion")
PUB = os.path.join(REM, "public")
sys.path.insert(0, os.path.join(BASE, "..", "anuncios"))
import audio as AU  # trilha e efeitos gerados por código (sem direitos de terceiros)

cfg = json.load(open(os.path.join(WORK, "config.json"), encoding="utf-8"))
trans = json.load(open(os.path.join(WORK, "transcricao.json"), encoding="utf-8"))
FPS = cfg["fps"]
f = lambda s: int(round(s * FPS))


def norm(w):
    return re.sub(r"[.,!?…:;]+$", "", w.lower())


# ---------------------------------------------------------------- 1. linha do tempo
segs, t = [], 0.0
for tr in cfg["trechos"]:
    if tr.get("tipo") in ("insercao", "cartao"):
        d = tr["duracao"]
        segs.append({"id": tr["id"], "tipo": tr["tipo"], "inicio": f(t), "dur": f(d)})
    else:
        d = tr["ate"] - tr["de"]
        segs.append({"id": tr["id"], "tipo": "bruto", "de": tr["de"], "ate": tr["ate"], "entrada": tr["entrada"],
                     "audio_ate": tr.get("audio_ate", tr["ate"]), "inicio": f(t), "dur": f(d), "t_saida": t})
    t += d
TOTAL = t


def bruto_para_saida(tb):
    """Tempo do bruto -> tempo da saída (None se o trecho não entrou na edição).
    Inclui a sobra de áudio ('audio_ate'), que toca por cima do bloco seguinte."""
    for s in segs:
        if s["tipo"] == "bruto" and s["de"] <= tb < s["audio_ate"] + 1e-6:
            return s["t_saida"] + (tb - s["de"])
    return None


# ---------------------------------------------------------------- 2. legenda
L = cfg["legenda"]
chave = {norm(k): v for k, v in L["palavras_chave"].items()}
por_trecho = {k: {norm(a): b for a, b in v.items()} for k, v in L.get("palavras_chave_por_trecho", {}).items()}


def cor_de(palavra, trecho):
    return por_trecho.get(trecho, {}).get(norm(palavra)) or chave.get(norm(palavra), "branco")


def trecho_de(tb):
    for s in segs:
        if s["tipo"] == "bruto" and s["de"] <= tb < s["audio_ate"] + 1e-6:
            return s
    return None


palavras = []
for p in trans["palavras"]:
    if p["inicio"] < cfg["hook"]["ate_no_bruto"]:
        continue  # o título do gancho já mostra esse trecho
    s = trecho_de(p["inicio"])
    if s is None:
        continue
    fim_b = min(p["fim"], p["inicio"] + 0.9, s["audio_ate"] - 0.01)  # a palavra não atravessa o corte
    txt = p["palavra"].upper() if L["maiusculas"] else p["palavra"]
    palavras.append({"t": txt, "ini": f(bruto_para_saida(p["inicio"])), "fim": f(bruto_para_saida(fim_b)),
                     "cor": cor_de(p["palavra"], s["id"]), "pont": p["palavra"][-1]})


def quebra(ws):
    """Divide em linhas de até N caracteres."""
    linhas, lin = [], []
    for w in ws:
        if lin and len(" ".join(x["t"] for x in lin + [w])) > L["max_caracteres_linha"]:
            linhas.append(lin); lin = []
        lin.append(w)
    return linhas + [lin] if lin else linhas


blocos, atual = [], []
def fecha():
    global atual
    if atual:
        blocos.append({"ini": atual[0]["ini"], "fim": atual[-1]["fim"], "linhas": quebra(atual)})
    atual = []

for w in palavras:
    if atual and (len(atual) + 1 > L["max_palavras_bloco"] or len(quebra(atual + [w])) > 2 or w["ini"] - atual[-1]["fim"] > 8):
        fecha()
    atual.append(w)
    if w["pont"] in ".!?…" or (w["pont"] == "," and len(atual) >= 2):
        fecha()  # fim de frase fecha o bloco; vírgula fecha se já tem 2+ palavras
fecha()
for a, b in zip(blocos, blocos[1:]):  # sem sobreposição; buraco menor que 6 frames é emendado
    a["fim"] = b["ini"] if b["ini"] - a["fim"] < 6 else min(a["fim"], b["ini"])

# ---------------------------------------------------------------- elementos e emojis
E = cfg["elementos"]
def fb(x):
    v = bruto_para_saida(x)
    return f(v) if v is not None else None

elementos = {
    "circulo_carro": dict(E["circulo_carro"], ini=fb(E["circulo_carro"]["de_no_bruto"]), fim=fb(E["circulo_carro"]["ate_no_bruto"])),
    "proibido": dict(E["proibido"], ini=fb(E["proibido"]["de_no_bruto"]), fim=fb(E["proibido"]["ate_no_bruto"])),
    "selo_juntos": dict(E["selo_juntos"], ini=fb(E["selo_juntos"]["de_no_bruto"]), fim=fb(E["selo_juntos"]["ate_no_bruto"])),
    "preco": dict(E["preco"], ini=fb(E["preco"]["de_no_bruto"])),
    "seta_cta": dict(E["seta_cta"], ini=fb(E["seta_cta"]["de_no_bruto"])),
    "aviso": E["aviso"],
}
emojis = [{"emoji": e["emoji"], "ini": fb(e["no_bruto"])} for e in cfg["emojis"] if fb(e["no_bruto"]) is not None]
seg_id = {s["id"]: s for s in segs}

timeline = {"fps": FPS, "dur": f(TOTAL), "cores": cfg["cores"], "segmentos": segs, "blocos": blocos,
            "elementos": elementos, "emojis": emojis, "hook": cfg["hook"], "insercao": cfg["insercao"],
            "cartao": cfg["cartao"]}
os.makedirs(os.path.join(REM, "src"), exist_ok=True)
json.dump(timeline, open(os.path.join(REM, "src", "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- 3. assets
os.makedirs(os.path.join(PUB, "fontes"), exist_ok=True)
cc = cfg["correcao_cor"]
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(BASE, cfg["bruto"]),
                "-vf", f"eq=contrast={cc['contraste']}:saturation={cc['saturacao']}", "-an",
                "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-pix_fmt", "yuv420p", os.path.join(PUB, "bruto.mp4")], check=True)
for raiz, _, arqs in os.walk(os.path.join(BASE, "imagens")):
    for a in arqs:
        rel = os.path.relpath(os.path.join(raiz, a), os.path.join(BASE, "imagens"))
        os.makedirs(os.path.dirname(os.path.join(PUB, rel)) or PUB, exist_ok=True)
        shutil.copy(os.path.join(raiz, a), os.path.join(PUB, rel))
fs = os.path.join(REM, "node_modules", "@fontsource", "poppins", "files")
for peso in (600, 700, 800, 900):
    shutil.copy(os.path.join(fs, f"poppins-latin-{peso}-normal.woff2"), os.path.join(PUB, "fontes", f"poppins-{peso}.woff2"))
    shutil.copy(os.path.join(fs, f"poppins-latin-ext-{peso}-normal.woff2"), os.path.join(PUB, "fontes", f"poppins-ext-{peso}.woff2"))

# ---------------------------------------------------------------- 4. áudio
SR = AU.SR
N = int(TOTAL * SR) + SR
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(BASE, cfg["bruto"]), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
fonte = np.frombuffer(raw, np.float32).astype(np.float64)
voz = np.zeros(N)
for s in segs:
    if s["tipo"] != "bruto":
        continue
    a, b = int(s["de"] * SR), int(s["audio_ate"] * SR)
    trecho = fonte[a:b].copy()
    fade = int(0.008 * SR)
    trecho[:fade] *= np.linspace(0, 1, fade); trecho[-fade:] *= np.linspace(1, 0, fade)
    o = int(s["t_saida"] * SR)
    voz[o:o + len(trecho)] += trecho
rms_voz = np.sqrt(np.mean(voz[np.abs(voz) > 0.02] ** 2)) + 1e-9
voz *= 0.12 / rms_voz  # voz em ~-18 dBFS RMS; o loudness final é ajustado no export

mix = voz.copy()
A = cfg["audio"]
if A["musica"]:
    arqs = sorted(os.listdir(os.path.join(BASE, "audio"))) if os.path.isdir(os.path.join(BASE, "audio")) else []
    arqs = [a for a in arqs if a.lower().endswith((".mp3", ".wav", ".m4a", ".ogg"))]
    if arqs:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(BASE, "audio", arqs[0]), "-t", str(TOTAL + 1), "-ac", "1",
                              "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        mus = np.frombuffer(raw, np.float32).astype(np.float64)
    else:
        mus = AU.trilha(TOTAL + 1)
    mus = np.pad(mus, (0, max(0, N - len(mus))))[:N]
    mus *= 0.12 / (np.sqrt(np.mean(mus ** 2)) + 1e-9)  # mesma referência RMS da voz
    jan = int(0.15 * SR)
    env = np.convolve(np.abs(voz), np.ones(jan) / jan, mode="same")
    fala = np.clip(env / 0.03, 0, 1)
    fala = np.convolve(fala, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
    ganho_db = A["musica_sem_voz_db"] + (A["musica_sob_voz_db"] - A["musica_sem_voz_db"]) * np.clip(fala * 1.4, 0, 1)
    mix += mus * 10 ** (ganho_db / 20)

sfx = {"whoosh": AU.whoosh(), "pop": AU.pop(), "tic": AU.tic()}
t_ = np.arange(int(0.9 * SR)) / SR
sfx["ding"] = (np.sin(2 * np.pi * 1318.5 * t_) + 0.6 * np.sin(2 * np.pi * 1975.5 * t_) + 0.3 * np.sin(2 * np.pi * 2637 * t_)) * np.exp(-t_ * 5) * 0.5
t_ = np.arange(int(0.035 * SR)) / SR
sfx["click"] = np.random.default_rng(2).uniform(-1, 1, len(t_)) * np.exp(-t_ * 180) * 0.8
t_ = np.arange(int(0.5 * SR)) / SR
sfx["impacto"] = np.sin(2 * np.pi * np.cumsum(40 + 90 * np.exp(-t_ * 25)) / SR) * np.exp(-t_ * 9) * 0.9
ev = [(0.0, "impacto", 0.9), (0.02, "whoosh", 0.7)]
for s in segs[1:]:
    ev.append((s["inicio"] / FPS - 0.12, "whoosh", 0.55))
ins = seg_id["insercao"]["inicio"] / FPS
ev += [(ins + 0.3 + k * 0.08, "tic", 0.35) for k in range(0, 12, 2)]
ev += [(ins + 1.9, "pop", 0.7), (ins + 2.2, "whoosh", 0.5)]
ev += [(ins + 4.0 + k * 0.4, "pop", 0.8) for k in range(3)]
for nome in ("circulo_carro", "proibido", "selo_juntos"):
    if elementos[nome]["ini"] is not None:
        ev.append((elementos[nome]["ini"] / FPS, "pop", 0.55))
ev.append((elementos["preco"]["ini"] / FPS, "ding", 0.9))
ev.append((elementos["seta_cta"]["ini"] / FPS, "click", 0.8))
ev.append((seg_id["cartao"]["inicio"] / FPS + 0.35, "ding", 0.6))
for tt, nome, g in ev:
    s0 = int(max(0, tt) * SR); x = sfx[nome] * g * 0.25
    mix[s0:s0 + len(x)] += x[:max(0, N - s0)]
mix = mix[:int(TOTAL * SR)]
mix = mix / max(1.0, np.abs(mix).max() / 0.95)
with wave.open(os.path.join(WORK, "audio_mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    st = np.stack([mix, mix], 1)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())

print(f"Linha do tempo: {TOTAL:.2f} s ({f(TOTAL)} frames), {len(blocos)} blocos de legenda, {len(emojis)} emojis")
for s in segs:
    print(f"  {s['id']:9s} {s['inicio'] / FPS:6.2f}s  +{s['dur'] / FPS:.2f}s  {s.get('tipo')}")
