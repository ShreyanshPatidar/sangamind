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
  scenes.json, map configs), `<channel>/brand/brand.json`, renders in `<render>` = `<channel>/renders/<NNN>/` (three digits, e.g. `004`,
  the same number as the on-screen FILE number).
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
   sentence is a short spoken pause. `[loud]` at the start of a sentence (with or after `[slow]`)
   makes it louder (x1.5, or `[loud 1.3]`): for the hook questions and the one line that must hit. Name respellings live in `voice.json` "pronounce".
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
4. **Listen first.** `_tools/.venv/Scripts/python _tools/export.py <script> --assets <assets> --brand <brand.json> --out _studio/public/<n> --render-dir <render> --listen`
   makes only the voice and writes `narration.mp3` into the render folder (about a minute). Send it to
   the user and get a yes on the words, the pacing and the pauses before any picture is built.
   Script changes later go the same way: a short audio of the changed parts, never a wall of text.
5. **Export** (voice + word timings + timeline): the same command without `--listen` (writes captions.srt
   for YouTube and credits.txt for the description into the render folder; cached voice is instant).
6. **Layout check:** `_tools/.venv/Scripts/python _tools/layout_check.py _studio/public/<n>/timeline.json`
   flags items that partly cover each other, text in the bottom strip / ruler / HUD, and stretches where
   nothing changes for 8+ s. Fix every flag (move it, re-cue it, add a beat, or mark `"overlap": true`
   when it is on purpose) and re-run until clean.
7. **Storyboard:** `_tools/.venv/Scripts/python _tools/storyboard.py <n> --studio _studio --out <render>`
   renders one still 70% into every scene and draws `storyboard.jpg` (time, length, words spoken;
   red border = scene over 12 s). Look at it yourself; fix scenes.json and re-export until it reads right.
8. **Draft render:** `_tools/.venv/Scripts/python _tools/render.py <n> --studio _studio --out <render>/draft.mp4 --draft`
   (half size, 2-3x faster; `--frames 900-1500` for one stretch). The user watches the draft for content,
   pacing and sound. Every round of changes is a draft, never a full render.
9. **Fact-check before the final:** a separate agent that did not write the script checks every claim
   against sources (numbers, dates, quotes, legal status, allegation wording) and reports a table; fix
   what it finds.
10. **Final:** `_tools/.venv/Scripts/python _tools/render.py <n> --studio _studio --out <render>/video.mp4`
   renders full size once, masters the sound to -14 LUFS (`master.py`) and runs `checks.py` (format, black
   and frozen frames, loudness, frame sheet). Look at the frame sheet. Report every result.
11. **Upload folder:** once the final passes, `<render>` keeps only the five upload files, always named
   `video.mp4`, `captions.srt`, `thumbnail.png`, `thumbnail-test.png` (Test & Compare) and `upload-pack.md`;
   drafts, sheets, storyboard, logs and unused thumbnails go to the Recycle Bin.

## The paper look (optional, per channel)

