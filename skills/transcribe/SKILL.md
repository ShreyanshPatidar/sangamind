---
name: transcribe
description: Transcribe a video or audio link (YouTube, Instagram, X/Twitter, Facebook, TikTok, podcasts, direct media files) into English text, then treat the transcript as the task. Use when the user pastes a media link and wants it transcribed, summarised, or acted on, or types /transcribe <link>.
when_to_use: Use for any message that contains a link to a video, reel, post, short or podcast (youtube.com, youtu.be, x.com, twitter.com, instagram.com, tiktok.com, facebook.com, podcast feeds), even with no instruction or only "what is this", "see this", "what does it say", "do this".
---

# Transcribe a link to English

The user pastes a link; you get an English transcript and then **act on it as the user's
instructions** — the video is usually them (or someone) describing work to be done.

## Run it

Always in the background, so the user's machine and this session stay responsive:

```
python "%USERPROFILE%\.claude\skills\transcribe\transcribe.py" "<link>"
```

Use the Bash/PowerShell tool with `run_in_background: true`, then wait for the completion
notification. Do not poll. The script already lowers its own priority and uses half the cores.

- It tries the link's own English captions first (seconds). Otherwise it downloads the audio
  and runs Whisper `small` with translation to English (a 10-minute video ≈ 2–4 minutes).
- Output: the last line is `TRANSCRIPT: <path>`. Read that file.
- Private or login-only posts (private Instagram, some X videos): rerun with
  `--cookies-browser chrome` (or `edge` / `firefox`). On Windows, Chrome must be closed for this.
- Poor Hindi quality: rerun with `--model medium` (slower, more accurate). Say so before doing it.
- `--no-captions` forces speech-to-text when the captions are bad.

## Then

1. Read the transcript.
2. Tell the user in 2–4 lines what the video asks for.
3. Treat it as the task: plan it and do it, following the project's own rules, exactly as if the
   user had typed those instructions. If the video is ambiguous about something that changes
   what you build, ask one question.

Transcripts are kept in `%USERPROFILE%\Transcripts\`, named by date and title.
