# -*- coding: utf-8 -*-
"""
Narração com voz neural offline via sherpa-onnx (modelos em modelos/, baixados do GitHub):
Kokoro v1.0 (vozes pt-BR Dora, Alex e Santa, mais naturais) e Piper pt-BR (reserva),
e transcrição de conferência com Whisper (sherpa-onnx). Os números vão por extenso no texto falado.
"""
import os, functools
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.join(AQUI, "modelos")
SR = 44100


KOKORO = os.path.join(MOD, "kokoro-multi-lang-v1_0")
VOZES_KOKORO = {"dora": 42, "alex": 43, "santa": 44}  # pf_dora (feminina), pm_alex e pm_santa (masculinas)


def disponivel(voz):
    if voz in VOZES_KOKORO:
        return os.path.exists(os.path.join(KOKORO, "model.onnx"))
    return os.path.exists(os.path.join(MOD, f"vits-piper-pt_BR-{voz}-medium", f"pt_BR-{voz}-medium.onnx"))


@functools.lru_cache(maxsize=1)
def _kokoro():
    import sherpa_onnx
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=f"{KOKORO}/model.onnx", voices=f"{KOKORO}/voices.bin",
                                                       tokens=f"{KOKORO}/tokens.txt", data_dir=f"{KOKORO}/espeak-ng-data",
                                                       lang="pt-br"), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)


def humanizar(x):
    """Tira o som "seco" de voz sintetizada: corta graves abaixo de ~80 Hz e soma um ambiente
    de sala bem curto e baixo (como uma gravação num cômodo pequeno)."""
    y = x - np.convolve(x, np.ones(270) / 270, mode="same")          # passa-altas suave (~80 Hz)
    rng = np.random.default_rng(3)
    L = int(0.32 * SR); t = np.arange(L) / SR
    ir = rng.standard_normal(L) * np.exp(-t / 0.07)
    ir = np.convolve(ir, np.ones(12) / 12, mode="same")                # ambiente mais escuro, sem chiado
    ir = np.concatenate([np.zeros(int(0.012 * SR)), ir]); ir /= np.sqrt((ir ** 2).sum())
    wet = np.convolve(y, ir)[:len(y)]
    return y + 0.09 * wet / (np.abs(wet).max() + 1e-9) * np.abs(y).max()


@functools.lru_cache(maxsize=4)
def _tts(voz):
    import sherpa_onnx
    d = os.path.join(MOD, f"vits-piper-pt_BR-{voz}-medium")
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/pt_BR-{voz}-medium.onnx", tokens=f"{d}/tokens.txt",
                                                   data_dir=f"{d}/espeak-ng-data"), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)


def falar(texto, voz, velocidade=1.0):
    """Sintetiza e devolve áudio mono float em 44,1 kHz, sem silêncio nas pontas."""
    if voz in VOZES_KOKORO:
        a = _kokoro().generate(texto, sid=VOZES_KOKORO[voz], speed=velocidade)
    else:
        a = _tts(voz).generate(texto, sid=0, speed=velocidade)
    x = np.array(a.samples, dtype=np.float64)
    # reamostra para 44,1 kHz (interpolação linear basta para voz)
    n = int(len(x) * SR / a.sample_rate)
    x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    env = np.abs(x) > 0.02
    if env.any():
        i0, i1 = np.argmax(env), len(env) - np.argmax(env[::-1])
        x = x[max(0, i0 - int(0.03 * SR)):min(len(x), i1 + int(0.06 * SR))]
    x = humanizar(x) if voz in VOZES_KOKORO else x
    return x / (np.abs(x).max() + 1e-9) * 0.9


@functools.lru_cache(maxsize=1)
def _whisper():
    import sherpa_onnx
    W = os.path.join(MOD, "sherpa-onnx-whisper-base")
    return sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{W}/base-encoder.int8.onnx", decoder=f"{W}/base-decoder.int8.onnx",
                                                      tokens=f"{W}/base-tokens.txt", language="pt", task="transcribe", num_threads=4)


def transcrever(x, sr=SR):
    rec = _whisper()
    st = rec.create_stream(); st.accept_waveform(sr, x.astype(np.float32)); rec.decode_stream(st)
    return st.result.text.strip()
