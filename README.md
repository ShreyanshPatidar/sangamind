# Sangamind

**A Claude plugin marketplace — 26 skills and a Claude Code mod, in one install.**

*Sangamind = Sangam ("confluence") + mind.* A curated set of skills for Claude across chat (web,
desktop, mobile), Cowork and Claude Code, plus **Switchboard**, a Claude Code mod where every feature
is a switch.

---

## What's inside

Two plugins:

### `sangamind` — the skills
Works wherever Claude runs. A few highlights:

| Skill | Does |
|---|---|
| **ui-design** | One design workflow: placement → direction → build → audit → look. Anti-generic taste rules, a 74-system design library with a token mixer, accessibility + Web Interface Guidelines checks, and a "premium = evidence of thought" pass. |
| **transcribe** | Turn any link into English text — videos/audio (YouTube, Instagram, X, TikTok, podcasts) are transcribed; articles and text posts have their page text fetched. Then it acts on the content. |
| **systematic-debugging** | Find the root cause before fixing — bound the problem, get evidence, don't guess. |
| **advisor** | Blunt-advisor mode: challenge assumptions, tag claims Certain/Likely/Guessing, disagree with a reason. |
| **verification-before-completion** | Run the check before claiming "done" — evidence before assertions. |
| **receiving-code-review** | Handle review feedback with rigor, not performative agreement. |
| **skill-writer** | Write, structure and fix Claude skills. |
| **website-legal-check** | Check a site before launch — privacy, cookies, consent, accessibility, claims. |
| **agent-builder** | Scope and build a first AI agent end to end. |
| **accessibility-wcag22** | WCAG 2.2 AA compliance for web apps. |
| **datagrid-helper** | Configure and debug the Indas DataGrid. |
| **motion-design / explainer-video** | Make a finished motion/explainer video (Remotion, local). |

Plus a full **YouTube toolkit**: `yt-playbook`, `yt-plan`, `yt-script`, `yt-package`, `yt-metadata`
(description, tags, chapters), `yt-cut` (tighten a take + carve Shorts), `yt-retention`, `yt-audit`,
`yt-viral`, `yt-comment`.

### `switchboard` — the Claude Code mod
Claude Code only. One mod, every feature a toggle: usage meter, output viewer, work log, hide secrets,
guards against repeated failures / risky commands / edit collisions / overlapping test runs, an
other-chats line, and a dev-server watch.

---

## Install

It's a Claude plugin marketplace. Add it, then install the plugins you want:

```
/plugin marketplace add ShreyanshPatidar/sangamind
/plugin install sangamind@sangamind
/plugin install switchboard@sangamind
```

Some skills need tools on the machine:
- **transcribe** — Claude Code on a computer with Python, `yt-dlp`, `faster-whisper` and `ffmpeg`.
- **motion-design / explainer-video** — Remotion and related local tooling.

Skills without extra tooling work in Claude chat (web, desktop, mobile) and Cowork too.

---

## Layout

```
sangamind/      the skills plugin (skills/<name>/SKILL.md each)
switchboard/    the Claude Code mod
hookify/        hookify rule files
docs/           notes, including LEARNINGS.md (log for future skill upgrades)
.claude-plugin/ marketplace manifest
```

## License & use

Open to use and adapt. Individual skills under `references/` and `library/` carry their upstream
licenses (see each skill's `licenses/` or `Sources` section) — e.g. ui-design bundles material from
Anthropic's frontend-design skill (Apache-2.0), the taste-skill (MIT), and VoltAgent's design library
(MIT). Keep those notices when reusing.

---

*Maintained by Shreyansh Patidar. Contributions and issues welcome.*
