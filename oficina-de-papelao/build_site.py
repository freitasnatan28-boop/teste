# -*- coding: utf-8 -*-
"""
Gera a página de vendas em dist/site/ (Fase 5).

  python build_site.py

Passos:
  1. gera o PDF com build.py (se ainda não existir ou se estiver velho);
  2. renderiza capa, 3 páginas de projeto, checklist e certificado;
  3. monta o hero (capa na frente + 2 páginas inclinadas atrás);
  4. cria og.png (1200 x 630), favicon e fontes Poppins em woff2;
  5. monta a galeria com fotos reais, se houver fotos em imagens/;
  6. preenche site_src/index.html e as páginas de privacidade e termos
     com os dados do config.py.
"""
import os, re, sys, glob, shutil, datetime, importlib, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PASTA = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PASTA)
import config as C

SRC = os.path.join(PASTA, "site_src")
OUT = os.path.join(PASTA, "dist", "site")
PDF = os.path.join(PASTA, "Oficina-de-Papelao-120-projetos.pdf")
CATS = ["Veículos", "Céu e Espaço", "Fundo do Mar", "Casas e Cidade", "Castelos e Fantasia",
        "Animais da Fazenda", "Animais Selvagens", "Dinossauros", "Robôs e Invenções",
        "Casinha de Brincar", "Jogos e Brincadeiras", "Música e Arte"]
# Projetos mostrados em "Veja como é por dentro" (os mesmos do "antes e depois")
PAGINAS_DESTAQUE = [1, 11, 91]
CREAM, KRAFT, KRAFT_D, INK = "#FFF8EE", "#C89B6D", "#8A6440", "#2B2A33"
pendencias = []


# ---------------------------------------------------------------- utilidades
def projetos():
    P = []
    for m in ("d1", "d2", "d3", "d4", "d5", "d6"):
        P += importlib.import_module(m).P
    return sorted(P, key=lambda p: p["n"])


def pagina_do_projeto(P, n):
    """Mesma numeração do build.py: 4 páginas iniciais + (capa da categoria + 10) por categoria."""
    p = next(x for x in P if x["n"] == n)
    irmaos = [x["n"] for x in P if x["c"] == p["c"]]
    return 5 + p["c"] * 11 + 1 + irmaos.index(n)


def gerar_pdf():
    fontes = [os.path.join(PASTA, "build.py")] + glob.glob(os.path.join(PASTA, "d?.py"))
    fotos = glob.glob(os.path.join(PASTA, "imagens*", "*"))
    if os.path.exists(PDF) and os.path.getmtime(PDF) > max(os.path.getmtime(f) for f in fontes + fotos):
        return
    print("Gerando o PDF com build.py…")
    subprocess.run([sys.executable, "build.py"], cwd=PASTA, check=True)


def render(pagina, dpi=150):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(pagina), "-l", str(pagina), "-png",
                        "-singlefile", PDF, os.path.join(tmp, "p")], check=True)
        return Image.open(os.path.join(tmp, "p.png")).convert("RGB")


def salvar_webp(im, nome, largura, q=80):
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, "img", nome), "WEBP", quality=q, method=6)
    return im.size


def img_tag(src, size, alt, cls="", lazy=True, extra=""):
    attrs = f' class="{cls}"' if cls else ""
    load = ' loading="lazy" decoding="async"' if lazy else ""
    return f'<img{attrs} src="img/{src}" width="{size[0]}" height="{size[1]}" alt="{alt}"{load}{extra}>'


def fonte(peso, tam):
    arq = {"R": "Poppins-Regular", "M": "Poppins-Medium", "B": "Poppins-Bold"}[peso]
    return ImageFont.truetype(os.path.join(PASTA, arq + ".ttf"), tam)


