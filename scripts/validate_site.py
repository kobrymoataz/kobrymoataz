#!/usr/bin/env python3
"""Offline validation for one-page GitHub profile portfolio; stdlib only."""
from html.parser import HTMLParser
from pathlib import Path
import re, sys
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
README=ROOT/'README.md'
ESSENTIAL=[DOCS/'index.html',DOCS/'site.css',DOCS/'app.js',DOCS/'globe-v21.js',
           DOCS/'assets/img/portrait.webp',DOCS/'assets/img/earth-texture.webp',
           DOCS/'assets/img/globe-fallback.webp',DOCS/'.nojekyll',README]
errors=[]
class H(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=set();self.refs=[];self.links=[];self.imagealts=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag in ('script','img') and 'src' in a:self.refs.append(a['src'])
  if tag=='link' and 'href' in a:self.refs.append(a['href'])
  if tag=='a' and 'href' in a:self.links.append(a['href'])
  if tag=='img':self.imagealts.append((a.get('alt'),a.get('src')))

def local(v):
 return v and not v.startswith(('#','data:','mailto:','tel:','//')) and not urlsplit(v).scheme

def resolution(source,ref):
 p=unquote(urlsplit(ref).path)
 target=(source.parent/p).resolve()
 try:target.relative_to(ROOT)
 except ValueError:raise ValueError(f'asset path escapes repository: {source.name}->{ref}')
 return target
for path in ESSENTIAL:
 if not path.is_file():errors.append('essential asset missing: '+str(path.relative_to(ROOT)))
if not errors:
 h=H();h.feed((DOCS/'index.html').read_text(encoding='utf-8'))
 for ref in h.refs:
  if local(ref) and not resolution(DOCS/'index.html',ref).is_file():errors.append('missing local HTML asset: '+ref)
 for ref in h.links:
  if ref.startswith('#') and ref!='#' and ref[1:] not in h.ids:errors.append('broken anchor '+ref)
 for alt,src in h.imagealts:
  if alt is None:errors.append('missing alt text for '+str(src))
 for ref in re.findall(r'url\(\s*["\']?([^"\')]+)',(DOCS/'site.css').read_text()):
  if local(ref) and not resolution(DOCS/'site.css',ref).is_file():errors.append('missing CSS asset: '+ref)
 for p in list((DOCS/'assets/logos').glob('*.svg'))+list((ROOT/'assets/logos').glob('*.svg')):
  try:ET.parse(p)
  except ET.ParseError as e:errors.append('malformed SVG '+str(p.relative_to(ROOT))+': '+str(e))
 md=README.read_text(encoding='utf-8')
 for ref in re.findall(r'(?:src=["\']|\]\()(\./assets/[^\s\)"\']+)',md):
  if local(ref) and not resolution(README,ref).is_file():errors.append('missing README asset: '+ref)
 # Protect against mistakenly linking removed V20 scripts/CSS.
 html=(DOCS/'index.html').read_text(encoding='utf-8')
 for stale in ['v19.css','v20.css','v19.js','v20.js','globe-fallback.js']:
  if stale in html:errors.append('obsolete script/styles referenced: '+stale)
 for required in ['RepoVerity','SubmissionLedger','FlowFault','React','Firebase','PostgreSQL','MongoDB','PHP','n8n','MYCDIC','Trendad']:
  if required not in html+md:errors.append('required description missing: '+required)
 if not (DOCS/'globe-v21.js').read_text().count("getContext('webgl")>=2:
  errors.append('missing direct WebGL initialization')
if errors:
 print('Portfolio validation FAILED:',file=sys.stderr)
 for e in errors:print(' - '+e,file=sys.stderr)
 sys.exit(1)
print('Portfolio validation PASSED: local links, images, anchors, SVGs, README, source files, and V21 WebGL code.')
