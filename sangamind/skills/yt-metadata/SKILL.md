---
name: yt-metadata
description: >-
  Write the search-facing text a YouTube video publishes with - the description,
  tags, and chapters - aimed at the query a real person types and validated so the
  chapters actually render. Use for "write my description", "tags", "SEO", "add
  chapters", "timestamps", "break this into sections", "help this video get found",
  "nobody is finding this".
---

# yt-metadata

The publish-time text around the video: **description, tags, chapters.** Search is a smaller lever
than packaging and a bigger one than people think for evergreen videos. For a video aimed at the
subscriber feed, say so and spend the effort on `/yt-package` instead.

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

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
