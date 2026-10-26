#!/usr/bin/env python3
"""V32 static full-document Chromium visual & interaction checks. Inline because local navigation blocked."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,base64,mimetypes
root=Path(__file__).resolve().parents[1]
site=root/'docs'
html=(site/'index.html').read_text()
# Embed unchanged local image bytes for accurate off-network visual QA screenshots.
def embed_asset(match):
    src=match.group(1)
    file=(site/src).resolve()
    if not file.is_file() or not file.is_relative_to(site): return match.group(0)
    mime=mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
    return 'src="data:'+mime+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')+'"'
html=re.sub(r'src="(\./assets/[^"]+)"',embed_asset,html)
html=re.sub(r'<script\s+(?:type="module"\s+)?src="[^"]+"[^>]*></script>','',html)
html=re.sub(r'<link\s+rel="stylesheet"\s+href="[^"]+">','',html)
styles='\n'.join((site/name).read_text() for name in ['styles.css','studio.css','studio-flow.css','perspective.css','trustops.css','repo-audit.css','automation.css','experience-v32.css'])
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 results=[]
 for width in (1440,1024,768,390):
  context=browser.new_context(viewport={'width':width,'height':850},accept_downloads=True)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(html,wait_until='domcontentloaded')
  page.add_style_tag(content=styles)
  page.add_script_tag(content=(site/'i18n.js').read_text())
  page.add_script_tag(content=(site/'app.js').read_text())
  page.add_script_tag(content=(site/'experience-v32.js').read_text())
  # Actual launch handlers belong to the original modules, which are regression-tested separately.
  page.evaluate('''() => {window.__v32launch={trust:0,auto:0,studio:0};
     for(const [id,k] of [['trustLaunch','trust'],['automationLaunch','auto'],['studioLaunch','studio']])
      document.getElementById(id).addEventListener('click',()=>window.__v32launch[k]++);
  }''')
  assert page.locator('#tools .hub-card').count()==3
  assert page.locator('#legacyLab').get_attribute('open') is None
  assert not page.locator('#engineeringLab').is_visible()
  assert page.locator('.skill:visible').count()==6,(width,page.locator('.skill:visible').count())
  assert page.locator('#toolCount').inner_text()=='6 / 18'
  page.locator('#toolkitExpand').click();assert page.locator('.skill:visible').count()==18
  page.locator('.category[data-category="data"]').click();assert page.locator('.skill:visible').count()==3
  page.locator('.category[data-category="all"]').click();assert page.locator('.skill:visible').count()==18
  page.locator('#toolkitExpand').click();assert page.locator('.skill:visible').count()==6
  page.locator('#hubTrustLaunch').click();page.locator('#hubAutoLaunch').click();page.locator('#hubStudioLaunch').click()
  assert page.evaluate('window.__v32launch')=={'trust':1,'auto':1,'studio':1}
  page.locator('#legacyLab summary').click();assert page.locator('#engineeringLab').is_visible()
  page.locator('#legacyLab summary').click();assert not page.locator('#engineeringLab').is_visible()
  page.locator('#copyContactEmail').click()
  assert page.locator('#copyContactStatus').inner_text(), 'copy action must report status'
  dimensions=page.evaluate('''() => ({scroll:document.documentElement.scrollWidth,viewport:innerWidth,hub:document.getElementById('tools').getBoundingClientRect().width})''')
  assert dimensions['scroll']<=width+3,(width,dimensions)
  assert not errors,(width,errors)
  path=root.parent/f'v32-preview-{width}.png'
  page.locator('#tools').screenshot(path=str(path),animations='disabled')
  if width==1440:
   page.locator('#top').screenshot(path=str(root.parent/'v32-hero.png'),animations='disabled')
   page.locator('#work').screenshot(path=str(root.parent/'v32-work.png'),animations='disabled')
  if width==390:
   page.evaluate("window.siteI18n.change('ar')")
   assert page.locator('html').get_attribute('dir')=='rtl'
   assert 'استكشف' in page.locator('#toolsHubTitle').inner_text()
   ar_dim=page.evaluate('''() => ({scroll:document.documentElement.scrollWidth,viewport:innerWidth})''')
   assert ar_dim['scroll']<=width+3,ar_dim
   page.locator('#tools').screenshot(path=str(root.parent/'v32-arabic-390.png'),animations='disabled')
  results.append({'width':width,'overflow':dimensions['scroll']-width,'controls':'PASS','locales':'PASS' if width==390 else 'not checked'})
  context.close()
  print(f'V32 Chromium PASS {width}px | launch gateway + toolkit filters + classic sandbox + email copy + no overflow')
 browser.close()
(root/'QA_BROWSER_V32.json').write_text(json.dumps({'mode':'inline full document, browser navigation restricted','results':results},indent=2))
