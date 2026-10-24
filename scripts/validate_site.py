#!/usr/bin/env python3
"""V25 publish gate: dependency-free verification of local assets and i18n completeness."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re,json,sys,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
D=R/'docs'; errors=[]
REQUIRED=['index.html','styles.css','i18n.js','lab.js','app.js','globe.js','.nojekyll','assets/logo-mark.svg','assets/img/portrait.webp','assets/img/earth-texture.webp','assets/img/globe-v25-fallback.webp','assets/img/mycdic-public-website.webp']
for f in REQUIRED:
 if not (D/f).is_file():errors.append('Missing file: docs/'+f)
for f in ['README.md','.github/workflows/deploy-pages.yml','assets/banners/hero.gif','scripts/push_v25.sh']:
 if not (R/f).is_file():errors.append('Missing file: '+f)
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.assets=[];self.anchors=[];self.images=[];self.langKeys=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if 'data-i18n' in a:self.langKeys.append(a['data-i18n'])
  if 'data-i18n-placeholder' in a:self.langKeys.append(a['data-i18n-placeholder'])
  if tag in ('script','img') and 'src' in a:self.assets.append(a['src'])
  if tag=='link' and 'href' in a:self.assets.append(a['href'])
  if tag=='a' and 'href' in a:self.anchors.append(a['href'])
  if tag=='img':self.images.append(a)
p=Parser()
if (D/'index.html').exists():p.feed((D/'index.html').read_text(encoding='utf-8'))
if len(p.ids)!=len(set(p.ids)):errors.append('Duplicate HTML IDs')

def local(v):return v and not v.startswith(('#','mailto:','tel:','data:','//')) and not urlsplit(v).scheme

def assetExists(root,ref):
 path=(root/unquote(urlsplit(ref).path)).resolve()
 try:path.relative_to(R)
 except ValueError:return False
 return path.is_file()
for a in p.assets:
 if local(a) and not assetExists(D,a):errors.append('Missing HTML asset: '+a)
for a in p.anchors:
 if a.startswith('#') and a[1:] not in p.ids and a!='#':errors.append('Broken section anchor: '+a)
 elif local(a) and not assetExists(D,a):errors.append('Missing local linked file: '+a)
for a in p.images:
 if 'alt' not in a:errors.append('Image missing alt: '+str(a.get('src')))
css=(D/'styles.css').read_text(encoding='utf-8') if (D/'styles.css').exists() else ''
for a in re.findall(r'url\(\s*["\']?([^"\')]+)',css):
 if local(a) and not assetExists(D,a):errors.append('Missing CSS asset: '+a)
for svg in list((D/'assets').rglob('*.svg'))+list((R/'assets').rglob('*.svg')):
 try:ET.parse(svg)
 except ET.ParseError as e:errors.append('Invalid SVG: '+str(svg)+': '+str(e))
md=(R/'README.md').read_text(encoding='utf-8') if (R/'README.md').exists() else ''
for a in re.findall(r'(?:src=["\']|\]\()(\./assets/[^\s\)"\']+)',md):
 if not assetExists(R,a):errors.append('Missing README asset: '+a)
# All four translations must cover all referenced localization keys.
js=(D/'i18n.js').read_text(encoding='utf-8') if (D/'i18n.js').exists() else ''
match=re.search(r'const messages\s*=\s*(\{.*?\});\s*const available=',js,re.S)
if not match:errors.append('Missing i18n translation object')
else:
 try:
  obj=json.loads(match.group(1))
  for lang in ['en','fr','es','ar']:
   missing=set(p.langKeys)-set(obj[lang]);
   if missing:errors.append('Untranslated UI keys '+lang+': '+', '.join(sorted(missing)))
 except Exception as e:errors.append('i18n JSON parse error: '+str(e))
if (D/'assets/Moataz_Kobry_Professional_CV.pdf').exists():errors.append('Public CV PDF must not be included in docs')
if 'Moataz_Kobry_Professional_CV.pdf' in md or 'Moataz_Kobry_Professional_CV.pdf' in (D/'index.html').read_text(): errors.append('Public CV download link found')
html=(D/'index.html').read_text(encoding='utf-8') if (D/'index.html').exists() else ''
for term in ['V25','RepoVerity','SubmissionLedger','FlowFault','Firebase','PostgreSQL','MongoDB','MYCDIC','Trendad','globeCanvas','engineeringLab','termInput','termOutput','workflow-simulator / v3']:
 if term not in html+md and term!='V25':errors.append('Required portfolio element not found: '+term)
lab=(D/'lab.js').read_text(encoding='utf-8') if (D/'lab.js').is_file() else ''
for term in ['data-terminal-os','labElapsed','tabLinux','tabMac']:
 if term not in html:errors.append('Missing terminal UI control: '+term)
for term in ['setShell','formatDuration','stopwatchReset','systemctl','docker']:
 if term not in lab:errors.append('Missing terminal engine feature: '+term)
workflow=(R/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8') if (R/'.github/workflows/deploy-pages.yml').exists() else ''
if 'actions/deploy-pages' in workflow or 'pages: write' in workflow:errors.append('Workflow unexpectedly deploys; use branch publishing')
if errors:
 print('V25 VALIDATION FAILED',file=sys.stderr)
 for e in errors:print(' - '+e,file=sys.stderr)
 sys.exit(1)
print(f'V25 VALIDATION PASSED | {len(p.ids)} anchors | {len(p.images)} images | {len(p.langKeys)} localized elements | 4 languages')
