#!/usr/bin/env python3
"""Inline Chromium interaction test for V32.1 UI; network/local navigation is restricted."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,base64
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'docs/index.html').read_text()
css=(ROOT/'docs/systems.css').read_text()
core=(ROOT/'docs/systems-core.mjs').read_text()
script=(ROOT/'docs/systems.js').read_text()
i18n=(ROOT/'docs/i18n.js').read_text();m=re.search(r'const messages\s*=\s*(\{.*?\});\s*const available=',i18n,re.S)
messages=json.loads(m.group(1))
start=html.index('<section id="systemsPanel"')
end=html.index('  <script src="./i18n.js"',start)
panel=html[start:end]
gateway=html[html.index('<aside class="systems-gateway"'):html.index('</aside>',html.index('<aside class="systems-gateway"'))+len('</aside>')]
base='data:text/javascript;base64,'+base64.b64encode(core.encode()).decode()
script=script.replace("from './systems-core.mjs'",f"from '{base}'")
def fixture(pass_count, warn, fail):
 states=['pass']*pass_count+['warn']*warn+['fail']*fail
 return {'schema':'trustops-audit-v1','domain':'example.com','counts':{'pass':pass_count,'warn':warn,'fail':fail,'info':0,'unknown':0},'findings':[{'id':f'signal{i}','state':s,'detail':'SENSITIVE CONTENT NEVER RENDER'} for i,s in enumerate(states)],'finishedAt':'2026-10-26T13:00:00Z'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height,lang in [(1440,900,'en'),(390,844,'en'),(390,844,'ar')]:
  page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # Stub only browser storage origin restrictions. Report parsing and UI are the actual production modules.
  page.set_content(f'''<!doctype html><html lang="{lang}" dir="{'rtl' if lang=='ar' else 'ltr'}"><head><meta charset="utf-8"><style>{css}</style></head><body>{gateway}{panel}</body></html>''')
  page.evaluate('''() => {
    const storage=new Map();
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  }''')
  page.evaluate('(data) => {window.siteI18n={t:k=>data[k]||k};}',messages[lang])
  # Module retains its real imports (using a data URL for the local ESM dependency).
  page.add_script_tag(content=script,type='module')
  page.wait_for_function("() => !!document.getElementById('systemsLaunch').onclick || document.getElementById('systemsHistoryCount').textContent === '0/24'",timeout=5000)
  page.locator('#systemsLaunch').click()
  assert page.locator('#systemsPanel').is_visible()
  assert page.locator('#systemsClose').evaluate('(x)=>document.activeElement===x')
  fixtures=[{'name':'before.json','mimeType':'application/json','buffer':json.dumps(fixture(1,0,1)).encode()},{'name':'after.json','mimeType':'application/json','buffer':json.dumps(fixture(2,0,0)).encode()}]
  page.locator('#systemsFiles').set_input_files(fixtures)
  page.wait_for_function("() => document.getElementById('systemsHistoryCount').textContent === '2/24'",timeout=5000)
  assert 'SENSITIVE CONTENT' not in page.locator('#systemsPanel').inner_text()
  page.locator('#systemsCompare').click()
  assert page.locator('#systemsExport').is_enabled()
  assert page.locator('#systemsResult tbody tr').count()>0
  with page.expect_download() as dl:page.locator('#systemsExport').click()
  assert dl.value.suggested_filename=='systems-comparison-v32-1.json'
  page.locator('#systemsSave').click()
  assert page.evaluate("localStorage.getItem('mk-systems-history-v32-1') !== null")
  page.keyboard.press('Escape');assert not page.locator('#systemsPanel').is_visible()
  page.locator('#systemsLaunch').click()
  page.once('dialog',lambda d:d.accept());page.locator('#systemsClear').click()
  assert page.locator('#systemsHistoryCount').inner_text()=='0/24'
  assert page.evaluate("localStorage.getItem('mk-systems-history-v32-1') === null")
  # The same bridge used by TrustOps, RepoVerity and Automation after an explicit click.
  page.evaluate('(report) => document.dispatchEvent(new CustomEvent("systems:import",{detail:{report}}))',fixture(1,0,0))
  page.wait_for_function("() => document.getElementById('systemsHistoryCount').textContent === '1/24'",timeout=5000)
  assert page.evaluate("localStorage.getItem('mk-systems-history-v32-1') === null"), 'Direct transfer must not persist without consent'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'overflow {width} {lang}'
  page.screenshot(path=str(ROOT.parent/f'v32-1-systems-{width}-{lang}.png'))
  assert not errors, errors
  page.close()
 browser.close()
print('V32.1 BROWSER INLINE PASS | desktop/mobile/Arabic RTL | upload/compare/export | explicit save/clear | no XSS | no overflow')
