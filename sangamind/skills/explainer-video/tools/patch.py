"""Fix one stretch of a finished video - picture, sound, or both - without rendering the whole thing again.

    python patch.py 021 --studio ../_studio --video ../<channel>/renders/021/video.mp4 --from 4:30 --to 5:00

1. Make the change: edit scenes.json (picture) and/or the script (narration), then re-run export.py
   (with --scenes-only if the narration did not change).
2. Run this with the stretch of the *finished* video the change sits in (old times, as you watched it).

It compares the timeline the video was rendered from (<video>.timeline.json, written by render.py) with the
new one: every word before --from must be unchanged, every word after --to must be the same words, shifted
by however much longer or shorter the new stretch is. Then it renders only the new stretch with its sound,
joins old-before + new + old-after, re-masters the loudness of the whole file and runs checks.py.
The old file stays as <name>.before-patch.mp4 until the checks pass.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from render import remotion_bin

HERE = Path(__file__).resolve().parent


def seconds(text):
    """'4:30', '270' or '270.5' -> seconds."""
    parts = [float(p) for p in text.split(":")]
    return sum(p * 60 ** i for i, p in enumerate(reversed(parts)))


def check_untouched(old, new, start, end, delta, tol):
    """The change must stay inside [start, end): same sentences before it, same sentences shifted by delta after it.
    Sentences, not words: sentence times are where the voice clips were placed (exact), while word times are
    Whisper's estimate and wobble a little on every export."""
    ow, nw = old["sentences"], new["sentences"]
    before = [w for w in ow if w["end"] <= start]
    if len(nw) < len(before) or any(a["text"] != b["text"] or abs(a["start"] - b["start"]) > tol
                                    for a, b in zip(before, nw)):
        return "the narration before --from changed"
    after = [w for w in ow if w["start"] >= end]
    tail = nw[len(nw) - len(after):] if after else []
    if any(a["text"] != b["text"] or abs(b["start"] - a["start"] - delta) > tol for a, b in zip(after, tail)):
        return "the narration after --to changed (or the stretch is too short to hold the whole change)"
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("video_id", help="the folder name under <studio>/public, e.g. 021")
    ap.add_argument("--studio", required=True)
    ap.add_argument("--video", required=True, help="the finished video to patch")
    ap.add_argument("--from", dest="start", required=True, help="start of the stretch in the finished video, e.g. 4:30")
    ap.add_argument("--to", dest="end", required=True, help="end of the stretch in the finished video, e.g. 5:00")
    ap.add_argument("--old-timeline", help="the timeline the video was rendered from (default: <video>.timeline.json)")
    a = ap.parse_args()

    cfg = json.loads((HERE / "video.json").read_text(encoding="utf-8"))
    pcfg = cfg.get("patch", {"crf": cfg["crf"], "preset": cfg["preset"], "tolerance": 0.06})
    studio, video = Path(a.studio).resolve(), Path(a.video).resolve()
    new_path = studio / "public" / a.video_id / "timeline.json"
    old_path = Path(a.old_timeline) if a.old_timeline else video.with_suffix(".timeline.json")
    if not old_path.exists():
        sys.exit(f"no {old_path.name}: pass --old-timeline (the timeline.json the video was rendered from)")
    old = json.loads(old_path.read_text(encoding="utf-8"))
    new = json.loads(new_path.read_text(encoding="utf-8"))

    start, end = seconds(a.start), min(seconds(a.end), old["duration"])
    if not 0 <= start < end:
        sys.exit("--from must come before --to, inside the video")
    delta = new["duration"] - old["duration"]
    problem = check_untouched(old, new, start, end, delta, pcfg.get("tolerance", 0.06))
    if problem:
        sys.exit(f"can't patch: {problem}. Widen --from/--to around the change, or render the whole video again.")

    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                        "-of", "csv=p=0", str(video)], capture_output=True, text=True, check=True)
    num, den = (int(x) for x in r.stdout.strip().split(",")[0].split("/"))
    fps = num / den
    first, last = round(start * fps), round((end + delta) * fps) - 1
    cut_after = round(end * fps)
    print(f"new stretch {a.start} -> {end + delta:.2f}s ({delta:+.2f}s), frames {first}-{last}")

    segment = video.with_name(video.stem + ".patch-segment.mp4")
    cmd = remotion_bin(studio) + ["render", "Explainer", str(segment), f"--props={json.dumps({'video': a.video_id})}",
                                  f"--frames={first}-{last}"]
    subprocess.run(cmd, cwd=studio, check=True)

    before = video.with_name(video.stem + ".before-patch.mp4")
    video.replace(before)
    t0, t1 = first / fps, cut_after / fps
    checks = cfg["checks"]
    # the old parts are already mastered; bring the new stretch to the same loudness before joining
    level = f"loudnorm=I={checks['loudness_lufs']}:TP={checks['true_peak_max'] - 0.5}:LRA=11,aresample=48000"
    norm = "aresample=48000,aformat=channel_layouts=stereo"
    parts = [f"[0:v]trim=end_frame={first},setpts=PTS-STARTPTS[v0];[0:a]atrim=end={t0},asetpts=PTS-STARTPTS,{norm}[a0];",
             f"[1:v]setpts=PTS-STARTPTS[v1];[1:a]{level},asetpts=PTS-STARTPTS,{norm}[a1];"]
    # a stretch that runs to the end keeps no old tail (rounding would otherwise leave the old last frames on)
    tail = end < old["duration"] - 2 / fps
    if tail:
        parts.append(f"[0:v]trim=start_frame={cut_after},setpts=PTS-STARTPTS[v2];"
                     f"[0:a]atrim=start={t1},asetpts=PTS-STARTPTS,{norm}[a2];")
    n = 3 if tail else 2
    graph = "".join(parts) + "".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]"
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(before), "-i", str(segment),
                        "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-c:v", "libx264",
                        "-crf", str(pcfg["crf"]), "-preset", pcfg["preset"], "-pix_fmt", "yuv420p",
                        "-r", f"{num}/{den}", "-c:a", "aac", "-b:a", cfg["audio_bitrate"],
                        "-movflags", "+faststart", str(video)])
    segment.unlink(missing_ok=True)
    if r.returncode:
        before.replace(video)
        sys.exit("ffmpeg failed; the original video is back in place")

    # the result must be exactly as long as the new timeline, to the frame
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                        "stream=nb_read_frames", "-of", "csv=p=0", str(video)], capture_output=True, text=True, check=True)
    frames, want = int(r.stdout.strip().split(",")[0]), round(new["duration"] * fps)
    if abs(frames - want) > 1:
        video.replace(video.with_name(video.stem + ".bad-patch.mp4"))
        before.replace(video)
        sys.exit(f"the patched video has {frames} frames, the timeline needs {want}: original put back")

    py = sys.executable
    subprocess.run([py, str(HERE / "master.py"), str(video)], check=True)
    check = subprocess.run([py, str(HERE / "checks.py"), str(video)])
    if check.returncode:
        print(f"checks failed: the original is kept as {before.name}")
        sys.exit(1)
    shutil.copy(new_path, video.with_suffix(".timeline.json"))
    before.unlink()
    print(f"patched -> {video}")


if __name__ == "__main__":
    main()
