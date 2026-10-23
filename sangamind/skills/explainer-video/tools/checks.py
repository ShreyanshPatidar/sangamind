"""Final-pass checks on a rendered video (from the motion-design harness's twelve checks).

    python checks.py ../Syptian/renders/014/video.mp4

Reports format, length, black frames, frozen frames and loudness against video.json's targets, and
writes a one-frame-per-second sheet next to the video to look at. Exit code 1 if anything fails.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent


def ff(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout + r.stderr


def main():
    video = Path(sys.argv[1])
    t = json.loads((HERE / "video.json").read_text(encoding="utf-8"))["checks"]
    results = []

    probe = json.loads(ff(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)]))
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
    ok = v["codec_name"] == "h264" and a and a["codec_name"] == "aac" and int(v["height"]) >= t["min_height"]
    results.append(("format", ok, f"{v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} + {a['codec_name'] if a else 'no audio'}"))
    dur = float(probe["format"]["duration"])
    results.append(("length", True, f"{int(dur // 60)}:{dur % 60:04.1f}"))

    out = ff(["ffmpeg", "-i", str(video), "-vf", f"blackdetect=d={t['black_min_seconds']}", "-an", "-f", "null", "-"])
    blacks = re.findall(r"black_start:([\d.]+)", out)
    results.append(("black frames", not blacks, ", ".join(f"at {float(b):.1f}s" for b in blacks) or "none"))

    out = ff(["ffmpeg", "-i", str(video), "-vf", f"freezedetect=n=0.003:d={t['freeze_max_seconds']}", "-an", "-f", "null", "-"])
    freezes = re.findall(r"freeze_start: ([\d.]+)", out)
    results.append(("frozen frames", not freezes, ", ".join(f"at {float(f):.1f}s" for f in freezes) or "none"))

    out = ff(["ffmpeg", "-i", str(video), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"])
    summary = out[out.rfind("Summary:"):]
    lufs = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    ok = abs(lufs - t["loudness_lufs"]) <= t["loudness_tolerance"] and peak <= t["true_peak_max"]
    results.append(("loudness", ok, f"{lufs} LUFS (target {t['loudness_lufs']}), true peak {peak} dBTP (max {t['true_peak_max']})"))

    sheet = video.with_name(video.stem + "-sheet.png")
    ff(["ffmpeg", "-y", "-i", str(video), "-vf", "fps=1,scale=320:-1,tile=8x" + str(int(dur) // 8 + 1),
        "-frames:v", "1", str(sheet)])
    results.append(("frame sheet", sheet.exists(), str(sheet)))

    for name, ok, note in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name:<14} {note}")
    sys.exit(0 if all(ok for _, ok, _ in results) else 1)


if __name__ == "__main__":
    main()
