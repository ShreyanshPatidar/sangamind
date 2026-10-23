"""Narrate a Syptian-style script with Kokoro (local, free) or Google Cloud TTS (Chirp 3 HD / Studio).

Reads the narration from a script .md (the lines under "## Script", skipping beat headings and
[ON SCREEN] notes) and writes a WAV. Settings come from voice.json next to this file; flags override.
Names Kokoro gets wrong go in its "pronounce" list as a respelling ("Lojka": "Loy-ka").
Delivery: "..." inside a sentence is a short pause; pauses carry quiet room tone ("room_tone_db").

    python voice.py ../Syptian/scripts/14-wrong-turn-ww1.md -o out.wav
    python voice.py script.md --voice bf_emma --speed 0.95 --beats 3
    python voice.py script.md --voice google:en-GB-Chirp3-HD-Aoede --beats 3 -o g.wav

Google voices: any voice spec starting "google:" goes to Cloud Text-to-Speech. The key is read from the
GOOGLE_TTS_KEY environment variable or google-tts-key.txt next to this file (never commit that file).
Free tier: 1M characters/month for Chirp 3 HD. Every Google clip is cached in .tts-cache/, so re-running
an export only pays for sentences that changed.
"""
import argparse
import base64
import hashlib
import io
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np

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


class _Lazy:
    """Loads Kokoro only when a Kokoro voice is actually used, so Google-only runs don't need the model."""
    def __init__(self, cfg):
        self.cfg, self._k = cfg, None

    def __getattr__(self, name):
        if self._k is None:
            from kokoro_onnx import Kokoro
            self._k = Kokoro(str(HERE / self.cfg["model"]), str(HERE / self.cfg["voices"]))
        return getattr(self._k, name)


def load_tts(cfg):
    return _Lazy(cfg)


GOOGLE_URL = "https://texttospeech.googleapis.com/v1/text:synthesize?key="


def _google_key():
    key = os.environ.get("GOOGLE_TTS_KEY")
    f = HERE / "google-tts-key.txt"
    if not key and f.exists():
        key = f.read_text(encoding="utf-8").strip()
    if not key or "paste" in key:
        raise SystemExit("No Google key: put it in _tools/google-tts-key.txt or set GOOGLE_TTS_KEY")
    return key


def google_say(text, name, speed, rate=24000):
    """One clip from Google Cloud TTS. name like 'en-GB-Chirp3-HD-Aoede'. Cached by (text, voice, speed)."""
    cache = HERE / ".tts-cache"
    cache.mkdir(exist_ok=True)
    tag = hashlib.sha1(f"{name}|{speed}|{rate}|{text}".encode()).hexdigest()[:20]
    hit = cache / f"{tag}.wav"
    if not hit.exists():
        body = {
            "input": {"text": text},
            "voice": {"languageCode": "-".join(name.split("-")[:2]), "name": name},
            "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": rate, "speakingRate": speed},
        }
        req = urllib.request.Request(GOOGLE_URL + _google_key(), json.dumps(body).encode(),
                                     {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                hit.write_bytes(base64.b64decode(json.load(r)["audioContent"]))
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Google TTS {e.code}: {e.read().decode(errors='replace')[:400]}")
    with wave.open(io.BytesIO(hit.read_bytes())) as w:
        rate = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return pcm.astype(np.float32) / 32768, rate


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


ELLIPSIS = re.compile(r"\s*(?:\.\.\.|\u2026)\s*")


def _trim(samples, rate, floor=0.008):
    """Cut Kokoro's uneven leading/trailing silence so the pauses we add are the pauses you hear."""
    loud = np.where(np.abs(samples) > floor)[0]
    if not len(loud):
        return samples
    a = max(0, loud[0] - int(0.01 * rate))
    b = min(len(samples), loud[-1] + int(0.06 * rate))
    return samples[a:b]


def _fade(samples, rate, ms=8):
    """Short fade in/out so cuts between pieces never click."""
    n = min(len(samples) // 2, int(rate * ms / 1000))
    if n > 0:
        ramp = np.linspace(0, 1, n, dtype=np.float32)
        samples = samples.copy()
        samples[:n] *= ramp
        samples[-n:] *= ramp[::-1]
    return samples


def gap(seconds, rate, cfg):
    """A pause. Filled with very quiet room tone (voice.json "room_tone_db"), not digital silence,
    which sounds like the mic was switched off between sentences."""
    n = int(rate * max(0.0, seconds))
    db = cfg.get("room_tone_db")
    if db is None or n == 0:
        return np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(n)
    noise = np.cumsum(rng.standard_normal(n)).astype(np.float32)  # brown-ish, warm
    noise -= np.convolve(noise, np.ones(400) / 400, mode="same")    # remove drift
    noise /= (np.abs(noise).max() + 1e-9)
    return noise * np.float32(10 ** (db / 20))


def speak(tts, text, cfg, voice, speed, lang):
    """Synthesize one sentence: name respellings, then "..." inside it becomes a real pause
    (voice.json "ellipsis_pause") instead of Kokoro gliding straight over it."""
    for word, said in cfg.get("pronounce", {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", said, text)
    google = voice.startswith("google:")
    style = None if google else resolve_voice(tts, voice)
    parts = [p for p in ELLIPSIS.split(text) if p.strip()]
    out, rate = [], 24000
    for i, part in enumerate(parts):
        if google:
            samples, rate = google_say(part.strip(), voice[len("google:"):], speed)
        else:
            samples, rate = tts.create(part.strip(), voice=style, speed=speed, lang=lang)
        out.append(_fade(_trim(samples.astype(np.float32), rate), rate))
        if i < len(parts) - 1:
            out.append(gap(cfg.get("ellipsis_pause", 0.35), rate, cfg))
    if not out:
        return np.zeros(0, dtype=np.float32), rate
    return np.concatenate(out), rate


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
        out += [samples, gap(cfg["pause_seconds"], rate, cfg)]
    audio = np.concatenate(out)
    write_wav(a.out, audio, rate)
    if not a.raw:
        polish(a.out, cfg)
    print(f"{a.out}: {len(audio) / rate:.1f}s, voice {a.voice}, speed {a.speed}")


if __name__ == "__main__":
    main()
