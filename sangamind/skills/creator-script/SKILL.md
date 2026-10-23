---
name: creator-script
description: >-
  Write a YouTube video script from a raw idea - hook options off 21
  formulas, scored, then the full spoken script with the retention beats
  marked. Use whenever the user wants a video script, a hook, an opening
  line, "what should I say", "write my next video", or is about to record
  and does not have the first fifteen seconds yet.
---

# creator-script

One idea into a script somebody finishes.

Two tools live in this folder and both actually run. Use them. Do not eyeball the hook.

```bash
python3 hookscore.py hooks.txt                    # rank your hook options
python3 hookscore.py --profile story hooks.txt    # history, money, business, science explainers
python3 hookscore.py --hook "one line"            # score a single one
```

Pick the profile by the channel: `creator` (default) for advice and how-to, `story` for explainers,
where the stakes are lives, wars and money and short punchy beats count (RHYTHM). Every report says
what works and the words that earned it, not only what is weak; pass that on to the user. Word lists
and weights live in `profiles.json`, the 25 formulas (21 creator + 4 story) in `hooks.json`.

## Before you write

1. Read `~/.claude/youtube/voice.md` if it exists. That is the user's voice profile: how they talk
   on camera, the words they never use, who they are talking to, what they will not claim. If it
   does not exist, ask for **three of their own videos**, read or transcribe them, infer the voice,
   and write the file. A script in the wrong voice is worse than no script, because they have to
   read it out loud.
2. Never invent a number, a result or a source. If a figure would strengthen it and you do not have
   one, ask for it or write the line without it.
3. **Factual topic (money, history, news, science, business)? Research brief first.** Build it from
   sources, verify it, and write only from it, marking anything uncertain `[VERIFY]`. The brief
   prompt and the JSON script template are in
   [the playbook's pipeline](../yt-strategy/references/pipeline.md). Fill in the template before
   drafting a series, so every episode keeps the same audience, tone and rules.
4. **Topic passed the test?** (yt-strategy, "Topics") If a big definitive video already tells the same
   hidden story, stop and say so before writing a word.
5. **Channel format.** If the channel has a signature format (in its brand doc), follow it - e.g.
   "levels" from what everyone believes down to what almost nobody knows, "seven rules", "three
   failures". The format shapes the spine; **the content of each part comes only from the research
   brief** - if research finds three real parts, the video has three. No signature format? Skip this.
6. A character host? Write in the persona sheet's voice, never claim credentials, and keep money
   content educational ([ai-host](../yt-strategy/references/ai-host.md)).

## Short-form (1-5 minutes)

150-750 words. The hook gets 3 seconds, not 15, so the turn starts by second 5. Re-hook every
20-30 seconds. One idea per video. Captions on from the first frame.

## The shape

**The first 15 seconds is the whole job.** It does three things or the video leaks: confirm the
click the title promised, open a question the viewer cannot close, and prove the payoff exists.

1. **Hook.** Write FIVE against [the 25 formulas](hooks.json), run them through `hookscore.py`,
   keep the top two, and show the user both with their scores. Never hand over one hook.
2. **The turn** (0:15-0:45). Say what the video is going to do, in one sentence, and start doing it.
   Make it a **counted promise** and point at one part: "there are five levels to this; most people
   never get past level two", "seven rules; most people break the third". It opens two loops at once
   (what is it, why that one), and each counted part becomes a payoff and a chapter.
   No channel intro, no "before we get started", no subscribe pitch. Those are the single most
   common cause of the 0:30 cliff.
3. **The body.** One idea per beat. Mark each beat with what is ON SCREEN, not just what is said -
   a talking head with nothing to look at is a podcast.
4. **The payoff.** Deliver the thing the hook promised, explicitly, and say that you are delivering
   it: "that is the prompt, it is in the description".
5. **The close.** One ask. Not three.

## A connected story (not a list of chapters)

A script that reads like chapters (who, then what, then a myth, then the aftermath) loses people at
every heading. Before drafting, write the **story spine** into the script file:

- **One throughline**, promised in the turn in one sentence ("the plot failed three times, and still
  worked"). Every beat advances that line, or it is cut.
- **Follow one thing** (a car, a coin, a person), so the viewer always knows where to look.
- **Chain the beats with but / so / meanwhile / because.** If two beats join with "and then", the
  second one is a new chapter: rewrite the join.
- **Every beat ends on the question the next beat answers.** Re-hooks come from the story ("but the
  day isn't over"), never from "stay tuned".
- **Count it out loud** when the story has a pattern ("failure number one... two... three").
- **Digressions go where they are natural** (debunk the myth when that moment comes up), never
  between the climax and its consequence.
- **Name things early that pay off later** (mention India in the war beat, then close on India).
- On-screen notes describe pictures with text on them, not text cards (see explainer-video).

## What to hand back

- the two best hooks with their scored panels
- the story spine (throughline + the question each beat ends on)
- the script, beat by beat, with `[ON SCREEN: ...]` on every beat
- the runtime estimate at 150 words per minute - **length follows the story**: never pad to reach a
  length or cut a beat to fit one
- one line naming which formula the winning hook used and why it fits this idea

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
