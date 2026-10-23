# The content pipeline

Not Prompt -> Copy -> Upload. **Research -> Brief -> Outline -> Script -> Review -> Rewrite**, a human
at every gate. Full chain: Research -> Topic -> Script -> Voice -> Assets -> Edit -> Thumbnail ->
Upload -> Analytics.

## Four agents, one shared file (Force's system)

Each role has its own system prompt; no agent does the whole job. Splitting writer from editor
stops the system approving its own average work.

- **Researcher** - reads PIPELINE.md, takes the topic under NEXT UP, returns one sharp angle (not
  the obvious take), three supporting points with real specifics, two sources worth citing, one
  question the audience actually asks. Writes BRIEF, marks BRIEFED.
- **Writer** - brief -> first draft: one-sentence hook stating the outcome, paragraphs of at most
  four lines, plain language, no filler, no closing that restates. Matches VOICE.md. Writes DRAFT,
  marks DRAFTED.
- **Editor** - notes, never a rewrite. Checks against VOICE.md; flags paragraphs over four lines
  and how to cut; quotes filler or repeated sentences to delete; points where the reader stops
  learning. Verdict APPROVE or REVISE. Writes EDITS, marks EDITED.
- **Publisher** - only if STATUS says APPROVED. Formats per platform (one publisher per platform):
  ready-to-paste piece, title + alternate, two-sentence preview description, three hashtags where
  used. Writes READY, marks PUBLISHED.

```
# Content Pipeline
## NEXT UP
## BRIEF
## DRAFT
## EDITS
## READY
## STATUS
current stage: BRIEFED / DRAFTED / EDITED / APPROVED / PUBLISHED
```

**More than one video in flight? Replace the shared file** with a tracker: one row per video
(status, upload date, episode number, link to its script) in whatever the user already uses - Notion,
Airtable, Google Sheets - plus one document per script. A single PIPELINE.md holds one video at a
time and breaks at about three uploads a week. The four roles and their prompts still apply; each
reads and writes the video's row and script document instead.

VOICE.md: written once from five of your best pieces; every agent reads it every run. In Sangamind
the voice file is `~/.claude/youtube/voice.md` (creator-script and yt-strategy read it).

Run the first pass by hand and fix each agent until it is reliable. Then `/schedule` each stage
(e.g. research 7am, approve by 9; write 10am; edit 1pm; publish 3pm). The human's job becomes four
approval moments - editor-in-chief. Every miss becomes a correction in that agent's prompt; a fix
kept in your head dies. Weekly: read the last five pieces against VOICE.md and update it.

## Research before writing (factual topics)

1. Research with primary sources and reputable reporting.
2. Research brief: facts with sources. Prompt: "Here are my sources. Build a research brief with a
   dated timeline, the key people and their roles, the exact numbers, any direct quotes with their
   source, and a separate list of claims that are disputed or unconfirmed. Do not add anything
   that isn't in the sources."
3. Verify dates, names, events, statistics, quotes, locations.
4. Give only verified material to the model, told to use nothing else.
5. Generate. 6. Fact-check the script line by line against the brief.

## JSON script template

Structured fields are followed far more reliably than paragraphs, and reuse keeps quality steady.

```json
{
  "video_title": "",
  "audience": "who, age, where they watch (phone / TV)",
  "total_word_count": 0,
  "number_of_sections": 0,
  "words_per_section": 0,
  "hook_style": "cold open in the tensest moment, no greeting, no 'in this video'",
  "tone": "",
  "vocabulary": "plain English, explain any jargon in one sentence",
  "narrator_personality": "or the persona sheet",
  "character_registry": [{"name": "", "role": "", "locked_facts": "from the research brief only"}],
  "story_structure": "the channel's signature format if it has one (e.g. levels, surface to bottom), else cold open, background, rising stakes, turning point, fallout, reflection",
  "cliffhangers": "",
  "curiosity_loops": "open a new question every 60-90 s (every 20-30 s for 1-5 min) and close it later",
  "emotional_beats": [],
  "cta": "one soft ask, never at an emotional peak",
  "ending": "the strongest image, not a summary",
  "rules": ["use only facts from the research brief", "mark anything uncertain as [VERIFY]",
            "never invent quotes", "vary sentence length and avoid repeated transitions"]
}
```

Words at 150/min: 1 min = 150, 3 min = 450, 5 min = 750.

## Review pass (where human judgment shows)

Read aloud and rewrite stumbles; delete any sentence that could sit in any video; add your details,
opinions, examples; something new every 30-40 s; names and numbers against the brief; vary the
skeleton between videos; **rewrite the first 30 seconds last**.

Generic-prompt failures to catch: soft hooks that start with background, repeated rhythm, stock
transitions ("but that's not all", "let's dive in"), invented facts, no retention structure, name
drift in long scripts.

## Production

- **Voice** matches the niche (true crime calm; history measured; action quick; drama warm). Same
  voice and settings every video, a pronunciation list, pauses through punctuation, commercial
  licence before monetizing. Own voice or a voice actor often earns more trust.
- **Edit** - every visual supports the exact line ("the market collapsed" = a chart or headline,
  not a skyline). Movement, captions, quiet music, sparing SFX, pattern interrupts, no dead air.
  Visuals: maps, charts, archival, screenshots, licensed stock, public domain, attributed CC,
  AI where appropriate - never a random clip.
- **Edit-pass check:** screen changes every few seconds? visual matches line? captions readable on
  phone and TV? music under the voice? every silence intentional? first 30 s the strongest?
- Speed-ups: saved source folder + template brief; scene list from the script before editing;
  reusable edit template; one thumbnail template; an upload checklist (title, description,
  chapters, end screen); one scheduled weekly analytics review.
- Expect 15-20 h for video one, 5-8 h by video twenty with templates - then delegate.
- **Batching:** day 1 ten scripts, day 2 voices and visuals, days 3-4 edit and schedule.
- **Hiring:** only once you can describe a good edit. Paid test video first. Order: editor,
  researcher, scriptwriter, thumbnail designer, channel manager, operations. Access through channel
  permissions, never a password. Write down deliverables, deadlines, revisions, ownership. Pay on
  time. The cheapest editor costs you four hours of fixes.

## Operating

Double down on winners without copying yourself; 90-minute focus blocks; weekly questions (what's
working, failing, changed, slowing us, stop, automate, systemise, next bottleneck); calm speed via
checklists; rest. Beginner asks "how do I make a video", operator asks "how do I build a system that
makes thirty a month without everything depending on me".
