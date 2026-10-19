# The harness around the prompt (guide pages 2–4)

From the same field guide. The guide's harness is **Mortiflix** (github.com/GTKottman/mortiflix-oss,
AGPL-3.0), which enforces these rules in code. Not installed: on 9 Oct 2026 its sessions did not run
on Windows yet (target 20 Oct 2026), and they run Claude unattended with full permissions, sandboxed
only on Linux. Until it is worth installing, follow these rules by hand.

## Pipeline (explainer)

brief → script + style frames (side by side) → transitions → animatic → music (skipped if no music)
→ build (internal: checks only, no gate) → final.

Other shapes: **social-short** (45 s – 3 min vertical, hook first): brief → hook frames → transitions
→ final. **logo-sting** (3–8 s, the quickest real run): directions → final.

## How a session behaves

- **Sessions end at gates.** Work until there is something to review, submit it, write a handoff
  (what you did, what's next, gotchas) in `HANDOFF.md`, and stop. No waiting, no polling. The next
  session starts from the handoff.
- **What was approved is frozen.** Copy each approved submission into `approved/<step>/`; never edit
  files there afterwards.
- **It learns the studio.** When Shreyansh points at a real mistake, propose a new check; once he
  approves it, add it to `checks.md` in the project and to the "Studio checks" list at the end of
  this file, so every future video runs it. Lasting taste notes go in `TASTE.md`.

## What a gate receives

```json
{
  "note": "What this is and what to look at. Plain words.",
  "questions": [{ "id": "pace", "text": "Calm or energetic?", "choices": ["Calm", "Energetic"], "default": "Calm" }],
  "items": [{ "path": "out/frames/sf01-open.png", "label": "SF01 · Opening" }],
  "error_checks": [{ "id": "text-safe-area", "result": "pass" },
                   { "id": "loudness", "result": "n/a", "note": "Stills only: no audio in this submission." }],
  "pin_changes": [{ "note": 1, "change": "Warmed the sky toward golden hour.", "status": "done" }]
}
```

Show it as a short message: the note, the items to open, each check's result, the questions with
their defaults, and one line per note answered.

## The twelve checks

| Check | Applies to | Passes when |
|---|---|---|
| spelling-and-facts | script, stills, motion | Every word, name and number matches the brief or a source. |
| script-fits-length | script | About 150 spoken words per minute lands within 10% of the target length. |
| text-safe-area | stills, motion | Every text box sits at least 5% inside each frame edge. |
| no-collisions | stills, motion | No accidental overlap. Nothing clipped by the frame or another layer. |
| text-contrast | stills, motion | At least 4.5:1 at the worst frame. On screen for about words / 3 + 1 seconds. |
| frame-sheet | motion | No black, flash or frozen frames. One frame per second, viewed yourself. |
| format | motion | The brief's shape at 1080p or more, constant rate, H.264 + AAC, length within 5%. |
| loudness | audio | -14 LUFS (±1) integrated, true peak at or below -1 dBTP, no clicks or pops. |
| sync | audio | Each spoken key word lands with its visual within 2 frames. |
| music-check | music | The score plays through with no errors. |
| music-under-voice | music | Music about 18 dB under the voice while it speaks. Every word stays intelligible. |
| transitions-carried | motion | Each cut names a carrier, a reason and a landing word. |

Every submission reports each check that applies as `pass`, `fixed` or `n/a`; `fixed` and `n/a`
carry a note. A missing check means the submission is not ready.

Measuring with ffmpeg: frame sheet `ffmpeg -i out/final.mp4 -vf "fps=1,scale=320:-1,tile=6x10" -frames:v 1 checks/final-sheet.png`;
black frames `-vf blackdetect=d=0.05`; frozen frames `-vf freezedetect=n=0.003:d=0.5`; loudness
`-af ebur128=peak=true -f null -`; format `ffprobe -v error -show_streams -show_format`.

## Craft areas (the guide's shared skills)

- **motion-design**: style frames, layout, type, colour, timing, easing, transitions (prompt.md).
- **remotion-motion**: the Remotion project from a template; stills first, then renders one at a time.
- **transition-board**: every cut designed before the animatic: carrier, reason, timing, real
  in-between frames.
- **voiceover**: narration, checked takes, and a word-timing map the animation follows.
- **music**: an original score written to the approved animatic (no stock tracks without a licence
  in assets/SOURCES.md). For sound effects and ambience (not the score), Openverse is a free
  source of 5.2M+ CC audio with no API key — `api.openverse.org`; use only cc0/by/by-sa
  (commercial-OK) and record each file's credit in assets/SOURCES.md. The explainer-video skill's
  `tools/openverse.py` already does the search, licence filter and credit logging if you want it.
- **final-pass**: format, black or frozen frames, loudness, true peak, and a frame sheet to look at.

## Guards against a runaway loop

- Two working rounds in a row that move nothing forward: stop and ask.
- Renders run one at a time.

## Studio checks

Checks Shreyansh approved after a real mistake. Run them on every video.

- (none yet)
