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

Three tools live in this folder and all of them actually run. Use them. Do not eyeball the hook.

**Before anything is voiced, run the rules check and paste its output in chat:**
`python3 script_check.py <script.md> --title "<the title>"` checks the opening questions, the title's
promise in the first seconds, acronyms explained on first mention, loaded words and spoken level
labels, narrated stage directions, and facts crammed up front. Every FAIL is fixed before the voice is
made. It covers the mechanical rules only; read the script against the judgement rules too.

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

**Check the opening against the title and thumbnail, side by side, before it is voiced:**
- The **first frame is the thumbnail** (same object, same words, same moment), so the click feels
  answered, not switched.
- **Say the title's promise in words by ~0:20** ("one company that's accused of getting paid three
  times"). Holding the title's hook back for minutes is how a viewer feels lost.
- **Open with 2-3 direct questions to the viewer, back to back** (a channel brand doc can make this a must). Ask them
  straight at the viewer in the first seconds, one per line with a pause after each, the title's
  question first: "Every time a concert ticket gets resold... who do you think gets paid? Who decides
  the price? And how did this ticket go from 135 to 355?" Then one line that kills the easy answer
  ("Fans blamed a robot. Wrong.") and one that teases the real one, and go. Each question is paid off
  later, in order. Never more than three.
- **Ask the thumbnail's question out loud** if it has one.
- **Give it air:** a beat of silence and picture before the first word, and real pauses between the
  hook lines. No dense fact (dates, counts) crammed into the first 15 seconds.

1. **Hook.** Write FIVE against [the 25 formulas](hooks.json), run them through `hookscore.py`,
   keep the top two, and show the user both with their scores. Never hand over one hook.
2. **The turn** (0:15-0:45). Say what the video is going to do, in one sentence, and start doing it.
   Promise the depth or the payoff in words the viewer feels ("the answer sits deeper than most
   people ever look", "seven rules; most people break the third"). A count can work once, in the
   turn; never as a label later.
   No channel intro, no "before we get started", no subscribe pitch. Those are the single most
   common cause of the 0:30 cliff.
3. **The body.** One idea per beat. Mark each beat with what is ON SCREEN, not just what is said -
   a talking head with nothing to look at is a podcast.
4. **The payoff.** Deliver the thing the hook promised, explicitly, and say that you are delivering
   it: "that is the prompt, it is in the description".
5. **The close.** One ask. Not three.
   - **Land, don't recap.** The close is one consequence the viewer feels, then the sign-off. A list
     of status updates there is a news bulletin, not an ending; those belong in the last beat or the
     description.
   - **A tease is the channel's choice** (its brand doc says). If it teases, decide the next video's title
     before writing the close: the tease sells that exact title with its own hook and the end card shows
     it. A vague tease written before the next video is planned is why an ending trails off.

## Every line has a job

Before anything is voiced, check each line does one of three jobs: **builds tension**, **delivers**
(a fact, a number, the reveal), or **carries the rhythm** into the next line. Short joining words
are jobs too: "And suddenly...", "But", "So", "Three times." - keep them, they are what makes a
pause land.

- **Silence is not tension.** A pause only works after a line that makes the viewer lean in. A gap
  with nothing in front of it is dead air.
- **Don't narrate the picture or the viewer** ("you join the queue", "you open the app"): it slows
  the beat and the screen already shows it.
- **Narrator asides** ("here's what matters", "back to X") stay only if they build anticipation
  right before a payoff; if they just delay the point, cut them.
- **Before a reveal: a run-up line, then silence, then the hit.** Never explain how time passed.
  Vary the run-up words between videos. "£135. And suddenly... £355." beats "£135. You join the
  queue. Hours later... £355." (and beats "£135. [silence] £355.").
- **Approve by ear, before the render:** new or rewritten lines go to the user as a short audio
  preview in the channel voice (each part announced by number, one-line summary of each in chat),
  not as a wall of text. Get a yes, or pick the strongest yourself if the user hands you the call,
  before any visuals or render.
- **Explain how and why, not just what.** Before the script is final, list the questions a viewer
  would still have at the end ("how does the tool work?", "why can't they just leave?", "what
  happens now?"). Answer the ones that matter with sourced lines. Length follows the content: never
  pad, never cut real explanation to hit a number.

## Written for the ear (AI voice)

- **Short sentences:** under ~28 words (`script_check.py` fails longer ones). Long sentences are
  where an AI voice goes flat and a non-native listener loses the thread. Split them; the split
  is often a natural pause.
- **Pace:** about 150-160 words a minute including pauses. Dense stretches (court cases, numbers)
  need more pauses, not fewer.
- **Highs and lows across the whole video:** `[loud]` and `[slow]` on 2-3 key lines per section,
  not only in the hook, so six minutes don't sound like one long line.
- **Open with 1 s of silence** (`[pause 1.0]` first), then the hook questions.

## Written for a global audience

Assume the viewer has never heard of the country's institutions. The first time an organisation,
office or place is named, say **what it does** in plain words, then the name: "America's consumer
protection agency, the FTC", "Britain's competition regulator", "London's Wembley Stadium", "British lawmakers"
(not "Parliament"). After that the short name is fine. Never an unexplained acronym, in the voice or on
screen ("FTC (US CONSUMER AGENCY)"). Plain, neutral words: "regulator", "agency",
"court", not loaded ones like "watchdog" or "crackdown". Money in the currency of the story; say whose it is when it changes.

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
- **Never announce the structure.** No "Level two.", "Part three.", "Rule number four:" as a spoken
  label: it reads like a slide deck and the viewer hears a gear change. The next section opens by
  *answering* the question the last one ended on ("...who did?" -> "People did. The names on the
  poster."). If the format has levels, the visuals show the depth (a dive, a ruler, a counter);
  the voice just tells the story. Deleting the labels is not enough - write the new joins.
- **Write the punchlines for the screen too.** Mark the 2-3 lines that should fill the screen as
  big text (the reveal, the twist, the line people will quote). Subtitles run everywhere else.
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
