import os, glob, math, importlib, sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white, Color
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

FD = os.path.dirname(os.path.abspath(__file__)) + "/"
for n, f in [("P", "Poppins-Regular"), ("PB", "Poppins-Bold"), ("PM", "Poppins-Medium"), ("PL", "Poppins-Light"), ("PI", "Poppins-Italic")]:
    pdfmetrics.registerFont(TTFont(n, FD + f + ".ttf"))
from reportlab.lib.fonts import addMapping
addMapping("P", 0, 0, "P"); addMapping("P", 1, 0, "PB"); addMapping("P", 0, 1, "PI"); addMapping("P", 1, 1, "PB")

W, H = A4
M = 34
INK = HexColor("#2B2A33")
MUTED = HexColor("#6B6875")
CREAM = HexColor("#FFF8EE")
KRAFT = HexColor("#C89B6D")
KRAFT_D = HexColor("#8A6440")
ADULT = HexColor("#E8590C")

CATS = [
    ("Veículos", "#E03131", "#FFE3E3"),
    ("Céu e Espaço", "#3B5BDB", "#E3E9FF"),
    ("Fundo do Mar", "#0C8599", "#DDF6F9"),
    ("Casas e Cidade", "#E67700", "#FFF0D6"),
    ("Castelos e Fantasia", "#9C36B5", "#F6E5FB"),
    ("Animais da Fazenda", "#5C940D", "#EAF6D8"),
    ("Animais Selvagens", "#D9480F", "#FFE8D9"),
    ("Dinossauros", "#2B8A3E", "#DDF3E2"),
    ("Robôs e Invenções", "#495057", "#E9ECEF"),
    ("Casinha de Brincar", "#D6336C", "#FFE3EE"),
    ("Jogos e Brincadeiras", "#1971C2", "#DCEEFF"),
    ("Música e Arte", "#F08C00", "#FFF1CC"),
]
TITLE = "Oficina de Papelão"
SUB = "120 projetos para brincar e criar com as crianças"

def col(i): return HexColor(CATS[i][1])
def tint(i): return HexColor(CATS[i][2])

def rr(c, x, y, w, h, r, fill=None, stroke=None, lw=1):
    c.saveState()
    if fill is not None: c.setFillColor(fill)
    if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=1 if fill is not None else 0, stroke=1 if stroke is not None else 0)
    c.restoreState()

def para(c, text, x, y_top, w, style):
    p = Paragraph(text, style)
    _, h = p.wrap(w, 2000)
    p.drawOn(c, x, y_top - h)
    return h

def ph(text, w, style):
    p = Paragraph(text, style); _, h = p.wrap(w, 2000); return h

def star(c, cx, cy, r, fill):
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5
        rad = r if k % 2 == 0 else r * 0.45
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    p.close(); c.setFillColor(fill); c.drawPath(p, fill=1, stroke=0)

# ---------------- category icons (drawn in a box centered at cx,cy with size s) ----------------
def poly(c, pts, fill, stroke=None, lw=2):
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    p.close(); c.setFillColor(fill)
    if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
    c.drawPath(p, fill=1, stroke=1 if stroke is not None else 0)

