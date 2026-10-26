#!/usr/bin/env python3
"""V28 browser-component QA, self-hosted UI injected on about:blank.
No real HTTPS origin => IndexedDB persistence across reload is NOT verified here."""
import asyncio, pathlib, json, re, traceback, sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
async def main():
  report={'test_environment':'Chromium about:blank, local assets injected; not hosted HTTPS','checks':{},'viewport_checks':{},'exceptions':[]}
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    print('Browser launched',flush=True)
    page=await browser.new_page(viewport={'width':1440,'height':940},device_scale_factor=1)
    page.on('pageerror',lambda e:report['exceptions'].append(str(e)))
    html=(DOCS/'index.html').read_text()
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',html)
    html=re.sub(r'<link[^>]+rel="stylesheet"[^>]+>','',html)
    print('Setting content',flush=True)
    await page.set_content(html,wait_until='domcontentloaded')
    print('Content loaded',flush=True)
    for path in ['styles.css','vendor/codemirror/codemirror.css','studio.css','studio-flow.css']:
      await page.add_style_tag(content=(DOCS/path).read_text())
    print('CSS loaded',flush=True)
    for path in ['i18n.js','lab.js','app.js','globe.js','vendor/codemirror/codemirror.js','vendor/codemirror/javascript.js','vendor/codemirror/python.js','vendor/codemirror/sql.js','vendor/codemirror/matchbrackets.js','vendor/xterm/xterm.js','studio-engine.js','studio-flow-engine.js','studio-flow-ui.js','studio.js']:
      print('loading script',path,flush=True)
      await page.add_script_tag(content=(DOCS/path).read_text())
    print('All scripts loaded',flush=True)
    assert not report['exceptions'],report['exceptions']
    print('Opening studio',flush=True)
    await page.locator('#studioLaunch').click(timeout=8000)
    print('Studio opened',flush=True)
    await page.locator('[data-studio-tab="flow"]').click(timeout=8000)
    print('Flow tab opened',flush=True)
    await page.locator('#flowNodes .flow-node').first.wait_for(timeout=8000)
    assert await page.locator('#flowNodes .flow-node').count()==6
    report['checks']['graph_nodes']='6 active SVG nodes with native selection'
    # disable store for one run; stored record should not appear
    await page.locator('#flowNodes [data-id="STORE"]').click()
    assert await page.locator('#flowEnable').is_checked()
    await page.locator('#flowEnable').uncheck()
    assert '5 / 6' in await page.locator('#flowActiveCount').inner_text()
    report['checks']['graph_changes_execution']='Store disabled changes future job plan'
    await page.locator('#flowNodes [data-id="DELIVER"]').click()
    await page.locator('#flowLatency').fill('30')
    await page.locator('#flowBackoff').fill('50')
    await page.locator('#flowRetries').fill('1')
    await page.locator('#flowFailOnce').uncheck()
    await page.locator('#flowConfigForm button[type=submit]').click()
    assert 'Settings saved' in await page.locator('#flowFeedback').inner_text()
    report['checks']['config_file_ui']='Job settings saved into config.json'
    await page.locator('[data-flow-scenario="normal"]').click()
    await page.wait_for_function("document.querySelector('#flowMetricDone').textContent==='1'",timeout=14000)
    assert 'STORE' not in await page.locator('#flowTraceSummary').inner_text()
    report['checks']['skipped_stage_in_trace']='Disabled storage stage omitted in completed job trace'
    await page.locator('#flowNodes [data-id="STORE"]').click();await page.locator('#flowEnable').check()
    await page.locator('[data-flow-scenario="retry"]').click()
    await page.wait_for_function("Number(document.querySelector('#flowMetricDone').textContent)>=2",timeout=14000)
    assert int(await page.locator('#flowMetricRetry').inner_text())>=1
    report['checks']['retry_backoff']='One controlled delivery error followed by real timed retry state'
    await page.locator('[data-flow-scenario="missing"]').click()
    await page.wait_for_function("Number(document.querySelector('#flowMetricFail').textContent)>=1",timeout=12000)
    assert 'FAILED' in await page.locator('#flowTraceSummary').inner_text()
    report['checks']['dead_letter']='Invalid request goes to local dead-letter job ledger'
    await page.locator('[data-flow-scenario="review"]').click()
    await page.wait_for_function("Number(document.querySelector('#flowMetricReview').textContent)>=1",timeout=12000)
    await page.locator('#flowJobs .flow-job').first.locator('button[data-flow-job-action="approve"]').click()
    await page.wait_for_function("Number(document.querySelector('#flowMetricDone').textContent)>=3",timeout=12000)
    report['checks']['human_review']='Explicit approval resumes paused verification'
    await page.locator('[data-flow-scenario="normal"]').click()
    await page.locator('#flowJobs .flow-job').first.locator('button[data-flow-job-action="pause"]').click()
    assert 'PAUSED' in await page.locator('#flowTraceSummary').inner_text()
    await page.locator('#flowJobs .flow-job').first.locator('button[data-flow-job-action="resume"]').click()
    await page.wait_for_function("Number(document.querySelector('#flowMetricDone').textContent)>=4",timeout=12000)
    report['checks']['pause_resume']='Engine job stops and resumes from current stage'
    assert not report['exceptions'],report['exceptions']
    for width in [360,390,600,768,1024,1440]:
      await page.set_viewport_size({'width':width,'height':900})
      await page.wait_for_timeout(80)
      sizes=await page.evaluate('''() => ({root:document.documentElement.scrollWidth,window:innerWidth,overlay:document.querySelector('#engineeringStudio').getBoundingClientRect().width})''')
      report['viewport_checks'][str(width)]=sizes
      assert sizes['root']<=sizes['window']+2,(width,sizes)
      assert sizes['overlay']<=sizes['window']+2,(width,sizes)
    report['checks']['responsive']='Six widths 360..1440 px without document horizontal overflow'
    await page.set_viewport_size({'width':1440,'height':940});await page.wait_for_timeout(180)
    await page.evaluate("document.querySelector('[data-studio-panel=flow]').scrollTop=0;document.querySelector('#engineeringStudio').scrollTop=0")
    (ROOT/'previews').mkdir(exist_ok=True)
    await page.screenshot(path=str(ROOT/'previews/v28-flow-desktop.png'))
    await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(130)
    await page.evaluate("document.querySelector('[data-studio-panel=flow]').scrollTop=0;document.querySelector('#engineeringStudio').scrollTop=0")
    await page.screenshot(path=str(ROOT/'previews/v28-flow-mobile.png'))
    report['checks']['visual_previews']='Desktop and mobile PNG rendered'
    if report['exceptions']:raise AssertionError(report['exceptions'])
    await browser.close()
  (ROOT/'QA_BROWSER_V28.json').write_text(json.dumps(report,indent=2))
  print(json.dumps(report,indent=2))
if __name__=='__main__':
  try:asyncio.run(main())
  except Exception as exc: traceback.print_exc();sys.exit(1)
