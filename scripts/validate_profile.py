#!/usr/bin/env python3
"""Validate GitHub profile assets and the React portfolio project layout."""
from pathlib import Path
from xml.etree import ElementTree
import re,sys,ast,json

ROOT=Path(__file__).resolve().parents[1]
errors=[]
readme=(ROOT/'README.md').read_text(encoding='utf-8')
refs=set(re.findall(r'(?:src|href)=["\'](\./assets/[^"\']+)["\']',readme))
if not refs:errors.append('README has no assets')
for ref in refs:
    if not (ROOT/ref[2:]).is_file():errors.append('Missing '+ref)
for svg in (ROOT/'assets').glob('*.svg'):
    try:ElementTree.parse(svg)
    except ElementTree.ParseError as e:errors.append(f'{svg.name}: {e}')
for img in (ROOT/'assets').glob('*'):
    if img.suffix.lower() in ('.gif','.png'):
        data=img.read_bytes()
        if img.suffix.lower()=='.png' and not data.startswith(b'\x89PNG\r\n\x1a\n'):
            errors.append('Invalid PNG: '+img.name)
        if img.suffix.lower()=='.gif' and data[:6] not in (b'GIF87a',b'GIF89a'):
            errors.append('Invalid GIF: '+img.name)
for py in (ROOT/'scripts').glob('*.py'):
    try:ast.parse(py.read_text(encoding='utf-8'))
    except SyntaxError as e:errors.append(f'{py.name}: {e}')
for required in ['site/package.json','site/src/App.tsx','site/src/components/CyberScene.tsx','site/src/styles.css','site/vite.config.ts','.github/workflows/deploy-pages.yml','site/public/moataz-photo.png']:
    if not (ROOT/required).is_file():errors.append('Missing '+required)
try:
    pkg=json.loads((ROOT/'site/package.json').read_text())
    for dep in ['react','react-dom','three','@react-three/fiber','@react-three/drei','motion']:
        if dep not in pkg.get('dependencies',{}):errors.append('Missing dependency '+dep)
except Exception as e:errors.append('Invalid package.json '+str(e))
if errors:
    print('\n'.join('ERROR: '+s for s in errors),file=sys.stderr)
    sys.exit(1)
print(f'PASS: {len(refs)} linked assets, valid images, SVG, Python, website source, and deployment structure')
