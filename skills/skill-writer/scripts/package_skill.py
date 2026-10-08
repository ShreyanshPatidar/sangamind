#!/usr/bin/env python3
"""Package a skill folder into a distributable .skill zip archive."""

import os
import sys
import zipfile
from pathlib import Path

# Import validator from same directory
sys.path.insert(0, os.path.dirname(__file__))
from quick_validate import validate_skill


def package_skill(skill_path: str, output_dir: str = None) -> bool:
    """Package skill directory into a .skill zip file."""
    skill_path = os.path.abspath(skill_path)

    # Verify skill directory exists
    if not os.path.isdir(skill_path):
        print(f"❌ Skill directory not found: {skill_path}")
        return False

    # Verify SKILL.md exists
    skill_md = os.path.join(skill_path, 'SKILL.md')
    if not os.path.exists(skill_md):
        print(f"❌ SKILL.md not found in: {skill_path}")
        return False

    # Validate skill
    print(f"🔍 Validating skill...")
    if not validate_skill(skill_path):
        print("❌ Packaging aborted — fix validation errors first")
        return False

    skill_name = os.path.basename(skill_path)

    # Determine output directory
    if output_dir is None:
        output_dir = os.path.dirname(skill_path)
    else:
        output_dir = os.path.abspath(output_dir)

    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, f"{skill_name}.skill")

    # Create zip archive
    print(f"📦 Packaging skill '{skill_name}'...")
    try:
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_path in Path(skill_path).rglob('*'):
                if file_path.is_file():
                    arcname = os.path.relpath(str(file_path), os.path.dirname(skill_path))
                    zf.write(str(file_path), arcname)
                    print(f"   + {arcname}")

        print(f"✅ Packaged: {output_file}")
        return True

    except Exception as e:
        print(f"❌ Packaging failed: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python package_skill.py <path/to/skill-folder> [output-directory]")
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    success = package_skill(skill_path, output_dir)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
