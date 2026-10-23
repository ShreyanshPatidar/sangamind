---
name: explainer-video
description: Turn a finished script into an animated explainer video (Claude Motion style) on this computer - AI narration with real pauses, word-timed motion graphics (kinetic text, counters, archive photos, animated OpenStreetMap maps with routes and markers, stamps), word-by-word captions, original sound effects, then quality checks. Remotion + Kokoro + Whisper, all local and free.
when_to_use: Making or re-making a video for one of Shreyansh's channels from a script ("make the video", "render #14", "animate this script", "add a map scene"). Not for writing the script (creator-script) or a short brand sting (motion-design).
---

# explainer-video

Script in, finished MP4 out. Everything runs locally; nothing is uploaded.

## Where things live

- **Code: this skill.** `tools/` (Python), `studio/` (Remotion). Edit it here, then sync.
- **Workspace (per machine, not in git):** `<workspace>/_tools` (.venv, Kokoro models) and
  `<workspace>/_studio` (node_modules, `public/<video>/` data, sfx, fonts).
  On Shreyansh's laptop the workspace is `D:\Coding\Apps\AI\Channels`.
- **Channel data:** `<channel>/scripts/<n>-*.md`, `<channel>/assets/<n>/` (images, credits.json,
  scenes.json, map configs), `<channel>/brand/brand.json`, renders in `<channel>/renders/<n>/`.
- **Writing and planning live in Notion** (Syptian since 23 Oct 2026: YouTube > Syptian - Brand, Topics,
  Scripts; see `<channel>/NOTION.md`). Copy a script from its Notion page into `<channel>/scripts/`
  only when its video is rendered; never edit the local copy instead of the page.
- **Mascot:** full-size transparent poses in `<channel>/brand/mascot/` (Syptian: Berg,
  `syptian-mascot-berg-<pose>.png`; `-blank` has no face, for blink/talk animation). Brand rules
  decide where it may appear. Every new final asset (pose, logo, art) is also added to the Notion
  "Brand assets" page - the laptop copy alone is not a backup.

Setup on a new machine: `python setup.py --workspace <path>` (needs Python 3.10-3.13, Node 18+,
ffmpeg). After editing code here: `python setup.py --workspace <path> --sync`.

## Make a video

1. **Script.** Narration paragraphs under `## Script` (one per beat; `**[..]**` headings and
   `` `[ON SCREEN..]` `` lines are skipped). `[pause 0.8]` inside a line = that many seconds of
   silence: use them after hook beats and before reveals. A sentence starting `[slow]` (or `[slow 0.8]`) is read slower - use it on the
   two or three lines that must land (the shots, the reveal, the signature line). `...` inside a
   sentence is a short spoken pause. Name respellings live in `voice.json` "pronounce".
2. **Assets.** Public-domain/CC images in `assets/<n>/` with `credits.json` (fetch from Wikimedia
   Commons with the licence; look at every image before using it - check it shows what the line
   says). Maps: download the area with the OSM API
   (`https://api.openstreetmap.org/api/0.6/map?bbox=W,S,E,N`), write a `map-*.config.json`
   (center, width_m, routes by street name or points, markers, labels - see `tools/osm_map.py`),
   then `python osm_map.py area.osm config.json ../_studio/public/<n>/map-x.json`.
   **Real footage:** `python footage.py --assets ../<Channel>/assets/<n> "concert crowd" "stadium at night"`
   searches Pexels (free key in `_tools/pexels-key.txt`), Wikimedia Commons and the Internet Archive,
   skips anything NC/ND or unlicensed, cuts 15 s clips (1080p, silent) into the assets folder, logs
   source and licence in `footage.json` and draws `footage-sheet.jpg`. Look at the sheet, then use a
   clip anywhere an image goes (`"img": "clip-concert-crowd-2.mp4"`, also as `bg`). Moving footage
   under the narration is what makes it feel like a documentary rather than a slideshow: aim for one
   clip every few scenes, stills for the specific people, documents and quotes. Archive films are long;
   pass `--start <seconds>` for the part you want.
3. **Scenes.** `assets/<n>/scenes.json`: a flat list in order, each starting on its spoken `at`
   cue. Types: `photo` (img, label, `move` in/out/left/right or `focus` [x, y, zoom] to push in on a
   point, `ring` [x, y, r] + `note` to circle someone, `kicker` + `headline` text on the picture,
   `enter` wipe/zoom/slide/fade), `kinetic` (big words), `counter`, `stamp` (all three take `bg`, a
   picture behind), `map` (street map; steps: marker, draw, car, callout, shake, flash), `geo`
   (country map; steps: light a region central/allied/neutral, arrow from-to, point, date, focus on a
   region with zoom), `title`, `endcard`. Image x/y are fractions of the image.
   Country maps: GeoJSON borders (e.g. historical-basemaps for a past year) + a `map-*.config.json`
   (bbox, regions, points, attribution, credit), then `python geo_map.py config.json ../_studio/public/<n>/map-x.json`.
   Optional `sfx`: whoosh, pop, boom, gunshot, stamp, tick. Follow **Visual rules** below.
   For a **real recorded** sound a synthesised recipe can't fake (a true stamp thunk, crackling
   fire, room ambience), search Openverse (5.2M+ CC audio, free, no key):
   `python tools/openverse.py "<plain words>"` — it matches words literally, so listen to a few,
   then `--get <n> --out _studio/public/<n>/sfx --name <sound>`. It logs the licence + credit to
   that folder's `credits.json` so the description carries it. Abstract hits stay synthesised.
