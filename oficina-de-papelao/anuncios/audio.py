# -*- coding: utf-8 -*-
"""
Trilha e efeitos sonoros gerados por código (sem nenhum áudio de terceiros).

- trilha(dur): violão sintetizado (Karplus-Strong) em Dó–Sol–Lá menor–Fá, com baixo,
  bumbo, palma e chocalho leves, 112 bpm;
- efeitos: "whoosh" nos cortes, "pop" no preço, "tic" nos selos.
Se houver música em meus_assets/musica/, ela é usada no lugar da trilha gerada.
"""
import numpy as np

SR = 44100
rng = np.random.default_rng(12)


def pluck(freq, dur, decay=0.996, brilho=0.5):
    """Corda dedilhada (Karplus-Strong), calculada um período por vez."""
    n = int(SR * dur)
    N = max(2, int(SR / freq))
    y = np.zeros(n + N)
    y[:N] = rng.uniform(-1, 1, N) * brilho + rng.uniform(-1, 1, N) * (1 - brilho) * 0.3
    i = N
    while i < n + N:
        fim = min(i + N, n + N)
        prev = y[i - N:fim - N]
        prev2 = y[i - N - 1:fim - N - 1] if i - N - 1 >= 0 else np.concatenate([[0], y[i - N:fim - N - 1]])
        y[i:fim] = decay * 0.5 * (prev + prev2[:len(prev)])
        i = fim
    out = y[N:N + n]
    env = np.minimum(1, np.arange(n) / (0.004 * SR))
    return out * env


def nota(nome):
    tab = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    return 440.0 * 2 ** ((tab[nome[0]] + 12 * (int(nome[-1]) - 4)) / 12)


def trilha(dur, bpm=112):
    beat = 60 / bpm
    n = int(SR * dur) + SR
    mix = np.zeros(n)
    acordes = [("C3", ["C4", "E4", "G4", "C5"]), ("G2", ["G3", "B3", "D4", "G4"]),
               ("A2", ["A3", "C4", "E4", "A4"]), ("F2", ["F3", "A3", "C4", "F4"])]
    padrao = [0, 2, 1, 2, 3, 2, 1, 2]
    t, compasso = 0.0, 0
    while t < dur + beat:
        baixo, notas = acordes[compasso % 4]
        for k, idx in enumerate(padrao):                       # dedilhado em colcheias
            s = int((t + k * beat / 2) * SR)
            if s >= n: break
            p = pluck(nota(notas[idx]), 1.2, decay=0.995) * (0.34 if k % 2 == 0 else 0.26)
            mix[s:s + len(p)] += p[:max(0, n - s)]
        for b in (0, 2):                                       # baixo e bumbo nos tempos 1 e 3
            s = int((t + b * beat) * SR)
            if s >= n: continue
            L = int(0.45 * SR); tt = np.arange(L) / SR
            bx = np.sin(2 * np.pi * nota(baixo) * tt) * np.exp(-tt * 5) * 0.5
            fq = 45 + 70 * np.exp(-tt * 30)
            kick = np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-tt * 18) * 0.55
            e = min(n, s + L); mix[s:e] += (bx + kick)[:e - s]
        for b in (1, 3):                                       # palma nos tempos 2 e 4
            s = int((t + b * beat) * SR)
            if s >= n: continue
            L = int(0.18 * SR); tt = np.arange(L) / SR
            ruido = rng.uniform(-1, 1, L); ruido = np.diff(ruido, prepend=0)
            e = min(n, s + L); mix[s:e] += (ruido * np.exp(-tt * 28) * 0.22)[:e - s]
        for k in range(8):                                     # chocalho nas colcheias
            s = int((t + k * beat / 2 + beat / 4) * SR)
            if s >= n: continue
            L = int(0.05 * SR); tt = np.arange(L) / SR
            ch = np.diff(rng.uniform(-1, 1, L), prepend=0) * np.exp(-tt * 70) * 0.08
            e = min(n, s + L); mix[s:e] += ch[:e - s]
        t += 4 * beat; compasso += 1
    mix = mix[:int(SR * dur)]
    fade = int(0.9 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    return mix / (np.abs(mix).max() + 1e-9) * 0.5


def whoosh():
    L = int(0.32 * SR); tt = np.arange(L) / SR
    ruido = rng.uniform(-1, 1, L)
    out, y = np.zeros(L), 0.0
    for i in range(L):  # passa-baixa com corte que sobe e desce
        a = 0.02 + 0.25 * np.sin(np.pi * i / L) ** 2
        y += a * (ruido[i] - y); out[i] = y
    return out * np.sin(np.pi * tt / tt[-1]) ** 2 * 1.6


def pop():
    L = int(0.16 * SR); tt = np.arange(L) / SR
    fq = 420 + 1100 * (1 - np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-tt * 22) * 0.8


def tic():
    L = int(0.07 * SR); tt = np.arange(L) / SR
    return (np.sin(2 * np.pi * 1850 * tt) + 0.4 * np.sin(2 * np.pi * 2780 * tt)) * np.exp(-tt * 60) * 0.35


def montar(dur, eventos, musica=None):
    """eventos: [(t, 'whoosh'|'pop'|'tic')]. Retorna estéreo float32."""
    base = musica if musica is not None else trilha(dur)
    base = np.pad(base, (0, max(0, int(SR * dur) - len(base))))[:int(SR * dur)] * 0.62
    sfx = {"whoosh": whoosh(), "pop": pop(), "tic": tic()}
    for t, nome in eventos:
        s = int(t * SR); x = sfx[nome]
        e = min(len(base), s + len(x))
        if s < e:
            base[s:e] += x[:e - s] * {"whoosh": 0.22, "pop": 0.5, "tic": 0.4}[nome]
    base = np.tanh(base * 1.1) * 0.9  # segura picos
    return np.stack([base, base], axis=1).astype(np.float32)