def icon(c, i, cx, cy, s, main, light=white):
    u = s / 100.0
    c.saveState(); c.setLineJoin(1); c.setLineCap(1)
    dark = INK
    def R(x, y, w, h, r=4, f=main): rr(c, cx + x * u, cy + y * u, w * u, h * u, r * u, fill=f)
    def C(x, y, r, f=main): c.setFillColor(f); c.circle(cx + x * u, cy + y * u, r * u, fill=1, stroke=0)
    def T(pts, f=main): poly(c, [(cx + a * u, cy + b * u) for a, b in pts], f)
    if i == 0:  # car
        R(-45, -12, 90, 26, 8); R(-25, 8, 45, 24, 8); R(-18, 12, 14, 14, 3, light); R(2, 12, 14, 14, 3, light)
        C(-25, -14, 12, dark); C(25, -14, 12, dark); C(-25, -14, 5, light); C(25, -14, 5, light)
    elif i == 1:  # rocket
        R(-14, -30, 28, 55, 6); T([(-14, 25), (14, 25), (0, 50)]); C(0, 5, 8, light)
        T([(-14, -30), (-30, -40), (-14, -5)]); T([(14, -30), (30, -40), (14, -5)])
        T([(-8, -30), (8, -30), (0, -50)], HexColor("#FFB703"))
    elif i == 2:  # fish
        c.setFillColor(main); c.ellipse(cx - 38 * u, cy - 20 * u, cx + 22 * u, cy + 20 * u, fill=1, stroke=0)
        T([(18, 0), (45, 20), (45, -20)]); C(-22, 5, 5, light); C(-22, 5, 2.2, dark)
        T([(-8, 18), (5, 30), (8, 16)])
    elif i == 3:  # house
        R(-32, -35, 64, 45, 3); T([(-42, 8), (42, 8), (0, 42)]); R(-8, -35, 16, 26, 3, light); R(14, -18, 12, 12, 2, light); R(-26, -18, 12, 12, 2, light)
    elif i == 4:  # castle
        R(-40, -38, 80, 50, 2)
        for k in range(5): R(-40 + k * 17, 12, 11, 10, 1)
        R(-12, 12, 24, 30, 2); T([(-14, 42), (14, 42), (0, 58)]); R(-10, -38, 20, 26, 10, light)
    elif i == 5:  # barn
        T([(-38, -38), (38, -38), (38, 12), (0, 40), (-38, 12)]); R(-16, -38, 32, 34, 2, light)
        c.setStrokeColor(main); c.setLineWidth(4 * u)
        c.line(cx - 16 * u, cy - 38 * u, cx + 16 * u, cy - 4 * u); c.line(cx + 16 * u, cy - 38 * u, cx - 16 * u, cy - 4 * u)
        R(-8, 8, 16, 12, 2, light)
    elif i == 6:  # lion
        for k in range(12):
            a = k * math.pi / 6; C(32 * math.cos(a), 32 * math.sin(a), 14)
        C(0, 0, 28, HexColor("#FFD43B")); C(-10, 6, 4, dark); C(10, 6, 4, dark)
        T([(-6, -4), (6, -4), (0, -11)], dark)
    elif i == 7:  # dino (long neck)
        c.setFillColor(main); c.ellipse(cx - 34 * u, cy - 22 * u, cx + 20 * u, cy + 10 * u, fill=1, stroke=0)
        T([(4, 0), (18, 4), (34, 40), (24, 44)]); C(33, 44, 9)
        T([(-30, -10), (-58, -18), (-30, 2)])
        R(-26, -40, 10, 24, 3); R(0, -40, 10, 24, 3); C(36, 47, 2.2, light)
        for a in (-20, -6, 8): C(a, 2, 3.5, HexColor("#FFB703"))
    elif i == 8:  # robot
        R(-30, -30, 60, 50, 8); R(-2, 20, 4, 14, 1); C(0, 38, 6, HexColor("#FFB703"))
        C(-12, 0, 8, light); C(12, 0, 8, light); C(-12, 0, 3.5, dark); C(12, 0, 3.5, dark)
        R(-14, -20, 28, 7, 3, light); R(-38, -10, 8, 16, 2); R(30, -10, 8, 16, 2)
    elif i == 9:  # stove
        R(-34, -40, 68, 72, 5); C(-14, 20, 8, dark); C(14, 20, 8, dark); C(-14, 20, 4, light); C(14, 20, 4, light)
        R(-26, -32, 52, 36, 4, light); R(-18, -2, 36, 3, 1, main)
        for k in range(3): C(-14 + k * 14, 36, 3.5, dark)
    elif i == 10:  # dice
        R(-34, -34, 68, 68, 12)
        for (a, b) in [(-17, 17), (17, 17), (0, 0), (-17, -17), (17, -17)]: C(a, b, 6, light)
    elif i == 11:  # music note
        C(-18, -28, 13); C(22, -18, 13); R(-8, -28, 7, 62, 1); R(32, -18, 7, 62, 1)
        T([(-8, 34), (39, 44), (39, 30), (-8, 20)])
    c.restoreState()

