---
name: ui-design
description: One design workflow for web UI. Use it when building a new page or component, reshaping or redesigning an existing interface, or when asked to review, audit or polish a UI ("make this look premium", "why does this look generic", "review my UI", "check accessibility"). It combines design direction, anti-template taste rules, a redesign audit, Vercel's Web Interface Guidelines check and a 74-system design library with a token mixer/exporter.
when_to_use: Use for ANY change to how a page, screen or component looks, is laid out, or where something lives, small fixes included, before writing the code: "looks ugly", "looks bad on phone", "fix the spacing/alignment/colours", "make it look premium/modern/clean", "redesign", "new page", "this UI", "move X to", "merge these", "why is this its own page", "put this inside", a screenshot of a screen with a complaint.
---

# UI design

This workflow has five stages: **placement, direction, build, audit, look**. Load only the reference
files the task needs; they are long, except `references/placement.md`, which is short and always read.

## Always first: the project's own rules win

Before any design choice, read the project's CLAUDE.md, memory and existing design system (tokens, theme,
component library). Where a reference file below disagrees with them, the project wins. In particular:
- No hardcoded values. Colours, fonts, spacing, radii and shadows are tokens (CSS variables, theme config
  or DB settings), never literals in components. This applies even when a reference file shows hex values.
- An existing component library is extended, not replaced or restyled around.
- Placeholder images and CDN icons from the reference files are for throwaway prototypes only, never shipped.

## 0. Placement (every time, before anything else)

Read `references/placement.md` and answer its ten questions for the change, in writing, in two or
three lines: where the thing is used, whose it is, and which existing screen holds it. Most rework
comes from where a thing was put, not from how it looks: a page of its own for a short list, a
window opened over a window, a tab nobody visits, details reachable only after a second save.
Default to the screen that already exists; a new page, window or tab must say why no existing one
can hold it. Do this unprompted: the person should not have to ask for it to live in the right place.

## 1. Direction (new UI or a big reshape)

- `references/direction.md` (Anthropic frontend-design): ground the look in the subject, write a small
  token plan (4–6 colours, type roles, layout sketch, principles), check it against generic AI defaults,
  then build. Use this for every kind of UI, including dashboards and product screens.
- `references/taste.md` (taste-skill): the design read, the three dials (variance / motion / density),
  the AI-tells ban list and a pre-flight check (section 14). It is written for **landing pages, portfolios and
  marketing sites**. For dashboards, tables and multi-step app flows, use only section 9 (AI tells) and
  sections 6 and 8 (accessibility, dark mode). Its dials and motion skeletons don't fit dense product UI.
- `references/design-systems.md` (read it; scripts in `scripts/`): the 74-system library and `scripts/ds.py`. Use it to find a direction
  (`ds.py list`), mix colour, type, shape and spacing from different systems under the project's own brand
  colour, and export contrast-checked light and dark tokens. Use it whenever a project has no settled
  design system yet, or when an existing one needs a sounding board.

State the design read in one line before writing code. If the brief is ambiguous in a way that changes
the result, ask one question.

## 2. Build

Follow the plan through tokens. Build to a quality floor: works at phone width, visible keyboard focus,
respects reduced motion, works in light and dark themes, has loading, empty and error states.

**Let the layout do the explaining.** No secondary labels, descriptions or helper lines that repeat what
the heading, grouping or the control already says. Add a line of text only when the layout genuinely
can't carry the meaning (a consequence, a unit, a constraint the user would otherwise get wrong).

**Premium is evidence of thought, not polish.** AI makes everything *look* decent — the "commodity
ceiling" — so a pretty screen is the floor, not the edge. What reads as premium is the parts AI skips,
so build them on purpose, not as afterthoughts:
- **Design every state as a first-class screen** — loading, empty, error, offline, and *undo*. The
  skipped-state gap is "design theater": the happy path looks right while the user is left wondering
  "did that work? can I go back?". The user must always know *what just happened, that they can undo it,
  and what to do next.*
- **Failure moments are the biggest premium lever** (service-recovery paradox: a failure handled well
  leaves people as happy as if nothing broke; one bad moment loses ~a third of users). A declined
  payment with a clear "check balance / contact support" beats a dead error. Spend design effort here.
- **Hold the whole product together**, not screen-by-screen. The user sees screen 80 beside screen 1;
  seams where it "stops feeling like the same app" quietly cost trust and speed (people under-report it).

## 3. Audit (after building, or when asked to review)

1. For an existing UI being redesigned, first work through `references/redesign.md` (scan, diagnose, fix,
   working within the current stack).
2. Fetch the current Web Interface Guidelines (Vercel) and check the changed files against every rule:
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
   Report findings as `file:line` with the rule broken, in the format that file asks for.
3. Run the pre-flight check in section 14 of `references/taste.md` for marketing pages.
4. **Break it on purpose.** Turn off the network mid-flow, fail an action, empty every list, submit the
   bad input — and judge the error/empty/offline/recovery states as carefully as the success screens.
   Most teams skip this, which makes it the cheapest place to buy "premium". Then walk the whole flow as
   one product and log every seam where it stops feeling like the same app.

## 4. Look at it

Don't finish on code alone. Open the page and take screenshots at desktop and phone width, in light and
dark themes. Use the project's Playwright setup, or the browser tools if they are connected. Look at
the screenshots, fix what looks wrong, and screenshot again. If the user gives a screenshot of a design
they like, treat it as the direction brief: extract its tokens and layout, then rebuild it using the
project's own system.

## Sources

- `references/direction.md`: Anthropic `frontend-design` skill, Apache 2.0 (`licenses/`)
- `references/taste.md`, `references/redesign.md`: github.com/Leonxlnx/taste-skill, MIT (`licenses/`)
- Web Interface Guidelines: github.com/vercel-labs/web-interface-guidelines (fetched live, not copied)
- `library/`: github.com/VoltAgent/awesome-design-md, MIT, normalised locally (`scripts/sync.py` refreshes it)
