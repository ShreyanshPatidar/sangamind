#!/usr/bin/env python3
"""Validate a skill directory and SKILL.md frontmatter."""

import os
import re
import sys


ALLOWED_FRONTMATTER_KEYS = {'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'}


def validate_skill(skill_path: str) -> bool:
    """Validate skill directory structure and SKILL.md frontmatter."""
    errors = []

    # Check directory exists
    if not os.path.isdir(skill_path):
        print(f"❌ Path is not a directory: {skill_path}")
        return False

    skill_md_path = os.path.join(skill_path, 'SKILL.md')

    # Check SKILL.md exists
    if not os.path.exists(skill_md_path):
        print(f"❌ SKILL.md not found in: {skill_path}")
        return False

    with open(skill_md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse frontmatter
    if not content.startswith('---'):
        errors.append("SKILL.md must start with '---' (YAML frontmatter)")
        print_results(errors)
        return False

    parts = content.split('---', 2)
    if len(parts) < 3:
        errors.append("SKILL.md frontmatter must have opening and closing '---'")
        print_results(errors)
        return False

    frontmatter_str = parts[1].strip()
    body = parts[2].strip()

    # Parse YAML frontmatter manually (avoid dependency on pyyaml)
    frontmatter = {}
    for line in frontmatter_str.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' in line:
            key, _, value = line.partition(':')
            frontmatter[key.strip()] = value.strip()

    # Check for unknown keys
    for key in frontmatter:
        if key not in ALLOWED_FRONTMATTER_KEYS:
            errors.append(f"Unknown frontmatter key: '{key}'. Allowed: {', '.join(sorted(ALLOWED_FRONTMATTER_KEYS))}")

    # Validate name
    name = frontmatter.get('name', '')
    if not name:
        errors.append("Frontmatter missing required field: 'name'")
    else:
        if len(name) > 64:
            errors.append(f"'name' exceeds 64 characters (got {len(name)}): {name}")
        if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
            errors.append(f"'name' must be kebab-case (lowercase letters, digits, hyphens only): {name}")
        if name.startswith('-') or name.endswith('-'):
            errors.append(f"'name' cannot start or end with a hyphen: {name}")
        if '--' in name:
            errors.append(f"'name' cannot contain consecutive hyphens: {name}")

        # Check directory name matches
        dir_name = os.path.basename(os.path.abspath(skill_path))
        if name != dir_name:
            errors.append(f"'name' ({name}) must match directory name ({dir_name})")

    # Validate description
    description = frontmatter.get('description', '')
    if not description:
        errors.append("Frontmatter missing required field: 'description'")
    else:
        if len(description) > 1024:
            errors.append(f"'description' exceeds 1024 characters (got {len(description)})")
        if '<' in description or '>' in description:
            errors.append("'description' cannot contain '<' or '>' characters")

    # Validate optional compatibility
    compatibility = frontmatter.get('compatibility', '')
    if compatibility and len(compatibility) > 500:
        errors.append(f"'compatibility' exceeds 500 characters (got {len(compatibility)})")

    # Check body exists
    if not body:
        errors.append("SKILL.md body is empty — add instructions after the frontmatter")

    print_results(errors)
    return len(errors) == 0


def print_results(errors: list) -> None:
    if errors:
        print(f"❌ Validation failed with {len(errors)} error(s):")
        for error in errors:
            print(f"   • {error}")
    else:
        print("✅ Skill validation passed")


def main():
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill-directory>")
        sys.exit(1)

    skill_path = sys.argv[1]
    success = validate_skill(skill_path)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
