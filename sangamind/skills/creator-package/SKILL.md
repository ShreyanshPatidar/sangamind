---
name: creator-package
description: >-
  Write and lint the title and thumbnail for a YouTube video as one pairing,
  checking truncation, duplication and vagueness before publish. Use for
  "title ideas", "what should I call this", "thumbnail text", "my CTR is
  bad", packaging, or any request to rename or repackage an existing video.
---

# creator-package

The title and the thumbnail are ONE unit. Writing them separately is why most packaging fails: the
thumbnail repeats the title, and half the click surface says the same thing twice.

```bash
python3 title.py --title "..." --thumb "AI RAN IT"
python3 title.py titles.txt            # one per line, ranked
```

## Before you write

0. **Read the channel's series system first**, wherever the channel keeps its brand doc (a Notion
   page, a brand.md, a Google Doc - ask if you can't find one). A channel with a fixed title formula
   and thumbnail system gets titles IN that formula, never a fresh style per video.
1. Read `~/.claude/youtube/voice.md` if it exists. That is the user's voice profile: how they talk
   on camera, the words they never use, who they are talking to, what they will not claim. If it
   does not exist, ask for **three of their own videos**, read or transcribe them, infer the voice,
   and write the file. A script in the wrong voice is worse than no script, because they have to
   read it out loud.
2. Never invent a number, a result or a source. If a figure would strengthen it and you do not have
   one, ask for it or write the line without it.

## Rules the tool enforces, and why

- **60 characters** is where desktop search truncates, **40** is a mobile home feed. Both are
  reported because they fail differently: a desktop cut loses the tail, a mobile cut can lose the
  subject.
- **The thumbnail must not repeat the title.** Different words, same promise.
- **Three words maximum on the thumbnail** (fewer, or none, is often better). At feed size a fourth word is a grey smear.
- **A number, a name or a date** beats every adjective available to you.
- **Put the name people search in the title.** A new channel is found through search, not
  curiosity: "SOMEONE did X" hides the word everyone types. When the claim is an allegation, the
  title says so in one word ("X Is Accused Of ..."), never states it as fact.
- **Two all-caps words is the ceiling** before a title reads as spam - except one closing caps phrase
  of up to four words when it is the channel's series formula ("…DO NOT UNPLUG IT").

## The series system (a channel, not a pile of videos)

The strongest faceless channels run every video on **one premise viewers recognise from the feed**
(studied 23 Oct 2026: Bradikinin, "If Your [ordinary thing] Ever [impossible thing]… [ORDER]",
126K-2.6M views a video at 41K subscribers). If the channel has no series system yet, propose one
before titling anything:

- **One premise** the viewer can say back ("this channel dives down the iceberg of a thing you use").
- **One title formula:** a concrete, picturable first half + a short caps half that is the hook
  (e.g. `[What everyone believes or sees]… [THE HIDDEN PART]`).
- **One thumbnail system:** the same background, layout and accent colour every time, one object
  caught in a moment, a few heavy words (or none) with one in the accent colour (details in `thumbnails.md`).
- **Light lore (optional):** an episode/file number, a mascot's role if there is one, a subscribe line
  in the channel's voice.
- **Fixed format, original content:** the premise repeats, the script, angle and visuals never do -
  YouTube demonetises "template-based, repetitive" channels (policy-2026).

## Thumbnails

Before designing any thumbnail, read `thumbnails.md` (what the winning template does, what failed,
the brief to write first) and run every draft through `python3 thumbcheck.py a.png b.png -o sheet.png`,
which shows each one at feed size on YouTube's dark and light modes. Show the user that sheet. The two
most common misses: a static object instead of an object caught in a moment, and too many elements.

## Write ten, keep two

Generate ten titles, run them all through `title.py`, show the user the top three with their scores
and the specific issue on each. For the winner, write the thumbnail brief: the expression, the
framing, the three words, and what the background has to do to hold contrast at feed size.

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
