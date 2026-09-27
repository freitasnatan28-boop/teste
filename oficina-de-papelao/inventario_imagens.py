# -*- coding: utf-8 -*-
"""
Inventário das fotos dos projetos (Fase 1).

Lê a pasta imagens/ e gera dist/relatorio-imagens.md com:
  - projetos sem foto (001 a 120);
  - fotos FRACAS (menor lado < 900 px);
  - arquivos com nome errado ou duplicados (mesmo número ou mesmo conteúdo);
  - suspeitas (lidas de suspeitas.txt, preenchido depois da revisão visual);
  - o prompt do ChatGPT para refazer cada foto que precisa de ajuste.

Uso: python inventario_imagens.py
"""
import os, re, sys, glob, hashlib, importlib
from PIL import Image

PASTA = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PASTA)
MIN_LADO = 900
EXTS = ("png", "jpg", "jpeg", "webp")

# Artigo e concordância de cada título (padrão: masculino singular "um ... feito").
FEMININOS = {6, 7, 9, 10, 16, 26, 27, 31, 35, 37, 38, 39, 42, 44, 46, 47, 50, 51, 53, 55,
             62, 65, 68, 78, 82, 84, 87, 90, 92, 93, 94, 96, 97, 99, 102, 107, 112, 120}
NOMES_ESPECIAIS = {  # títulos compostos ou no plural
    43: "uma espada e um escudo de cavaleiro feitos",
    80: "um par de garras de dinossauro feito",
    88: "um par de walkie-talkies feito",
    100: "uma mesa e uma cadeira de boneca feitas",
}
# Itens de acabamento que não ajudam o gerador a entender a forma do objeto.
ACABAMENTO = re.compile(r"^(tinta|tintas|cola|canetinha|canetinhas|fita|lápis|tesoura|grampeador|olhinhos|papel (branco|preto)$)", re.I)


def carregar_projetos():
    projetos = []
    for m in ("d1", "d2", "d3", "d4", "d5", "d6"):
        projetos += importlib.import_module(m).P
    return sorted(projetos, key=lambda p: p["n"])


def limpar_material(m):
    """'1 caixa de leite vazia e lavada' -> 'caixa de leite'."""
    m = re.sub(r"\(.*?\)", "", m)                      # tira parênteses
    m = re.sub(r"^\d+\s+(ou \d+\s+)?", "", m.strip())  # tira a quantidade
    m = re.sub(r"\s+(vazia e lavada|vazia|sem ponta|iguais)\b", "", m)
    m = m.split(" ou ")[0].strip(" ,")
    return m[0].lower() + m[1:] if m else m


def tres_materiais(p):
    principais = [limpar_material(m) for m in p["mat"] if not ACABAMENTO.match(m.strip())]
    extras = [limpar_material(m) for m in p["mat"] if ACABAMENTO.match(m.strip())]
    lista = []
    for m in principais + extras:
        if m and m not in lista:
            lista.append(m)
    lista = lista[:3]
    return ", ".join(lista[:-1]) + " e " + lista[-1] if len(lista) > 1 else lista[0]


def prompt(p):
    n = p["n"]
    if n in NOMES_ESPECIAIS:
        alvo = NOMES_ESPECIAIS[n]
    elif n in FEMININOS:
        alvo = f"uma {p['t']} feita"
    else:
        alvo = f"um {p['t']} feito"
    return f"{n:03d}: Imagem de {alvo} de papelão com {tres_materiais(p)}. Só uma imagem, seguindo as regras."


def inventario():
    arquivos = sorted(f for f in os.listdir(os.path.join(PASTA, "imagens")) if not f.startswith("."))
    por_numero, nome_errado, fracas, hashes = {}, [], [], {}
    for f in arquivos:
        caminho = os.path.join(PASTA, "imagens", f)
        base, ext = os.path.splitext(f)
        if ext.lower().lstrip(".") not in EXTS or not re.fullmatch(r"\d{3}", base) or not 1 <= int(base) <= 120:
            nome_errado.append(f)
            continue
        por_numero.setdefault(int(base), []).append(f)
        with open(caminho, "rb") as fh:
            hashes.setdefault(hashlib.md5(fh.read()).hexdigest(), []).append(f)
        with Image.open(caminho) as im:
            w, h = im.size
        if min(w, h) < MIN_LADO:
            fracas.append((int(base), f, w, h))
    duplicadas = [v for v in por_numero.values() if len(v) > 1] + [v for v in hashes.values() if len(v) > 1]
    faltando = [n for n in range(1, 121) if n not in por_numero]
    return arquivos, faltando, fracas, nome_errado, duplicadas


