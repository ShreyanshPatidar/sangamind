"""
Transcribe any video or audio link to English text.

Works for anything yt-dlp can read: YouTube, Instagram, X/Twitter, Facebook, TikTok, Vimeo,
podcasts, direct media files (~1,800 sites). Always outputs English: Hindi, Hinglish or any
other language is translated by Whisper itself.

  1. Captions first. If the video already has English captions (common on YouTube), they are
     used as-is: seconds instead of minutes, and no model run at all.
  2. Otherwise the audio is downloaded and run through faster-whisper with task="translate".

Gentle on the machine by design: the process drops itself to below-normal priority and uses
half the CPU cores, so the rest of the computer stays usable while it runs.

Usage:
  python transcribe.py <url> [--model small] [--cookies-browser chrome|edge|firefox] [--out DIR]

Prints the path of the transcript file on the last line: "TRANSCRIPT: <path>".
"""

import argparse
import glob
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

DEFAULT_OUT = Path.home() / "Transcripts"
# Windows without Developer Mode cannot symlink the model cache; it still works, just noisily.
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
FFMPEG_DIR: str | None = None  # set in main() by find_tools()


def be_gentle() -> int:
    """Below-normal priority, half the cores. Returns the thread count to give Whisper."""
    try:
        if os.name == "nt":
            import ctypes

            BELOW_NORMAL = 0x00004000
            ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), BELOW_NORMAL)
        else:
            os.nice(10)
    except Exception:
        pass
    return max(1, (os.cpu_count() or 2) // 2)


def find_tools() -> str | None:
    """
    ffmpeg (and deno, which yt-dlp needs for YouTube) wherever they are, even when this process
    was started before they were installed and so never saw them on PATH. Returns ffmpeg's folder.
    """
    local = os.environ.get("LOCALAPPDATA", "")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg and local:
        found = glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "*FFmpeg*", "**", "bin", "ffmpeg.exe"), recursive=True)
        ffmpeg = found[0] if found else None
    if not shutil.which("deno") and local:
        found = glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "*Deno*", "**", "deno.exe"), recursive=True)
        if found:
            os.environ["PATH"] = os.path.dirname(found[0]) + os.pathsep + os.environ.get("PATH", "")
    if ffmpeg:
        os.environ["PATH"] = os.path.dirname(ffmpeg) + os.pathsep + os.environ.get("PATH", "")
    return os.path.dirname(ffmpeg) if ffmpeg else None


def slug(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")[:60] or "transcript"


def ydl_opts(workdir: str, cookies_browser: str | None) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "outtmpl": os.path.join(workdir, "media.%(ext)s"),
        "noplaylist": True,
    }
    if cookies_browser:
        opts["cookiesfrombrowser"] = (cookies_browser,)
    if FFMPEG_DIR:
        opts["ffmpeg_location"] = FFMPEG_DIR
    return opts


def captions(url: str, workdir: str, cookies_browser: str | None):
    """English captions if the site has them. Returns (title, lines) or (title, None)."""
    import yt_dlp

    opts = ydl_opts(workdir, cookies_browser) | {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "en-GB", "en-IN"],
        "subtitlesformat": "vtt",
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
    title = (info or {}).get("title") or "video"
    files = glob.glob(os.path.join(workdir, "*.vtt"))
    if not files:
        return title, None
    lines, last = [], None
    for block in Path(files[0]).read_text(encoding="utf-8", errors="ignore").split("\n\n"):
        m = re.search(r"(\d+):(\d+):(\d+)\.\d+ -->", block) or re.search(r"(\d+):(\d+)\.\d+ -->", block)
        if not m:
            continue
        parts = [int(x) for x in m.groups()]
        secs = parts[0] * 3600 + parts[1] * 60 + parts[2] if len(parts) == 3 else parts[0] * 60 + parts[1]
        text = " ".join(l for l in block.splitlines() if "-->" not in l and l.strip() and not l.startswith(("WEBVTT", "Kind:", "Language:")))
        text = re.sub(r"<[^>]+>", "", text).strip()
        # Auto-captions repeat each line as it scrolls; keep only what is new.
        if text and text != last:
            lines.append((secs, text))
            last = text
    return title, lines or None


def download_audio(url: str, workdir: str, cookies_browser: str | None):
    import yt_dlp

    opts = ydl_opts(workdir, cookies_browser) | {
        "format": "bestaudio/best",
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "64"}],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
    audio = glob.glob(os.path.join(workdir, "media.mp3")) or glob.glob(os.path.join(workdir, "media.*"))
    if not audio:
        raise RuntimeError("The audio could not be downloaded from that link.")
    return (info or {}).get("title") or "video", audio[0]


def whisper_english(audio: str, model_size: str, threads: int):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=threads)
    segments, info = model.transcribe(audio, task="translate", vad_filter=True)
    return info.language, [(int(s.start), s.text.strip()) for s in segments if s.text.strip()]


def stamp(secs: int) -> str:
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Transcribe a video or audio link to English.")
    ap.add_argument("url")
    ap.add_argument("--model", default="small", help="tiny | base | small | medium | large-v3 (bigger = better Hindi, slower)")
    ap.add_argument("--cookies-browser", default=None, help="Use this browser's sign-in for private posts: chrome, edge, firefox")
    ap.add_argument("--no-captions", action="store_true", help="Skip existing captions and always run speech-to-text")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    a = ap.parse_args()

    global FFMPEG_DIR
    threads = be_gentle()
    FFMPEG_DIR = find_tools()
    if not FFMPEG_DIR:
        print("FAILED: ffmpeg is not installed. Install it with: winget install Gyan.FFmpeg", file=sys.stderr)
        return 1
    workdir = tempfile.mkdtemp(prefix="transcribe-")
    try:
        title, lines, source, language = "video", None, "", ""
        if not a.no_captions:
            try:
                title, lines = captions(a.url, workdir, a.cookies_browser)
                source = "captions (English)"
            except Exception as e:  # Captions are a shortcut; any failure falls through to Whisper.
                print(f"(no usable captions: {str(e).splitlines()[0][:120]})", file=sys.stderr)
        if not lines:
            print("Downloading audio…", file=sys.stderr)
            title, audio = download_audio(a.url, workdir, a.cookies_browser)
            print(f"Transcribing to English with Whisper '{a.model}' on {threads} threads (low priority)…", file=sys.stderr)
            language, lines = whisper_english(audio, a.model, threads)
            source = f"speech-to-text, Whisper {a.model}, spoken language: {language}, translated to English"
        if not lines:
            print("No speech was found in that link.", file=sys.stderr)
            return 2

        out_dir = Path(a.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"{datetime.now():%Y-%m-%d_%H%M}_{slug(title)}.txt"
        body = [f"Title: {title}", f"Link: {a.url}", f"Source: {source}", ""]
        body += [f"[{stamp(t)}] {text}" for t, text in lines]
        path.write_text("\n".join(body) + "\n", encoding="utf-8")
        print(f"TRANSCRIPT: {path}")
        return 0
    except Exception as e:
        msg = str(e).splitlines()[0][:300]
        hint = ""
        if re.search(r"login|private|cookies|sign in|rate", msg, re.I):
            hint = "  This post needs a signed-in account: rerun with --cookies-browser chrome (or edge/firefox). Chrome must be closed for that on Windows."
        print(f"FAILED: {msg}{hint}", file=sys.stderr)
        return 1
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
