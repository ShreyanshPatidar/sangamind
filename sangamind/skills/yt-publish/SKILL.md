---
name: yt-publish
description: >-
  Everything a YouTube video needs at publish time - the search-facing text
  (description, tags, chapters validated so they actually render) and a
  channel-level audit that ends in the ONE fix to make next. Use for "write my
  description", "tags", "SEO", "add chapters", "timestamps", "help this video get
  found", "nobody is finding this", "audit my channel", "why isn't my channel
  growing", "review my videos", or a pasted channel URL.
---

# yt-publish

The publish surface: the search-facing text you set on a video, and the channel-level audit that
tells you what to fix before the next upload. Two jobs that both happen at publish time.

# Metadata — description, tags, chapters

The publish-time text around the video: **description, tags, chapters.** Search is a smaller lever
than packaging and a bigger one than people think for evergreen videos. For a video aimed at the
subscriber feed, say so and spend the effort on `/creator-package` instead.

## Before you write

1. Read `~/.claude/youtube/voice.md` if it exists — the user's voice profile (how they talk, words
   they never use, who they talk to, what they will not claim). If it does not exist, ask for **three
   of their own videos**, read or transcribe them, infer the voice, and write the file.
2. Never invent a number, a result or a source. If a figure would strengthen it and you don't have
   one, ask for it or write the line without it.

## The description

- **The first two lines are the only ones anyone reads.** They show above "...more" and they are the
  search snippet. Say what the video gives them, in the words they would have typed.
- Then the link or resource, if there is one, so it is above the fold.
- Then the chapters (below).
- Then the long version: what is covered, who it is for, what it assumes.

## Tags, honestly

Tags are a weak signal and YouTube has said so. Use them for disambiguation — spellings, tool names,
the abbreviations people actually type — and stop. Fifteen is plenty. A wall of tags is not a strategy
and stuffing unrelated ones is against the terms.

## Chapters (from a transcript)

```bash
python3 chapters.py transcript.srt --target 8
```

**The rules, which are not optional** — a chapter list that breaks any of these silently does not
become chapters at all; the block just sits in the description doing nothing:
- The first entry must be **00:00**.
- There must be **at least three**.
- Each must be **at least 10 seconds** long.

`chapters.py` checks all three and tells you when a list is invalid rather than letting you paste it.
It finds the BOUNDARIES well (it scores the pauses you took by how much the vocabulary shifts). The
titles it emits are topic-word placeholders — **rewrite each as the promise of that section**, in the
user's voice, three to five words. If a section cannot be named in five words, it is two sections or
it is filler (chapters double as a retention diagnostic).

## The query test

Before handing anything over, write the three search queries this video should win, and check the
title and first two description lines contain the words in those queries. If they don't, the problem
is the title, not the description.

# Channel audit — end in ONE fix

An audit that lists twenty problems is a way of avoiding the one that matters. This ends in ONE fix.
Same "Before you write" as above (read `~/.claude/youtube/voice.md`; invent no numbers).

## What to look at, in this order

1. **The last ten titles, as a set.** Read them as a list, the way the channel page shows them. Do
   they promise different things? Run them through `../creator-package/title.py`. A channel where
   every title is the same shape has a format problem, not a title problem.
2. **The thumbnails, at feed size.** Shrink them. What survives? If three of them are unreadable at
   that size, that is the fix and nothing else matters yet.
3. **The first fifteen seconds of the three most recent.** Transcribe them and score with
   `../creator-script/hookscore.py`. This is where most channels lose.
4. **Upload rhythm.** Not frequency — CONSISTENCY. Six videos in one week and then nothing for a
   month is worse than one a fortnight forever.
5. **The retention shape**, if they can export it. `/yt-strategy` (retention).

## What to hand back

- The single biggest fix, named, with what to do this week.
- Three things that are already working, so they do not break them. Be specific; "your energy is
  good" is not an observation.
- What NOT to do yet, and why.

Never open an audit with praise you do not mean, and never end one with a list of twenty things.

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
