"""Check a finished script against the written rules before anything is voiced.

    python script_check.py <script.md> --title "Why Concert Tickets Cost So Much... SOMEONE GETS PAID 3 TIMES"

Reads the narration under "## Script" (headings, `[ON SCREEN..]` and `[NOTE..]` lines skipped) and checks:
  QUESTIONS  the opening asks 2-3 direct questions in its first ~70 words, each followed by a pause
  TITLE      the title's promise is spoken in the first ~90 words
  NAMES      every acronym is explained the first time it is said ("America's consumer agency, the FTC")
  WORDS      no loaded words (watchdog, crackdown...), no spoken level labels, no stock filler
  STAGE      no stage directions narrated ("you join the queue")
  DENSE      no pile of numbers and dates in the first ~40 words
Prints PASS / FAIL per check with the offending text. Exit code 1 if anything fails.
These are the mechanical rules; the judgement rules (every line has a job, explain how and why) still
need a read.
"""
import argparse
import re
import sys
from pathlib import Path

LOADED = ["watchdog", "crackdown", "slammed", "blasted", "shocking", "insane", "destroyed"]
FILLER = ["in this video", "before we get started", "without further ado", "let's take a look",
          "let's dive in", "smash that", "don't forget to like"]
STAGE = r"\byou (?:join|open|click|scroll|walk|sit down|go to|log in|pick up)\b"
LEVEL = r"\b(?:level|part|chapter|step) (?:one|two|three|four|five|six|\d)\b"
KNOWN = {"UK", "US", "USA", "EU", "UN", "TV", "AI", "OK", "ID", "IP", "CEO", "NOTE"}
EXPLAINERS = r"(?:agency|regulator|department|commission|company|court|government|organisation|organization|body|authority|bank|union|office|group)"
NUM_WORDS = r"\b(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b"
STOP = {"why", "the", "a", "an", "so", "much", "how", "what", "who", "your", "you", "is", "are", "of", "to",
        "and", "in", "it", "its", "it's", "this", "that", "cost", "costs", "gets", "get"}
DIGITS = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven",
          "8": "eight", "9": "nine", "10": "ten"}


def narration(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    body = text.split("## Script", 1)[1] if "## Script" in text else text
    body = re.split(r"\n## ", body, maxsplit=1)[0]
    paras = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("**[") or line.startswith("`") or line.startswith("#"):
            continue
        paras.append(line)
    return paras


def words(s):
    return re.findall(r"[A-Za-z0-9'£$%]+", re.sub(r"\[[^\]]*\]", " ", s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--title", default="")
    a = ap.parse_args()
    paras = narration(Path(a.script))
    if not paras:
        sys.exit("no narration found under '## Script'")
    full = " ".join(paras)
    spoken = re.sub(r"\[[^\]]*\]", " ", full)
    results = []

    # QUESTIONS: 2-3 questions in the opening, each followed by a pause
    opening_words = words(paras[0])[:70]
    cut = 0
    for m in re.finditer(r"[A-Za-z0-9'£$%]+", re.sub(r"\[[^\]]*\]", lambda x: " " * len(x.group()), paras[0])):
        cut += 1
        if cut == len(opening_words):
            cut = m.end()
            break
    head = paras[0][:cut + 40]
    qs = [m.end() for m in re.finditer(r"\?", head)]
    no_pause = [paras[0][max(0, q - 50):q] for q in qs
                if not re.match(r"\s*\[pause\s+(0\.[5-9]|[1-9])", paras[0][q:q + 20])]
    ok = 2 <= len(qs) <= 3 and not no_pause
    detail = f"{len(qs)} question(s) in the first ~70 words"
    if no_pause:
        detail += "; no pause of 0.5 s+ after: " + " | ".join(f"...{x.strip()}?" for x in no_pause)
    results.append(("QUESTIONS", ok, detail))

    # TITLE: the title's key words spoken early
    if a.title:
        key = [DIGITS.get(w, w) for w in (x.lower() for x in words(a.title)) if w not in STOP and len(w) > 2 or w in DIGITS]
        early = " ".join(words(" ".join(paras))[:90]).lower()
        hit = [k for k in key if k in early]
        ok = len(hit) >= max(1, -(-len(key) * 3 // 5))  # at least 60% of the title's key words
        results.append(("TITLE", ok, f"title words heard in the first ~90 words: {hit} of {key}"))

    # NAMES: acronyms explained on first mention
    seen, bad = set(), []
    for sent in re.split(r"(?<=[.!?])\s+", spoken):
        for ac in re.findall(r"\b[A-Z]{2,6}\b", sent):
            if ac in seen or ac in KNOWN:
                continue
            seen.add(ac)
            before = sent[: sent.find(ac)].lower()
            if not re.search(EXPLAINERS, before):
                bad.append(f"{ac}: \"{sent.strip()[:90]}\"")
    results.append(("NAMES", not bad, "all explained" if not bad else "explain on first mention -> " + " | ".join(bad)))

    # WORDS: loaded words, spoken labels, filler
    low = spoken.lower()
    hits = [w for w in LOADED if re.search(rf"\b{w}\b", low)]
    hits += [m.group() for m in re.finditer(LEVEL, low)]
    hits += [f for f in FILLER if f in low]
    results.append(("WORDS", not hits, "clean" if not hits else f"found: {hits}"))

    # STAGE: narrated stage directions
    st = [m.group() for m in re.finditer(STAGE, low)]
    results.append(("STAGE", not st, "clean" if not st else f"found: {st} (the picture shows this; cut it)"))

    # DENSE: numbers/dates in the first ~40 words
    first = " ".join(words(paras[0])[:40]).lower()
    n = len(re.findall(NUM_WORDS, first))
    results.append(("DENSE", n <= 8, f"{n} number words in the first ~40 words" + ("" if n <= 8 else " (too many facts up front)")))

    fails = 0
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name:9} {detail}")
        fails += not ok
    print("script: clean" if not fails else f"script: {fails} check(s) failed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
