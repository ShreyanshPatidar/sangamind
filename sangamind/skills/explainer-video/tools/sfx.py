"""Synthesise the studio's sound effects from sfx.json into a folder (default: ../_studio/public/sfx).
Each effect gets pitch-shifted variants (name-1.wav ... name-n.wav) so repeats don't sound identical.

    python sfx.py [out_dir]
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent


def main():
    cfg = json.loads((HERE / "sfx.json").read_text(encoding="utf-8"))
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "_studio" / "public" / "sfx"
    out.mkdir(parents=True, exist_ok=True)
    rate = cfg["rate"]
    for name, s in cfg["sounds"].items():
        n = s.get("variants", cfg["variants"])
        for k in range(1, n + 1):
            # spread the pitch evenly across the variants, e.g. 0.88, 1.0, 1.12
            factor = 1 + (cfg["vary"] * (2 * (k - 1) / (n - 1) - 1) if n > 1 else 0)
            src = f"aevalsrc='{s['expr']}':s={rate}:d={s['d']}"
            chain = [s["filter"]] if s.get("filter") else []
            if factor != 1:
                chain.append(f"asetrate={round(rate * factor)},aresample={rate}")
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", src]
            if chain:
                cmd += ["-af", ",".join(chain)]
            file = f"{name}.wav" if n == 1 else f"{name}-{k}.wav"
            cmd += ["-ac", "2", str(out / file)]
            subprocess.run(cmd, check=True)
            print(file)


if __name__ == "__main__":
    main()
