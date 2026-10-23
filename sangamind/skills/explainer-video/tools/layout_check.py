"""Check a paper video's layout before rendering anything.

    python layout_check.py <_studio>/public/<video>/timeline.json [--assets <channel>/assets/<n>]

Flags, per scene, with the time it happens:
  OVERLAP  two things on screen at once that partly cover each other (a label fully inside a drawing,
           like a price on a ticket, is fine; add "overlap": true to an item to allow it on purpose)
  EDGE     text in the bottom strip (YouTube's captions and progress bar sit there), running into the
           depth ruler, or under the HUD
  STATIC   nothing new appears or leaves for longer than --static seconds (default 8) and no clip is playing

Boxes are estimated from font sizes and image sizes, so treat a flag as "look at this frame", and a clean
run as "probably fine". Exit code 1 when anything is flagged.
"""
import argparse
import json
import re
import sys
from pathlib import Path

W, H = 1920, 1080
CLIP = {".mp4", ".mov", ".webm", ".m4v"}
ZONES = {  # areas the HUD and the platform own
    "the bottom strip": (0, H - 110, W, H),
    "the depth ruler": (1760, 130, W, 930),
    "the depth readout": (1340, 40, W, 175),
    "the FILE stamp": (40, 40, 270, 115),
}


def text_box(it):
    text = it.get("text", "")
    lines = text.split("\n") or [""]
    longest = max(len(l) for l in lines)
    style = it.get("style", "headline")
    size = it.get("size") or {"headline": 92, "big": 170, "mono": 26, "note": 34}.get(style, 30)
    if style in ("mono", "kicker"):
        ls = 0.3 if style == "kicker" else 0.12
        w, h = longest * size * (0.6 + ls), len(lines) * size * 1.45
    elif style in ("headline", "big"):
        w, h = longest * size * 0.52, len(lines) * size * 1.05
    elif style == "note":
        maxw = it.get("w", 620)
        raw = longest * size * 0.47 + 60
        wraps = max(len(lines), int(raw // maxw) + len(lines))
        w, h = min(raw, maxw), wraps * size * 1.2 + 52 + (size * 0.8 if it.get("by") else 0)
    else:  # stamp
        w, h = longest * size * 0.66 + 46, size * 1.05 + 22
    x, y = it.get("x", 0), it.get("y", 0)
    if it.get("align") in ("center", "right") and it.get("w"):
        slack = max(0, it["w"] - w)
        x += slack / 2 if it["align"] == "center" else slack
    return x, y, x + w, y + h


def media_ratio(path: Path):
    try:
        if path.suffix.lower() == ".svg":
            m = re.search(r'viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"', path.read_text(encoding="utf-8", errors="ignore"))
            return float(m.group(2)) / float(m.group(1)) if m else 1.0
        from PIL import Image
        with Image.open(path) as im:
            return im.height / im.width
    except Exception:
        return 1.0


def box(it, img_dir: Path):
    k, x, y = it.get("kind"), it.get("x", 0), it.get("y", 0)
    if k == "text":
        return text_box(it)
    if k in ("svg", "guide"):
        w = it.get("w", 400 if k == "svg" else 220)
        return x, y, x + w, y + w * media_ratio(img_dir / it.get("src", ""))
    if k == "photo":
        w = it.get("w", 500)
        iw, ih = it.get("imgSize") or [16, 9]
        return x, y, x + w + 28, y + w * ih / iw + 58
    if k == "coin":
        r = it.get("r", 50)
        return x, y, x + 2 * r, y + 2 * r
    return None  # lines, glows: decorative, drawn over things on purpose


def area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def inter(a, b):
    return area((max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])))


def label(it):
    t = it.get("text") or it.get("src") or it.get("kind")
    return repr(t.replace("\n", " ")[:34])


def mmss(t):
    t = round(t, 1)
    return f"{int(t // 60)}:{t - 60 * int(t // 60):04.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("timeline")
    ap.add_argument("--static", type=float, default=8.0)
    a = ap.parse_args()
    tl = Path(a.timeline)
    data = json.loads(tl.read_text(encoding="utf-8"))
    img_dir = tl.parent / "img"
    flags = 0
    for n, s in enumerate(data["scenes"]):
        if s.get("type") not in ("paper", "dive"):
            continue
        start, end = s["start"], s["end"]
        dur = end - start
        items = s.get("items", [])
        windows = []
        for it in items:
            t0 = it.get("time", 0)
            t1 = it.get("until", dur)
            windows.append((t0, min(t1, dur)))
        out = []
        boxes = [box(it, img_dir) for it in items]
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                bi, bj = boxes[i], boxes[j]
                if not bi or not bj or items[i].get("overlap") or items[j].get("overlap"):
                    continue
                (a0, a1), (b0, b1) = windows[i], windows[j]
                if min(a1, b1) <= max(a0, b0):
                    continue
                ov = inter(bi, bj)
                small = min(area(bi), area(bj)) or 1
                if ov / small < 0.08:
                    continue
                texts = [items[i].get("kind") == "text", items[j].get("kind") == "text"]
                kinds = {items[i].get("kind"), items[j].get("kind")}
                if "coin" in kinds and not any(texts):
                    continue  # coins pile up and drop into things on purpose
                contained = ov / small > 0.85
                if contained and texts.count(True) < 2:
                    continue  # a label or a coin sitting on its object
                when = start + max(a0, b0)
                out.append(f"  OVERLAP {mmss(when)}  {label(items[i])} x {label(items[j])} ({ov / small:.0%})")
        for it, b in zip(items, boxes):
            if not b or it.get("kind") not in ("text", "photo", "svg"):
                continue
            for zone, z in ZONES.items():
                if inter(b, z) > 0.05 * (area(b) or 1):
                    out.append(f"  EDGE    {mmss(start + it.get('time', 0))}  {label(it)} runs into {zone}")
        if s.get("type") == "paper":
            moving = any(Path(it.get("src", "")).suffix.lower() in CLIP for it in items)
            typing = [it.get("time", 0) + len(it.get("text", "")) / 18 for it in items if it.get("enter") == "type"]
            events = sorted({0.0, dur, *typing, *[w for pair in windows for w in pair if 0 <= w <= dur]})
            gaps = [(events[k + 1] - events[k], events[k]) for k in range(len(events) - 1)]
            g, at = max(gaps) if gaps else (0, 0)
            if g > a.static and not moving:
                out.append(f"  STATIC  {mmss(start + at)}  nothing changes for {g:.0f}s (scene is {dur:.0f}s)")
        if out:
            flags += len(out)
            print(f"scene {n:02d} at {mmss(start)} ({s.get('type')}, {dur:.0f}s)")
            print("\n".join(out))
    print(f"{flags} flag(s)" if flags else "layout: clean")
    sys.exit(1 if flags else 0)


if __name__ == "__main__":
    main()