def com_sombra(canvas, pagina, x, y, blur=18, dy=14, alpha=70):
    """Cola uma página (RGBA) no canvas com sombra suave embaixo."""
    sombra = Image.new("RGBA", pagina.size, (0, 0, 0, 0))
    sombra.putalpha(pagina.getchannel("A").point(lambda a: a * alpha // 255))
    margem = blur * 3
    base = Image.new("RGBA", (pagina.width + 2 * margem, pagina.height + 2 * margem), (0, 0, 0, 0))
    base.paste(sombra, (margem, margem))
    base = base.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(base, (x - margem, y - margem + dy))
    canvas.alpha_composite(pagina, (x, y))


def arredondar(im, raio):
    im = im.convert("RGBA")
    mascara = Image.new("L", im.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, im.width - 1, im.height - 1), raio, fill=255)
    im.putalpha(mascara)
    return im


# ---------------------------------------------------------------- imagens
def fazer_hero(capa, pag_a, pag_b):
    W, H = 1100, 900
    tela = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    atras_h, frente_h = 680, 800
    for pag, ang, cx in ((pag_a, 8, 300), (pag_b, -8, 800)):
        p = arredondar(pag.resize((round(atras_h / 1.4142), atras_h), Image.LANCZOS), 10)
        p = p.rotate(ang, resample=Image.BICUBIC, expand=True)
        com_sombra(tela, p, cx - p.width // 2, 130 + (H - 130 - p.height) // 2 - 20, blur=16, alpha=55)
    frente = arredondar(capa.resize((round(frente_h / 1.4142), frente_h), Image.LANCZOS), 12)
    com_sombra(tela, frente, (W - frente.width) // 2, 36, blur=22, dy=18, alpha=85)
    tela = tela.crop(tela.getbbox())
    tamanhos = {}
    for larg in (1100, 800, 560):
        im = tela.resize((larg, round(tela.height * larg / tela.width)), Image.LANCZOS) if tela.width > larg else tela
        im.save(os.path.join(OUT, "img", f"hero-{larg}.webp"), "WEBP", quality=82, method=6)
        tamanhos[larg] = im.size
    return tamanhos


def fazer_og(capa):
    W, H = 1200, 630
    og = Image.new("RGBA", (W, H), CREAM)
    d = ImageDraw.Draw(og)
    d.rectangle((0, H - 150, W, H), fill=KRAFT)
    for y in range(H - 150, H, 7):
        d.line((0, y, W, y), fill=(160, 120, 80, 255), width=1)
    frente = arredondar(capa.resize((388, 548), Image.LANCZOS), 10).rotate(-4, resample=Image.BICUBIC, expand=True)
    com_sombra(og, frente, 60, 30, blur=16, alpha=90)
    d = ImageDraw.Draw(og)
    x = 520
    d.text((x, 70), "GUIA EM PDF · 120 PROJETOS", font=fonte("B", 26), fill="#C92A2A")
    d.text((x, 108), "Oficina de", font=fonte("B", 72), fill=INK)
    d.text((x, 188), "Papelão", font=fonte("B", 88), fill=KRAFT_D)
    d.multiline_text((x, 312), "Caixas, rolos e tampinhas viram\nbrinquedos para fazer com\nas crianças de 3 a 10 anos.",
                     font=fonte("R", 30), fill=INK, spacing=10)
    selo = f"R$ {C.PRECO}"
    f = fonte("B", 40); tw = d.textlength(selo, font=f)
    d.rounded_rectangle((x, 500, x + tw + 56, 572), 36, fill="#237A35")
    d.text((x + 28, 507), selo, font=f, fill="white")
    og.convert("RGB").save(os.path.join(OUT, "og.png"), optimize=True)


FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#C89B6D"/>
<path d="M14 26 32 18l18 8v22l-18 8-18-8z" fill="#FFF8EE"/>
<path d="M14 26l18 8 18-8M32 34v22" fill="none" stroke="#8A6440" stroke-width="3" stroke-linejoin="round"/>
<path d="M14 26 8 34l18 8 6-8zM50 26l6 8-18 8-6-8z" fill="#E9D3B6" stroke="#8A6440" stroke-width="2.5" stroke-linejoin="round"/>
</svg>"""


def fazer_favicon():
    with open(os.path.join(OUT, "favicon.svg"), "w") as f:
        f.write(FAVICON_SVG)
    # Mesmo desenho em PNG (32 e 180 px), feito em 640 px e reduzido
    s = 10
    im = Image.new("RGBA", (64 * s, 64 * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    P = lambda pts: [(a * s, b * s) for a, b in pts]
    d.rounded_rectangle((0, 0, 64 * s - 1, 64 * s - 1), 14 * s, fill=KRAFT)
    d.polygon(P([(14, 26), (32, 18), (50, 26), (50, 48), (32, 56), (14, 48)]), fill=CREAM)
    d.line(P([(14, 26), (32, 34), (50, 26)]), fill=KRAFT_D, width=3 * s, joint="curve")
    d.line(P([(32, 34), (32, 56)]), fill=KRAFT_D, width=3 * s)
    for aba in ([(14, 26), (8, 34), (26, 42), (32, 34)], [(50, 26), (56, 34), (38, 42), (32, 34)]):
        d.polygon(P(aba), fill="#E9D3B6", outline=KRAFT_D, width=int(2.5 * s))
    im.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, "favicon-32.png"))
    fundo = Image.new("RGBA", (64 * s, 64 * s), KRAFT)  # ícone da Apple sem transparência
    fundo.alpha_composite(im)
    fundo.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"))


def fazer_fontes():
    """Poppins em woff2, só com os caracteres usados em português e sem hinting
    (o hinting das TTF deixa o espaçamento entre letras irregular em telas 1x)."""
    from fontTools import subset
    os.makedirs(os.path.join(OUT, "fonts"), exist_ok=True)
    faixas = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201E,U+2022,U+2026,U+20AC,U+2192"
    for peso, arq in ((400, "Poppins-Regular"), (500, "Poppins-Medium"), (700, "Poppins-Bold")):
        subset.main([os.path.join(PASTA, arq + ".ttf"), f"--unicodes={faixas}", "--flavor=woff2",
                     "--layout-features=kern,liga", "--no-hinting", "--desubroutinize", f"--output-file={os.path.join(OUT, 'fonts', f'poppins-{peso}.woff2')}"])


def foto_do_projeto(n):
    for pasta in ("imagens_otimizadas", "imagens"):
        for ext in ("jpg", "jpeg", "png", "webp"):
            f = os.path.join(PASTA, pasta, f"{n:03d}.{ext}")
            if os.path.exists(f):
                return f
    return None


def fazer_galeria(P):
    """Uma foto real por categoria (o primeiro projeto que tiver foto)."""
    itens = []
    for ci, nome in enumerate(CATS):
        for p in (x for x in P if x["c"] == ci):
            f = foto_do_projeto(p["n"])
            if f:
                im = Image.open(f).convert("RGB")
                alvo = 4 / 3  # corta no centro em 4:3
                if im.width / im.height > alvo:
                    w = round(im.height * alvo); im = im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, im.height))
                else:
                    h = round(im.width / alvo); im = im.crop((0, (im.height - h) // 2, im.width, (im.height - h) // 2 + h))
                im = im.resize((480, 360), Image.LANCZOS)
                nome_arq = f"galeria-{p['n']:03d}.webp"
                im.save(os.path.join(OUT, "img", nome_arq), "WEBP", quality=78, method=6)
                itens.append(f'<figure>{img_tag(nome_arq, (480, 360), p["t"] + " feito de papelão")}'
                             f'<figcaption><b>{nome}</b>{p["t"]}</figcaption></figure>')
                break
    if not itens:
        pendencias.append("Galeria: nenhuma foto em imagens/, a seção ficou oculta")
        return "<!-- GALERIA: aparece sozinha quando houver fotos em imagens/ (rode build_site.py de novo) -->"
    if len(itens) < 12:
        pendencias.append(f"Galeria: só {len(itens)} de 12 categorias têm foto")
    return ('<section><div class="wrap"><h2>Feitos com papelão de verdade</h2>'
            '<p class="lead">Um projeto de cada categoria, montado seguindo o guia.</p>'
            f'<div class="gal">{"".join(itens)}</div></div></section>')


# ---------------------------------------------------------------- textos
def pixel_html():
    if C.pendente(C.PIXEL_ID):
        pendencias.append("Pixel da Meta: PENDENTE (código comentado no <head>)")
        return """<!-- ====== PIXEL DA META (PENDENTE) ======
     Para ativar: coloque o ID do pixel em config.py (PIXEL_ID = "123...") e rode
     python build_site.py. O código abaixo é gerado sozinho, com PageView no carregamento.
     Os eventos ViewContent (oferta na tela) e InitiateCheckout (clique em comprar)
     já estão prontos no script do fim da página e passam a funcionar quando o pixel existir.
<script>!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','SEU_PIXEL_ID');fbq('track','PageView');</script>
     ====================================== -->"""
    pid = re.sub(r"\D", "", C.PIXEL_ID)
    return f"""<!-- Pixel da Meta -->
<script>
!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','{pid}');
fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id={pid}&ev=PageView&noscript=1"></noscript>"""


def checkout_href():
    if C.pendente(C.LINK_CHECKOUT):
        pendencias.append("Link do checkout: PENDENTE (os botões levam para #oferta)")
        return "#oferta"
    return C.LINK_CHECKOUT.strip()


def rodape():
    linhas = [f"{C.NOME_MARCA} · Todos os direitos reservados"]
    ident = [v for v in (C.RESPONSAVEL, ("CNPJ/CPF " + C.DOCUMENTO) if not C.pendente(C.DOCUMENTO) else "") if v and not C.pendente(v)]
    if ident:
        linhas.append(" · ".join(ident))
    else:
        pendencias.append("Responsável e CNPJ/CPF: PENDENTE (exigidos no rodapé pelo Decreto 7.962/2013)")
    if not C.pendente(C.EMAIL_SUPORTE):
        linhas.append(f'Suporte: <a href="mailto:{C.EMAIL_SUPORTE}">{C.EMAIL_SUPORTE}</a>')
    else:
        pendencias.append("E-mail de suporte: PENDENTE (fora do rodapé por enquanto)")
    linhas.append('<a href="privacidade.html">Política de privacidade</a> · <a href="termos.html">Termos de uso</a>')
    linhas.append("Este produto é digital e não tem vínculo com o Facebook, o Instagram ou o Google.")
    return "<br>\n ".join(linhas)


def v(valor, rotulo):
    """Valor do config ou um marcador visível [PENDENTE: …] (usado nas páginas legais)."""
    return valor if not C.pendente(valor) else f"<mark>[PENDENTE: {rotulo}]</mark>"


def texto_privacidade():
    email = v(C.EMAIL_SUPORTE, "e-mail de suporte")
    plataforma = v(C.PLATAFORMA, "plataforma de pagamento")
    return f"""
<p>Esta política explica como o {C.NOME_MARCA} trata os dados pessoais de quem visita este site e de quem compra o guia digital, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).</p>
<h2>1. Quem é o responsável</h2>
<p>O controlador dos dados é {v(C.RESPONSAVEL, "nome ou razão social")}, CNPJ/CPF {v(C.DOCUMENTO, "CNPJ ou CPF")}. Contato para assuntos de privacidade: {email}.</p>
<h2>2. Quais dados coletamos</h2>
<ul>
<li><b>Dados da compra</b>: nome, e-mail, CPF, telefone e dados de pagamento, informados por você no checkout. Esses dados são coletados e processados pela plataforma de pagamento ({plataforma}), que tem política de privacidade própria. Nós não recebemos o número completo do seu cartão.</li>
<li><b>Dados de navegação</b>: páginas visitadas, tipo de aparelho e navegador, endereço IP aproximado e os parâmetros do anúncio de origem (como utm_source e fbclid), coletados por cookies e tecnologias parecidas.</li>
<li><b>Contato</b>: as informações que você enviar ao falar com o suporte.</li>
</ul>
<h2>3. Para que usamos</h2>
<ul>
<li>Entregar o produto comprado e prestar suporte (execução de contrato, art. 7º, V, da LGPD).</li>
<li>Cumprir obrigações legais e fiscais (art. 7º, II).</li>
<li>Medir o resultado dos anúncios e melhorar o site, com o Pixel da Meta e ferramentas parecidas (legítimo interesse, art. 7º, IX, ou consentimento, quando exigido).</li>
</ul>
<h2>4. Cookies e Pixel da Meta</h2>
<p>Este site pode usar o Pixel da Meta (Facebook e Instagram), que registra eventos como a visita à página, a visualização da oferta e o clique no botão de compra. Assim sabemos quais anúncios funcionam. Você pode bloquear ou apagar cookies nas configurações do seu navegador e ajustar as preferências de anúncios na sua conta da Meta.</p>
<h2>5. Com quem compartilhamos</h2>
<p>Só com quem é necessário para o serviço funcionar: a plataforma de pagamento e entrega, o serviço de hospedagem do site e a Meta (medição de anúncios). Não vendemos dados pessoais.</p>
<h2>6. Por quanto tempo guardamos</h2>
<p>Pelo tempo necessário para as finalidades acima e para cumprir prazos legais (por exemplo, obrigações fiscais e de defesa do consumidor).</p>
<h2>7. Seus direitos</h2>
<p>Pelo art. 18 da LGPD, você pode pedir a confirmação e o acesso aos seus dados, a correção, a anonimização, o bloqueio ou a eliminação, a portabilidade, informações sobre o compartilhamento e a revogação do consentimento. Basta escrever para {email}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
<h2>8. Segurança</h2>
<p>Usamos conexão segura (HTTPS) e plataformas com medidas de segurança reconhecidas. Nenhum sistema é 100% invulnerável, mas trabalhamos para proteger seus dados.</p>
<h2>9. Crianças</h2>
<p>O guia é feito para adultos usarem com crianças. A compra deve ser feita por um adulto, e não coletamos dados de crianças de propósito.</p>
<h2>10. Mudanças</h2>
<p>Esta política pode ser atualizada. A data da última versão fica no topo da página.</p>
"""


def texto_termos():
    email = v(C.EMAIL_SUPORTE, "e-mail de suporte")
    return f"""
<p>Estes termos valem para a compra e o uso do guia digital <b>{C.NOME_PRODUTO}</b>, vendido por {v(C.RESPONSAVEL, "nome ou razão social")}, CNPJ/CPF {v(C.DOCUMENTO, "CNPJ ou CPF")}. Ao comprar, você concorda com eles.</p>
<h2>1. O produto</h2>
<p>É um guia digital em PDF, com 120 projetos de brinquedos de papelão e bônus (checklist e certificado). Não é um produto físico e nada é enviado pelo correio.</p>
<h2>2. Preço, pagamento e entrega</h2>
<p>O preço é o informado na página no momento da compra (R$ {C.PRECO}, pagamento único). O pagamento é processado pela plataforma {v(C.PLATAFORMA, "plataforma de pagamento")}. Depois da aprovação, o acesso é enviado ao e-mail informado na compra. Se não chegar, confira o spam e a aba Promoções e fale com o suporte.</p>
<h2>3. Direito de arrependimento e garantia de 7 dias</h2>
<p>Conforme o art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990), você pode desistir da compra em até 7 dias, contados da compra ou do recebimento do acesso, e receber de volta 100% do valor pago, sem precisar explicar o motivo. O pedido pode ser feito pela plataforma de pagamento ou pelo e-mail {email}. O reembolso segue os prazos do meio de pagamento usado.</p>
<h2>4. Uso permitido</h2>
<p>A compra dá uma licença pessoal e intransferível para usar o guia em casa, com a família, ou em atividades com crianças (por exemplo, numa sala de aula). É permitido imprimir as páginas para esse uso. Não é permitido revender, compartilhar o arquivo, publicar na internet ou distribuir o conteúdo, total ou parcialmente, sem autorização por escrito. O conteúdo é protegido pela Lei de Direitos Autorais (Lei nº 9.610/1998).</p>
<h2>5. Segurança das atividades</h2>
<p>Os projetos devem ser feitos com um adulto responsável por perto. As etapas marcadas como <b>Adulto</b> (estilete, furos, cola quente e similares) devem ser feitas só por adultos. Materiais pequenos podem causar engasgo e devem ficar longe de crianças pequenas. As idades são sugestões: cabe ao adulto avaliar se a atividade é adequada para cada criança.</p>
<h2>6. Resultados</h2>
<p>O guia traz ideias e instruções de brincadeiras. Cada criança tem seu ritmo, e o resultado dos projetos depende dos materiais e de quem monta.</p>
<h2>7. Suporte</h2>
<p>Dúvidas, problemas de acesso ou pedidos: {email}.</p>
<h2>8. Mudanças e foro</h2>
<p>Estes termos podem ser atualizados, e a versão em vigor é a publicada nesta página. Fica eleito o foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.</p>
"""


# ---------------------------------------------------------------- montagem
def main():
    P = projetos()
    gerar_pdf()
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "img"))

    print("Renderizando páginas do PDF…")
    capa = render(1)
    destaques = [(n, render(pagina_do_projeto(P, n))) for n in PAGINAS_DESTAQUE]
    checklist, certificado = render(137), render(138)

    hero = fazer_hero(capa, destaques[0][1], destaques[1][1])
    titulo = {p["n"]: p["t"] for p in P}
    tags = {"IMG_HERO": f'<img class="mock" src="img/hero-1100.webp" srcset="img/hero-560.webp 560w, img/hero-800.webp 800w, img/hero-1100.webp 1100w" '
                        f'sizes="(max-width:600px) calc(100vw - 40px), 560px" width="{hero[1100][0]}" height="{hero[1100][1]}" '
                        f'alt="Capa do guia Oficina de Papelão com duas páginas de projeto atrás" fetchpriority="high">'}
    for k, (n, im) in enumerate(destaques, 1):
        size = salvar_webp(im, f"pagina-{n:03d}.webp", 480)
        tags[f"IMG_P{k}"] = img_tag(f"pagina-{n:03d}.webp", size, f"Página do projeto {n:02d}: {titulo[n]}, com materiais, peças e passo a passo")
    tags["IMG_B1"] = img_tag("checklist.webp", salvar_webp(checklist, "checklist.webp", 424), "Página do checklist dos 120 projetos")
    tags["IMG_B2"] = img_tag("certificado.webp", salvar_webp(certificado, "certificado.webp", 424), "Certificado de Pequeno Construtor para imprimir")

    fazer_og(capa)
    fazer_favicon()
    fazer_fontes()

    if C.pendente(C.DOMINIO):
        pendencias.append("Domínio: PENDENTE (og:image relativo; a prévia no Facebook precisa do endereço completo)")
        og_image, canonical = "og.png", "<!-- canonical: aparece quando o domínio for definido em config.py -->"
    else:
        base = "https://" + C.DOMINIO.strip().replace("https://", "").replace("http://", "").strip("/")
        og_image, canonical = base + "/og.png", f'<link rel="canonical" href="{base}/">\n<meta property="og:url" content="{base}/">'

    html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
    troca = dict(tags, PRECO=C.PRECO, PRECO_NUM=C.PRECO.replace(",", "."), CHECKOUT=checkout_href(), PIXEL=pixel_html(),
                 OG_IMAGE=og_image, CANONICAL=canonical, RODAPE=rodape(), GALERIA=fazer_galeria(P))
    for k, val in troca.items():
        html = html.replace("{{" + k + "}}", val)
    sobras = re.findall(r"\{\{\w+\}\}", html)
    assert not sobras, f"Marcadores sem valor: {sobras}"
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    legal = open(os.path.join(SRC, "legal.html"), encoding="utf-8").read()
    hoje = datetime.date.today().strftime("%d/%m/%Y")
    for arq, tit, conteudo in (("privacidade.html", "Política de privacidade", texto_privacidade()),
                               ("termos.html", "Termos de uso", texto_termos())):
        with open(os.path.join(OUT, arq), "w", encoding="utf-8") as f:
            f.write(legal.replace("{{TITULO}}", tit).replace("{{DATA}}", hoje).replace("{{CONTEUDO}}", conteudo))

    n_botoes = len(re.findall(r'class="[^"]*js-checkout', html))
    tamanho = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, "**", "*"), recursive=True) if os.path.isfile(f))
    print(f"\ndist/site/ pronto: {n_botoes} botões de compra → {checkout_href()} · {tamanho / 1024:.0f} KB no total")
    if pendencias:
        print("Pendências:")
        for p in dict.fromkeys(pendencias):
            print("  -", p)


if __name__ == "__main__":
    main()
