"""Render a video: a fast draft to review, or the final file (full size, mastered, checked).

    python render.py <video> --studio <_studio> --out <file.mp4> --draft    # half size, ~2-3x faster
    python render.py <video> --studio <_studio> --out <file.mp4>            # final: render + master + checks
    python render.py <video> --studio <_studio> --out <file.mp4> --frames 900-1500 --draft   # one stretch

Watch the draft for content, pacing and sound; render the final once, when the draft is approved.
Set REMOTION_BROWSER to a Chrome/Chromium binary if Remotion can't download its own.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def remotion_bin(studio: Path) -> list[str]:
    for name in ("remotion.cmd", "remotion"):
        p = studio / "node_modules" / ".bin" / name
        if p.exists():
            return [str(p)]
    return ["npx", "remotion"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", help="the folder name under <studio>/public, e.g. 04")
    ap.add_argument("--studio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--draft", action="store_true", help="half size, lower quality, no mastering")
    ap.add_argument("--frames", help="only this range, e.g. 900-1500")
    ap.add_argument("--concurrency", type=int, default=max(1, (os.cpu_count() or 2)))
    a = ap.parse_args()

    studio, out = Path(a.studio).resolve(), Path(a.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = remotion_bin(studio) + ["render", "Explainer", str(out), f"--props={json.dumps({'video': a.video})}",
                                  f"--concurrency={a.concurrency}"]
    if a.draft:
        cmd += ["--scale=0.5", "--crf=30"]
    if a.frames:
        cmd += [f"--frames={a.frames}"]
    if os.environ.get("REMOTION_BROWSER"):
        cmd += [f"--browser-executable={os.environ['REMOTION_BROWSER']}"]
    print(" ".join(cmd))
    subprocess.run(cmd, cwd=studio, check=True, shell=sys.platform == "win32" and cmd[0] == "npx")
    if a.draft:
        print(f"draft -> {out}")
        return
    py = sys.executable
    subprocess.run([py, str(HERE / "master.py"), str(out)], check=True)
    subprocess.run([py, str(HERE / "checks.py"), str(out)], check=True)
    print(f"final -> {out}")


if __name__ == "__main__":
    main()
