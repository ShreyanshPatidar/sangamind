#!/usr/bin/env python3
"""hookscore.py - score a YouTube hook before you waste a take on it.

Five properties (six in the story profile), 0-100 each, and a verdict that is 60% the weighted mean
and 40% the weakest one. The weakest-link weighting is deliberate: a hook with four strong properties
and one dead one is a hook that leaks at the dead one, and averaging hides that.

    python3 hookscore.py hooks.txt                    # one hook per line, ranked (creator profile)
    python3 hookscore.py --profile story hooks.txt    # history / money / explainer hooks
    python3 hookscore.py --hook "one line"            # score a single hook
    python3 hookscore.py --json hooks.txt             # machine-readable

Every report says what works and why (the words it found), not only what is weak. Word lists and
weights live in profiles.json; the formulas in hooks.json.

WHAT THIS CAN AND CANNOT TELL YOU. Measured against 74 real short-form hooks (first 15 seconds of
auto-captions, top-8 and bottom-8 by views across five channels): it separates deliberately bad
hooks from real ones well, and it separates a creator's own hits from their own misses barely at
all. Treat a low score as a reason to look again, never a high score as a promise.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FORMULAS = json.load(open(os.path.join(HERE, "hooks.json"), encoding="utf-8"))["hooks"]
PROFILES = json.load(open(os.path.join(HERE, "profiles.json"), encoding="utf-8"))
SHARED = PROFILES["shared"]

def rx(items):
    return re.compile(r"\b(" + "|".join(re.escape(i) for i in sorted(items, key=len, reverse=True)) + r")\b", re.I)

DIGITS = re.compile(r"\b(\d[\d,.]*\s?(%|k|m|x|s|h)?|\$\d[\d,.]*|\d+\s?(second|minute|hour|day|week|month|year)s?)\b", re.I)
NUMWORDS = rx(SHARED["number_words"])
FILLER, VAGUE = set(SHARED["filler"]), set(SHARED["vague"])
CLOSED = rx(SHARED["closed"])
YOU = re.compile(r"\b(you|your|you're|youre|yourself)\b", re.I)

def words(t): return re.findall(r"[a-z0-9'%$.]+", t.lower())
def found(pattern, t): return [m.group(0).strip(" .,") for m in pattern.finditer(t)]
def clamp(x): return max(0, min(100, round(x)))

# each property returns (score, evidence for, evidence against)

def specificity(t, p):
    w = words(t)
    if not w: return 0, [], []
    nums = found(DIGITS, t) + found(NUMWORDS, t)
    vague = [x for x in w if x in VAGUE]
    filler = [x for x in w if x in FILLER]
    # proper nouns that are not sentence-initial read as named things
    names = [n for i, n in enumerate(t.split()[1:], 1) if n[:1].isupper() and not t.split()[i - 1].endswith((".", "!", "?"))]
    s = 34 + min(len(nums), 3) * 18 - len(vague) * 16 - len(filler) * 5 + min(18, 6 * len(names))
    return clamp(s), [f"number '{n}'" for n in nums[:3]] + [f"name '{n.strip('.,')}'" for n in names[:3]], \
        [f"vague '{v}'" for v in vague] + [f"filler '{f}'" for f in filler]

def address(t, p):
    hits = found(YOU, t)
    phrases = found(rx(p["address_phrases"]), t) if p["address_phrases"] else []
    first = YOU.search(" ".join(t.split()[:6]))
    s = 26 + len(hits) * 20 + (30 if first else 0) + len(phrases) * 15
    why = ([f"'you' in the first six words"] if first else []) + [f"'{x}' puts the viewer in the story" for x in phrases]
    return clamp(s), why, [] if hits else ["never speaks to the viewer"]

def stakes(t, p):
    hits = found(rx(p["stakes"]), t)
    big = found(DIGITS, t) + found(NUMWORDS, t)
    s = 22 + min(len(hits), 3) * 24 + (14 if big else 0)
    return clamp(s), [f"'{h}'" for h in hits[:4]], [] if hits else ["nothing is lost or at risk"]

def curiosity(t, p):
    hits = found(rx(p["curiosity"]), t)
    q = t.strip().endswith("?")
    closed = found(CLOSED, t)
    s = 24 + min(len(hits), 3) * 17 + (18 if q else 0) - (18 if closed else 0)
    why = [f"'{h}' opens a gap" for h in hits[:3]] + (["ends on a question"] if q else [])
    return clamp(s), why, [f"'{c}' answers its own question" for c in closed]

def brevity(t, p):
    n = len(words(t))
    lo, hi = p["brevity_band"]
    if n == 0: return 0, [], []
    if lo <= n <= hi: return 100, [f"{n} words: sayable in about {round(n / 2.5)} seconds"], []
    if n < lo: return clamp(max(30, 100 - (lo - n) * 11)), [], [f"only {n} words"]
    return clamp(max(10, 100 - (n - hi) * 7)), [], [f"{n} words: too long to land in one breath"]

def rhythm(t, p):
    # short punchy fragments stacked before the turn ("One wrong turn. Two gunshots.")
    parts = [x for x in re.split(r"[.!?]+", t) if x.strip()]
    short = [x.strip() for x in parts if len(x.split()) <= 5]
    s = 40 + min(len(short), 3) * 20 + (10 if len(parts) >= 2 else 0)
    why = [f"{len(short)} short beats: " + " / ".join(short[:3])] if len(short) >= 2 else []
    return clamp(s), why, [] if short else ["one long sentence, no beat to land on"]

ALL = {"SPECIFICITY": specificity, "ADDRESS": address, "STAKES": stakes,
       "CURIOSITY": curiosity, "BREVITY": brevity, "RHYTHM": rhythm}

FIX = {
 "SPECIFICITY": "swap one adjective for a number, a name or a date",
 "ADDRESS": "say 'you' in the first six words, or 'you were told...'",
 "STAKES": "name what was lost: lives, money, an empire, the viewer's time",
 "CURIOSITY": "cut the half of the sentence that answers itself; leave the real story unsaid",
 "BREVITY": "read it out loud and stop where you run out of breath",
 "RHYTHM": "break it into two or three short beats before the turn",
}
WHY = {
 "SPECIFICITY": "concrete details make it feel true and visual",
 "ADDRESS": "it pulls the viewer into the story",
 "STAKES": "the viewer feels something big is at risk",
 "CURIOSITY": "it opens a question the viewer has to stay for",
 "BREVITY": "it lands before the thumb moves",
 "RHYTHM": "short beats hit hard when spoken",
}

def classify(t):
    best, hits = None, 0
    for f in FORMULAS:
        n = sum(1 for pat in f["match"] if re.search(pat, t, re.I))
        if n > hits: best, hits = f, n
    return best, hits

def score(t, profile):
    p = PROFILES["profiles"][profile]
    weights = p["weights"]
    parts, evidence = {}, {}
    for name in weights:
        s, good, bad = ALL[name](t, p)
        parts[name], evidence[name] = s, (good, bad)
    mean = sum(parts[n] * weights[n] for n in parts) / sum(weights.values())
    verdict = round(0.6 * mean + 0.4 * min(parts.values()))
    formula, hits = classify(t)
    return parts, evidence, verdict, formula, hits

def band(v): return "STRONG" if v >= 72 else "WORKABLE" if v >= 55 else "WEAK"

def why_lines(parts, evidence):
    # brevity is table stakes, so it only counts as a strength when nothing else is
    top = sorted(parts, key=lambda n: (n != "BREVITY", parts[n]), reverse=True)
    out = []
    for name in top[:2]:
        good = evidence[name][0]
        if good and parts[name] >= 60:
            out.append(f"{name} {parts[name]} - {WHY[name]}: {', '.join(good)}")
    return out

def report(r):
    t = r["hook"]
    print(f"\n  {t}")
    print(f"  {'-' * min(72, max(20, len(t)))}")
    for k, v in r["properties"].items():
        print(f"    {k:<12} {v:3d}  {'#' * (v // 5)}")
    print(f"    {'VERDICT':<12} {r['verdict']:3d}  {band(r['verdict'])}")
    if r["formula"]:
        print(f"    formula      {r['formula']}  - {r['shape']}")
    else:
        print("    formula      Unclassified  (no formula matched - that is usually a summary, not a hook)")
    for line in r["works"] or ["nothing stands out yet"]:
        print(f"    works        {line}")
    low = min(r["properties"], key=r["properties"].get)
    bad = r["evidence"][low][1]
    print(f"    weakest      {low} - {FIX[low]}" + (f" ({'; '.join(bad)})" if bad else ""))

def main():
    a = sys.argv[1:]
    as_json = "--json" in a
    a = [x for x in a if x != "--json"]
    profile = "creator"
    if "--profile" in a:
        i = a.index("--profile"); profile = a[i + 1]; del a[i:i + 2]
    if profile not in PROFILES["profiles"]:
        sys.exit(f"unknown profile '{profile}'; choose from {', '.join(PROFILES['profiles'])}")
    if "--hook" in a:
        lines = [a[a.index("--hook") + 1]]
    elif a and os.path.exists(a[0]):
        lines = [l for l in open(a[0], encoding="utf-8").read().splitlines() if l.strip()]
    else:
        print(__doc__); sys.exit(1 if not a else 0)
    out = []
    for t in lines:
        parts, evidence, verdict, f, hits = score(t, profile)
        out.append({"hook": t.strip(), "properties": parts, "verdict": verdict, "band": band(verdict),
                    "formula": f["name"] if f else None, "shape": f["shape"] if f else None,
                    "works": why_lines(parts, evidence), "evidence": evidence})
    out.sort(key=lambda r: -r["verdict"])
    if as_json:
        print(json.dumps([{k: v for k, v in r.items() if k != "evidence"} for r in out], indent=1)); return
    print(f"  profile: {profile}")
    for r in out:
        report(r)
    if len(out) > 1:
        print(f"\n  winner: {out[0]['hook']}  ({out[0]['verdict']}, {out[0]['band']})\n")

if __name__ == "__main__":
    main()
