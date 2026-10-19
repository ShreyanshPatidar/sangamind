---
name: creator-cut
description: >-
  Cut a video down from its transcript - tighten a rambling recording into an
  edit decision list (dead air, filler, retakes with timecodes), and find the
  Shorts hiding inside a long video. Use for "edit this", "cut the dead space",
  "tighten this video", "I rambled", "shorten this", "cut this into shorts",
  "clip this", "repurpose this video", "what should I clip".
---

# creator-cut

Two cuts, both from a timestamped transcript: **tighten** a raw take, and **carve Shorts** out of a
long video. The skill prints the cuts; you apply them in your editor. No transcript yet? Ask for one
or produce one first — `whisper`, `faster-whisper`, or the caption track YouTube generates on an
unlisted upload all work. Do not guess at timings.

---

## Tighten (edit decision list)

```bash
python3 deadair.py transcript.srt              # srt, vtt or whisper json
python3 deadair.py transcript.srt --floor 0.35 --json
```

What it finds:
- **DEAD** — gaps longer than the floor, trimmed from the MIDDLE so both sides keep a breath. Cutting
  flush against speech is what makes a tightened take sound gasping.
- **FILLER** — cues that are nothing but "um", "so yeah", "basically".
- **REPEAT** — a sentence restarted. Compared against the last cue that was actually speech, not the
  literal previous cue, because most retakes have an "um" between the two attempts.

What it will not do: it does not touch media and has no opinion about your B-roll. A 40% cut on the
report is a 40% cut of SPEECH — if the video has a long silent demo, that number is wrong, so check
the report against the footage before trusting the runtime at the bottom.

---

## Carve Shorts

A Short cut out of a long video is not a clip of the best moment. It is a moment that **survives
without the video around it** — a much smaller set.

**Picking:** read the transcript and find spans of 20–55 seconds where all three are true:
1. It opens on a complete thought. If the first sentence needs the previous minute, it is not a Short.
2. There is a turn in it — a claim, then something that complicates or proves it.
3. It ends on a line, not a trail-off.

Rank the candidates and show the top five with timecodes and first line, so the user can reject one
without reading the whole transcript.

**Writing each one:**
- **A NEW first line.** The long video's line assumes context this viewer doesn't have. Write the
  replacement and run it through `../creator-script/hookscore.py`.
- **On-screen text for the first two seconds**, different words from the spoken line.
- **A loop point**: what the last line sets up so the first line answers it.
- A vertical framing note — what gets cropped out of a 16:9 frame and whether that matters.

---

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