def ler_suspeitas():
    """suspeitas.txt: uma linha por foto, no formato 'NNN: motivo'."""
    arq = os.path.join(PASTA, "suspeitas.txt")
    if not os.path.exists(arq):
        return {}
    out = {}
    for linha in open(arq, encoding="utf-8"):
        m = re.match(r"\s*(\d{1,3})\s*:\s*(.+)", linha)
        if m:
            out[int(m.group(1))] = m.group(2).strip()
    return out


REGRAS = """Cole isto UMA VEZ no início da conversa (ou nas instruções do projeto) do ChatGPT.
Depois mande um prompt por vez.

> **Regras para todas as imagens da Oficina de Papelão**
> 1. Foto realista de um brinquedo artesanal feito à mão com papelão kraft e sucata, com cara de feito em casa (bordas de papelão aparentes, pintura com guache, um pouco imperfeito). Nada de plástico, nada de aparência de brinquedo industrial.
> 2. Formato horizontal 3:2 (1536 x 1024). O objeto inteiro aparece, centralizado, ocupando uns 70% da largura, com folga em cima e embaixo (a foto vai ser cortada em 16:10).
> 3. Fundo liso e claro (bege ou branco quente), em cima de uma mesa de madeira clara. Luz natural suave, sombra leve.
> 4. Sem pessoas, sem mãos, sem texto, sem letras, sem logotipos, sem marcas e sem personagens de desenho, filme ou jogo.
> 5. Sem estilete, tesoura com ponta, cola quente, sacos plásticos, pilhas ou peças muito pequenas soltas na cena.
> 6. Cores alegres e vivas, estilo de foto de revista infantil."""


def main():
    projetos = carregar_projetos()
    P = {p["n"]: p for p in projetos}
    arquivos, faltando, fracas, nome_errado, duplicadas = inventario()
    suspeitas = ler_suspeitas()
    refazer = sorted(set(faltando) | {n for n, *_ in fracas} | set(suspeitas))

    L = ["# Relatório das imagens – Oficina de Papelão", ""]
    L += [f"Arquivos em `imagens/`: **{len(arquivos)}** · com número válido: **{120 - len(faltando)} de 120**", ""]
    L += ["| Situação | Quantidade |", "| --- | --- |",
          f"| Faltando | {len(faltando)} |", f"| Fracas (menor lado < {MIN_LADO} px) | {len(fracas)} |",
          f"| Nome errado | {len(nome_errado)} |", f"| Duplicadas | {len(duplicadas)} |",
          f"| Suspeitas (revisão visual) | {len(suspeitas)} |", ""]

    L += ["## 1. Faltando", ""]
    if faltando:
        if len(faltando) == 120:
            L += ["**Todas as 120.** A pasta `imagens/` do zip veio vazia. Enquanto isso, o PDF usa a ilustração da categoria no lugar da foto.", ""]
        L += [", ".join(f"{n:03d}" for n in faltando), ""]
    else:
        L += ["Nenhuma. ✅", ""]

    L += ["## 2. Fracas", ""]
    L += [f"- {n:03d} ({f}): {w} x {h} px" for n, f, w, h in fracas] or ["Nenhuma."]
    L += [""]
    if nome_errado or duplicadas:
        L += ["### Nome errado ou duplicado", ""]
        L += [f"- `{f}`: renomeie para `NNN.png` (três dígitos, de 001 a 120)" for f in nome_errado]
        L += [f"- Duplicadas: {', '.join(d)}" for d in duplicadas]
        L += [""]

    L += ["## 3. Suspeitas", ""]
    if suspeitas:
        L += [f"- {n:03d} ({P[n]['t']}): {m}" for n, m in sorted(suspeitas.items())]
    elif len(faltando) == 120:
        L += ["Sem fotos, não há o que comparar. Quando elas chegarem, eu abro cada uma, comparo com o título e listo aqui."]
    else:
        L += ["Nenhuma."]
    L += [""]

    L += ["## 4. Prompts para gerar ou refazer no ChatGPT", "", "### Regras (sugestão)", "", REGRAS, ""]
    L += [f"### Prompts ({len(refazer)})", "", "```"]
    L += [prompt(P[n]) for n in refazer]
    L += ["```", ""]

    os.makedirs(os.path.join(PASTA, "dist"), exist_ok=True)
    with open(os.path.join(PASTA, "dist", "relatorio-imagens.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    print(f"dist/relatorio-imagens.md: {len(faltando)} faltando, {len(fracas)} fracas, "
          f"{len(nome_errado)} nome errado, {len(duplicadas)} duplicadas, {len(suspeitas)} suspeitas")


if __name__ == "__main__":
    main()
