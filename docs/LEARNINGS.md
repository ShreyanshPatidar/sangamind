# Sangamind — Learnings

A running log of things worth remembering, to feed **future upgrades of the skills and docs**.
When something here is big enough, fold it into the relevant skill (e.g. `ui-design`, `transcribe`)
and note that it was applied. Until then it lives here so it isn't lost.

Format per entry: **date · source · the learning · which skill/doc it should upgrade.**

---

## 2026-10-18 · Premium vs. generic UI ("The Psychology of Premium Apps", Tim, ex-Spotify designer)
Source: https://youtu.be/8EAYZe6y3I8
**Feeds → `ui-design` skill** (add to the "premium, not generic" / anti-AI-tells guidance).

The core thesis: **pretty ≠ premium.** AI makes every app *look* decent — the "commodity ceiling."
What makes people pay *more* is **evidence the product was thought through**, which lives in three
places AI consistently skips:

1. **Every state, not just the happy path.** AI builds screens that look right but omits "what is the
   system doing, can I undo, how do I recover." Researchers named the gap **"Design Theater"** — ~a
   quarter of an AI's stated design reasoning never reaches the interface, and the skipped parts are
   the unglamorous ones (system status, undo, error recovery). Fix: walk the core flow; the user must
   always know *what just happened, that they can take it back, and what to do next.*

2. **Consistency across the whole product, not screen-by-screen.** Users see "screen 80 next to screen
   1." AI spins up many screens that "don't quite agree." Premium = the connective tissue holds; it
   feels like *one product someone cared about.* A 2009 York study: moving a nav bar left→right (nothing
   else changed) more than doubled time-on-page, and people said it barely slowed them. Teams under-
   measure this. Fix: use the product for an hour like a real user; note every spot it stops feeling
   like the same product.

3. **Failure/error moments are the biggest premium driver** (the "grand finale"). The Chrome offline
   dino game; a failed-payment alert with a "contact support" button grew one client's new accounts
   +60% and loaded funds +79%. The **service recovery paradox** (2007 review): handle a failure *well*
   and people end up as happy, or happier, than if nothing broke. It only takes **one bad experience**
   for ~a third of users to quit (2018). Fix: **break the app on purpose** — kill WiFi mid-flow, fail a
   payment, empty every list — and design those states as carefully as the success screens. Cheapest
   place to buy "premium," because most teams skip it.

**Actionable rules to add to `ui-design`:**
- Treat **loading / empty / error / offline / "undo"** states as first-class deliverables, designed
  with the same care as the happy path — not afterthoughts. (The skill's quality floor already lists
  these; elevate them from a checkbox to a *premium differentiator*, with the "design theater" framing.)
- Add a review step: "**break it on purpose** — turn off network mid-flow, fail an action, empty every
  list — and judge the error/recovery states as the thing that signals premium."
- Add a consistency pass: "use the whole flow as one product for ~an hour; log every seam where it
  stops feeling like the same app." (Screen-by-screen review misses this.)
- Reframe "premium": it is **evidence of thought (states, recovery, consistency)**, not polish or
  gradients. Anti-AI-tells already bans the generic look; this adds the *positive* definition.

---

<!-- Add new learnings above this line, newest at the bottom of its section or as a new dated section. -->
