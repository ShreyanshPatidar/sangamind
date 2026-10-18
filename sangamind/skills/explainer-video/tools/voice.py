"""Narrate a Syptian-style script with Kokoro (local, free).

Reads the narration from a script .md (the lines under "## Script", skipping beat headings and
[ON SCREEN] notes) and writes a WAV. Settings come from voice.json next to this file; flags override.
Names Kokoro gets wrong go in its "pronounce" list as a respelling ("Lojka": "Loy-ka").

    python voice.py ../Syptian/scripts/14-wrong-turn-ww1.md -o out.wav
    python voice.py script.md --voice bf_emma --speed 0.95 --beats 3
"""
import argparse
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent


def narration(md_path, beats=None):
    """Return the spoken paragraphs from a script file, one per beat."""
    text = Path(md_path).read_text(encoding="utf-8")
    body = text.split("## Script", 1)[-1].split("\n## ", 1)[0]
    paras = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith(("**[", "`[", "#")):
            continue
        paras.append(line)
    return paras[:beats] if beats else paras


def load_cfg():
    return json.loads((HERE / "voice.json").read_text(encoding="utf-8"))


def load_tts(cfg):
    return Kokoro(str(HERE / cfg["model"]), str(HERE / cfg["voices"]))


def resolve_voice(tts, spec):
    """'bf_emma' or a blend like 'bf_emma*0.7+bf_isabella*0.3' (weights are normalised)."""
    if "+" not in spec and "*" not in spec:
        return spec
    parts = []
    for part in spec.split("+"):
        name, _, weight = part.strip().partition("*")
        parts.append((tts.get_voice_style(name.strip()), float(weight or 1)))
    total = sum(w for _, w in parts)
    return sum(style * (w / total) for style, w in parts).astype(np.float32)


def speak(tts, text, cfg, voice, speed, lang):
    """Synthesize one piece of text, applying the pronunciation respellings."""
    for word, said in cfg.get("pronounce", {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", said, text)
    return tts.create(text, voice=resolve_voice(tts, voice), speed=speed, lang=lang)


def polish(path, cfg):
    """Run the voice.json "polish" ffmpeg filter (pitch, EQ, compression, loudness) over a WAV in place."""
    chain = cfg.get("polish")
    if not chain:
        return
    tmp = Path(path).with_suffix(".polish.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-af", chain, str(tmp)], check=True)
    tmp.replace(path)


def write_wav(path, samples, rate):
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def main():
    cfg = load_cfg()
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--voice", default=cfg["voice"])
    ap.add_argument("--speed", type=float, default=cfg["speed"])
    ap.add_argument("--lang", default=cfg["lang"])
    ap.add_argument("--beats", type=int, help="only the first N paragraphs (for samples)")
    ap.add_argument("--only", type=int, nargs="*", help="pick paragraphs by index (0-based)")
    ap.add_argument("--raw", action="store_true", help="skip the polish filter")
    a = ap.parse_args()

    tts = load_tts(cfg)
    paras = narration(a.script, a.beats)
    if a.only:
        paras = [paras[i] for i in a.only]
    out, rate = [], None
    for p in paras:
        samples, rate = speak(tts, p, cfg, a.voice, a.speed, a.lang)
        out += [samples, np.zeros(int(rate * cfg["pause_seconds"]), dtype=samples.dtype)]
    audio = np.concatenate(out)
    write_wav(a.out, audio, rate)
    if not a.raw:
        polish(a.out, cfg)
    print(f"{a.out}: {len(audio) / rate:.1f}s, voice {a.voice}, speed {a.speed}")


if __name__ == "__main__":
    main()
