"""Set up (or update) an explainer-video workspace from this skill.

    python setup.py --workspace "D:/Coding/Apps/AI/Channels"            # first time: everything
    python setup.py --workspace "D:/Coding/Apps/AI/Channels" --sync     # after editing the skill: code only

The skill folder holds the code; the workspace holds everything heavy and per-machine:
  <workspace>/_tools   Python tools + .venv + models/ (Kokoro voice, ~355 MB)
  <workspace>/_studio  Remotion project + node_modules + public/ (per-video data, sfx, fonts)
Code is copied skill -> workspace, never the other way, so edit it here and re-run with --sync.
"""
import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / "setup.json").read_text(encoding="utf-8"))


def copy_tree(src: Path, dst: Path):
    for f in src.rglob("*"):
        if f.is_file():
            target = dst / f.relative_to(src)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, target)


def run(cmd, cwd=None):
    print("  $", " ".join(map(str, cmd)))
    subprocess.run(cmd, cwd=cwd, check=True, shell=sys.platform == "win32" and str(cmd[0]) in ("npm", "npx"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--sync", action="store_true", help="copy code only, skip installs")
    a = ap.parse_args()
    ws = Path(a.workspace)
    tools, studio = ws / "_tools", ws / "_studio"

    print("code -> workspace")
    copy_tree(HERE / "tools", tools)
    copy_tree(HERE / "studio", studio)
    if a.sync:
        return

    venv_py = tools / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if not venv_py.exists():
        run([sys.executable, "-m", "venv", tools / ".venv"])
    run([venv_py, "-m", "pip", "install", "-q", "-r", HERE / "requirements.txt"])

    models = tools / "models"
    models.mkdir(exist_ok=True)
    for name, url in CFG["models"].items():
        if not (models / name).exists():
            print(f"  downloading {name}")
            urllib.request.urlretrieve(url, models / name)

    if not (studio / "node_modules").exists():
        run(["npm", "ci"], cwd=studio)
    if not (studio / "public" / "sfx").exists():
        run([venv_py, tools / "sfx.py", studio / "public" / "sfx"])
    print("ready")


if __name__ == "__main__":
    main()
