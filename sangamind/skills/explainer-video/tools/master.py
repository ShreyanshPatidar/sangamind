"""Master a rendered video's sound to the loudness target in video.json (two-pass loudnorm).
The picture is copied untouched; only the audio is re-encoded.

    python master.py ../Syptian/renders/14/video.mp4
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent


def main():
    video = Path(sys.argv[1])
    t = json.loads((HERE / "video.json").read_text(encoding="utf-8"))["checks"]
    target = f"I={t['loudness_lufs']}:TP={t['true_peak_max'] - 0.5}:LRA=11"
    # pass 1: measure
    r = subprocess.run(["ffmpeg", "-i", str(video), "-af", f"loudnorm={target}:print_format=json", "-vn", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = json.loads(re.findall(r"\{[^{}]*\}", r.stderr)[-1])
    # pass 2: apply with the measured values (linear, so the mix keeps its dynamics)
    chain = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
             f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
    tmp = video.with_name(video.stem + ".mastering.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-c:v", "copy", "-af", chain,
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(video)
    print(f"mastered {video.name}: was {m['input_i']} LUFS, target {t['loudness_lufs']}")


if __name__ == "__main__":
    main()
