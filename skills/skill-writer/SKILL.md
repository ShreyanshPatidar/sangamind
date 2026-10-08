---
name: skill-writer
description: Shreyansh's own skill-writing guide - write, structure or fix a Claude Code skill (SKILL.md anatomy, frontmatter, progressive disclosure, bundled scripts, validation, packaging) or turn a repeated prompt or workflow into a skill. For measuring a skill with evals and benchmarks, use the official skill-creator instead.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform Claude from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else Claude needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information: "Does Claude really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/      - Executable code (Python/Bash/etc.)
    ├── references/   - Documentation loaded into context as needed
    └── assets/       - Files used in output (templates, icons, fonts, etc.)
```

#### Bundled Resources

##### Scripts (`scripts/`)
Executable code for tasks that require deterministic reliability or are repeatedly rewritten.
- Use when the same code is rewritten repeatedly or deterministic reliability is needed
- Token efficient, may be executed without loading into context

##### References (`references/`)
Documentation loaded as needed into context to inform Claude's process and thinking.
- For documentation Claude should reference while working
- Keeps SKILL.md lean, loaded only when Claude determines it's needed
- If files are large (>10k words), include grep search patterns in SKILL.md
- **Avoid duplication**: info should live in SKILL.md OR references, not both

##### Assets (`assets/`)
Files used within the output Claude produces — not loaded into context.
- Templates, images, icons, boilerplate code, fonts, sample documents

#### What NOT to Include
Do NOT create: README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md, etc.
Only include files an AI agent needs to do the job.

### Progressive Disclosure Design Principle

Three-level loading system:
1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<500 lines)
3. **Bundled resources** - As needed by Claude

Keep SKILL.md under 500 lines. Reference bundled files clearly so Claude knows they exist and when to use them.

For skills with multiple variants, organize references by variant:
```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

## Skill Creation Process

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (run `scripts/init_skill.py`)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (run `scripts/package_skill.py`)
6. Iterate based on real usage

### Step 1: Understand with Concrete Examples

Ask clarifying questions to understand usage patterns:
- "What functionality should this skill support?"
- "Can you give examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

### Step 2: Plan Reusable Contents

For each concrete example, identify what scripts, references, and assets would help when executing these workflows repeatedly.

### Step 3: Initialize

```bash
python scripts/init_skill.py <skill-name> --path <output-directory>
```

Skip if the skill already exists.

### Step 4: Edit the Skill

For design patterns, see:
- **Multi-step processes**: See [references/workflows.md](references/workflows.md)
- **Specific output formats**: See [references/output-patterns.md](references/output-patterns.md)

**Frontmatter rules:**
- `name`: kebab-case, max 64 chars, must match directory name
- `description`: max 1024 chars, include what it does AND when to use it — all "when to use" info goes here (body loads after trigger)
- `allowed-tools`: optional — restrict tool access (e.g. `Read, Grep, Glob` for read-only skills)
- No other fields in frontmatter

**Description formula:** `[What it does] + [When to use it] + [Key trigger words]`
```yaml
# ✅ Good — specific, includes triggers
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.

# ❌ Too vague — won't trigger reliably
description: Helps with documents
```

**Skill location:**
- Personal (`~/.claude/skills/`) — individual workflows, experimental, not shared
- Project (`.claude/skills/`) — team workflows, project-specific, committed to git

**Body:** Write imperative/infinitive form instructions for Claude.

### Step 5: Package

```bash
python scripts/package_skill.py <path/to/skill-folder>
```

Validates then creates a `.skill` zip file for distribution.

### Step 6: Iterate

Test on real tasks, notice struggles, update SKILL.md or bundled resources, repeat.

## Validation Checklist

```bash
python scripts/quick_validate.py <path/to/skill-folder>
```

Or manually verify:
- [ ] `name` is kebab-case, max 64 chars, matches directory name
- [ ] `description` is specific, < 1024 chars, includes "what" + "when" + trigger words
- [ ] SKILL.md body is not empty
- [ ] No hardcoded angle brackets (`<`, `>`) in description
- [ ] Bundled files referenced in body so Claude knows they exist

## Troubleshooting

**Skill doesn't trigger:**
- Description too vague → add trigger words users would say
- Add "Use when..." clause with specific user phrases

**Multiple skills conflict:**
- Make descriptions more distinct with different trigger words

**YAML errors:**
- No tabs in frontmatter (spaces only)
- Run `python scripts/quick_validate.py <skill-dir>` to catch errors
