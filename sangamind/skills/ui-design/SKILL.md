---
name: ui-design
description: One design workflow for web UI. Use it when building a new page or component, reshaping or redesigning an existing interface, or when asked to review, audit or polish a UI ("make this look premium", "why does this look generic", "review my UI", "check accessibility"). It combines design direction, anti-template taste rules, a redesign audit, Vercel's Web Interface Guidelines check and a 74-system design library with a token mixer/exporter.
when_to_use: Use for ANY change to how a page, screen or component looks or is laid out, small fixes included, before writing the code: "looks ugly", "looks bad on phone", "fix the spacing/alignment/colours", "make it look premium/modern/clean", "redesign", "new page", "this UI", a screenshot of a screen with a complaint.
---

# UI design

This workflow has four stages: **direction, build, audit, look**. Load only the reference files the
task needs; they are long.

## Always first: the project's own rules win

Before any design choice, read the project's CLAUDE.md, memory and existing design system (tokens, theme,
component library). Where a reference file below disagrees with them, the project wins. In particular:
- No hardcoded values. Colours, fonts, spacing, radii and shadows are tokens (CSS variables, theme config
  or DB settings), never literals in components. This applies even when a reference file shows hex values.
- An existing component library is extended, not replaced or restyled around.
- Placeholder images and CDN icons from the reference files are for throwaway prototypes only, never shipped.

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

## 3. Audit (after building, or when asked to review)

1. For an existing UI being redesigned, first work through `references/redesign.md` (scan, diagnose, fix,
   working within the current stack).
2. Fetch the current Web Interface Guidelines (Vercel) and check the changed files against every rule:
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
   Report findings as `file:line` with the rule broken, in the format that file asks for.
3. Run the pre-flight check in section 14 of `references/taste.md` for marketing pages.

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
