# Full audit: everything that governs Shreyansh's Claude (21 Oct 2026)

Done because the single `~/.claude/CLAUDE.md` is NOT the whole story. This is the complete
inventory, and — critically — which parts reach **cloud** Claude (claude.ai/code) vs only the **PC**.

Legend: 🖥️ PC only · ☁️ reaches cloud · ⚠️ partial/conditional

---

## 1. Written rules (instructions)
- 🖥️ **`~/.claude/CLAUDE.md`** — the global rules (Git/no-attribution, Building/no-hardcoding,
  Skills-first, Working-with-me/brutally-honest, where-things-live paths). **Cloud can't read it.**
- ☁️ **Repo root `CLAUDE.md`** — Parallax now has one; auto-read by PC AND cloud. The only rule
  file that reaches cloud.
- ⚠️ **`app/AGENTS.md`** (Parallax) — read only when no CLAUDE.md is above it; now superseded by the root CLAUDE.md.

## 2. settings.json (`~/.claude/settings.json`) — 🖥️ PC ONLY, does NOT reach cloud
- **effortLevel: high**, voice on, fullscreen TUI, autoUpdates latest.
- **enabledPlugins:** typesafe@typesafe-ai, hookify@claude-plugins-official, switchmod@sangamind,
  sangamind@sangamind.
- **autoMode.soft_deny:** `$defaults` + per-repo denials (git push --force in Indas Estimo; a build cmd).
- **autoMode.environment:** a detailed security/trust-boundary config for the Indas Estimo repo
  (trusted repo, protected branches, secrets locations, prod-target heuristics). **All PC-only.**

## 3. Plugins — ☁️ NOT installed in cloud (per docs). Four:
- **sangamind** — his 20 skills (see §5).
- **switchmod** (the Switchboard mod) — behavioral enforcement via hooks. Options ON: usageMeter,
  gitStatus, taskProgress, usageHints, turnSummary, saveBeforeCompact, outputViewer, **hideSecrets**,
  **stopRepeatedFailures**, **confirmRiskyCommands**, workLog, **editCollisionCheck**,
  **oneTestRunAtATime**, otherChatsLine, devServerWatch. (`switchmod/hooks/hooks.json`.)
- **hookify** (official) — runs the rules in §4.
- **typesafe** (typesafe-ai) — TypeScript safety skills.

## 4. Hookify rules — 🖥️ PC ONLY (hooks don't run in cloud). THREE, all `action: block`:
- **no-ai-coauthor** — blocks any `git commit` whose message has Co-Authored-By: Claude /
  "Generated with Claude". *(This is the enforcement the cloud session LACKED → why it broke the rule.)*
- **no-client-names-in-oric** — blocks writing BFC/PFC/Estimo into Oric's src/supabase/tests.
- **e2e-for-screens** — blocks screen/component unit tests in Oric src/ (screens → Playwright e2e only).

## 5. Skills (sangamind plugin) — ⚠️ cloud loads only skills enabled on claude.ai. 20 total:
advisor, creator-comment, creator-cut, creator-package, creator-script, creator-viral,
datagrid-helper, debug, explainer-video, go-framework, mcb-framework, motion-design, review-intake,
ship-audit, skill-writer, transcribe, ui-design, verify, yt-publish, yt-strategy.
Plus 🖥️ `~/.claude/skills/reverse-engineer-anything`.

## 6. Memory (auto-memory) — 🖥️ PC ONLY, "not shared across machines or cloud". Per-project:
MEMORY.md + fact files under `~/.claude/projects/<repo>/memory/` for: Coding (21 facts, incl. Parallax),
Oric App, indas-ui, Indas Estimo (+IndusWebApi), Parksons-Estimo, both websites, BFC Kota, GitHub Estimo.

## 7. Other 🖥️ PC-only: handoffs (session summaries), plans/, youtube/voice.md.

---

## The honest conclusion
**What reaches cloud Claude: almost nothing automatic — ONLY a repo-committed `CLAUDE.md` / `.claude/rules/`.**
Everything that actually ENFORCES behaviour (settings, the 3 hookify blocks, switchmod's safety hooks)
is PC-only and does NOT run in cloud. That's precisely why the cloud session broke no-attribution:
it had the *idea* of the rule (if in a repo file) but none of the *enforcement*.

**So the achievable cloud fix is:**
1. ☁️ A repo root `CLAUDE.md` (done for Parallax) — gives cloud the WRITTEN rules.
2. ☁️ A cloud-environment setup script that writes `~/.claude/CLAUDE.md` in the VM (built:
   `cloud-environment-setup.sh`) — global written rules for every cloud session.
3. ⚠️ Enforcement (hooks/plugins) in cloud: NOT reliably possible per the docs. Best effort would be
   a setup script that installs the hookify + sangamind plugins in the VM — unverified, may not work.

Cloud Claude will KNOW the rules (text) but won't be BLOCKED by them (no hooks). The safety net there
is: these written rules are strong + explicit, and a human reviews cloud PRs before merge.
