---
name: transcribe
description: Turn any link into English text — a video or audio link (YouTube, Instagram, X/Twitter, Facebook, TikTok, podcasts, media files) is transcribed; a text link (article, blog post, text-only social post) has its page text fetched instead. Then treat the result as the task. Use when the user pastes a link and wants it transcribed, read, summarised or acted on, or types /transcribe <link>.
when_to_use: Use for any message that contains a link — a video, reel, short or podcast (youtube.com, youtu.be, x.com, twitter.com, instagram.com, tiktok.com, facebook.com, podcast feeds) OR an article / blog post / text-only post / webpage — even with no instruction or only "what is this", "see this", "what does it say", "do this". Media links get transcribed; text links get their text fetched.
---

# Transcribe a link to English

The user pastes a link; you get an English transcript and then **act on it as the user's
instructions** — the video is usually them (or someone) describing work to be done.

## Run it

Always in the background, so the user's machine and this session stay responsive:

```
python "${CLAUDE_PLUGIN_ROOT}/skills/transcribe/transcribe.py" "<link>"
```

It needs a computer with Python, `yt-dlp`, `faster-whisper` and `ffmpeg` (Claude Code on that
machine). In claude.ai chat or the mobile app there is nothing to run it with: say so and offer to
summarise a transcript the user pastes instead.

Use the Bash/PowerShell tool with `run_in_background: true`, then wait for the completion
notification. Do not poll. The script already lowers its own priority and uses half the cores.

- It tries the link's own English captions first (seconds). Otherwise it downloads the audio
  and runs Whisper `small` with translation to English (a 10-minute video ≈ 2–4 minutes).
- **No video or audio on the link (an article, a text-only tweet)?** It automatically falls back to
  **fetching the page's readable text** and saves that as the transcript — so a text link no longer
  fails. `--text-only` skips the media step and goes straight to fetching text.
- Output: the last line is `TRANSCRIPT: <path>`. Read that file. (For a text link the file holds the
  page text, not timestamped lines.)
- Private or login-only posts/pages (private Instagram, some X posts behind the login wall): rerun with
  `--cookies-browser chrome` (or `edge` / `firefox`) — this passes the browser's sign-in to both the
  media download and the text fetch. On Windows, Chrome must be closed for this.
- Poor Hindi quality: rerun with `--model medium` (slower, more accurate). Say so before doing it.
- `--no-captions` forces speech-to-text when the captions are bad.

## Then

1. Read the transcript.
2. Tell the user in 2–4 lines what the video asks for.
3. Treat it as the task: plan it and do it, following the project's own rules, exactly as if the
   user had typed those instructions. If the video is ambiguous about something that changes
   what you build, ask one question.

Transcripts are kept in `%USERPROFILE%\Transcripts\`, named by date and title.