# ---------------- styles ----------------
def S(name, **kw):
    base = dict(fontName="P", fontSize=10, leading=14, textColor=INK)
    base.update(kw); return ParagraphStyle(name, **base)

# ---------------- page builders ----------------
def footer(c, page_no, i=None):
    c.setFont("P", 8); c.setFillColor(MUTED)
    c.drawString(M, 18, TITLE + "  ·  " + (CATS[i][0] if i is not None else SUB))
    c.drawRightString(W - M, 18, str(page_no))

def find_image(n):
    for ext in ("png", "jpg", "jpeg", "webp"):
        for pat in (f"{n:03d}", f"{n}"):
            f = f"imagens/{pat}.{ext}"
            if os.path.exists(f): return f
    return None

def image_box(c, pr, x, y, w, h):
    i = pr["c"]
    img = find_image(pr["n"])
    c.saveState()
    p = c.beginPath(); p.roundRect(x, y, w, h, 16); c.clipPath(p, stroke=0, fill=0)
    if img:
        ir = ImageReader(img); iw, ih = ir.getSize()
        sc = max(w / iw, h / ih); dw, dh = iw * sc, ih * sc
        c.drawImage(ir, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    else:
        c.setFillColor(tint(i)); c.rect(x, y, w, h, fill=1, stroke=0)
        # playful background dots
        c.setFillColor(Color(1, 1, 1, alpha=0.55))
        for k in range(14):
            cx = x + ((k * 97 + pr["n"] * 31) % int(w)); cy = y + ((k * 53 + pr["n"] * 17) % int(h))
            c.circle(cx, cy, 6 + (k % 4) * 5, fill=1, stroke=0)
        icon(c, i, x + w / 2, y + h / 2 + 4, min(h * 0.62, 150), col(i))
    c.restoreState()

def chip(c, x, y, label, value, color, w=None):
    c.setFont("PB", 9.5); vw = c.stringWidth(value, "PB", 9.5)
    c.setFont("P", 8.5); lw = c.stringWidth(label, "P", 8.5)
    w = w or (lw + vw + 22)
    rr(c, x, y, w, 22, 11, fill=white, stroke=color, lw=1.2)
    c.setFillColor(MUTED); c.setFont("P", 8.5); c.drawString(x + 10, y + 7.5, label)
    c.setFillColor(INK); c.setFont("PB", 9.5); c.drawString(x + 12 + lw, y + 7.2, value)
    return w

def step_text(s):
    s = s.replace("&", "&amp;")
    if s.startswith("[ADULTO] "):
        return f'<font name="PB" color="#E8590C">Adulto:</font> ' + s[len("[ADULTO] "):]
    return s

def project_page(c, pr, page_no):
    i = pr["c"]; cc = col(i)
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    # header
    hh = 78
    c.setFillColor(cc); c.rect(0, H - hh, W, hh, fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1, alpha=0.12)); c.circle(W - 60, H - 10, 70, fill=1, stroke=0); c.circle(W - 150, H - 80, 30, fill=1, stroke=0)
    c.setFillColor(white); c.circle(M + 26, H - hh / 2, 25, fill=1, stroke=0)
    c.setFillColor(cc); c.setFont("PB", 18); c.drawCentredString(M + 26, H - hh / 2 - 6.5, f"{pr['n']:02d}")
    c.setFillColor(white); c.setFont("PM", 9); c.drawString(M + 62, H - 30, CATS[i][0].upper())
    tsize = 22
    while c.stringWidth(pr["t"], "PB", tsize) > W - M * 2 - 70 and tsize > 14: tsize -= 1
    c.setFont("PB", tsize); c.drawString(M + 62, H - 30 - tsize - 2, pr["t"])

    cw = W - 2 * M
    # measure text blocks at base size, then fit image height
    def build(fs):
        st_b = S("b", fontSize=fs, leading=fs * 1.38)
        st_h = S("h", fontName="PB", fontSize=fs + 2.5, leading=fs + 6, textColor=cc)
        colw = (cw - 14) / 2
        mat = "<br/>".join("•&nbsp;&nbsp;" + m.replace("&", "&amp;") for m in pr["mat"])
        pec = "<br/>".join("•&nbsp;&nbsp;" + m.replace("&", "&amp;") for m in pr["pec"])
        h_cols = max(ph(mat, colw - 24, st_b), ph(pec, colw - 24, st_b)) + fs + 30
        steps = [step_text(s) for s in pr["pas"]]
        h_steps = sum(ph(s, cw - 50, st_b) + 5 for s in steps) + fs + 26
        boxw = (cw - 14) / 2
        h_box = max(ph(pr["brinca"].replace("&", "&amp;"), boxw - 24, st_b), ph(pr["apr"].replace("&", "&amp;"), boxw - 24, st_b)) + fs + 30
        return st_b, st_h, colw, mat, pec, h_cols, steps, h_steps, boxw, h_box
    avail = H - hh - 14 - 30 - 34  # below header, above footer; minus chips row
    for fs in (9.6, 9.2, 8.8, 8.4, 8.0, 7.6):
        st_b, st_h, colw, mat, pec, h_cols, steps, h_steps, boxw, h_box = build(fs)
        img_h = avail - (h_cols + h_steps + h_box + 3 * 10)
        if img_h >= 170: break
    img_h = max(120, min(img_h, 330))
    y = H - hh - 14
    image_box(c, pr, M, y - img_h, cw, img_h)
    y -= img_h + 10
    # chips
    x = M
    x += chip(c, x, y - 22, "Idade ", pr["i"], cc) + 8
    x += chip(c, x, y - 22, "Tempo ", pr["tm"], cc) + 8
    lvl = {1: "Fácil", 2: "Médio", 3: "Desafio"}[pr["d"]]
    lw_ = c.stringWidth("Nível ", "P", 8.5); vw_ = c.stringWidth(lvl, "PB", 9.5)
    w = chip(c, x, y - 22, "Nível ", lvl, cc, w=lw_ + vw_ + 22 + 36)
    for k in range(3):
        star(c, x + 12 + lw_ + vw_ + 10 + k * 11, y - 11, 4.6, HexColor("#FAB005") if k < pr["d"] else HexColor("#DEE2E6"))
    y -= 32
    # two columns
    for k, (title, body) in enumerate([("Você vai precisar", mat), ("Peças para recortar", pec)]):
        bx = M + k * (colw + 14)
        rr(c, bx, y - h_cols, colw, h_cols, 12, fill=white)
        c.setFillColor(cc); c.setFont("PB", st_h.fontSize); c.drawString(bx + 12, y - 12 - st_h.fontSize, title)
        para(c, body, bx + 12, y - st_h.fontSize - 20, colw - 24, st_b)
    y -= h_cols + 10
    # steps
    rr(c, M, y - h_steps, cw, h_steps, 12, fill=white)
    c.setFillColor(cc); c.setFont("PB", st_h.fontSize); c.drawString(M + 12, y - 12 - st_h.fontSize, "Passo a passo")
    yy = y - st_h.fontSize - 20
    for k, s in enumerate(steps):
        hs = ph(s, cw - 50, st_b)
        c.setFillColor(cc); c.circle(M + 22, yy - st_b.leading / 2 + 1, 8, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("PB", 8.5); c.drawCentredString(M + 22, yy - st_b.leading / 2 - 2, str(k + 1))
        para(c, s, M + 38, yy, cw - 50, st_b)
        yy -= hs + 5
    y -= h_steps + 10
    # bottom boxes
    for k, (title, body, fill) in enumerate([("Hora de brincar!", pr["brinca"], tint(i)), ("O que a criança desenvolve", pr["apr"], HexColor("#FFF3BF"))]):
        bx = M + k * (boxw + 14)
        rr(c, bx, y - h_box, boxw, h_box, 12, fill=fill)
        c.setFillColor(cc if k == 0 else HexColor("#B7791F")); c.setFont("PB", st_h.fontSize); c.drawString(bx + 12, y - 12 - st_h.fontSize, title)
        para(c, body.replace("&", "&amp;"), bx + 12, y - st_h.fontSize - 20, boxw - 24, st_b)
    footer(c, page_no, i)

def cover(c):
    c.setFillColor(HexColor("#FFF3E0")); c.rect(0, 0, W, H, fill=1, stroke=0)
    # kraft cardboard band
    c.setFillColor(KRAFT); c.rect(0, 0, W, 300, fill=1, stroke=0)
    c.setStrokeColor(Color(0.45, 0.3, 0.18, alpha=0.18)); c.setLineWidth(1)
    for k in range(0, 300, 7): c.line(0, k, W, k)
    # icons grid
    for k in range(12):
        cx = 72 + (k % 6) * 90; cy = 205 - (k // 6) * 110
        c.setFillColor(white); c.circle(cx, cy, 38, fill=1, stroke=0)
        icon(c, k, cx, cy, 52, col(k))
    # title
    c.setFillColor(HexColor("#E03131")); c.setFont("PB", 14); c.drawCentredString(W / 2, H - 150, "GUIA COMPLETO PARA FAZER EM CASA")
    c.setFillColor(INK); c.setFont("PB", 50); c.drawCentredString(W / 2, H - 215, "Oficina de")
    c.setFillColor(KRAFT_D); c.setFont("PB", 64); c.drawCentredString(W / 2, H - 285, "Papelão")
    # badge
    c.setFillColor(HexColor("#FAB005")); c.circle(W - 90, H - 80, 52, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("PB", 30); c.drawCentredString(W - 90, H - 78, "120")
    c.setFont("PM", 11); c.drawCentredString(W - 90, H - 96, "projetos")
    c.setFillColor(INK); c.setFont("P", 15); c.drawCentredString(W / 2, H - 330, "Brinquedos incríveis com caixas, rolos e sucata")
    c.drawCentredString(W / 2, H - 350, "que você já tem em casa. Para crianças de 3 a 10 anos.")
    # chips
    labels = ["Passo a passo simples", "Materiais baratos", "12 categorias"]
    tw = sum(c.stringWidth(l, "PM", 11) + 34 for l in labels) + 20
    x = (W - tw) / 2
    for l in labels:
        w = c.stringWidth(l, "PM", 11) + 34
        rr(c, x, H - 405, w, 28, 14, fill=white, stroke=KRAFT_D, lw=1.2)
        c.setFillColor(INK); c.setFont("PM", 11); c.drawCentredString(x + w / 2, H - 396, l); x += w + 10

def how_to(c, page_no):
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(KRAFT); c.rect(0, H - 110, W, 110, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("PB", 30); c.drawString(M, H - 70, "Antes de começar")
    c.setFont("P", 11); c.drawString(M, H - 92, "Tudo o que você precisa saber para aproveitar a oficina")
    st = S("b", fontSize=10.5, leading=15.5)
    sth = S("h", fontName="PB", fontSize=14, leading=18, textColor=KRAFT_D)
    blocks = [
        ("Como usar este guia", "Cada projeto tem uma página com idade indicada, tempo, nível de dificuldade, lista de materiais, peças para recortar (com medidas), passo a passo, uma ideia de brincadeira e o que a criança desenvolve. Escolha junto com a criança: deixar ela decidir já faz parte da diversão."),
        ("A caixa de materiais da família", "Vá guardando durante a semana: caixas de sapato, de leite, de cereal e de creme dental, rolos de papel higiênico e papel toalha, tampinhas, potes, copos descartáveis e garrafas PET. Tenha à mão: tesoura sem ponta, cola branca, fita crepe, tinta guache, pincéis, canetinhas, lápis de cor e barbante."),
        ("Segurança em primeiro lugar", "Todo passo marcado com <font name='PB' color='#E8590C'>Adulto:</font> deve ser feito por um adulto: cortes com estilete, furos com ponta e uso de cola quente. A criança participa pintando, colando, decorando e dando ideias. Lave bem as embalagens antes de usar e prefira tinta atóxica."),
        ("Medidas e moldes", "As medidas são aproximadas: não precisa régua perfeita. Para círculos, contorne tampas de pote, copos e tampinhas. Para retângulos, use uma régua ou a própria caixa como guia. O importante é a brincadeira, não a perfeição."),
        ("Níveis de dificuldade", "1 estrela = fácil, a criança faz quase tudo (a partir de 3 anos).  2 estrelas = médio, precisa de ajuda em algumas etapas.  3 estrelas = desafio, projeto para fazer em dupla com o adulto ou para crianças maiores."),
        ("Dica de ouro", "Deixe a tinta secar bem antes de colar as peças e tire uma foto de cada criação pronta. No final do guia tem um checklist dos 120 projetos e um certificado de Pequeno Construtor para entregar à criança."),
    ]
    y = H - 140
    for t, b in blocks:
        hb = ph(b, W - 2 * M - 30, st) + 40
        rr(c, M, y - hb, W - 2 * M, hb, 12, fill=white)
        c.setFillColor(KRAFT_D); c.setFont("PB", 13.5); c.drawString(M + 15, y - 24, t)
        para(c, b, M + 15, y - 32, W - 2 * M - 30, st)
        y -= hb + 12
    footer(c, page_no)

def sumario(c, projects, page_no, part):
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("PB", 28); c.drawString(M, H - 70, "Sumário" + (" (continuação)" if part else ""))
    cats = range(0, 6) if part == 0 else range(6, 12)
    y = H - 100
    colw = (W - 2 * M - 16) / 2
    for idx, ci in enumerate(cats):
        cx = M + (idx % 2) * (colw + 16)
        if idx % 2 == 0 and idx > 0: y -= 232
        rr(c, cx, y - 222, colw, 222, 12, fill=white)
        c.setFillColor(col(ci)); c.roundRect(cx, y - 30, colw, 30, 12, fill=1, stroke=0); c.rect(cx, y - 30, colw, 14, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("PB", 11.5); c.drawString(cx + 12, y - 20, CATS[ci][0])
        yy = y - 48
        for pr in [p for p in projects if p["c"] == ci]:
            c.setFillColor(col(ci)); c.setFont("PB", 9); c.drawString(cx + 12, yy, f"{pr['n']:02d}")
            c.setFillColor(INK); c.setFont("P", 9.3); c.drawString(cx + 32, yy, pr["t"][:44])
            c.setFillColor(MUTED); c.drawRightString(cx + colw - 12, yy, str(pr["_page"]))
            yy -= 17
    footer(c, page_no)

def divider(c, ci, projects, page_no):
    cc = col(ci)
    c.setFillColor(cc); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1, alpha=0.1))
    for k in range(9): c.circle((k * 131) % W, (k * 211) % H, 40 + (k % 3) * 30, fill=1, stroke=0)
    c.setFillColor(white); c.circle(W / 2, H - 230, 110, fill=1, stroke=0)
    icon(c, ci, W / 2, H - 230, 150, cc)
    c.setFillColor(white); c.setFont("PM", 13); c.drawCentredString(W / 2, H - 390, f"CATEGORIA {ci + 1:02d}")
    c.setFont("PB", 36); c.drawCentredString(W / 2, H - 432, CATS[ci][0])
    rr(c, M + 40, 70, W - 2 * M - 80, 300, 18, fill=white)
    y = 340
    for pr in [p for p in projects if p["c"] == ci]:
        c.setFillColor(cc); c.setFont("PB", 11); c.drawString(M + 64, y, f"{pr['n']:02d}")
        c.setFillColor(INK); c.setFont("P", 11); c.drawString(M + 94, y, pr["t"])
        c.setFillColor(MUTED); c.setFont("P", 10); c.drawRightString(W - M - 64, y, f"pág. {pr['_page']}")
        y -= 27
    c.setFillColor(white); c.setFont("P", 8); c.drawString(M, 18, TITLE); c.drawRightString(W - M, 18, str(page_no))

def checklist(c, projects, page_no):
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("PB", 26); c.drawString(M, H - 64, "Checklist dos 120 projetos")
    c.setFont("P", 10.5); c.setFillColor(MUTED); c.drawString(M, H - 84, "Pinte a caixinha de cada projeto que vocês já fizeram. Quantos você consegue completar?")
    cols = 3; colw = (W - 2 * M) / cols; rowh = 16.6
    per = 40
    for k, pr in enumerate(projects):
        cx = M + (k // per) * colw; cy = H - 112 - (k % per) * rowh
        rr(c, cx, cy - 3, 11, 11, 2.5, fill=white, stroke=col(pr["c"]), lw=1.3)
        c.setFillColor(col(pr["c"])); c.setFont("PB", 7.8); c.drawString(cx + 16, cy, f"{pr['n']:03d}")
        c.setFillColor(INK); c.setFont("P", 7.8)
        t = pr["t"]
        while c.stringWidth(t, "P", 7.8) > colw - 46: t = t[:-2]
        c.drawString(cx + 36, cy, t if t == pr["t"] else t + "…")
    footer(c, page_no)

def certificate(c, page_no):
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    rr(c, 28, 28, W - 56, H - 56, 24, fill=white, stroke=KRAFT_D, lw=3)
    rr(c, 40, 40, W - 80, H - 80, 18, stroke=KRAFT, lw=1.2)
    for k in range(12):
        cx = 88 + (k % 6) * ((W - 176) / 5); cy = H - 110 if k < 6 else 120
        c.setFillColor(tint(k)); c.circle(cx, cy, 28, fill=1, stroke=0); icon(c, k, cx, cy, 36, col(k))
    c.setFillColor(KRAFT_D); c.setFont("PB", 15); c.drawCentredString(W / 2, H - 250, "CERTIFICADO DE")
    c.setFillColor(INK); c.setFont("PB", 38); c.drawCentredString(W / 2, H - 298, "Pequeno Construtor")
    c.setFont("P", 13); c.setFillColor(MUTED); c.drawCentredString(W / 2, H - 340, "Certificamos que")
    c.setStrokeColor(INK); c.setLineWidth(1); c.line(150, H - 390, W - 150, H - 390)
    c.setFont("P", 12.5); c.setFillColor(INK)
    for k, l in enumerate(["transformou papelão em brinquedos incríveis,", "usou a imaginação, a paciência e muita criatividade", "e concluiu projetos da Oficina de Papelão."]):
        c.drawCentredString(W / 2, H - 425 - k * 20, l)
    c.setFont("P", 11); c.setFillColor(MUTED)
    c.drawString(150, H - 530, "Projetos concluídos: ______"); c.drawRightString(W - 150, H - 530, "Data: ___/___/_____")
    star(c, W / 2, H - 610, 34, HexColor("#FAB005"))

def main():
    projects = []
    for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "d*.py"))):
        mod = importlib.import_module(os.path.basename(f)[:-3]); projects += mod.P
    projects.sort(key=lambda p: p["n"])
    only = sys.argv[1] if len(sys.argv) > 1 else None
    # page numbering: 1 cover, 2 how-to, 3-4 sumario, then per category: divider + 10 pages
    page = 5
    for ci in range(12):
        page += 1
        for pr in [p for p in projects if p["c"] == ci]:
            pr["_page"] = page; page += 1
    out = "Oficina-de-Papelao-120-projetos.pdf" if not only else "preview.pdf"
    c = canvas.Canvas(out, pagesize=A4)
    c.setTitle(TITLE + " – " + SUB); c.setAuthor(TITLE)
    cover(c); c.showPage()
    how_to(c, 2); c.showPage()
    sumario(c, projects, 3, 0); c.showPage()
    sumario(c, projects, 4, 1); c.showPage()
    page = 5
    for ci in range(12):
        prs = [p for p in projects if p["c"] == ci]
        if not prs: continue
        divider(c, ci, projects, page); c.showPage(); page += 1
        for pr in prs:
            project_page(c, pr, page); c.showPage(); page += 1
    checklist(c, projects, page); c.showPage(); page += 1
    certificate(c, page); c.showPage()
    c.save(); print(out, page, "pages,", len(projects), "projects")

if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); main()
