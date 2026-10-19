#!/usr/bin/env python3
"""Zero-dependency checks for the profile artwork and local README links."""
from pathlib import Path
from xml.etree import ElementTree
import re
import sys
import ast

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / 'README.md'


def main():
    errors = []
    content = README.read_text(encoding='utf-8')
    referenced = set(re.findall(r'(?:src|href)=["\'](\./assets/[^"\']+)["\']', content))
    if not referenced:
        errors.append('No relative asset references found in README.')
    for src in sorted(referenced):
        file = ROOT / src.removeprefix('./')
        if not file.is_file():
            errors.append(f'Missing asset: {src}')
    for file in sorted((ROOT / 'assets').glob('*.svg')):
        try:
            ElementTree.parse(file)
        except ElementTree.ParseError as exc:
            errors.append(f'Invalid SVG: {file.name} ({exc})')
    for name in ('hero-motion.gif', 'leadership-motion.gif'):
        file = ROOT / 'assets' / name
        if not file.is_file() or file.read_bytes()[:6] not in (b'GIF87a', b'GIF89a'):
            errors.append(f'Missing or invalid GIF: {name}')
    for file in (ROOT / 'scripts').glob('*.py'):
        try:
            ast.parse(file.read_text(encoding='utf-8'))
        except SyntaxError as exc:
            errors.append(f'Python syntax error: {file.name}: {exc}')
    if errors:
        for error in errors:
            print(f'ERROR: {error}', file=sys.stderr)
        return 1
    print(f'Profile passed validation: {len(referenced)} linked assets, valid SVG and GIF files, Python syntax OK.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
