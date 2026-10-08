---
name: no-client-names-in-oric
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: (?i)oric app[\\/](src|supabase|tests)[\\/]
  - field: content
    operator: regex_match
    pattern: \b(BFC|PFC|Estimo)\b
---

**Edit blocked: a client or product name in Oric.**

Never write BFC, PFC or Estimo in Oric's code, SQL or tests, not even in a comment. Companies come
from the database; describe the thing itself instead ("the sister product", "a company").
