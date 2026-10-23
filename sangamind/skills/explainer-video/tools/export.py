"""Prepare a video for the Remotion studio: narration, word timings and the scene timeline.

    python export.py ../Syptian/scripts/14-wrong-turn-ww1.md --assets ../Syptian/assets/14 \
        --brand ../Syptian/brand/brand.json --out ../_studio/public/14

Writes into --out: narration.wav, timeline.json (words with times, scenes with times, brand), and
copies every image the scenes use into img/.

Script markup: a "[pause 0.8]" inside the narration adds that many seconds of silence there;
a sentence starting with "[slow]" (or "[slow 0.8]") is read slower; "..." mid-sentence is a short pause.

scenes.json (in --assets) is a flat list of scenes in order. Each scene starts when the narrator says
its "at" cue (a few words, matched in order); the first scene starts at 0, and a scene without a cue
shares the gap before the next cued one evenly. Steps inside a scene can have their own cues too.
"""
import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from voice import gap, load_cfg, load_tts, narration, polish, speak, write_wav

PAUSE = re.compile(r"\[pause\s+([\d.]+)\]", re.I)


def norm(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


SLOW = re.compile(r"^\[slow(?:\s+([\d.]+))?\]\s*", re.I)


def synthesize(paras, cfg, tts, voice, speed, lang):
    """Returns audio, rate, and sentences [{text, start, end, beat}].

    A sentence that starts with "[slow]" (or "[slow 0.8]") is read slower - voice.json "slow_factor",
    or the number given - for the lines that should land: the shots, the reveal, the signature line."""
    audio, sentences, t, rate = [], [], 0.0, 24000
    for bi, para in enumerate(paras):
        pieces = PAUSE.split(para)  # text, seconds, text, seconds, ...
        after_sentence = False
        for i, piece in enumerate(pieces):
            if i % 2:  # a pause marker REPLACES the normal gap after the sentence before it, never adds to it
                if after_sentence:
                    t -= len(audio.pop()) / rate
                    after_sentence = False
                silence = gap(float(piece), rate, cfg)
                audio.append(silence)
                t += len(silence) / rate
                continue
            for sentence in re.split(r"(?<=[.!?])(?<!\.\.\.)\s+", piece.strip()):  # "..." stays inside its sentence
                if not sentence:
                    continue
                m = SLOW.match(sentence)
                k = float(m.group(1) or cfg.get("slow_factor", 0.88)) if m else 1.0
                sentence = SLOW.sub("", sentence)
                samples, rate = speak(tts, sentence, cfg, voice, speed * k, lang)
                pause = gap(cfg["sentence_pause"], rate, cfg)
                audio += [samples, pause]
                sentences.append({"text": sentence, "start": t, "end": t + len(samples) / rate, "beat": bi})
                t += (len(samples) + len(pause)) / rate
                after_sentence = True
        beat_gap = gap(cfg["beat_pause"], rate, cfg)
        audio.append(beat_gap)
        t += len(beat_gap) / rate
    return np.concatenate(audio), rate, sentences


def word_times(wav, sentences, model_name):
    """Exact word times: Whisper's timestamps, mapped onto the script's own words sentence by sentence.
    Without Whisper (not installed, or its model can't be downloaded) every sentence is spread by
    characters between its exact start and end: words land within ~0.2 s, fine for scene cues."""
    heard = []
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        # decode with ffmpeg ourselves (16 kHz mono float), so PyAV version changes can't break this
        pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                             capture_output=True, check=True).stdout
        segs, _ = model.transcribe(np.frombuffer(pcm, dtype=np.float32), language="en", word_timestamps=True)
        heard = [w for s in segs for w in s.words]
    except Exception as e:  # noqa: BLE001 - any failure falls back to estimated times
        print(f"word times: Whisper unavailable ({type(e).__name__}); estimating from sentence times")
    words = []
    for si, s in enumerate(sentences):
        script = s["text"].split()
        inside = [w for w in heard if s["start"] - 0.15 <= (w.start + w.end) / 2 <= s["end"] + 0.15]
        if len(inside) == len(script):
            pairs = [(sw, w.start, w.end) for sw, w in zip(script, inside)]
        else:  # fall back to spreading the sentence by characters
            total = sum(len(x) for x in script)
            pairs, t = [], s["start"]
            for sw in script:
                d = (s["end"] - s["start"]) * len(sw) / total
                pairs.append((sw, t, t + d))
                t += d
        for sw, a, b in pairs:
            words.append({"text": sw, "start": round(max(a, s["start"]), 3), "end": round(min(b, s["end"]), 3),
                          "sentence": si, "beat": s["beat"]})
    return words


