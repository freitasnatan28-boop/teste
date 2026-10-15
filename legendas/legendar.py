#!/usr/bin/env python3
"""
legendar.py — legendas dinâmicas no estilo "Edits" do Instagram, gravadas no vídeo.

Uso:
    python legendar.py caminho/do/video.mp4            # tudo direto
    python legendar.py caminho/do/video.mp4 --revisar  # pausa para editar o texto

Fluxo: FFmpeg extrai o áudio -> faster-whisper transcreve (timestamps por palavra)
-> glossário corrige termos -> (opcional) você revisa o texto -> gera .ass + .srt
-> FFmpeg grava a legenda no vídeo (mesma resolução e fps).
"""

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║                              CONFIGURAÇÃO                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# --- Transcrição ---
MODELO_WHISPER = "large-v3"   # "medium" é ~2x mais rápido; "large-v3" erra menos
IDIOMA = "pt"
DISPOSITIVO = "auto"          # "auto", "cpu" ou "cuda"

# --- Fonte ---
FONTE_ARQUIVO = "fonts/Montserrat-ExtraBold.ttf"  # relativo a esta pasta
FONTE_NOME = "Montserrat ExtraBold"               # nome da família, como o libass enxerga
FONTE_GOOGLE = ("Montserrat", 800)                # baixa do Google Fonts se faltar o arquivo
TAMANHO_FONTE = 90            # em px, para vídeo de 1080 px de largura (escala junto)
ESPACAMENTO_LETRAS = 1        # px extras entre letras
CAIXA_ALTA = True

# --- Cores (#RRGGBB) ---
COR_TEXTO = "#FFFFFF"
COR_DESTAQUE = "#FFE81F"      # palavra sendo falada
COR_CONTORNO = "#000000"
COR_SOMBRA = "#000000"
OPACIDADE_SOMBRA = 0.55       # 0 = invisível, 1 = sólida
CONTORNO = 7                  # px (para 1080 de largura)
SOMBRA = 4                    # deslocamento da sombra em px
SUAVIZAR_BORDA = 1.0          # \blur leve no contorno/sombra (0 = desliga)

# --- Blocos ---
MIN_PALAVRAS = 1
MAX_PALAVRAS = 4
MAX_CARACTERES_LINHA = 16     # acima disso o bloco quebra em 2 linhas
MAX_LINHAS = 2
PAUSA_NOVO_BLOCO = 0.45       # silêncio (s) que força um bloco novo
QUEBRAR_EM_VIRGULA = True     # vírgula/ponto encerram o bloco
SEGURAR_FIM = 0.20            # s que o último bloco fica na tela após a última palavra
COLAR_BLOCOS = 0.40           # gaps menores que isso: o bloco fica até o próximo entrar
REMOVER_PONTUACAO = ".,;:"    # some da tela (? e ! continuam). "" mantém tudo

# --- Animação ---
POP_ESCALA = 118              # % inicial da palavra nova (encolhe até 100)
POP_DURACAO_MS = 110
ENTRADA_BLOCO_ESCALA = 88     # % inicial do bloco ao surgir (100 = sem animação)
ENTRADA_BLOCO_MS = 90

# --- Posição (frações da tela) ---
POSICAO_VERTICAL = 0.64       # centro do texto (0 = topo, 1 = base). Terço inferior.
MARGEM_SEGURA_INFERIOR = 0.24 # faixa de baixo coberta pela interface do Reels
MARGEM_SEGURA_SUPERIOR = 0.14
MARGEM_LATERAL = 0.11         # cada lado (botões do Reels ficam à direita)

# --- Saída ---
CRF = 16                      # 14-18 = visualmente sem perdas; menor = maior arquivo
PRESET = "slow"               # mais lento = arquivo menor com mesma qualidade
SUFIXO_SAIDA = "_legendado"

# ════════════════════════════════════════════════════════════════════════════

import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path