4. **Export** (voice + word timings + timeline):
   `_tools/.venv/Scripts/python _tools/export.py <script> --assets <assets> --brand <brand.json> --out _studio/public/<n> --render-dir <channel>/renders/<n>`
   (writes captions.srt for YouTube and credits.txt for the description into the render folder)
5. **Storyboard before rendering.** `_tools/.venv/Scripts/python _tools/storyboard.py <n> --studio _studio --out <channel>/renders/<n>`
   renders one still 70% into every scene and draws `storyboard.jpg`: numbered frames with time,
   length, source file and the words spoken over each (red border = scene over 12 s, check it moves).
   Look at it yourself first, then send it to the user for approval: wrong picture for the words,
   text over a face, a static stretch. Fix scenes.json, re-export (cached voice is instant) and re-run
   the storyboard - never the full render - until it reads right. For one moment in detail:
   `npx remotion still Explainer out/s.png --frame=<f>` or `npx remotion studio`.
6. **Render:** `npx remotion render Explainer <channel>/renders/<n>/video.mp4 --props='{"video":"<n>"}'`
7. **Master the sound:** `_tools/.venv/Scripts/python _tools/master.py <video.mp4>` (voice + effects + drone
   together land louder than the voice alone; this brings the mix to -14 LUFS, picture untouched).
8. **Check:** `_tools/.venv/Scripts/python _tools/checks.py <video.mp4>` (format, black and frozen
   frames, -14 LUFS loudness, frame sheet). Look at the frame sheet. Report every result.

## Visual rules (Shreyansh's feedback on the first video, 17 Oct 2026)

- **Pictures carry the video, text sits on them.** Words go over a moving picture (`headline` +
  `kicker` on a photo, or `bg` behind a kinetic/counter/stamp), not on a flat colour card.
- **Full-screen text cards only in the hook**, and at most one more for the payoff line. A plain card
  mid-video reads as "new chapter" and breaks the story.
- **Everything moves, all the time.** Every photo has a camera move: drift (`move`) or a push to the
  subject (`focus`) with a `ring` on the person or object the line names. Maps draw, light up and
  zoom on cue (`steps`). No shot holds longer than ~5 s.
- **Dates, places and lists are animated on a map or picture** (a `geo` map with countries lighting
  up and arrows, a date chip), not read out on title cards.
- **Captions are small and optional** (`motion.captions`, `captionSize`), hidden while on-screen text
  is showing; YouTube gets captions.srt anyway.
- Vary the entrances (wipe, zoom, slide, fade); never the same transition three times in a row.
- **Sound only where it means something** (a gunshot, a bomb, a stamp), never a whoosh on every
  scene: brand.json `sfx.enter` / `sfx.steps` stay empty unless a channel wants defaults. Repeats
  cycle through pitch variants. The drone plays only under scenes marked `"tense": true`.

## Settings (nothing hardcoded)

- `brand.json` (per channel): colours, fonts, motion sizes and timings, sfx/drone/narration volumes.
- `tools/voice.json`: voice blend (e.g. `bf_emma*0.6+af_bella*0.4`), speed, pauses, polish chain,
  pronunciation respellings for names Kokoro gets wrong (check names by running Whisper on the output).
  **Google voices (optional upgrade):** set `"voice": "google:en-GB-Chirp3-HD-Aoede"` (any Cloud
  Text-to-Speech voice name) to narrate with Google instead of Kokoro. Free tier 1M characters/month
  for Chirp 3 HD (a 5-minute video is about 4,500). Needs a Google Cloud project with the
  Text-to-Speech API enabled and an API key restricted to it, saved in `_tools/google-tts-key.txt`
  (or env `GOOGLE_TTS_KEY`); never commit it. Clips are cached in `_tools/.tts-cache/`, so re-exports
  only pay for changed sentences. Kokoro speeds (~0.85) are slow for Google; start at 0.95-1.0.
- `tools/video.json`: check targets. `tools/sfx.json`: the synthesised sound recipes.
  `tools/openverse.py`: search/fetch real CC-licensed sounds when synthesis won't do.

## Rules

- Never publish. Deliver files; Shreyansh uploads.
- Image and map credits go in the description (`credits.json`, "Map data (c) OpenStreetMap contributors").
- Remotion is free for individuals and companies up to 3 people; above that it needs a company licence.
- Fonts are OFL (licences in `studio/public/fonts`). Abstract sound effects are synthesised, ours;
  any real sound fetched from Openverse is CC-licensed and must keep its credit (handled by
  `openverse.py` → `credits.json` → description). Only cc0/by/by-sa are fetched (commercial-OK).
- Shell heredocs mangle backslashes on this Windows setup: write regex-heavy code with the editor, not `sed`/heredocs.
