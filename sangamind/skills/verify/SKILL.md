---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
when_to_use: Use whenever the question is whether work is finished or works: "is it done", "are we done", "is it working", "did it work", "can I tell the team / ship it", "over or something is left", and before saying done, fixed, passing, or committing and pushing.
---

# Verification Before Completion

## Overview

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Verify the real surface, not just the local command

Passing locally is not the claim the user cares about. "Working" means working **where they will
experience it** — the deployed site, production, the actual user path — not just `exit 0` on your machine.

| Claim | Not sufficient | Actually verify |
|-------|----------------|-----------------|
| "Analytics / the feature is live" | Code builds locally | Fetch the **production** URL and confirm the tag/feature is served. Committed ≠ pushed ≠ deployed. |
| "It's pushed / deployed" | `git commit` ran | `git push` output shows it reached the remote; the deploy built the new commit, not an old one. |
| "The config is applied" | Added an env var / setting | The running app actually reads it (env vars take effect on the **next deploy**, not instantly). |
| "Done" (a user-facing feature) | Happy path works | The **failure/empty/offline/error** states work too — break it on purpose and check (a sync-fail, an empty list, a declined action). Happy-path-only is not done. |

## Verify WHAT you changed, not just THAT a command ran

A command succeeding does not mean it did the *right* thing. Check the contents.

| Claim | Not sufficient | Actually verify |
|-------|----------------|-----------------|
| "Committed my work" | `git commit` succeeded | `git diff --cached --name-status` / `git show --stat` shows **only your files** — no foreign/pre-staged changes swept in. (Real incident: a pre-staged deletion rode along in a commit.) |
| "Left the other session's work alone" | You didn't edit it | `git status` shows their files still uncommitted/unchanged after your commit. |
| "Staged only my hunks" | `git add -p` ran | Re-read the staged diff; confirm the exact hunks, nothing adjacent. |

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

---
Adapted from the superpowers plugin by Jesse Vincent (MIT License), 4 Oct 2026.