PASTA_SCRIPT = Path(__file__).resolve().parent
GLOSSARIO = PASTA_SCRIPT / "glossario.txt"
FIM_FRASE = ".?!…"
PAUSA_LEVE = ",;:"
# palavras que soam penduradas no fim de um bloco ("…PELO WHATSAPP E")
PALAVRAS_FRACAS = set("""a o as os e é um uma uns umas de do da dos das no na nos nas em
    ao aos à às pra pro pras pros para por pelo pela pelos pelas com sem que se
    mas ou nem eu tu te me lhe seu sua meu minha teu tua""".split())


@dataclass
class Palavra:
    texto: str
    inicio: float
    fim: float
    quebra: bool = False  # quebra de linha no texto revisado => fecha o bloco


def log(msg):
    print(f"» {msg}", flush=True)


def rodar(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit(f"Erro rodando {cmd[0]}:\n{r.stderr[-3000:]}")
    return r.stdout


# ───────────────────────────── vídeo / áudio ─────────────────────────────────

def info_video(video):
    dados = json.loads(rodar([
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_streams", "-show_format", str(video)]))
    v = next(s for s in dados["streams"] if s["codec_type"] == "video")
    a = next((s for s in dados["streams"] if s["codec_type"] == "audio"), None)
    largura, altura = int(v["width"]), int(v["height"])
    # vídeo de celular gravado "deitado" com metadado de rotação
    rot = 0
    for sd in v.get("side_data_list", []):
        rot = int(sd.get("rotation", 0) or 0)
    rot = int(v.get("tags", {}).get("rotate", rot))
    if abs(rot) in (90, 270):
        largura, altura = altura, largura
    return {"largura": largura, "altura": altura, "pix_fmt": v.get("pix_fmt", "yuv420p"),
            "fps": v.get("r_frame_rate"), "audio": a["codec_name"] if a else None,
            "cor": {k: v[k] for k in ("color_range", "color_space", "color_transfer",
                                     "color_primaries") if v.get(k) and v[k] != "unknown"}}


def extrair_audio(video, destino):
    log("Extraindo áudio…")
    rodar(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
           "-ar", "16000", "-c:a", "pcm_s16le", str(destino)])


# ───────────────────────────── glossário ──────────────────────────────────────

def ler_glossario():
    """Linhas 'errado => certo' viram substituições; linhas soltas viram vocabulário."""
    trocas, termos = [], []
    if not GLOSSARIO.exists():
        return trocas, termos
    for linha in GLOSSARIO.read_text(encoding="utf-8").splitlines():
        linha = linha.split("#", 1)[0].strip()
        if not linha:
            continue
        if "=>" in linha:
            errado, certo = (p.strip() for p in linha.split("=>", 1))
            if errado:
                trocas.append((errado, certo))
                termos.append(certo)
        else:
            termos.append(linha)
    return trocas, termos


def aplicar_glossario(texto, trocas):
    for errado, certo in trocas:
        padrao = r"(?<!\w)" + re.escape(errado) + r"(?!\w)"
        texto = re.sub(padrao, lambda m, c=certo: c, texto, flags=re.IGNORECASE)
    return texto


# ───────────────────────────── transcrição ────────────────────────────────────

def transcrever(audio, termos):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Falta o faster-whisper: pip install -r requirements.txt")

    dispositivo, tipo = "cpu", "int8"
    if DISPOSITIVO in ("auto", "cuda"):
        try:
            import ctranslate2
            if ctranslate2.get_cuda_device_count() > 0:
                dispositivo, tipo = "cuda", "float16"
        except Exception:
            pass
    log(f"Transcrevendo com Whisper '{MODELO_WHISPER}' ({dispositivo})… "
        "na primeira vez o modelo é baixado.")
    try:
        modelo = WhisperModel(MODELO_WHISPER, device=dispositivo, compute_type=tipo)
    except Exception as e:
        sys.exit(f"Não consegui carregar o modelo '{MODELO_WHISPER}' ({e}).\n"
                 "Na primeira vez ele é baixado do huggingface.co — confira a internet.")
    prompt = None
    if termos:  # vocabulário do glossário ajuda o Whisper a acertar nomes/termos
        prompt = "Termos: " + ", ".join(dict.fromkeys(termos)) + "."
    segmentos, _ = modelo.transcribe(
        str(audio), language=IDIOMA, word_timestamps=True, beam_size=5,
        vad_filter=True, condition_on_previous_text=False, initial_prompt=prompt)

    frases = []
    for seg in segmentos:
        palavras = [{"texto": p.word.strip(), "inicio": round(p.start, 3),
                     "fim": round(p.end, 3)} for p in seg.words if p.word.strip()]
        if palavras:
            frases.append(palavras)
            print("   ", " ".join(p["texto"] for p in palavras), flush=True)
    return frases


# ───────────────────────────── revisão / alinhamento ──────────────────────────

def normalizar(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w]", "", t)


def limpar_texto(texto):
    texto = re.sub(r"\s+", " ", texto).strip()
    texto = re.sub(r"\s+([,.;:?!…])", r"\1", texto)
    return texto


def texto_inicial(frases, trocas):
    """Uma frase do Whisper por linha, já com o glossário aplicado."""
    linhas = [limpar_texto(aplicar_glossario(" ".join(p["texto"] for p in f), trocas))
              for f in frases]
    return "\n".join(l for l in linhas if l) + "\n"


def alinhar(frases, texto_revisado):
    """Reaproveita os tempos do Whisper para o texto revisado (que pode ter
    palavras trocadas, juntadas, separadas, incluídas ou removidas)."""
    orig = [Palavra(p["texto"], p["inicio"], p["fim"]) for f in frases for p in f]
    rev = []
    for linha in texto_revisado.splitlines():
        tokens = linha.split()
        for i, tok in enumerate(tokens):
            rev.append(Palavra(tok, 0.0, 0.0, quebra=(i == len(tokens) - 1)))
    if not orig or not rev:
        return rev

    a = [normalizar(p.texto) for p in orig]
    b = [normalizar(p.texto) for p in rev]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                rev[j1 + k].inicio, rev[j1 + k].fim = orig[i1 + k].inicio, orig[i1 + k].fim
        elif op == "replace":
            distribuir(rev[j1:j2], orig[i1].inicio, orig[i2 - 1].fim)
        elif op == "insert":
            antes = orig[i1 - 1] if i1 > 0 else None
            depois = orig[i1] if i1 < len(orig) else None
            ini = antes.fim if antes else max(0.0, depois.inicio - 0.3)
            fim = depois.inicio if depois else antes.fim + 0.3
            if fim - ini < 0.12 * (j2 - j1) and antes:
                # sem espaço livre: divide o tempo da palavra anterior
                meio = (antes.inicio + antes.fim) / 2
                anterior_rev = next((p for p in reversed(rev[:j1]) if p.fim == antes.fim), None)
                if anterior_rev:
                    anterior_rev.fim = meio
                ini = meio
            distribuir(rev[j1:j2], ini, max(fim, ini + 0.1))
    return rev


def distribuir(palavras, ini, fim):
    """Divide [ini, fim] entre as palavras, proporcional ao tamanho de cada uma."""
    pesos = [max(len(normalizar(p.texto)), 1) for p in palavras]
    total, t = sum(pesos), ini
    for p, w in zip(palavras, pesos):
        p.inicio, t = t, t + (fim - ini) * w / total
        p.fim = t


def revisar_no_editor(arquivo):
    editor = os.environ.get("VISUAL") or os.environ.get("EDITOR")
    if not editor and sys.platform == "win32":
        editor = "notepad"
    print()
    print("─" * 70)
    print(arquivo.read_text(encoding="utf-8"), end="")
    print("─" * 70)
    print("Edite o texto acima (uma frase por linha; cada linha fecha um bloco).")
    print("Pode corrigir palavras, pontuação, juntar/separar linhas — os tempos se ajustam.")
    if editor:
        log(f"Abrindo no editor ({editor})… salve e feche para continuar.")
        subprocess.run([*editor.split(), str(arquivo)])
    else:
        input(f"Arquivo: {arquivo}\nEdite, salve e aperte ENTER para gerar o vídeo… ")


# ───────────────────────────── blocos ─────────────────────────────────────────

class Medidor:
    """Mede a largura do texto com a fonte real (Pillow), como o libass vai desenhar."""

    def __init__(self, caminho_fonte, tamanho):
        self.fonte = None
        try:
            from PIL import ImageFont
            base = ImageFont.truetype(str(caminho_fonte), 1000)
            asc, desc = base.getmetrics()
            # o tamanho no .ass é a altura ascendente+descendente, não o "em"
            self.fonte = ImageFont.truetype(str(caminho_fonte), round(tamanho * 1000 / (asc + desc)))
        except Exception:
            self.tamanho = tamanho

    def largura(self, texto):
        extra = ESPACAMENTO_LETRAS * len(texto)
        if self.fonte:
            return self.fonte.getlength(texto) + extra
        return len(texto) * self.tamanho * 0.62 + extra  # estimativa sem Pillow


def texto_tela(palavra):
    t = palavra.texto.upper() if CAIXA_ALTA else palavra.texto
    if REMOVER_PONTUACAO:
        t = t.strip(REMOVER_PONTUACAO) or t
    return t


def montar_blocos(palavras, medidor, largura_max):
    # 1) frases: cortadas em pontuação, pausas e quebras de linha do texto revisado
    frases, atual = [], []
    for i, p in enumerate(palavras):
        atual.append(p)
        prox = palavras[i + 1] if i + 1 < len(palavras) else None
        corta = (p.quebra or prox is None
                 or p.texto[-1] in FIM_FRASE
                 # vírgula só corta se não deixar uma palavra sozinha ("Oi, gente,")
                 or (QUEBRAR_EM_VIRGULA and p.texto[-1] in PAUSA_LEVE and len(atual) >= 2)
                 or prox.inicio - p.fim >= PAUSA_NOVO_BLOCO)
        if corta:
            frases.append(atual)
            atual = []

    # 2) cada frase vira blocos equilibrados (5 palavras => 3+2, não 4+1)
    blocos = []
    for frase in frases:
        n = len(frase)
        k = -(-n // MAX_PALAVRAS)
        while k > 1 and n // k < MIN_PALAVRAS:
            k -= 1
        while True:
            partes = soltar_fracas(dividir(frase, k), medidor, largura_max)
            if all(cabe(pt, medidor, largura_max) for pt in partes) or k >= n:
                break
            k += 1
        blocos.extend(partes)
    return blocos


def dividir(frase, k):
    n, partes, ini = len(frase), [], 0
    for i in range(k):
        fim = ini + (n - ini) // (k - i) + (1 if (n - ini) % (k - i) else 0)
        partes.append(frase[ini:fim])
        ini = fim
    return [p for p in partes if p]


def soltar_fracas(partes, medidor, largura_max):
    """Passa artigo/preposição/conjunção do fim de um bloco para o começo do próximo."""
    for i in range(len(partes) - 1):
        while (len(partes[i]) > 1 and len(partes[i + 1]) < MAX_PALAVRAS
               and normalizar(partes[i][-1].texto) in {normalizar(w) for w in PALAVRAS_FRACAS}
               and cabe([partes[i][-1]] + partes[i + 1], medidor, largura_max)):
            partes[i + 1].insert(0, partes[i].pop())
    return partes


def linhas_do_bloco(bloco, medidor):
    """Divide o bloco em 1 ou 2 linhas, o mais equilibrado possível."""
    textos = [texto_tela(p) for p in bloco]
    if len(" ".join(textos)) <= MAX_CARACTERES_LINHA or len(bloco) == 1 or MAX_LINHAS < 2:
        return [list(range(len(bloco)))]
    melhor = min(range(1, len(bloco)), key=lambda c: abs(
        medidor.largura(" ".join(textos[:c])) - medidor.largura(" ".join(textos[c:]))))
    return [list(range(melhor)), list(range(melhor, len(bloco)))]


def largura_linhas(bloco, medidor):
    """Largura da linha mais larga, contando a palavra em destaque crescida pelo pop."""
    textos = [texto_tela(p) for p in bloco]
    crescimento = max(POP_ESCALA - 100, 0) / 100
    return max(medidor.largura(" ".join(textos[i] for i in linha))
               + crescimento * max(medidor.largura(textos[i]) for i in linha)
               for linha in linhas_do_bloco(bloco, medidor))


def cabe(bloco, medidor, largura_max):
    return largura_linhas(bloco, medidor) <= largura_max


# ───────────────────────────── .ass / .srt ────────────────────────────────────

def cor_ass(hexa, opacidade=1.0):
    h = hexa.lstrip("#")
    alfa = round((1 - opacidade) * 255)
    return f"&H{alfa:02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def tempo_ass(cs):
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def tempo_srt(cs):
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h:02d}:{m:02d}:{s:02d},{cs * 10:03d}"


def tempos_dos_blocos(blocos):
    """Início/fim (centésimos) de cada bloco e de cada palavra dentro dele."""
    resultado = []
    for i, bloco in enumerate(blocos):
        ini = round(bloco[0].inicio * 100)
        fim = round((bloco[-1].fim + SEGURAR_FIM) * 100)
        if i + 1 < len(blocos):
            prox = round(blocos[i + 1][0].inicio * 100)
            if prox - round(bloco[-1].fim * 100) < COLAR_BLOCOS * 100:
                fim = prox
            fim = min(fim, prox)
        if resultado:
            ini = max(ini, resultado[-1][1])
        fim = max(fim, ini + 8)
        marcas = [ini] + [min(max(round(p.inicio * 100), ini), fim) for p in bloco[1:]] + [fim]
        for j in range(1, len(marcas)):  # garante ordem crescente
            marcas[j] = max(marcas[j], marcas[j - 1])
        resultado.append((ini, fim, marcas))
    return resultado


def escapar_ass(t):
    return t.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def gerar_ass(blocos, tempos, medidor, info, caminho):
    W, H = info["largura"], info["altura"]
    esc = W / 1080
    tamanho = round(TAMANHO_FONTE * esc)
    x = W // 2
    largura_max = W * (1 - 2 * MARGEM_LATERAL)
    altura_linha = tamanho * 1.05

    eventos = []
    for bloco, (ini, fim, marcas) in zip(blocos, tempos):
        linhas = linhas_do_bloco(bloco, medidor)
        meia_altura = altura_linha * len(linhas) / 2
        y = H * POSICAO_VERTICAL
        y = min(y, H * (1 - MARGEM_SEGURA_INFERIOR) - meia_altura)
        y = max(y, H * MARGEM_SEGURA_SUPERIOR + meia_altura)
        textos = [escapar_ass(texto_tela(p)) for p in bloco]
        # se mesmo assim não couber (palavra enorme), reduz a fonte do bloco
        maior = largura_linhas(bloco, medidor)
        fs = tamanho if maior <= largura_max else int(tamanho * largura_max / maior)

        for k in range(len(bloco)):
            t0, t1 = marcas[k], marcas[k + 1]
            if t1 <= t0:
                continue
            cab = f"{{\\blur{SUAVIZAR_BORDA}" if SUAVIZAR_BORDA else "{"
            cab += f"\\an5\\pos({x},{round(y)})"
            if fs != tamanho:
                cab += f"\\fs{fs}"
            escala = "\\fscx100\\fscy100"
            if k == 0 and ENTRADA_BLOCO_ESCALA != 100:
                # o bloco surge pequeno e cresce; o resto da linha volta para essa animação
                escala = (f"\\fscx{ENTRADA_BLOCO_ESCALA}\\fscy{ENTRADA_BLOCO_ESCALA}"
                          f"\\t(0,{ENTRADA_BLOCO_MS},\\fscx100\\fscy100)")
                cab += escala
            cab += "}"
            partes = []
            for linha in linhas:
                pal = []
                for i in linha:
                    if i == k:
                        pop = ""
                        if POP_ESCALA != 100:
                            pop = (f"\\fscx{POP_ESCALA}\\fscy{POP_ESCALA}"
                                   f"\\t(0,{POP_DURACAO_MS},\\fscx100\\fscy100)")
                        pal.append(f"{{\\1c{cor_ass(COR_DESTAQUE)}{pop}}}{textos[i]}"
                                   f"{{\\1c{cor_ass(COR_TEXTO)}{escala}}}")
                    else:
                        pal.append(textos[i])
                partes.append(" ".join(pal))
            eventos.append(f"Dialogue: 0,{tempo_ass(t0)},{tempo_ass(t1)},Legenda,,0,0,0,,"
                           + cab + "\\N".join(partes))

    estilo = ",".join(str(v) for v in [
        "Legenda", FONTE_NOME, tamanho, cor_ass(COR_TEXTO), cor_ass(COR_DESTAQUE),
        cor_ass(COR_CONTORNO), cor_ass(COR_SOMBRA, OPACIDADE_SOMBRA),
        0, 0, 0, 0, 100, 100, round(ESPACAMENTO_LETRAS * esc, 1), 0, 1,
        round(CONTORNO * esc, 1), round(SOMBRA * esc, 1), 5,
        round(W * MARGEM_LATERAL), round(W * MARGEM_LATERAL), 0, 1])
    caminho.write_text(f"""[Script Info]
; Gerado por legendar.py
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: {estilo}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(eventos) + "\n", encoding="utf-8")


def gerar_srt(blocos, tempos, caminho):
    saida = []
    for n, (bloco, (ini, fim, _)) in enumerate(zip(blocos, tempos), 1):
        saida.append(f"{n}\n{tempo_srt(ini)} --> {tempo_srt(fim)}\n"
                     + " ".join(p.texto for p in bloco) + "\n")
    caminho.write_text("\n".join(saida), encoding="utf-8")


# ───────────────────────────── fonte / render ─────────────────────────────────

def garantir_fonte():
    caminho = PASTA_SCRIPT / FONTE_ARQUIVO
    if caminho.exists():
        return caminho
    familia, peso = FONTE_GOOGLE
    log(f"Baixando a fonte {familia} {peso} do Google Fonts…")
    try:
        url_css = (f"https://fonts.googleapis.com/css2?family={familia.replace(' ', '+')}"
                   f":wght@{peso}")
        css = urllib.request.urlopen(url_css, timeout=30).read().decode()
        url_ttf = re.search(r"url\((https://[^)]+\.ttf)\)", css).group(1)
        caminho.parent.mkdir(parents=True, exist_ok=True)
        caminho.write_bytes(urllib.request.urlopen(url_ttf, timeout=60).read())
        return caminho
    except Exception as e:
        log(f"Não consegui baixar a fonte ({e}). Usando uma fonte do sistema.")
        return None


def renderizar(video, ass, pasta_fontes, info, saida):
    log(f"Gravando a legenda no vídeo (CRF {CRF}, preset {PRESET})…")
    # caminhos relativos evitam ter que escapar ':' e aspas no filtro do FFmpeg
    filtro = f"ass={ass.name}" + (f":fontsdir={pasta_fontes.name}" if pasta_fontes else "")
    dez_bits = "10" in info["pix_fmt"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-stats", "-i", str(video.resolve()),
           "-map", "0:v:0", "-map", "0:a?", "-vf", filtro,
           "-c:v", "libx264", "-preset", PRESET, "-crf", str(CRF),
           "-pix_fmt", "yuv420p10le" if dez_bits else "yuv420p",
           "-fps_mode", "passthrough"]
    for chave, opcao in (("color_range", "-color_range"), ("color_space", "-colorspace"),
                         ("color_transfer", "-color_trc"), ("color_primaries", "-color_primaries")):
        if chave in info["cor"]:
            cmd += [opcao, info["cor"][chave]]
    if info["audio"] in ("aac", "mp3"):
        cmd += ["-c:a", "copy"]
    elif info["audio"]:
        cmd += ["-c:a", "aac", "-b:a", "320k"]
    cmd += ["-movflags", "+faststart", str(saida.resolve())]
    r = subprocess.run(cmd, cwd=ass.parent)
    if r.returncode != 0:
        sys.exit("FFmpeg falhou ao gravar a legenda.")


# ───────────────────────────── principal ──────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Legendas dinâmicas estilo Edits/Reels.")
    ap.add_argument("video", type=Path)
    ap.add_argument("--revisar", action="store_true",
                    help="pausa para você editar o texto antes de renderizar")
    ap.add_argument("--nova-revisao", action="store_true",
                    help="descarta a revisão salva e recomeça do texto do Whisper")
    ap.add_argument("--retranscrever", action="store_true",
                    help="ignora a transcrição salva e roda o Whisper de novo")
    ap.add_argument("--so-legenda", action="store_true",
                    help="gera só .ass/.srt, sem gravar no vídeo")
    ap.add_argument("--saida", type=Path, help="arquivo de vídeo de saída")
    args = ap.parse_args()

    for prog in ("ffmpeg", "ffprobe"):
        if not shutil.which(prog):
            sys.exit(f"Não encontrei o {prog}. Instale o FFmpeg e tente de novo.")
    video = args.video
    if not video.exists():
        sys.exit(f"Vídeo não encontrado: {video}")

    base = video.with_suffix("")
    trabalho = Path(f"{base}_trabalho")
    trabalho.mkdir(exist_ok=True)
    arq_transcricao = trabalho / "transcricao.json"
    arq_revisao = trabalho / "revisao.txt"
    arq_ass = Path(f"{base}.ass")
    arq_srt = Path(f"{base}.srt")
    saida = args.saida or Path(f"{base}{SUFIXO_SAIDA}.mp4")

    info = info_video(video)
    log(f"Vídeo: {info['largura']}x{info['altura']}, {info['fps']} fps, áudio {info['audio']}")
    if not info["audio"]:
        sys.exit("O vídeo não tem áudio.")
    trocas, termos = ler_glossario()

    # 1-2) áudio + transcrição (reaproveitada se já existir)
    if arq_transcricao.exists() and not args.retranscrever:
        log(f"Usando transcrição salva ({arq_transcricao}).")
        frases = json.loads(arq_transcricao.read_text(encoding="utf-8"))
    else:
        audio = trabalho / "audio.wav"
        extrair_audio(video, audio)
        frases = transcrever(audio, termos)
        arq_transcricao.write_text(json.dumps(frases, ensure_ascii=False, indent=1),
                                   encoding="utf-8")
        audio.unlink(missing_ok=True)
    if not frases:
        sys.exit("O Whisper não encontrou fala no vídeo.")

    # 3) revisão: glossário automático + edição manual opcional
    if not arq_revisao.exists() or args.nova_revisao or args.retranscrever:
        arq_revisao.write_text(texto_inicial(frases, trocas), encoding="utf-8")
    else:
        log(f"Usando revisão salva ({arq_revisao}). Use --nova-revisao para refazer.")
    if args.revisar:
        revisar_no_editor(arq_revisao)
    texto = arq_revisao.read_text(encoding="utf-8")
    print("\nTexto final:\n" + texto)
    palavras = alinhar(frases, texto)

    # 4) blocos + .ass + .srt
    fonte = garantir_fonte()
    medidor = Medidor(fonte, round(TAMANHO_FONTE * info["largura"] / 1080)) if fonte \
        else Medidor("", round(TAMANHO_FONTE * info["largura"] / 1080))
    blocos = montar_blocos(palavras, medidor, info["largura"] * (1 - 2 * MARGEM_LATERAL))
    tempos = tempos_dos_blocos(blocos)
    gerar_ass(blocos, tempos, medidor, info, arq_ass)
    gerar_srt(blocos, tempos, arq_srt)
    (trabalho / "palavras.json").write_text(
        json.dumps([asdict(p) for p in palavras], ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"{len(blocos)} blocos -> {arq_ass} e {arq_srt}")
    if args.so_legenda:
        return

    # 5) grava no vídeo (fonte e .ass copiados para a pasta de trabalho)
    pasta_fontes = None
    if fonte:
        pasta_fontes = trabalho / "fonts"
        pasta_fontes.mkdir(exist_ok=True)
        shutil.copy2(fonte, pasta_fontes / fonte.name)
    shutil.copy2(arq_ass, trabalho / "legenda.ass")
    renderizar(video, trabalho / "legenda.ass", pasta_fontes, info, saida)
    log(f"Pronto: {saida}")


if __name__ == "__main__":
    main()
