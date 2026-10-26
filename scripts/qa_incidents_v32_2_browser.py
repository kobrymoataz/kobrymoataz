#!/usr/bin/env python3
"""Inline Chromium smoke for V32.2 actual browser modules, not a deployed-site claim."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,base64
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'docs/index.html').read_text()
css=(ROOT/'docs/systems.css').read_text()
core=(ROOT/'docs/systems-core.mjs').read_text()
incidents=(ROOT/'docs/systems-incidents-core.mjs').read_text()
ui=(ROOT/'docs/systems.js').read_text()
i18n=(ROOT/'docs/i18n.js').read_text()
m=re.search(r'const messages\s*=\s*(\{.*?\});\s*const available=',i18n,re.S);assert m
messages=json.loads(m.group(1))
start=html.index('<section id="systemsPanel"')
end=html.index('  <script src="./i18n.js"',start)
panel=html[start:end]
gateway=html[html.index('<aside class="systems-gateway"'):html.index('</aside>',html.index('<aside class="systems-gateway"'))+len('</aside>')]
def dataurl(source):return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
core_url=dataurl(core)
incidents=incidents.replace("from './systems-core.mjs'",f"from '{core_url}'")
incidents_url=dataurl(incidents)
ui=ui.replace("from './systems-core.mjs'",f"from '{core_url}'").replace("from './systems-incidents-core.mjs'",f"from '{incidents_url}'")
def fixture(states):
 return {'schema':'trustops-audit-v1','domain':'example.org','counts':{x:states.count(x) for x in ['pass','warn','fail','info','unknown']},'findings':[{'id':f'signal{i}','state':s,'detail':'DO_NOT_DISPLAY_SECRET'} for i,s in enumerate(states)],'finishedAt':'2026-10-26T20:00:00Z'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height,lang in [(1440,900,'en'),(390,844,'en'),(390,844,'ar')]:
  page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(f'''<!doctype html><html lang="{lang}" dir="{'rtl' if lang=='ar' else 'ltr'}"><head><meta charset="utf-8"><style>{css}</style></head><body>{gateway}{panel}</body></html>''')
  page.evaluate('''() => {const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>`test-${Math.random().toString(36).slice(2)}`});}''')
  page.evaluate('(dict)=>{window.siteI18n={t:k=>dict[k]||k}}',messages[lang])
  page.add_script_tag(content=ui,type='module')
  page.wait_for_function("() => document.getElementById('systemsHistoryCount').textContent === '0/24'",timeout=8000)
  page.locator('#systemsLaunch').click()
  files=[{'name':'first.json','mimeType':'application/json','buffer':json.dumps(fixture(['warn','pass'])).encode()}, {'name':'second.json','mimeType':'application/json','buffer':json.dumps(fixture(['pass','pass'])).encode()}]
  page.locator('#systemsFiles').set_input_files(files)
  page.wait_for_function("() => document.getElementById('systemsHistoryCount').textContent === '2/24'",timeout=8000)
  assert page.locator('#systemsTimeline .sys-timeline-item').count()==1
  assert 'DO_NOT_DISPLAY_SECRET' not in page.locator('#systemsPanel').inner_text()
  page.locator('#systemsCaseOpen').click()
  page.wait_for_function("() => document.getElementById('systemsCaseCount').textContent === '1/40'",timeout=8000)
  page.locator('[data-field="status"]').first.select_option('investigating')
  page.locator('[data-field="priority"]').first.select_option('high')
  assert page.locator('#systemsCases').inner_text().find(messages[lang]['sysCaseInvestigating'])>=0
  with page.expect_download() as download:page.locator('#systemsBackup').click()
  assert download.value.suggested_filename=='systems-casebook-v32-2.json'
  assert page.evaluate("localStorage.getItem('mk-systems-casebook-v32-2')===null")
  page.locator('#systemsSave').click()
  assert page.evaluate("localStorage.getItem('mk-systems-casebook-v32-2') !== null")
  assert page.evaluate("!localStorage.getItem('mk-systems-casebook-v32-2').includes('DO_NOT_DISPLAY_SECRET')")
  page.locator('#systemsCompare').click()
  assert page.locator('#systemsExport').is_enabled()
  page.screenshot(path=str(ROOT.parent/f'v32-2-systems-{width}-{lang}.png'))
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),(width,lang)
  page.once('dialog',lambda d:d.accept())
  page.locator('#systemsClear').click()
  assert page.locator('#systemsCaseCount').inner_text()=='0/40'
  assert page.evaluate("localStorage.getItem('mk-systems-casebook-v32-2')===null")
  page.locator('#systemsRestoreFile').set_input_files(download.value.path())
  page.wait_for_function("() => document.getElementById('systemsCaseCount').textContent === '1/40'",timeout=8000)
  assert page.locator('#systemsCases').inner_text().find(messages[lang]['sysCaseInvestigating'])>=0
  # Explicitly restored but not automatically persisted.
  assert page.evaluate("localStorage.getItem('mk-systems-casebook-v32-2')===null")
  assert not errors,errors
  page.close()
 browser.close()
print('V32.2 BROWSER INLINE PASS | 1440/390 EN + 390 AR | timeline | triage | export | explicit save | clear/recover | no raw data')