A channel whose brand.json has a `"paper"` block gets a printed-page look instead of dark archive cards:
scene `"paper"` (a page with `items`) and scene `"dive"` (the move between sections), plus an always-on
HUD (the video's `meta.file` stamp, a section readout and a ruler). Everything visual comes from the
brand block (colours, fonts, depths, ruler labels, dive length); nothing is channel-specific in code.

- **Items** (`kind`): `photo` (a real photo or clip, printed and taped, `caption`), `svg` (an ink drawing
  from the assets folder), `text` (`style` headline/big/mono/kicker/note/stamp; `color` ink/accent/soft/
  highlight), `line` (draws itself; `arrow`, `dashed`; use for strike-throughs and brackets), `coin`,
  `glow`, `guide` (the mascot PNG, optional `lantern`). Positions are 1920x1080 page pixels.
- **Timing:** each item appears on its own spoken cue (`"at"`) and can leave on another (`"out"`);
  `enter` = drop/fade/stamp/pop/write/sink/fall. Keep one accent thing per moment.
- **Scenes:** `section` (0 = the surface; pages at the surface take `waterline: <y>`), `dive` takes
  `section`, `kicker`, `title`, optional `rise: true` to go back up, and an `sfx` (a file the channel
  puts in `_studio/public/sfx`). `scenes.json` `"meta"`: `file` (e.g. "FILE 004") and `sections`
  (the readout names, `|`-separated) for this video.
- **Subtitles: uploaded, not burned in, on long videos** (brand `motion.captions: 0`). A paper video is
  already full of designed text; a running caption strip makes a second stream to read, can't be
  switched off and reads as a Shorts look. Upload `captions.srt` to YouTube instead (viewers toggle it,
  it auto-translates, search indexes it). **Shorts: burn them in** (`captions: 1`): small, bottom
  centre, on a paper-coloured strip, the spoken word in the highlight colour.
- **Full-screen punchlines:** give the 2-3 lines the script marks for the screen their own short
  paper scene with one centred `big` text item (`"align": "center"`, `"enter": "pop"`) cued to the line.
- **Dive titles are not labels:** a dive's `title` is the line that answers the previous section
  ("People did."), not "Level 2"; leave `kicker` empty unless the brand wants it.
- **Drawings:** keep text out of SVG files (they render without the brand fonts); put labels on as
  `text` items. Pages longer than ~25 s need a new page or a steady stream of items.

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
- **Captions:** see the paper look - uploaded on long videos, burned in on Shorts.
- Vary the entrances (wipe, zoom, slide, fade); never the same transition three times in a row.
- **Typewriter text with keyboard sound** (`"enter": "type"` on a text item; brand `paper.typeSfx`,
  `typeCps`): for the lines that read like evidence - a quote from a document, a dossier list, a court
  finding. Big typed quotes can take the whole screen. A few per video, not every label.
- **Sound only where it means something** (a gunshot, a bomb, a stamp), never a whoosh on every
  scene: brand.json `sfx.enter` / `sfx.steps` stay empty unless a channel wants defaults. Repeats
  cycle through pitch variants. The drone plays only under scenes marked `"tense": true`.
- **A mascot must read on a phone.** Big enough that the expression is legible at feed size (a small
  corner sticker turns every pose into the same blob), a different pose each time (never the same
  twice in a row), and a small reaction on each entrance (pop, tilt, bob) tied to the line.
- **Props and effects mean something.** An effect on every appearance (a glow, a prop, a sound)
  stops meaning anything; tie it to the moments it is about. The channel's brand says which.
- **Show who the story is about, properly.** When the narration names a company, institution or
  public figure - above all one that is accused of something - the viewer sees exactly who: the
  full name on screen, the company's logo the first time it is named (editorial identification is
  allowed, as long as it never looks like a sponsorship or a mockery), and a real photo of the
  person or of the company's sign, building or court. Three limits:
  - **Real photos only, licensed** (public domain / CC BY / BY-SA, credited). Never an AI image of a
    real person; a press photo without a licence is not ours to use.
  - **Accused, not guilty.** While a claim is unproven, the name or face carries "ALLEGED" / "accused
    by <who>" on the same shot, and their denial gets screen time too. No faces cut into crime
    imagery, nothing that edits them to look guilty.
  - **Public actors only.** Companies, officials, executives named in public filings, public
    figures. Someone a source left unnamed (an anonymous executive, a private broker) stays unnamed
    and unpictured.

## Settings (nothing hardcoded)

- `brand.json` (per channel): colours, fonts, motion sizes and timings, sfx/drone/narration volumes.
- `tools/voice.json`: voice blend (e.g. `bf_emma*0.6+af_bella*0.4`), speed, pauses, polish chain,
  pronunciation respellings for names Kokoro gets wrong (check names by running Whisper on the output).
  **Google voices (optional upgrade):** set `"voice": "google:en-GB-Chirp3-HD-Aoede"` (any Cloud
  Text-to-Speech voice name) to narrate with Google instead of Kokoro. Free tier 1M characters/month
  for Chirp 3 HD (a 5-minute video is about 4,500). Needs a Google Cloud project with the
  Text-to-Speech API enabled and an API key restricted to it, saved in `_tools/google-tts-key.txt`
  (or env `GOOGLE_TTS_KEY`); never commit it. Clips are cached in `_tools/.tts-cache/`, so re-exports
  only pay for changed sentences. Kokoro speeds (~0.85) are slow for Google; start at 0.95-1.0, with `sentence_pause` ~0.4 and
  `beat_pause` ~0.9 (Chirp voices already breathe at the end of a sentence). A `[pause N]` replaces the
  gap after the sentence before it; it never adds to it.
- `tools/video.json`: check targets. `tools/sfx.json`: the synthesised sound recipes.
  `tools/openverse.py`: search/fetch real CC-licensed sounds when synthesis won't do.

## Rules

- **Delivering big files:** a full render (200+ MB) is too big to copy to the laptop from a cloud
  session (30 MB limit per file). Send it in chat to download, or render on the laptop with Claude Code.
  Without Whisper (blocked in the cloud) subtitle word timing is estimated; exact on the laptop.
- Never publish. Deliver files; Shreyansh uploads.
- Image and map credits go in the description (`credits.json`, "Map data (c) OpenStreetMap contributors").
- Remotion is free for individuals and companies up to 3 people; above that it needs a company licence.
- Fonts are OFL (licences in `studio/public/fonts`). Abstract sound effects are synthesised, ours;
  any real sound fetched from Openverse is CC-licensed and must keep its credit (handled by
  `openverse.py` → `credits.json` → description). Only cc0/by/by-sa are fetched (commercial-OK).
- Shell heredocs mangle backslashes on this Windows setup: write regex-heavy code with the editor, not `sed`/heredocs.
