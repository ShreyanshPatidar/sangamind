# Design-system library

`library/` holds 74 analysed design systems (all of VoltAgent/awesome-design-md, MIT), stored locally and
normalised. Every file now has the same machine-readable token header; upstream, 10 were prose-only and 3
had broken YAML. `library/CATALOG.md` compares them at a glance, and `library/index.json` holds the same
data for scripts.

## Pick

```
python scripts/ds.py list --app                  # systems whose tokens suit dense app UI (dashboards, tables)
python scripts/ds.py list --theme dark --shape sharp
python scripts/ds.py list --category fintech
python scripts/ds.py list --q editorial
python scripts/ds.py show stripe                 # roles, fonts + open substitutes, shape, density, contrast issues
```

Read the chosen `library/<slug>.md` in full before building. Its prose (do's and don'ts, component
rules, responsive behaviour) is where the character lives. The tokens alone aren't enough.

## Make it ours, not a copy

Pick by axis, then mix. Colour, type, shape and spacing can each come from a different system, and
`--brand` replaces the primary colour with the project's own:

```
python scripts/ds.py tokens --mix color=linear.app,type=stripe,shape=vercel,space=linear.app --brand "#0f766e"
python scripts/ds.py tokens --from notion --format tailwind --out app/tokens.css
python scripts/ds.py check  --mix ...            # contrast audit, before and after fixes
```

On every export, `tokens`:
- maps each system's own names onto one semantic set (`--color-canvas / surface / ink / ink-muted /
  hairline / primary / on-primary / focus / success / warning / error`, `--font-*`, `--radius-*`,
  `--text-*` with line-height, weight and tracking, `--spacing`)
- fixes WCAG contrast failures by moving lightness in OKLCH, and lists every change in a comment
- generates the missing light or dark theme (neutrals mirrored in OKLCH, brand hue kept, contrast
  re-checked) as `[data-theme]` plus a `prefers-color-scheme` block
- puts the open-source substitute after proprietary fonts in the font stack

## Rules

- The output is a token file (CSS variables or a Tailwind v4 `@theme`). Components read the tokens; no
  value is ever pasted into a component.
- In a project with its own design system (for example, a component library with its own tokens), don't
  replace it. Use `show` and `check` to borrow principles, compare, and propose specific token changes
  to the user.
- Never ship another brand's logo, name or proprietary font files. Their fonts appear in the stack only
  as names; the substitute is what actually loads.
- Keep the user's brand: always pass `--brand` when the project already has a primary colour.
- `python scripts/sync.py` pulls upstream again, re-normalises and rebuilds the catalog.
