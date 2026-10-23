"""Storyboard check: one still per scene with its time and the words spoken over it, before the full render.

    python storyboard.py 04 --studio ../_studio --out ../Syptian/renders/004

Run after export.py. Renders a still 70% into every scene (a few seconds each, no audio, no video file)
and draws storyboard.jpg: a grid of numbered frames, each with its time and the narration under it.
Read it like a comic: wrong picture for the words, a scene that's too long or too static, text over a
face, a clip that doesn't match - fix scenes.json and re-run this, not the render. Render once it reads right.
"""
import argparse
import json
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size, bold=False):
    for name in (["arialbd.ttf", "DejaVuSans-Bold.ttf"] if bold else ["arial.ttf", "DejaVuSans.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def spoken(words, start, end):
    return " ".join(w["text"] for w in words if start <= w["start"] < end).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("video", help="the folder name under _studio/public (e.g. 04)")
    ap.add_argument("--studio", default=str(Path(__file__).parent.parent / "_studio"))
    ap.add_argument("--out", required=True, help="where storyboard.jpg goes (the video's render folder)")
    ap.add_argument("--cols", type=int, default=4)
    a = ap.parse_args()

    studio, out = Path(a.studio).resolve(), Path(a.out)
    timeline = json.loads((studio / "public" / a.video / "timeline.json").read_text(encoding="utf-8"))
    frames_dir = out / "storyboard-frames"
    node = shutil.which("node") or sys.exit("node not found")
    subprocess.run([node, str(studio / "storyboard.mjs"), a.video, str(frames_dir.resolve()), "0.33"],
                   cwd=studio, check=True)
    frames = json.loads((frames_dir / "frames.json").read_text(encoding="utf-8"))

    w, h, pad, text_h = 640, 360, 18, 120
    rows = -(-len(frames) // a.cols)
    sheet = Image.new("RGB", (a.cols * (w + pad) + pad, rows * (h + text_h + pad) + pad + 70), "#0F5257")
    d = ImageDraw.Draw(sheet)
    d.text((pad, 18), f"STORYBOARD  {a.video}  -  {len(frames)} scenes, {timeline['duration']:.0f}s",
           fill="#F4F1EA", font=font(34, True))
    title, body = font(22, True), font(18)
    for k, f in enumerate(frames):
        x = pad + (k % a.cols) * (w + pad)
        y = 70 + pad + (k // a.cols) * (h + text_h + pad)
        im = Image.open(f["file"]).convert("RGB").resize((w, h))
        sheet.paste(im, (x, y))
        m, s = divmod(int(f["start"]), 60)
        scene = timeline["scenes"][f["i"]]
        what = scene.get("img") or scene.get("bg") or scene.get("map") or scene.get("text") or ""
        d.text((x, y + h + 6), f"{f['i']:02d}  {m}:{s:02d}  {f['end'] - f['start']:.1f}s  {f['type']}  {what}"[:62],
               fill="#F2A541", font=title)
        words = spoken(timeline["words"], f["start"], f["end"]) or "(no narration)"
        for j, line in enumerate(textwrap.wrap(words, 62)[:3]):
            d.text((x, y + h + 36 + j * 24), line, fill="#F4F1EA", font=body)
        if f["end"] - f["start"] > 12:
            d.rectangle([x, y, x + w - 1, y + h - 1], outline="#E5484D", width=5)  # long scene: check it moves
    path = out / "storyboard.jpg"
    sheet.save(path, quality=85)
    print(f"storyboard -> {path}  (red border = scene over 12 s)")


if __name__ == "__main__":
    main()
