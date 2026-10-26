#!/usr/bin/env python3
"""Local Chromium smoke test of V31.2 integrated controls. No network access."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
site=root/'docs'
html=(site/'index.html').read_text()
fragment=html[html.index('<section id="automationStudio"'):html.index('<section id="engineeringStudio"')]
page_html='<html lang="en"><head><meta charset="utf-8"><style>body{margin:0;background:#0b1218;color:#fafafa}'+(site/'automation.css').read_text()+'</style></head><body><button id="automationLaunch">Launch</button><div id="backgroundProbe">Background</div>'+fragment+'</body></html>'
core=re.sub(r'^export\s+','',(site/'automation-core.mjs').read_text(),flags=re.M)
security=re.sub(r'^export\s+','',(site/'security-evidence-core.mjs').read_text(),flags=re.M)
security=re.sub(r'^import\s+.*?;\s*','',security,flags=re.M)
ui=re.sub(r'^import\s+.*?;\s*','',(site/'automation.js').read_text(),flags=re.M)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  context=browser.new_context(viewport={'width':width,'height':850},accept_downloads=True)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  # This environment blocks all browser navigation; use an inline document.
  # A WebCrypto interface shim permits UI testing on an opaque about:blank origin.
  # Cryptographic SHA-256 correctness is independently tested via Node WebCrypto.
  page.set_content(page_html,wait_until='domcontentloaded')
  page.evaluate("Object.defineProperty(window.crypto,'subtle',{value:{digest:async () => new Uint8Array(32).fill(7).buffer},configurable:true})")
  page.add_script_tag(content='(function(){'+core+';Object.assign(window,{LIMITS,validateWorkflow,importWorkflow,analyzeWorkflow,updateNodeReliability,createSampleWorkflow,reportAsHtml,summarizeExecution});})();')
  page.add_script_tag(content='(function(){'+security+';Object.assign(window,{inspectSecurity,importSupplement,buildEvidencePack,evidenceHtml});})();')
  page.add_script_tag(content=ui)
  page.locator('#automationLaunch').click()
  page.locator('#automationSample').click()
  assert page.locator('#autoStatNodes').inner_text()=='3'
  assert page.locator('#autoEvidenceSection').is_visible()
  page.locator('#autoNodeSearch').fill('http')
  page.locator('#autoNodeList button').first.click()
  page.locator('#autoRetry').check()
  page.locator('#automationNodeForm button[type=submit]').click()
  page.locator('#autoEvidenceBuild').click()
  page.wait_for_function("!document.querySelector('#autoEvidenceJSON').disabled", timeout=10000)
  assert 'SHA-256' in page.locator('#autoEvidenceStatus').inner_text()
  with page.expect_download() as dl:page.locator('#autoEvidenceJSON').click()
  data=dl.value.path().read_text()
  assert 'mk-evidence-pack/v31.2' in data
  assert 'nodeReference' in data
  assert 'Send to API' not in data
  with page.expect_download() as dl:page.locator('#autoEvidenceHTML').click()
  assert dl.value.suggested_filename.endswith('.html')
  page.locator('#automationUndo').click()
  assert page.locator('#autoEvidenceJSON').is_disabled()
  assert page.locator('#autoEvidenceStatus').inner_text()
  page.evaluate("document.documentElement.lang='ar';document.documentElement.dir='rtl';document.dispatchEvent(new Event('portfolio:locale'))")
  assert page.locator('#autoEvidenceSection').is_visible()
  assert not errors,errors
  context.close()
  print(f'V31.2 Chromium PASS {width}px: local security evidence, digest UI (shim), JSON/HTML export, invalidation, RTL')
 browser.close()
