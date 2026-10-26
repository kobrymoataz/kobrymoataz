"""Offline DOM and interaction smoke tests (Chromium set_content, no URL navigation)."""
import asyncio, re, json, mimetypes, base64, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];docs=ROOT/'docs'

def inline():
 s=(docs/'index.html').read_text()
 s=s.replace('<link rel="stylesheet" href="./styles.css">','<style>'+ (docs/'styles.css').read_text()+'</style>')
 s=re.sub(r'<script src="(https?://[^\"]+)"[^>]*></script>','',s)
 def script(m):
  f=(docs/m.group(1)).resolve()
  if not f.is_relative_to(docs):return ''
  return '<script>'+f.read_text()+'</script>'
 s=re.sub(r'<script src="(\./[^\"]+\.js)"[^>]*></script>',script,s)
 def asset(m):
  path=m.group(2)
  f=(docs/path).resolve()
  if f.is_file() and f.is_relative_to(docs):
   mt=mimetypes.guess_type(path)[0] or 'application/octet-stream'
   return m.group(1)+'data:'+mt+';base64,'+base64.b64encode(f.read_bytes()).decode()+'"'
  return m.group(0)
 s=re.sub(r'(src=")((?:\./)?assets/[^\"]+)"',asset,s)
 return s
async def run():
 report={'tests':{},'viewport':{},'pageErrors':[]};html=inline()
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
  page=await browser.new_page(viewport={'width':1440,'height':920})
  page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
  await page.set_content(html,wait_until='domcontentloaded',timeout=30000)
  await page.wait_for_selector('#wsFileList .ws-file',timeout=15000)
  assert await page.locator('#wsFileList .ws-file').count()>=5
  report['tests']['workspace_boots']='passed'
  await page.locator('#wsEditor').fill('{"service":"test","retryLimit":0,"latencyMs":90,"simulateDeliveryFailureOnce":true,"requireHumanReview":false,"requireReference":true}')
  await page.locator('#wsSave').click()
  async def cmd(command):
   await page.locator('#termInput').fill(command)
   await page.locator('#termInput').press('Enter')
   await page.wait_for_timeout(180)
  await cmd('git status')
  assert 'modified: config.json' in await page.locator('#termOutput').inner_text()
  report['tests']['git_status_reflects_edits']='passed'
  await cmd('git add .');await cmd('git commit -m "Config adjusted"')
  await page.wait_for_timeout(500)
  assert 'Config adjusted' in await page.locator('#wsCommits').inner_text()
  report['tests']['local_snapshot_commit']='passed'
  await cmd('workflow run retry')
  await page.wait_for_function("document.querySelector('#wsFailed').textContent==='1'",timeout=15000)
  assert 'Retry limit reached' in await page.locator('#termOutput').inner_text()
  report['tests']['config_driven_failure']='passed'
  await page.locator('#wsEditor').fill('{"service":"test","retryLimit":2,"latencyMs":90,"simulateDeliveryFailureOnce":true,"requireHumanReview":false,"requireReference":true}')
  await page.locator('#wsSave').click()
  await cmd('workflow run retry')
  await page.wait_for_function("document.querySelector('#wsDelivered').textContent==='1'",timeout=15000)
  report['tests']['retries_succeed_after_config_change']='passed'
  await cmd('workflow run review')
  await page.wait_for_function("document.querySelector('#wsJobList').textContent.includes('REVIEW')",timeout=15000)
  await cmd('approve')
  await page.wait_for_function("document.querySelector('#wsDelivered').textContent==='2'",timeout=15000)
  report['tests']['human_review_approval']='passed'
  await cmd('write notes.txt new-content')
  assert 'notes.txt' in await page.locator('#wsFileList').inner_text()
  report['tests']['terminal_writes_file']='passed'
  await page.locator('#tabLinux').click();assert 'dev@ubuntu' in await page.locator('#terminalPrompt').inner_text()
  await page.locator('#tabMac').click();assert 'moataz' in await page.locator('#terminalPrompt').inner_text()
  report['tests']['mac_linux_themes']='passed'
  await page.locator('[data-lang="ar"]').first.click();assert await page.locator('html').get_attribute('dir')=='rtl';report['tests']['rtl_language']='passed'
  for width in [360,390,650,768,1024,1440]:
   await page.set_viewport_size({'width':width,'height':900})
   await page.wait_for_timeout(100)
   value=await page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
   report['viewport'][width]=value
   assert value['scroll']<=value['width']+2, f'Horizontal overflow {width} {value}'
  await page.set_viewport_size({'width':1440,'height':950})
  await page.locator('[data-lang="en"]').first.click()
  await page.screenshot(path=str(ROOT/'previews/v26-hero.png'))
  await page.locator('#lab').scroll_into_view_if_needed()
  await page.screenshot(path=str(ROOT/'previews/v26-terminal.png'))
  await page.locator('#workstation').scroll_into_view_if_needed()
  await page.screenshot(path=str(ROOT/'previews/v26-workstation.png'))
  await page.set_viewport_size({'width':390,'height':844})
  await page.locator('#workstation').scroll_into_view_if_needed()
  await page.screenshot(path=str(ROOT/'previews/v26-mobile.png'))
  assert not report['pageErrors'],report['pageErrors']
  report['tests']['no_javascript_errors']='passed'
  await browser.close()
 (ROOT/'QA_BROWSER_RESULTS.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))

if __name__=='__main__':
 try:asyncio.run(run())
 except Exception as e:
  import traceback;traceback.print_exc();sys.exit(1)
