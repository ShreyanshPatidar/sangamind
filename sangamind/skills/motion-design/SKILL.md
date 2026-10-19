---
name: motion-design
description: Make a finished motion design video (brand reel, explainer, YouTube intro, product demo) as a Remotion project that renders an MP4, stage by stage with Shreyansh approving each gate - brief, script, style frames, transitions, animatic, build, final - and quality checks before every gate. Use when asked to make, animate or render a video, reel, intro, explainer or demo clip.
when_to_use: Any request to produce a video or animation from scratch ("make a video", "brand reel", "YouTube intro", "explainer", "animate this", "demo video for Oric", "motion graphics"). Not for transcribing or editing existing footage (use transcribe or creator-cut).
---

# Motion design harness

Source: "Opus 5.5 Motion Design Harness" field guide by @0xMovez (Oct 2026). Page 1, the prompt, is
copied word for word into `prompt.md`; pages 2–4 (the harness, the twelve checks, running it) are
in `harness.md`.

## Run it

1. Read `prompt.md` and `harness.md` in this folder in full. The prompt is the brief for the whole
   job: follow it exactly, gates included. The harness says how each session stops at a gate, what
   a gate submission holds, and the twelve checks. You are the studio; Shreyansh is the owner who
   approves each `[me]` gate. Short jobs use the shorter pipelines in `harness.md` (logo-sting,
   social-short).
2. Fill its `{{BRACES}}` from the request: TOPIC, AUDIENCE, TAKEAWAY, SECONDS, the shape and
   narration choice. Anything the request leaves open goes into gate 1 as a question with a default.
3. Videos are part of Chitrix, his local picture studio: each one is a project in
   `D:\Coding\Apps\Chitrix\Videos\<video-name>\`, and the finished MP4 is also copied to
   `Chitrix\Videos\out\`. Never inside an app's repo. Images made in Chitrix (`Chitrix\Images\`) can be
   used as assets. Brand files go in `./brand`: for a business of his, copy its logo, fonts and
   colour tokens from that website's repo rather than inventing them.
4. Needs Node and ffmpeg (both on his PC). Create the Remotion project with
   `npx create-video@latest video` at gate 5 or earlier; render with `npx remotion render`.
   Python `librosa` only if a beat-synced score is wanted: ask before installing it.

## House rules that win over the prompt

- His names, tone and no-hardcoding rule still apply: colours and type come from `design/LOOK.md`
  and the brand files, never literals scattered through scenes.
- No Claude or AI credit anywhere in the video or its files.
- Don't publish or upload the video anywhere; deliver files only.
