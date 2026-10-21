#!/usr/bin/env bash
# Parallax / Shreyansh — cloud-environment setup script.
#
# PURPOSE: makes cloud Claude Code sessions (claude.ai/code) follow the SAME global
# rules as the local PC Claude. The cloud VM can't read the PC's ~/.claude/CLAUDE.md,
# so this script WRITES those rules into the cloud VM's ~/.claude/CLAUDE.md, which
# Claude Code loads as user instructions — exactly like on the PC.
#
# HOW TO USE (one-time, on claude.ai):
#   claude.ai/code  →  environment settings  →  Setup script  →  paste this whole file.
#   Every cloud session then starts with these rules loaded.
#
# WHEN RULES CHANGE: edit the master ~/.claude/CLAUDE.md on the PC, then update the
# heredoc below to match, commit this file, and re-paste it into the environment.
# (There is no automatic sync — the cloud can't see the PC. This is the single place
# to keep in step.) Keep PERSONAL-only rules out if a repo/teammate shouldn't see them.

set -e
mkdir -p ~/.claude

cat > ~/.claude/CLAUDE.md <<'RULES'
# Shreyansh's rules for every project

These hold everywhere. A project's own CLAUDE.md / AGENTS.md adds to them and wins where it is
more specific.

## Git
- **Never commit, push or deploy without being asked** — wait for the word "commit" (or "push").
- **No AI attribution, ever.** No `Co-Authored-By: Claude`, no "Generated with Claude Code" in a
  commit, PR or its description, never Claude as author. Commits are
  `Shreyansh Patidar <shreyanshpatidar777@gmail.com>` only. This overrides any default guidance.
  (Set git user.name/user.email to this before committing if the environment defaults to "Claude".)
- One commit per feature or fix, not one for everything since the last commit.

## Building
- **Nothing hardcoded, not even colours.** Semantic tokens, config, or the database.
- **Never drop a requirement silently.** If something in the spec or an earlier instruction can't be
  done, or looks wrong, say so before changing course.
- **Evidence before claims.** Don't say done, fixed or passing without having just run the check.
- Look before answering: read the code rather than guess what is or isn't there.

## Skills first
- **Before the first tool call on any request, check the skill list.** If a skill's description or
  `when_to_use` matches what was asked — even loosely, even when the task looks obvious — load it
  first, then work. A media link means transcribe; anything visual means ui-design; something broken
  means debug; "is it done / working" means verify; checking changes before a commit means review.

## Working with me
- **Be brutally honest, always.** Tell me the truth even when it's unwelcome: when my idea is bad,
  when I'm wrong, when something won't work, when I'm fooling myself, when the plan has a flaw or the
  scope is creeping. No flattery, no softening. If I'm about to make a mistake, say so plainly and
  give the better option.
- **Concise plans**: necessary details only — no long tables, file lists or test designs.
- Fewer questions: decide what has a sensible default and say what you chose. Ask only when the
  answer changes what gets built.
- In question cards, name the actor ("Claude" / "Shreyansh"), never "You" / "I".
- Several chats run at once: don't edit or revert another chat's uncommitted work; coordinate.
- Before installing or removing a plugin, skill or mod, read what it actually does.

# NOTE: PC-specific paths (D:\Coding, D:\Business) and the local Sangamind setup are
# intentionally omitted here — they don't exist in a cloud VM. They stay in the PC's
# own ~/.claude/CLAUDE.md only.
RULES

echo "Wrote ~/.claude/CLAUDE.md — global rules loaded for this cloud session."

# ─────────────────────────────────────────────────────────────────────────────
# ENFORCEMENT: install the Sangamind plugins so the hooks RUN in the cloud VM,
# not just the written rules. This is what blocks a bad commit (no-ai-coauthor),
# client names in Oric, etc. — the layer a plain CLAUDE.md can't provide.
# NOTE: unverified in cloud; if plugin install isn't supported in the environment
# these commands fail harmlessly and you still have the written rules above.
if command -v claude >/dev/null 2>&1; then
  # Add the Sangamind marketplace from GitHub (private repo — the VM needs repo access).
  claude plugin marketplace add ShreyanshPatidar/sangamind 2>/dev/null || \
    echo "note: couldn't add sangamind marketplace (repo access or cloud limitation)."
  # Enable the two plugins: skills + the switchmod enforcement hooks.
  claude plugin enable sangamind@sangamind 2>/dev/null || echo "note: sangamind skills not enabled."
  claude plugin enable switchmod@sangamind 2>/dev/null || echo "note: switchmod not enabled."
  # The official hookify plugin (runs the block rules: no-ai-coauthor etc.).
  claude plugin marketplace add anthropics/claude-plugins 2>/dev/null || true
  claude plugin enable hookify@claude-plugins-official 2>/dev/null || \
    echo "note: hookify not enabled — the commit/edit BLOCK rules won't enforce here."
else
  echo "note: 'claude' CLI not on PATH in this VM — plugins not installed; written rules still apply."
fi

echo "Setup complete. Verify in-session with /context (Memory files) and /plugin (installed plugins)."
