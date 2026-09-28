# -*- coding: utf-8 -*-
"""
Narração com voz neural offline (Piper pt-BR via sherpa-onnx; modelos em modelos/, baixados do GitHub)
e transcrição de conferência com Whisper (sherpa-onnx). Os números vão por extenso no texto falado.
"""
import os, functools
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.join(AQUI, "modelos")
SR = 44100


def disponivel(voz):
    return os.path.exists(os.path.join(MOD, f"vits-piper-pt_BR-{voz}-medium", f"pt_BR-{voz}-medium.onnx"))


@functools.lru_cache(maxsize=4)
def _tts(voz):
    import sherpa_onnx
    d = os.path.join(MOD, f"vits-piper-pt_BR-{voz}-medium")
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/pt_BR-{voz}-medium.onnx", tokens=f"{d}/tokens.txt",
                                                   data_dir=f"{d}/espeak-ng-data"), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)


def falar(texto, voz, velocidade=1.1):
    """Sintetiza e devolve áudio mono float em 44,1 kHz, sem silêncio nas pontas."""
    a = _tts(voz).generate(texto, sid=0, speed=velocidade)
    x = np.array(a.samples, dtype=np.float64)
    # reamostra para 44,1 kHz (interpolação linear basta para voz)
    n = int(len(x) * SR / a.sample_rate)
    x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    env = np.abs(x) > 0.02
    if env.any():
        i0, i1 = np.argmax(env), len(env) - np.argmax(env[::-1])
        x = x[max(0, i0 - int(0.03 * SR)):min(len(x), i1 + int(0.06 * SR))]
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
