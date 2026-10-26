"""Copy scripts from Notion to the laptop for the video maker. Notion is the master; these copies are never edited.

    python notion_pull.py ../<channel>                      # every page in <channel>/notion.json
    python notion_pull.py ../<channel> scripts/21-moon.md   # just this one

<channel>/notion.json maps each laptop file to its page: {"pages": {"scripts/21-moon.md": {"id": "..."}}}.
Run it right before export.py/voice.py, so the voice reads exactly what is in Notion. To change a line, edit
the Notion page and pull again - a fix made in the laptop copy is lost on the next pull.
Notion escapes Markdown characters ("\\[pause 1.0\\]"); they are unescaped here so cue tags still work.
Needs Notion's CLI `ntn`, logged in (`ntn login`).
"""
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

FRONT = re.compile(r"\A---\s*\n.*?\n---\s*\n+", re.S)
ESCAPED = re.compile(r"\\([\\`*_{}\[\]()#+\-.!:~<>|=])")
HEAD = "<!-- Copy of https://app.notion.com/p/{id}, pulled {stamp}. Edit the Notion page, not this file. -->\n"


def ntn_bin():
    found = shutil.which("ntn")
    if found:
        return found
    winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Links" / "ntn.exe"
    if winget.exists():
        return str(winget)
    sys.exit("Notion's CLI `ntn` isn't installed (winget install Notion.ntn, then ntn login)")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("channel", help="the channel folder, holding notion.json")
    ap.add_argument("files", nargs="*", help="only these files (paths as in notion.json)")
    a = ap.parse_args()

    channel = Path(a.channel).resolve()
    pages = json.loads((channel / "notion.json").read_text(encoding="utf-8"))["pages"]
    unknown = [f for f in a.files if f not in pages]
    if unknown:
        sys.exit(f"not in notion.json: {unknown}")
    env = {**os.environ}
    env.setdefault("NOTION_HOME", str(Path.home() / ".notion"))
    ntn, stamp = ntn_bin(), datetime.datetime.now().strftime("%d %b %Y %H:%M")

    for rel in a.files or pages:
        page_id = pages[rel]["id"]
        r = subprocess.run([ntn, "pages", "get", page_id], capture_output=True, text=True, encoding="utf-8",
                           stdin=subprocess.DEVNULL, env=env)
        if r.returncode:
            sys.exit(f"ntn couldn't read {rel} ({page_id}): {r.stderr.strip() or r.stdout.strip()}")
        body = ESCAPED.sub(r"\1", FRONT.sub("", r.stdout, count=1)).replace("\r\n", "\n").strip() + "\n"
        path = channel / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(HEAD.format(id=page_id, stamp=stamp) + body, encoding="utf-8", newline="\n")
        print(f"  {rel}")
    print(f"pulled from Notion, {stamp}")


if __name__ == "__main__":
    main()
