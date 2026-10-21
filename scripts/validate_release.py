from pathlib import Path
from PIL import Image, ImageChops
from xml.etree import ElementTree
import re, json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
readme=(ROOT/'README.md').read_text()
for src in re.findall(r'\bsrc="(\./[^"]+)"',readme):
 p=ROOT/src[2:]
 if not p.exists():errors.append(f'README missing: {src}')
page=(ROOT/'docs/index.html').read_text()
for src in re.findall(r'\bsrc="(assets/[^"]+|logos/[^"]+)"',page):
 p=ROOT/'docs'/src
 if not p.exists():errors.append(f'Site missing: {src}')
js=(ROOT/'docs/app.js').read_text()
for icon in re.findall(r"\['[^']+','([^']+)','(?:languages|frameworks|data|automation)'\]",js):
 if not (ROOT/'docs/logos'/f'{icon}.svg').exists():errors.append(f'Icon missing: {icon}')
for svg in list((ROOT/'docs/logos').glob('*.svg'))+list((ROOT/'assets/logos').glob('*.svg')):
 try:ElementTree.parse(svg)
 except Exception as e:errors.append(f'SVG invalid: {svg.name}: {e}')
for name in ('hero','architecture','institutional'):
 path=ROOT/'assets/banners'/f'{name}.gif'
 try:
  im=Image.open(path);n=im.n_frames
  if n<10:errors.append(f'GIF too few frames: {name}')
  im.seek(0); first=im.convert('RGB').crop((0,0,980,im.height))
  im.seek(n-1); last=im.convert('RGB').crop((0,0,980,im.height))
  bbox=ImageChops.difference(first,last).getbbox()
  if bbox:errors.append(f'Text zone changed between GIF frames: {name}, bbox={bbox}')
 except Exception as e:errors.append(f'GIF invalid: {name}: {e}')
qa=json.loads((ROOT/'qa/results.json').read_text())
for v,d in qa.items():
 if d['scrollWidth']!=d['innerWidth']:errors.append(f'{v} overflow')
 if d['brokenImgs']:errors.append(f'{v} broken image')
 if d['errors']:errors.append(f'{v} page errors')
 if d['workTab']!='management':errors.append(f'{v} work panel broken')
 if d['filteredAutomation']!=5:errors.append(f'{v} tech filter broken')
if errors:
 print('VALIDATION FAILED:')
 print('\n'.join(errors))
 sys.exit(1)
print('Validation passed: responsive layout, icons, 3 GIFs, self-contained assets, navigation interactions.')
