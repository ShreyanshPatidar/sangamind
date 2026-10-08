#!/usr/bin/env python3
"""Initialize a new skill directory structure."""

import argparse
import os
import re
import sys


def validate_skill_name(name: str) -> bool:
    """Validate skill name: kebab-case, lowercase, max 64 chars."""
    if len(name) > 64:
        return False
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
        return False
    return True


def title_case(name: str) -> str:
    """Convert kebab-case to Title Case."""
    return ' '.join(word.capitalize() for word in name.split('-'))


def init_skill(skill_name: str, output_path: str) -> None:
    """Create skill directory structure."""
    if not validate_skill_name(skill_name):
        print(f"❌ Invalid skill name '{skill_name}'")
        print("   Names must be kebab-case (lowercase letters, digits, hyphens only)")
        print("   Max 64 characters. Cannot start/end with hyphens or have consecutive hyphens.")
        sys.exit(1)

    skill_dir = os.path.join(output_path, skill_name)

    if os.path.exists(skill_dir):
        print(f"❌ Skill directory already exists: {skill_dir}")
        sys.exit(1)

    display_name = title_case(skill_name)

    # Create directories
    os.makedirs(skill_dir, exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'scripts'), exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'references'), exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'assets'), exist_ok=True)

    # Create SKILL.md
    skill_md = f"""---
name: {skill_name}
description: TODO: Describe what this skill does and when to use it. Include trigger words users would say. Max 1024 chars.
---

# {display_name}

TODO: Brief overview of what this skill does and who uses it.

## Instructions

TODO: Step-by-step instructions for Claude to follow.

1. First step
2. Second step
3. Handle edge cases

## Examples

TODO: Show concrete usage examples.

## Resources

- Scripts: See `scripts/` for executable helpers
- References: See `references/` for detailed documentation
- Assets: See `assets/` for templates and files
"""

    with open(os.path.join(skill_dir, 'SKILL.md'), 'w', encoding='utf-8') as f:
        f.write(skill_md)

    # Create example reference file
    reference_content = f"""# {display_name} Reference

Detailed documentation, API references, database schemas, or comprehensive guides.

This file is loaded into context only when Claude determines it's needed.
Keep SKILL.md lean — put verbose details here.
"""
    with open(os.path.join(skill_dir, 'references', 'reference.md'), 'w', encoding='utf-8') as f:
        f.write(reference_content)

    # Create example script
    script_content = f"""#!/usr/bin/env python3
\"\"\"Helper script for {display_name} skill.\"\"\"

import sys


def main():
    # TODO: Implement helper logic
    print("Hello from {skill_name} helper!")


if __name__ == '__main__':
    main()
"""
    with open(os.path.join(skill_dir, 'scripts', 'helper.py'), 'w', encoding='utf-8') as f:
        f.write(script_content)

    print(f"✅ Skill '{skill_name}' initialized at: {skill_dir}")
    print()
    print("Next steps:")
    print(f"  1. Edit {skill_dir}/SKILL.md — fill in TODO sections")
    print(f"  2. Add scripts to {skill_dir}/scripts/ (or delete example)")
    print(f"  3. Add references to {skill_dir}/references/ (or delete example)")
    print(f"  4. Add assets to {skill_dir}/assets/ (or delete if unused)")
    print(f"  5. Run: python scripts/package_skill.py {skill_dir}")


def main():
    parser = argparse.ArgumentParser(description='Initialize a new skill directory structure')
    parser.add_argument('skill_name', help='Skill name (kebab-case, max 64 chars)')
    parser.add_argument('--path', default='.', help='Output directory (default: current directory)')
    args = parser.parse_args()

    init_skill(args.skill_name, args.path)


if __name__ == '__main__':
    main()
