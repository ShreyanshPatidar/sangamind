---
name: yt-strategy
description: >-
  The YouTube strategy, planning and diagnostics skill - 2026 platform rules,
  niche research, AI-host channels, the content pipeline, money beyond ads,
  multi-platform posting; planning a week/month of uploads sized to real
  capacity; and reading a Studio retention export to find where viewers leave.
  Use for "can I monetize this", "is this allowed on YouTube", "pick a niche",
  "faceless channel", "how do I make money from this channel", "post
  everywhere", "plan my week", "content calendar", "what should I post", "why
  do people stop watching", "my retention is bad", a pasted retention CSV, or
  before planning any new channel.
---

# yt-strategy

The strategy, planning and diagnostics side of the channel — what to make, whether it will earn,
and where viewers leave. The `creator-*` and other `yt-*` skills do the making; this one holds the
thinking they follow.

# Playbook — the strategy knowledge base

What Shreyansh learned from reading the guides, kept so it is not lost. Read only the reference the
question needs.

| Question | Read |
|---|---|
| Is it allowed, will it earn, what changed on YouTube | [policy-2026.md](references/policy-2026.md) |
| What is working, how to study a niche without copying | [research.md](references/research.md) |
| Which niche, is this niche risky | [niche.md](references/niche.md) |
| AI character or avatar host | [ai-host.md](references/ai-host.md) |
| A recurring character in short video: identity lock, video tools, costs | [ai-characters.md](references/ai-characters.md) |
| Research to publish, the agents, the script template | [pipeline.md](references/pipeline.md) |
| Money: RPM, affiliate, email, products, month-1 reality | [money.md](references/money.md) |
| Posting to several platforms, 1-5 minute content | [multi-platform.md](references/multi-platform.md) |

[sources.md](references/sources.md) says where each idea came from and how far to trust it.

## Rules that hold everywhere

1. **Platform rules move.** Every date and number in `policy-2026.md` was true on 8 Oct 2026 by the
   source's account. Before advising on money or monetization, check the live YouTube Help Center
   page and say if it changed.
2. **Income figures are claims, not facts.** Never repeat a creator's "$41k/month" as evidence.
3. **Study, never copy.** Remaking someone's video, script, thumbnail or footage is both theft and,
   since 1 Oct 2026, a reach penalty on Shorts.
4. **A human decision in every video.** Angle, opinion, edit choices. A channel whose videos could
   swap titles unnoticed is the "inauthentic content" YouTube does not pay.
5. **Verify before publishing.** AI drafts, a human checks every fact against a source.

# Planning — a week or month of uploads

A plan that does not fit the week is a list of regrets. Ask two questions before writing anything:
**how many hours do you actually have**, and **what is already half-made**. (Same "Before you write"
voice.md step as the making skills; invent no numbers.)

## The shape of a week

- **One anchor.** The video the week is for. It gets the most time and goes out on the day the
  channel's own analytics say is best — ask for that, do not assume Tuesday.
- **One cheap one.** Built from something that exists: a clip, a reaction, a follow-up to the comment
  that got the most replies last week.
- **Shorts from the anchor.** Three, cut from the long video, not written separately. `/creator-cut`
  finds them.

Three uploads on a seven-day week, not seven. The empty days are what make the filled ones survive a
bad week.

Hand back a table: day, format, working title, the one sentence it promises, and what already exists
for it. Then the honest line — how many hours this costs, and what to drop first if the week goes
wrong.

# Retention — read the Studio export

The retention graph is the only honest feedback YouTube gives you. Almost nobody exports it.

```bash
python3 retention.py retention.csv --duration 600
python3 retention.py retention.csv --transcript transcript.srt
```

Getting the file: Studio → a video → Analytics → Engagement → the audience-retention chart → the
download icon → "Audience retention".

- **HOOK LEAK** — what is lost in the first 30 seconds. Under 25% is healthy. Always the first thing
  to fix, and always the first fifteen seconds of script, never the edit.
- **CLIFFS** — single steep drops. A topic change with no signposting, a sponsor read, a long setup.
  With `--transcript` the tool prints what was being said there, which makes the report actionable.
- **SLIDE** — the steady bleed across the middle. A flat slide is pacing. The fix is cutting, not
  rewriting.

Name the single biggest leak and one change for it. Not a list of five. If the hook leak is healthy
and the slide is flat, the video is fine and the problem is packaging — send them to
`/creator-package`.

## The gate

Nothing here publishes. This skill writes and you publish. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
