#!/usr/bin/env python3
"""Validation for branch-published static GitHub profile + portfolio."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
README = ROOT / 'README.md'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = set()
        self.site_anchors = []
        self.alts = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'img' and 'src' in a:
            self.references.append(a['src'])
            self.alts.append((a.get('alt'),a['src']))
        if tag == 'script' and 'src' in a: self.references.append(a['src'])
        if tag == 'link' and 'href' in a: self.references.append(a['href'])
        if tag == 'a' and 'href' in a: self.site_anchors.append(a['href'])


def is_local(value):
    value = value.strip()
    return not (not value or value.startswith(('#','data:','mailto:','tel:','//')) or urlsplit(value).scheme)

def resolve(source, url):
    parts = urlsplit(url)
    path = unquote(parts.path)
    target = (source.parent / path).resolve()
    try: target.relative_to(ROOT.resolve())
    except ValueError: raise ValueError(f'path escapes repository: {source.relative_to(ROOT)} -> {url}')
    return target

errors=[]
for f in [DOCS/'index.html', DOCS/'styles.css', DOCS/'v19.css', DOCS/'v20.css', DOCS/'script.js', DOCS/'v19.js', DOCS/'v20.js', DOCS/'globe-fallback.js', DOCS/'globe.js', DOCS/'assets/img/earth-texture.webp', DOCS/'assets/img/globe-fallback.webp', DOCS/'.nojekyll', README]:
    if not f.is_file(): errors.append(f'missing essential file: {f.relative_to(ROOT)}')

if not errors:
    p=Links()
    p.feed((DOCS/'index.html').read_text(encoding='utf-8'))
    for ref in p.references:
        if is_local(ref) and not resolve(DOCS/'index.html',ref).exists(): errors.append(f'missing HTML asset: {ref}')
    for alt,src in p.alts:
        if alt is None: errors.append(f'img missing alt: {src}')
    for ref in p.site_anchors:
        if ref.startswith('#') and ref != '#' and ref[1:] not in p.ids:
            errors.append(f'broken page anchor: {ref}')

    css = (DOCS/'styles.css').read_text(encoding='utf-8') + '\n' + (DOCS/'v19.css').read_text(encoding='utf-8') + '\n' + (DOCS/'v20.css').read_text(encoding='utf-8')
    for m in re.finditer(r'url\(\s*["\']?([^"\')]+)',css):
        ref=m.group(1).strip()
        if is_local(ref) and not resolve(DOCS/'styles.css',ref).exists(): errors.append(f'missing CSS asset: {ref}')

    js=(DOCS/'script.js').read_text(encoding='utf-8')
    for icon in re.findall(r"icon:\s*'([a-z0-9_-]+)'",js):
        if not (DOCS/'assets/logos'/f'{icon}.svg').is_file(): errors.append(f'missing technology logo: {icon}')

    md=README.read_text(encoding='utf-8')
    refs=re.findall(r'(?:src=["\']|\]\()(\./assets/[^\s\)"\']+)',md)
    for ref in refs:
        if is_local(ref) and not resolve(README,ref).exists(): errors.append(f'missing README asset: {ref}')

    for icon_file in list((DOCS/'assets/logos').glob('*.svg'))+list((ROOT/'assets/logos').glob('*.svg')):
        try: ET.parse(icon_file)
        except ET.ParseError as exc: errors.append(f'invalid SVG {icon_file.relative_to(ROOT)}: {exc}')
    for fname in ['Firebase', 'PostgreSQL', 'MongoDB', 'PHP', 'RepoVerity', 'SubmissionLedger', 'FlowFault']:
        if fname not in md: errors.append(f'{fname} missing from README')

if errors:
    print('Portfolio validation FAILED:',file=sys.stderr)
    for error in errors: print(' - '+error,file=sys.stderr)
    raise SystemExit(1)
print('Portfolio validation PASSED: HTML links, anchors, local assets, README, icons, SVGs and V20 files.')
