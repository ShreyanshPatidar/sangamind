"""Search Openverse (5.2M+ CC audio files, free, no API key) for a real recorded sound,
and optionally download one into a video's sfx folder with its attribution.

Use this when a synthesised recipe in sfx.json can't give the real thing: a genuine stamp
thunk, crackling fire, a room's ambience, a specific real-world noise. Abstract hits
(whoosh, pop, boom, tick) stay synthesised — they're cleaner made than found.

    # search only — ALWAYS do this first and pick by ear, Openverse matches words literally
    python openverse.py "rubber stamp thunk"

    # download result N of the last search into a video's sfx folder, recording the credit
    python openverse.py "rubber stamp thunk" --get 3 --out ../_studio/public/<video>/sfx --name stamp

Licences are limited to ones that allow commercial use with attribution (cc0, by, by-sa).
Every download appends a line to <out>/credits.json so the required credit reaches the
video description — a CC sound used without credit is a licence breach. cc0 needs no credit
but is logged anyway so you know where it came from.
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.openverse.org/v1/audio/"
# Only licences that permit commercial use and are satisfied by crediting the source.
LICENSES = "cc0,by,by-sa"
UA = "Sangamind-explainer/1.0 (+https://github.com/ShreyanshPatidar/sangamind)"


def search(query, page_size=8):
    qs = urllib.parse.urlencode({"q": query, "license": LICENSES, "page_size": page_size})
    req = urllib.request.Request(f"{API}?{qs}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("results", [])


def credit_line(res):
    lic = f"CC {res.get('license', '').upper()} {res.get('license_version', '')}".strip()
    return {
        "title": res.get("title"),
        "creator": res.get("creator"),
        "license": lic,
        "license_url": res.get("license_url"),
        "source": res.get("foreign_landing_url"),
    }


def download(res, out_dir, name):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    url = res["url"]
    ext = Path(urllib.parse.urlparse(url).path).suffix or ".wav"
    dest = out / f"{name}{ext}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())
    # append the credit so export.py / credits.json carry it into the description
    credits = out / "credits.json"
    data = json.loads(credits.read_text(encoding="utf-8")) if credits.exists() else []
    if not isinstance(data, list):
        data = [data]
    data.append({"file": dest.name, **credit_line(res)})
    credits.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return dest


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    query = args[0]
    get = out = name = None
    i = 1
    while i < len(args):
        if args[i] == "--get":
            get = int(args[i + 1]); i += 2
        elif args[i] == "--out":
            out = args[i + 1]; i += 2
        elif args[i] == "--name":
            name = args[i + 1]; i += 2
        else:
            i += 1

    results = search(query)
    if not results:
        print("No results. Openverse matches words literally — try plainer terms.")
        return

    if get is None:
        print(f"{len(results)} results for {query!r} (commercial-OK licences). "
              f"Listen before picking — Openverse matches words, not meaning:\n")
        for n, res in enumerate(results, 1):
            c = credit_line(res)
            print(f"[{n}] {c['title']}")
            print(f"    by {c['creator']} — {c['license']}")
            print(f"    audio:  {res['url']}")
            print(f"    source: {c['source']}\n")
        print("Open a few URLs, then rerun with --get <n> --out <sfx dir> --name <sound>.")
        return

    if not (out and name):
        print("--get needs both --out <sfx dir> and --name <sound>.")
        sys.exit(1)
    res = results[get - 1]
    dest = download(res, out, name)
    c = credit_line(res)
    print(f"Saved {dest}")
    print(f"Credit ({c['license']}): {c['title']} by {c['creator']} — {c['source']}")
    print(f"Logged to {Path(out) / 'credits.json'} for the video description.")


if __name__ == "__main__":
    main()
