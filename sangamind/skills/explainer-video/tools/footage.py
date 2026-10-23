"""Find real moving footage for a video: search free archives, download short clips, show a contact sheet.

    python footage.py --assets ../Syptian/assets/04 "concert crowd" "stadium lights at night"
    python footage.py --assets ../Syptian/assets/04 "1950s factory" --sources archive --start 120

Sources (all free, licence checked per clip; anything NC / ND / unclear is skipped):
  pexels     modern stock video, free for commercial use. Needs a free key: pexels-key.txt next to this
             file or env PEXELS_API_KEY (https://www.pexels.com/api/). Skipped without one.
  wikimedia  Wikimedia Commons video: public domain and CC BY / BY-SA. No key.
  archive    Internet Archive: Prelinger and other public-domain / CC films. No key. Films are long,
             so use --start to pick where the clip begins.

Each clip is cut to --seconds (default 15), scaled to 1920 wide, H.264, no sound, saved into --assets as
clip-<query>-<n>.mp4, and logged in footage.json (source, licence, author). Look at footage-sheet.jpg,
then use a clip in scenes.json like an image: {"type": "photo", "img": "clip-concert-crowd-1.mp4"}.
export.py copies only the clips scenes.json uses, and credits only those.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
UA = "SangamindFootage/1.0 (explainer-video skill; personal use)"
BAD_LICENCE = re.compile(r"\b(nc|nd|non-?commercial|no-?deriv|all rights reserved|copyright)\b", re.I)


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:30] or "clip"


def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


# --- sources: each returns a list of {url, source, licence, author, title, start} ------------------

def pexels(query, n):
    key = os.environ.get("PEXELS_API_KEY")
    f = HERE / "pexels-key.txt"
    if not key and f.exists():
        key = f.read_text(encoding="utf-8").strip()
    if not key:
        print("  pexels: skipped (no key in pexels-key.txt or PEXELS_API_KEY)")
        return []
    q = urllib.parse.urlencode({"query": query, "per_page": n, "orientation": "landscape", "size": "medium"})
    data = get_json(f"https://api.pexels.com/videos/search?{q}", {"Authorization": key})
    out = []
    for v in data.get("videos", []):
        files = [x for x in v.get("video_files", []) if x.get("file_type") == "video/mp4" and x.get("width")]
        if not files:
            continue
        best = min(files, key=lambda x: abs(x["width"] - 1920))  # closest to 1080p
        out.append({"url": best["link"], "source": v["url"], "licence": "Pexels License (free to use)",
                    "author": v.get("user", {}).get("name", "Pexels"), "title": query, "start": 0})
    return out


def wikimedia(query, n):
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": f"{query} filetype:video", "gsrlimit": n * 3,
        "prop": "imageinfo", "iiprop": "url|mime|extmetadata"})
    data = get_json(f"https://commons.wikimedia.org/w/api.php?{q}")
    out = []
    for page in (data.get("query", {}).get("pages") or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        licence = strip_html(meta.get("LicenseShortName", {}).get("value", ""))
        if not licence or BAD_LICENCE.search(licence):
            continue
        out.append({"url": info["url"], "source": info.get("descriptionurl", ""), "licence": licence,
                    "author": strip_html(meta.get("Artist", {}).get("value", "")) or "Wikimedia Commons",
                    "title": page.get("title", ""), "start": 0})
    return out[:n]


def archive(query, n):
    q = urllib.parse.urlencode([
        ("q", f"({query}) AND mediatype:movies AND (collection:prelinger OR licenseurl:*publicdomain* "
              f"OR licenseurl:*creativecommons*)"),
        ("fl[]", "identifier"), ("fl[]", "title"), ("fl[]", "licenseurl"), ("fl[]", "creator"),
        ("fl[]", "collection"), ("rows", n * 2), ("output", "json")])
    docs = get_json(f"https://archive.org/advancedsearch.php?{q}").get("response", {}).get("docs", [])
    out = []
    for d in docs:
        lic = d.get("licenseurl") or ""
        if not lic and "prelinger" in json.dumps(d.get("collection", "")).lower():
            lic = "Public domain (Prelinger Archives)"
        if not lic or "-nc" in lic or "-nd" in lic or BAD_LICENCE.search(lic):
            continue
        files = get_json(f"https://archive.org/metadata/{d['identifier']}").get("files", [])
        mp4 = [f for f in files if f.get("name", "").lower().endswith(".mp4")]
        if not mp4:
            continue
        f = min(mp4, key=lambda x: int(x.get("size") or 1 << 40))
        creator = d.get("creator")
        out.append({"url": f"https://archive.org/download/{d['identifier']}/{urllib.parse.quote(f['name'])}",
                    "source": f"https://archive.org/details/{d['identifier']}", "licence": lic,
                    "author": ", ".join(creator) if isinstance(creator, list) else (creator or "Internet Archive"),
                    "title": d.get("title", d["identifier"]), "start": 0})
        if len(out) >= n:
            break
    return out


SOURCES = {"pexels": pexels, "wikimedia": wikimedia, "archive": archive}


# --- download, cut, sheet ---------------------------------------------------------------------------

def cut(url, start, seconds, dest):
    """Read only the needed part over HTTP, scale to 1920 wide, H.264, no audio."""
    web = ["-user_agent", UA] if url.startswith("http") else []
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *web, "-ss", str(start), "-i", url,
           "-t", str(seconds), "-an", "-vf", "scale=1920:-2:flags=lanczos,fps=30",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=600).returncode == 0 and dest.exists()


def contact_sheet(clips, path):
    """Three frames per clip, one row per clip, file name on the left."""
    from PIL import Image, ImageDraw, ImageFont
    rows = []
    for c in clips:
        frames = []
        for frac in (0.15, 0.5, 0.85):
            png = path.with_suffix(f".{len(rows)}.{frac}.png")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(c["seconds"] * frac),
                            "-i", str(c["path"]), "-frames:v", "1", "-vf", "scale=480:-2", str(png)])
            if png.exists():
                frames.append(Image.open(png).convert("RGB"))
                png.unlink()
        if frames:
            rows.append((c["file"], c["licence"], frames))
    if not rows:
        return
    w, h, label = 480, 270, 360
    sheet = Image.new("RGB", (label + 3 * w, h * len(rows)), "#0F5257")
    draw = ImageDraw.Draw(sheet)
    try:
        big, small = ImageFont.load_default(size=24), ImageFont.load_default(size=18)
    except TypeError:  # Pillow < 10.1
        big = small = ImageFont.load_default()
    for i, (name, lic, frames) in enumerate(rows):
        draw.text((16, i * h + 16), name, fill="#F4F1EA", font=big)
        draw.text((16, i * h + 52), lic[:34], fill="#F2A541", font=small)
        for j, im in enumerate(frames):
            sheet.paste(im.crop((0, 0, w, h)), (label + j * w, i * h))
    sheet.save(path, quality=85)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("queries", nargs="+", help="what the clip should show, in plain words")
    ap.add_argument("--assets", required=True, help="the video's assets folder")
    ap.add_argument("--sources", default="pexels,wikimedia,archive")
    ap.add_argument("--per", type=int, default=3, help="clips per query per source")
    ap.add_argument("--seconds", type=float, default=15)
    ap.add_argument("--start", type=float, help="where in the source to start (long archive films)")
    a = ap.parse_args()

    assets = Path(a.assets)
    assets.mkdir(parents=True, exist_ok=True)
    log_path = assets / "footage.json"
    log = json.loads(log_path.read_text(encoding="utf-8")) if log_path.exists() else []
    known = {c["url"] for c in log}
    new = []
    for query in a.queries:
        for name in a.sources.split(","):
            try:
                found = SOURCES[name.strip()](query, a.per)
            except Exception as e:  # one source down shouldn't stop the others
                print(f"  {name}: failed ({e})")
                continue
            for c in found:
                if c["url"] in known:
                    continue
                k = 1 + sum(1 for x in log if x["file"].startswith(f"clip-{slug(query)}-"))
                file = f"clip-{slug(query)}-{k}.mp4"
                start = a.start if a.start is not None else c["start"]
                print(f"  {name}: {file} <- {c['source']}")
                if not cut(c["url"], start, a.seconds, assets / file):
                    print("    download failed, skipped")
                    continue
                entry = {"file": file, "query": query, "url": c["url"], "source": c["source"],
                         "license": c["licence"], "author": c["author"], "start": start}
                log.append(entry)
                known.add(c["url"])
                new.append({**entry, "licence": c["licence"], "path": assets / file, "seconds": a.seconds})
    log_path.write_text(json.dumps(log, indent=1, ensure_ascii=False), encoding="utf-8")
    if new:
        contact_sheet(new, assets / "footage-sheet.jpg")
        print(f"{len(new)} new clips -> {assets}; look at {assets / 'footage-sheet.jpg'}")
    else:
        print("no new clips found")
        sys.exit(1)


if __name__ == "__main__":
    main()
