# Thumbnails that get clicked

Learned 23 Oct 2026 from studying Bradikinin (41K subscribers, 126K-2.6M views a video, every
thumbnail on one template) and from four rounds of rejected thumbnails for a new channel. Read this
before designing any thumbnail; check every draft with `thumbcheck.py` before showing it.

## What the winning template does

1. **One object, caught in a moment.** Not a ticket lying there: a hand holding the phone that
   says 25h 00m, a cat leaning over a sleeping face, a dog mid-throw. The object is ordinary; the
   moment is what makes it a story. **A static object is the most common reason a thumbnail is dull.**
2. **The object is huge.** It fills 50-65% of the frame height, centred or slightly off-centre,
   under a band of words. Nothing else competes with it.
3. **2-3 words, all caps, the heaviest sans-serif weight available** (Black/900), tight letter
   spacing, across the top. One word in the accent colour. Elegant serifs and thin weights turn to
   mush at feed size; keep the brand serif for inside the video.
4. **The words add to the title, never repeat it.** The title says what happens; the thumbnail
   gives the twist, the order or the consequence ("IT WASN'T YOU", "DON'T MOVE", "DO NOT ANSWER").
   Direct address ("YOU", an imperative) beats description.
5. **One accent colour, used twice:** the accent word, plus one detail on the object (the glowing
   number, the lit window, the ball). Nothing else on the thumbnail is coloured.
6. **Flat background, maximum contrast with the object.** Flat drawn objects with a thick outline,
   no texture or fine detail (it vanishes at 160 px).
7. **The same template every video**, so the channel is recognisable before anyone reads it. Break
   it rarely and on purpose (one colour-inverted thumbnail for a big video).

## What failed (don't repeat)

- **Diagrams** (an iceberg cross-section, flowchart boxes): read as a school worksheet.
- **Too many elements:** words + object + diagram + mascot = nothing to look at first.
- **A mascot small in a corner:** adds nothing at feed size. Use the mascot only if it IS the object
  doing something.
- **A static object** (a ticket floating on a background): correct, clear and boring.
- **Small text, serif text, or a price/number too small to read at 168 px.**
- **Low contrast with the platform:** a near-white background disappears on YouTube's light mode;
  check both modes.

## The brief (write this before drawing anything)

- **Object + moment:** what is happening to the object right now? (hand gripping, being torn, being
  pulled from three sides, about to fall, lighting up)
- **Words:** 2-3, the twist/order, which one is in the accent colour.
- **Accent detail:** the one thing on the object in the accent colour.
- **Background:** the channel's flat colour; confirm contrast with the object and both YouTube modes.

## Process

1. Write three briefs with **three different moments**, not three layouts of the same object.
2. Draw them on the channel template.
3. `python3 thumbcheck.py a.png b.png c.png -o sheet.png`: every draft at mobile-feed (168 px) and
   home-feed (320 px) size on YouTube's dark and light backgrounds. If the words or the moment don't
   read in one second at 168 px, it fails, however good it looks full size.
4. Show the user the sheet, not the full-size files. Ship the best two as YouTube's Test & Compare pair.
