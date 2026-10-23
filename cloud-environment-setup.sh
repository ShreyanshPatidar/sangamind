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

# NOTE: plugins/hooks do NOT work in cloud ("Plugins aren't available in this
# environment" — confirmed 21 Oct 2026). So hookify's enforced blocks (e.g.
# no-ai-coauthor) cannot run here. The real attribution safeguard in cloud is the
# GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL environment variables set in this same
# environment config (git then physically can't author as "Claude"). Set them to:
#   GIT_AUTHOR_NAME=Shreyansh Patidar
#   GIT_AUTHOR_EMAIL=shreyanshpatidar777@gmail.com
#   GIT_COMMITTER_NAME=Shreyansh Patidar
#   GIT_COMMITTER_EMAIL=shreyanshpatidar777@gmail.com

# Belt-and-suspenders: also set git identity here in case the env vars aren't applied.
git config --global user.name "Shreyansh Patidar"
git config --global user.email "shreyanshpatidar777@gmail.com"

echo "Setup complete. Verify with /context (should list ~/.claude/CLAUDE.md under Memory files)."