def find_cue(words, cue, from_index):
    target = [norm(x) for x in cue.split() if norm(x)]
    keys = [norm(w["text"]) for w in words]
    for i in range(from_index, len(words) - len(target) + 1):
        if keys[i:i + len(target)] == target:
            return i
    raise SystemExit(f"cue not found in the narration (after word {from_index}): {cue!r}")


def resolve(scenes, words, total, lead):
    idx, starts = 0, []
    for s in scenes:
        if "at" in s:
            idx = find_cue(words, s["at"], idx)
            starts.append((max(0.0, words[idx]["start"] - lead), idx))
        else:
            starts.append((None, idx))
    starts[0] = (0.0, starts[0][1])
    # uncued scenes share the gap before the next cued one
    i = 0
    while i < len(starts):
        if starts[i][0] is None:
            j = i
            while j < len(starts) and starts[j][0] is None:
                j += 1
            a = starts[i - 1][0]
            b = starts[j][0] if j < len(starts) else total
            n = j - i + 1
            for k in range(i, j):
                starts[k] = (a + (b - a) * (k - i + 1) / n, starts[k][1])
            i = j
        i += 1
    out = []
    for k, (s, (start, widx)) in enumerate(zip(scenes, starts)):
        end = starts[k + 1][0] if k + 1 < len(starts) else total
        scene = {**s, "start": round(start, 3), "end": round(end, 3)}
        steps = []
        for st in s.get("steps", []):
            at = start
            if "at" in st:
                at = words[find_cue(words, st["at"], widx)]["start"]
            steps.append({**st, "time": round(at - start, 3)})
        if steps:
            scene["steps"] = steps
        items = []
        for it in s.get("items", []):  # paper look: items appear on their own spoken cue ("at") and can leave on "out"
            it = dict(it)
            if "at" in it:
                it["time"] = round(words[find_cue(words, it["at"], widx)]["start"] - start, 3)
            if "out" in it:
                it["until"] = round(words[find_cue(words, it["out"], widx)]["start"] - start, 3)
            items.append(it)
        if items:
            scene["items"] = items
        out.append(scene)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--assets", required=True)
    ap.add_argument("--brand", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--render-dir", help="also write captions.srt and credits.txt here")
    ap.add_argument("--listen", action="store_true",
                    help="narration only: write narration.mp3 into --render-dir to approve by ear, then stop")
    ap.add_argument("--scenes-only", action="store_true", help="reuse the narration; re-time scenes.json and brand only")
    a = ap.parse_args()

    cfg = load_cfg()
    out, assets = Path(a.out), Path(a.assets)
    (out / "img").mkdir(parents=True, exist_ok=True)

    if a.scenes_only:  # keep the narration and word times, re-time the scenes only
        old = json.loads((out / "timeline.json").read_text(encoding="utf-8"))
        total, sentences, words = old["duration"], old["sentences"], old["words"]
    else:
        paras = narration(a.script)
        tts = load_tts(cfg)
        audio, rate, sentences = synthesize(paras, cfg, tts, cfg["voice"], cfg["speed"], cfg["lang"])
        wav = out / "narration.wav"
        write_wav(wav, audio, rate)
        polish(wav, cfg)
        total = round(len(audio) / rate, 3)
        print(f"narration: {total}s, {len(sentences)} sentences")
        if a.render_dir:  # an mp3 of the voice alone, to listen to before any picture is made
            Path(a.render_dir).mkdir(parents=True, exist_ok=True)
            mp3 = Path(a.render_dir) / "narration.mp3"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-b:a", "160k", str(mp3)], check=True)
            print(f"listen: {mp3}")
        if a.listen:
            return
        words = word_times(wav, sentences, cfg["whisper_model"])
    plan = json.loads((assets / "scenes.json").read_text(encoding="utf-8"))
    scenes = resolve(plan["scenes"], words, total, cfg["scene_lead_seconds"])
    for s in scenes:
        for it in s.get("items", []):  # photos, clips, drawings, the guide: copied flat into img/
            if it.get("src"):
                src = (assets / it["src"]).resolve()
                it["src"] = src.name
                shutil.copy(src, out / "img" / src.name)
                if it.get("kind") == "photo":
                    it["imgSize"] = media_size(src)
        for key in ("img", "bg"):
            if key in s:
                shutil.copy(assets / s[key], out / "img" / s[key])
                s["imgSize"] = media_size(assets / s[key])
                if Path(s[key]).suffix.lower() in CLIP:
                    secs = clip_seconds(assets / s[key])
                    if secs < s["end"] - s["start"] + 0.5:
                        print(f"warning: {s[key]} is {secs:.1f}s but its scene lasts "
                              f"{s['end'] - s['start']:.1f}s - the picture freezes at the end; "
                              f"fetch a longer clip (footage.py --seconds) or split the scene")
    brand = json.loads(Path(a.brand).read_text(encoding="utf-8"))
    assign_sfx(scenes, brand.get("sfx", {}))
    timeline = {"duration": total, "audio": "narration.wav", "brand": brand, "meta": plan.get("meta", {}),
                "sentences": sentences, "words": words, "scenes": scenes}
    (out / "timeline.json").write_text(json.dumps(timeline, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"timeline: {len(words)} words, {len(scenes)} scenes -> {out / 'timeline.json'}")
    if a.render_dir:
        write_upload_files(Path(a.render_dir), words, brand["motion"]["captionMaxWords"], assets, scenes, out)


def assign_sfx(scenes, rules):
    """Turn each sound name into a file, cycling through its variants so repeats never sound identical.
    Scenes and steps play only the sound they ask for, plus the brand's opt-in defaults
    (brand.json "sfx": {"enter": {type: sound}, "steps": {step: sound}})."""
    cfg = json.loads((Path(__file__).parent / "sfx.json").read_text(encoding="utf-8"))
    used = {}

    def file(name):
        if name not in cfg["sounds"]:  # a channel's own sound file in _studio/public/sfx (e.g. "dive" -> dive.wav)
            return name if name.endswith(".wav") else f"{name}.wav"
        n = cfg["sounds"][name].get("variants", cfg["variants"])
        used[name] = used.get(name, 0) + 1
        return f"{name}.wav" if n == 1 else f"{name}-{(used[name] - 1) % n + 1}.wav"

    for s in scenes:
        name = s.get("sfx", rules.get("enter", {}).get(s["type"]))
        if name:
            s["sfxFile"] = file(name)
        for st in s.get("steps", []):
            name = st.get("sfx", rules.get("steps", {}).get(st["do"]))
            if name:
                st["sfxFile"] = file(name)


def srt_time(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"


CLIP = (".mp4", ".webm", ".mov")


def media_size(path):
    """[width, height] of an image, or of a footage clip (tools/footage.py) via ffprobe."""
    if path.suffix.lower() in CLIP:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "csv=p=0:s=x", str(path)],
                           capture_output=True, text=True, check=True)
        return [int(x) for x in r.stdout.strip().split("x")[:2]]
    with Image.open(path) as im:
        return list(im.size)


def clip_seconds(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def write_upload_files(render_dir, words, max_words, assets, scenes, out):
    """captions.srt (upload to YouTube with the video) and credits.txt (paste into the description)."""
    render_dir.mkdir(parents=True, exist_ok=True)
    blocks, by_sentence = [], {}
    for w in words:
        by_sentence.setdefault(w["sentence"], []).append(w)
    for ws in by_sentence.values():
        n = -(-len(ws) // max_words)
        size = -(-len(ws) // n)
        for i in range(0, len(ws), size):
            part = ws[i:i + size]
            blocks.append((part[0]["start"], part[-1]["end"], " ".join(x["text"] for x in part)))
    srt = [f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n" for i, (a, b, text) in enumerate(blocks, 1)]
    (render_dir / "captions.srt").write_text("\n".join(srt), encoding="utf-8")
    lines = []
    used = {s[k] for s in scenes for k in ("img", "bg") if s.get(k)}
    used |= {it["src"] for s in scenes for it in s.get("items", []) if it.get("src")}
    for name, heading in (("credits.json", "Images:"), ("footage.json", "Footage:")):
        f = assets / name
        if f.exists():
            rows = [c for c in json.loads(f.read_text(encoding="utf-8")) if c["file"] in used]
            if rows:
                lines.append(heading)
                lines += [f"- {c['author']}, {c['license']}: {c['source']}" for c in rows]
    for name in dict.fromkeys(s["map"] for s in scenes if s.get("map")):  # each map's credit line, once
        m = json.loads((out / name).read_text(encoding="utf-8"))
        lines.append(m.get("credit") or m["attribution"])
    (render_dir / "credits.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"upload files -> {render_dir}")


if __name__ == "__main__":
    main()
