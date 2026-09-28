# -*- coding: utf-8 -*-
"""
Narração dos anúncios. Escolhe sozinho o melhor motor de voz disponível, nesta ordem:

1. Google Cloud Text-to-Speech (vozes Chirp 3 HD, as mais naturais): precisa da variável de
   ambiente GOOGLE_TTS_API_KEY (configurada nas variáveis do ambiente, nunca no código);
2. Microsoft Edge TTS (Francisca, Thalita, Antonio): precisa de speech.platform.bing.com liberado na rede;
3. Kokoro v1.0 offline (Dora e Alex, via sherpa-onnx, modelo em modelos/), a reserva.

Os anúncios pedem papéis ("fem1", "fem2", "masc") e cada motor escolhe a voz equivalente.
Também faz a transcrição de conferência com Whisper (sherpa-onnx). Números vão por extenso no texto.
"""
import os, io, json, base64, hashlib, functools, subprocess, tempfile, urllib.request
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.join(AQUI, "modelos")
SR = 44100


KOKORO = os.path.join(MOD, "kokoro-multi-lang-v1_0")
VOZES_KOKORO = {"dora": 42, "alex": 43, "santa": 44}  # pf_dora (feminina), pm_alex e pm_santa (masculinas)


VOZES = {
    "google": {"fem1": ["pt-BR-Chirp3-HD-Aoede", "pt-BR-Neural2-A"], "fem2": ["pt-BR-Chirp3-HD-Leda", "pt-BR-Neural2-C"],
               "masc": ["pt-BR-Chirp3-HD-Charon", "pt-BR-Neural2-B"]},
    "edge": {"fem1": "pt-BR-FranciscaNeural", "fem2": "pt-BR-ThalitaNeural", "masc": "pt-BR-AntonioNeural"},
    "kokoro": {"fem1": "dora", "fem2": "dora", "masc": "alex"},
}
CACHE = os.path.join(AQUI, "tmp", "vozes")


def _edge_liberado():
    try:
        falar_edge("Oi.", VOZES["edge"]["fem1"], 1.0)
        return True
    except Exception:
        return False


@functools.lru_cache(maxsize=1)
def motor_ativo():
    if os.environ.get("GOOGLE_TTS_API_KEY"):
        return "google"
    if _edge_liberado():
        return "edge"
    return "kokoro"


def _decodificar(dados):
    """Qualquer áudio (wav/mp3) -> mono float em 44,1 kHz, via ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".bin") as f:
        f.write(dados); f.flush()
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f.name, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def falar_google(texto, nomes, velocidade):
    chave = os.environ["GOOGLE_TTS_API_KEY"]
    ultimo = None
    for nome in nomes:  # Chirp 3 HD primeiro; se a conta não tiver, Neural2
        for cfg_audio in ({"audioEncoding": "LINEAR16", "sampleRateHertz": 24000, "speakingRate": velocidade},
                          {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000}):
            corpo = {"input": {"text": texto}, "voice": {"languageCode": "pt-BR", "name": nome}, "audioConfig": cfg_audio}
            req = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize",
                                         data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json",
                                                                                   "X-Goog-Api-Key": chave})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    return _decodificar(base64.b64decode(json.load(r)["audioContent"]))
            except urllib.error.HTTPError as e:
                ultimo = f"{nome}: {e.code} {e.read()[:200]!r}"
    raise RuntimeError(f"Google TTS falhou ({ultimo})")


def falar_edge(texto, voz, velocidade):
    import asyncio, certifi, edge_tts
    certifi.where = lambda: os.environ.get("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt")  # CA do proxy do ambiente
    taxa = f"{round((velocidade - 1) * 100 + 8):+d}%"
    async def _go():
        buf = io.BytesIO()
        async for ch in edge_tts.Communicate(texto, voz, rate=taxa).stream():
            if ch["type"] == "audio":
                buf.write(ch["data"])
        return buf.getvalue()
    dados = asyncio.run(asyncio.wait_for(_go(), 30))
    if not dados:
        raise RuntimeError("edge-tts sem áudio")
    return _decodificar(dados)


def disponivel(voz):
    if voz in ("fem1", "fem2", "masc"):
        return motor_ativo() != "kokoro" or os.path.exists(os.path.join(KOKORO, "model.onnx"))
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
    """Sintetiza e devolve áudio mono float em 44,1 kHz, sem silêncio nas pontas.
    voz = papel ("fem1", "fem2", "masc") ou nome direto de voz Kokoro/Piper."""
    if voz in ("fem1", "fem2", "masc"):
        motor = motor_ativo()
        nome = VOZES[motor][voz]
        chave = hashlib.sha1(json.dumps([motor, nome, texto, round(velocidade, 3)]).encode()).hexdigest()
        arq = os.path.join(CACHE, chave + ".npy")
        if os.path.exists(arq):
            return np.load(arq)
        if motor == "kokoro":
            x = falar(texto, nome, velocidade)
        else:
            x = falar_google(texto, nome, velocidade) if motor == "google" else falar_edge(texto, nome, velocidade)
            x = _aparar(x)
            x = x / (np.abs(x).max() + 1e-9) * 0.9
        os.makedirs(CACHE, exist_ok=True); np.save(arq, x)
        return x
    if voz in VOZES_KOKORO:
        a = _kokoro().generate(texto, sid=VOZES_KOKORO[voz], speed=velocidade)
    else:
        a = _tts(voz).generate(texto, sid=0, speed=velocidade)
    x = np.array(a.samples, dtype=np.float64)
    # reamostra para 44,1 kHz (interpolação linear basta para voz)
    n = int(len(x) * SR / a.sample_rate)
    x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    x = _aparar(x)
    x = humanizar(x) if voz in VOZES_KOKORO else x
    return x / (np.abs(x).max() + 1e-9) * 0.9


def _aparar(x):
    """Tira o silêncio das pontas, deixando uma folga curta."""
    env = np.abs(x) > 0.02
    if env.any():
        i0, i1 = np.argmax(env), len(env) - np.argmax(env[::-1])
        x = x[max(0, i0 - int(0.03 * SR)):min(len(x), i1 + int(0.06 * SR))]
    return x


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
