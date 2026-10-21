#!/usr/bin/env python3
"""Validate published README art and the React/Vite source layout. Standard library only."""
from pathlib import Path
from xml.etree import ElementTree
import re, sys, struct, ast, json
ROOT=Path(__file__).resolve().parents[1]
errors=[]
readme=(ROOT/'README.md').read_text(encoding='utf-8')
refs=set(re.findall(r'<img[^>]*src=["\'](\./assets/[^"\']+)',readme))
if len(refs)<8:errors.append(f'Too few README image assets: {len(refs)}')
for ref in sorted(refs):
    p=ROOT/ref[2:]
    if not p.is_file():errors.append(f'Missing {ref}')
for name in ('hero.gif','architecture.gif','institutional.gif'):
    file=ROOT/'assets'/name
    if not file.is_file():errors.append('Missing banner '+name);continue
    b=file.read_bytes()
    if len(b)<14 or b[:6] not in (b'GIF87a',b'GIF89a'):errors.append('Invalid GIF '+name);continue
    w,h=struct.unpack('<HH',b[6:10]);expected=(1600,510) if name=='hero.gif' else ((1600,458) if name=='architecture.gif' else (1600,374))
    if (w,h)!=expected:errors.append(f'Unexpected GIF dimensions for {name}: {(w,h)}')
for file in (ROOT/'assets').glob('*.svg'):
    try:ElementTree.parse(file)
    except ElementTree.ParseError as exc:errors.append(f'Invalid SVG {file.name}: {exc}')
for file in (ROOT/'assets').glob('*.png'):
    if not file.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'):errors.append('Invalid PNG '+file.name)
for file in (ROOT/'scripts').glob('*.py'):
    try:ast.parse(file.read_text(encoding='utf-8'))
    except SyntaxError as exc:errors.append(f'Python syntax error {file.name}: {exc}')
for file in ['site/package.json','site/src/App.tsx','site/src/main.tsx','site/src/components/OrbScene.tsx','site/src/styles.css','site/vite.config.ts','site/src/assets/portrait.webp','.github/workflows/deploy-portfolio.yml','site/scripts/verify-dist.mjs']:
    if not (ROOT/file).is_file():errors.append('Missing '+file)
if (ROOT/'docs').exists():errors.append('Legacy docs folder must not be included')
try:
    pkg=json.loads((ROOT/'site/package.json').read_text())
    for name in ['react','react-dom','@react-three/fiber','@react-three/drei','three','gsap','motion']:
        if name not in pkg.get('dependencies',{}):errors.append(f'Package missing {name}')
except Exception as exc:errors.append('Invalid package.json: '+str(exc))
if errors:
    print('\n'.join('ERROR '+msg for msg in errors),file=sys.stderr)
    raise SystemExit(1)
print(f'PASS: README links ({len(refs)}), banner dimensions, SVG/PNG, React source layout, and workflow dependencies.')
