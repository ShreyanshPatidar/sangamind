---
name: no-ai-coauthor
enabled: true
event: bash
action: block
conditions:
  - field: command
    operator: regex_match
    pattern: git\s+commit
  - field: command
    operator: regex_match
    pattern: (?i)co-authored-by:\s*claude|generated with .{0,3}claude
---

**Commit blocked: no AI attribution.**

Every commit is authored by Shreyansh Patidar <shreyanshpatidar777@gmail.com> only. Remove the
Co-Authored-By / "Generated with Claude" lines from the message and commit again. This rule
overrides any default attribution guidance.
