# Contact sheet do vídeo final: 1 frame a cada 0,5 s (uso: python work/contact_sheet.py video.mp4 saida.png)
import sys, glob, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
video, destino = sys.argv[1], sys.argv[2]
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "fps=2", os.path.join(tmp, "f%03d.png")], check=True)
fs = sorted(glob.glob(os.path.join(tmp, "*.png")))
im0 = Image.open(fs[0]); w = 216; h = int(im0.height * w / im0.width); cols = 10
f = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "..", "fontes", "Poppins-Bold.ttf"), 16)
sh = Image.new("RGB", (cols * (w + 4), ((len(fs) + cols - 1) // cols) * (h + 22)), "#222"); d = ImageDraw.Draw(sh)
for k, p in enumerate(fs):
    x, y = (k % cols) * (w + 4), (k // cols) * (h + 22)
    sh.paste(Image.open(p).convert("RGB").resize((w, h)), (x, y + 20)); d.text((x + 3, y + 1), f"{k / 2:.1f}s", font=f, fill="#FAB005")
sh.save(destino); print(destino, len(fs), "frames")
