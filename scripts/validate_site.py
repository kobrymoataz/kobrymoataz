#!/usr/bin/env python3
"""V30.2 publish gate: dependency-free verification of local assets and i18n completeness."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re,json,sys,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
D=R/'docs'; errors=[]
REQUIRED=['index.html','styles.css','i18n.js','lab.js','app.js','globe.js','.nojekyll','assets/logo-mark.svg','assets/img/portrait.webp','assets/img/earth-texture.webp','assets/img/globe-v25-fallback.webp','assets/img/mycdic-public-website.webp','studio.css','studio.js','studio-engine.js','studio-flow.css','studio-flow-ui.js','studio-flow-engine.js','vendor/codemirror/codemirror.js','vendor/codemirror/codemirror.css','vendor/xterm/xterm.js','perspective.js','perspective.css','assets/img/regional-atlas.svg','trustops.css','trustops.js','trustops-core.mjs','repo-audit.css','repo-audit.js','repo-audit-core.mjs']
for f in REQUIRED:
 if not (D/f).is_file():errors.append('Missing file: docs/'+f)
for f in ['README.md','.github/workflows/deploy-pages.yml','assets/banners/hero.gif','scripts/push_v28.sh','scripts/push_v29.sh','scripts/test_perspective_v29.mjs','scripts/test_trustops_v30.mjs','scripts/push_v30_1.sh','scripts/push_v30_2.sh','scripts/test_repo_audit_v30_2.mjs']:
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
for term in ['V25','RepoVerity','SubmissionLedger','FlowFault','Firebase','PostgreSQL','MongoDB','MYCDIC','Trendad','globeCanvas','engineeringLab','termInput','termOutput','engineering-workstation / v26']:
 if term not in html+md and term!='V25':errors.append('Required portfolio element not found: '+term)
lab=(D/'lab.js').read_text(encoding='utf-8') if (D/'lab.js').is_file() else ''
for term in ['data-terminal-os','labElapsed','tabLinux','tabMac','wsEditor','wsFileList','wsRunPython','wsExport']:
 if term not in html:errors.append('Missing terminal UI control: '+term)
for term in ['indexedDBOpen','workflowRun','gitAction','importWorkspace','tests','pythonWorker']:
 if term not in lab:errors.append('Missing terminal engine feature: '+term)
workflow=(R/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8') if (R/'.github/workflows/deploy-pages.yml').exists() else ''
if 'actions/deploy-pages' in workflow or 'pages: write' in workflow:errors.append('Workflow unexpectedly deploys; use branch publishing')

# V28 functional studio structure and no fake success claims.
studio=(D/'studio.js').read_text(encoding='utf-8') if (D/'studio.js').is_file() else ''
core=(D/'studio-engine.js').read_text(encoding='utf-8') if (D/'studio-engine.js').is_file() else ''
for term in ['studioLaunch','engineeringStudio','studioTestRun','studioSQLRun','studioPythonRun','studioXterm','studioCode','studioImport','studioExport']:
 if term not in html:errors.append('Missing V28 studio UI: '+term)
for term in ['MKStudioEngine','hashObject','sha1Fallback','indexedDB','async commit','runWorkflow','retryLimit']:
 if term not in core:errors.append('Missing V28 studio engine: '+term)
for term in ['runTests','runnerHTML','runSQL','runPython','window.Terminal','CodeMirror']:
 if term not in studio:errors.append('Missing V27 runtime feature: '+term)
# V28 flow editor must be wired to the actual engine, not a decorative graph.
flow_engine=(D/'studio-flow-engine.js').read_text(encoding='utf-8') if (D/'studio-flow-engine.js').exists() else ''
flow_ui=(D/'studio-flow-ui.js').read_text(encoding='utf-8') if (D/'studio-flow-ui.js').exists() else ''
for term in ['flowDesigner','flowGraph','flowEnable','flowConfigForm','flowJobs','flowTrace','flowMetricQueue','flowTraceExport','data-flow-scenario','studio-flow-engine.js','studio-flow-ui.js']:
 if term not in html:errors.append('Missing V28 workflow interface: '+term)
for term in ['flowGraph','flowEditStage','flowMove','flowPosition','flowMetrics','flowTrace','runWorkflow','flowControl','flowDeadLetter','flowPump']:
 if term not in flow_engine:errors.append('Missing V28 stateful workflow engine: '+term)
for term in ['flowNodes','renderGraph','flowConfigForm','flowJobs','flowTraceExport','data-flow-i18n']:
 if term not in flow_ui and term not in html:errors.append('Missing V28 interactive graph behavior: '+term)
# V29 geographical context must have working selector, local assets and public evidence source.
for key in ['data-perspective-mode="earth"','data-perspective-mode="atlas"','atlasView','atlasPins','repoEvidence','placeDossier','globeLighting','globeConnections','./perspective.js']:
 if key not in html:errors.append('Missing V29 geographic interface: '+key)
globe29=(D/'globe.js').read_text(encoding='utf-8') if (D/'globe.js').exists() else ''
for key in ['MKGlobeV29','setMode(mode)','setConnections(enabled)','setLighting(enabled)',"getContext('webgl'"]:
 if key not in globe29:errors.append('Missing V29 globe feature: '+key)
ui29=(D/'perspective.js').read_text(encoding='utf-8') if (D/'perspective.js').exists() else ''
for key in ['createAtlas','renderDossier','chooseMode','getRepo','repoEvidenceRefresh',"fetch('https://api.github.com"]:
 if key not in ui29:errors.append('Missing V29 atlas or public API feature: '+key)
# V30.1 TrustOps: public DNS-only integration, translation coverage and no sample results.
for key in ['id="trustops"','id="trustLaunch"','id="trustopsStudio"','id="trustRun"','id="trustPanelFindings"','id="trustPanelEvidence"','id="trustExportJSON"','./trustops.js']:
 if key not in html:errors.append('Missing V30 TrustOps UI: '+key)
trust_ui=(D/'trustops.js').read_text(encoding='utf8') if (D/'trustops.js').exists() else ''
trust_core=(D/'trustops-core.mjs').read_text(encoding='utf8') if (D/'trustops-core.mjs').exists() else ''
for key in ['auditDomain','createDohResolver','normalizeDomain','normalizeSelector','estimateSpf','decodeTxt']:
 if key not in trust_core:errors.append('Missing V30 DNS engine feature: '+key)
for key in ['trustExportJSON','trustExportHTML','trustCancel','trustTabs','auditDomain']:
 if key not in trust_ui:errors.append('Missing V30 audit UI behavior: '+key)
if 'TrustOps Studio' not in md or 'trustops-core.mjs' not in md:errors.append('README missing TrustOps tool and source')
# V30.2 repository audit must be linked and its independent tests present.
for key in ['id="repoAudit"', 'id="repoAuditForm"', 'id="repoAuditInput"', 'id="repoExportJSON"', './repo-audit.js']:
 if key not in html:errors.append('Missing V30.2 repository audit UI: '+key)
repo_core=(D/'repo-audit-core.mjs').read_text(encoding='utf8') if (D/'repo-audit-core.mjs').exists() else ''
for key in ['parseRepository', 'auditRepository', 'dependenciesFromPackageLock', 'dependenciesFromRequirements']:
 if key not in repo_core:errors.append('Missing V30.2 repository audit engine: '+key)
if 'Repository Intelligence' not in md:errors.append('README missing V30.2 repository intelligence section')
if errors:
 print('V30.2 VALIDATION FAILED',file=sys.stderr)
 for e in errors:print(' - '+e,file=sys.stderr)
 sys.exit(1)
print(f'V30.2 VALIDATION PASSED | {len(p.ids)} anchors | {len(p.images)} images | {len(p.langKeys)} localized elements | 4 languages')
