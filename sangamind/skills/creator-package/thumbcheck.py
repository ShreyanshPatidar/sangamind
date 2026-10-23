"""Show thumbnails the way viewers see them: tiny, in a feed, on YouTube's dark and light modes.

    python3 thumbcheck.py a.png b.png c.png -o sheet.png

Each thumbnail appears at mobile-feed width (168 px) and home-feed width (320 px), once on the dark
feed (#0F0F0F) and once on the light feed (#FFFFFF), with a fake title line underneath for scale.
If the words or the moment don't read at 168 px in one second, the thumbnail fails.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZES = (168, 320)
MODES = (("dark", "#0F0F0F", "#F1F1F1", "#AAAAAA"), ("light", "#FFFFFF", "#0F0F0F", "#606060"))


def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("thumbs", nargs="+")
    ap.add_argument("-o", "--out", default="thumbcheck.png")
    a = ap.parse_args()

    ims = [Image.open(p).convert("RGB") for p in a.thumbs]
    pad, gap = 24, 18
    col_w = sum(SIZES) + gap * (len(SIZES) - 1)
    row_h = int(max(SIZES) * 9 / 16) + 44
    W = pad * 2 + col_w * len(MODES) + pad * (len(MODES) - 1)
    H = pad * 2 + row_h * len(ims) + 30
    sheet = Image.new("RGB", (W, H), "#777777")
    d = ImageDraw.Draw(sheet)
    for m, (mode, bg, fg, sub) in enumerate(MODES):
        x0 = pad + m * (col_w + pad)
        d.rectangle([x0 - 8, pad - 8, x0 + col_w + 8, H - pad + 8], fill=bg)
        d.text((x0, pad - 4), f"YouTube {mode} mode", fill=sub, font=font(14))
        for r, (im, path) in enumerate(zip(ims, a.thumbs)):
            y = pad + 26 + r * row_h
            x = x0
            for w in SIZES:
                h = int(w * 9 / 16)
                sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y))
                d.text((x, y + h + 5), Path(path).stem[:28], fill=fg, font=font(12 if w < 200 else 14))
                x += w + gap
    sheet.save(a.out)
    print(f"{a.out}: {len(ims)} thumbnails x {len(SIZES)} sizes x {len(MODES)} modes")


if __name__ == "__main__":
    main()
