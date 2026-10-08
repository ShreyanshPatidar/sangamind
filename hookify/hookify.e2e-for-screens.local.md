---
name: e2e-for-screens
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: (?i)oric app[\\/]src[\\/].*(\.test\.tsx|\.spec\.tsx?)$
---

**Blocked: a screen or component test in Oric's src/.**

Unit tests in Oric are for pure calculations only (money, GST, allocation, ageing, parsing), as
`*.test.ts` beside the calculation. Anything with a screen or a database is tested end to end: a
Playwright spec in tests/e2e/ that ends in a repeatable artifact.
