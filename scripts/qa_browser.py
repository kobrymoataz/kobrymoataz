#!/usr/bin/env python3
"""Chromium smoke checks for the V26 browser-local engineering workstation."""
import asyncio, threading, json, sys
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'

async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0), partial(SimpleHTTPRequestHandler,directory=str(DOCS)))
    t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
    url=f'http://127.0.0.1:{server.server_port}/'
    report={'url':'local test server','tests':{},'viewports':{},'js_errors':[]}
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
            ctx=await browser.new_context(viewport={'width':1280,'height':900})
            page=await ctx.new_page()
            page.on('pageerror',lambda error:report['js_errors'].append(str(error)))
            await page.goto(url,wait_until='domcontentloaded',timeout=30000)
            await page.wait_for_selector('#wsFileList .ws-file',timeout=25000)
            assert (await page.locator('#wsFileList .ws-file').count())>=5
            report['tests']['initial_workspace']='passed'
            await page.locator('#wsEditor').fill('{"service":"test","retryLimit":0,"latencyMs":90,"simulateDeliveryFailureOnce":true,"requireHumanReview":false,"requireReference":true}')
            await page.locator('#wsSave').click()
            await page.locator('#termInput').fill('git status')
            await page.locator('#termInput').press('Enter')
            assert 'modified: config.json' in (await page.locator('#termOutput').inner_text())
            report['tests']['edit_changes_git_status']='passed'
            await page.locator('#termInput').fill('git add .')
            await page.locator('#termInput').press('Enter')
            await page.locator('#termInput').fill('git commit -m "Config adjusted"')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_timeout(350)
            assert 'Config adjusted' in (await page.locator('#wsCommits').inner_text())
            report['tests']['snapshot_commit']='passed'
            await page.reload(wait_until='domcontentloaded')
            await page.wait_for_selector('#wsFileList .ws-file')
            assert 'Config adjusted' in (await page.locator('#wsCommits').inner_text())
            assert json.loads(await page.locator('#wsEditor').input_value())['retryLimit'] == 0
            report['tests']['indexeddb_reload_persistence']='passed'
            # need set retryLimit 0 + failure true -> workflow job fails
            await page.locator('#termInput').fill('workflow run retry')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_function("document.querySelector('#wsFailed').textContent==='1'",timeout=12000)
            assert 'Retry limit reached' in (await page.locator('#termOutput').inner_text())
            report['tests']['workflow_failure_from_saved_config']='passed'
            # Fix cfg to allow retry
            await page.locator('#wsEditor').fill('{"service":"test","retryLimit":2,"latencyMs":90,"simulateDeliveryFailureOnce":true,"requireHumanReview":false,"requireReference":true}')
            await page.locator('#wsSave').click()
            await page.locator('#termInput').fill('workflow run retry')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_function("document.querySelector('#wsDelivered').textContent==='1'",timeout=12000)
            report['tests']['workflow_retry_success']='passed'
            await page.locator('#termInput').fill('workflow run review')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_function("document.querySelector('#wsJobList').textContent.includes('REVIEW')",timeout=12000)
            await page.locator('#termInput').fill('approve')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_function("document.querySelector('#wsDelivered').textContent==='2'",timeout=12000)
            report['tests']['workflow_human_review']='passed'
            await page.locator('#tabLinux').click()
            assert 'dev@ubuntu' in await page.locator('#terminalPrompt').inner_text()
            await page.locator('#tabMac').click()
            assert 'moataz@portfolio' in await page.locator('#terminalPrompt').inner_text()
            report['tests']['shell_ui_switch']='passed'
            # local file edits via command
            await page.locator('#termInput').fill('write notes.txt hello-persistent-world')
            await page.locator('#termInput').press('Enter')
            await page.wait_for_timeout(200)
            assert 'notes.txt' in await page.locator('#wsFileList').inner_text()
            report['tests']['working_file_commands']='passed'
            # selected locale must preserve controls and RTL
            await page.locator('[data-lang="ar"]').first.click()
            assert await page.locator('html').get_attribute('dir') == 'rtl'
            assert await page.locator('#wsEditor').is_visible()
            report['tests']['arabic_rtl']='passed'
            for width in [360,390,650,768,1024,1440]:
                await page.set_viewport_size({'width':width,'height':900})
                await page.wait_for_timeout(130)
                size=await page.evaluate('({sw:document.documentElement.scrollWidth,iw:window.innerWidth})')
                report['viewports'][str(width)]={'scrollWidth':size['sw'],'innerWidth':size['iw'],'pass':size['sw']<=size['iw']+2}
                assert report['viewports'][str(width)]['pass'],f'horizontal overflow at {width} {size}'
            await page.set_viewport_size({'width':1440,'height':950})
            await page.locator('[data-lang="en"]').first.click()
            await page.screenshot(path=str(ROOT/'previews/v26-hero.png'),full_page=False)
            await page.locator('#lab').scroll_into_view_if_needed()
            await page.screenshot(path=str(ROOT/'previews/v26-lab.png'),full_page=False)
            await page.locator('#workstation').scroll_into_view_if_needed()
            await page.screenshot(path=str(ROOT/'previews/v26-workstation.png'),full_page=False)
            await page.set_viewport_size({'width':390,'height':844})
            await page.locator('#workstation').scroll_into_view_if_needed()
            await page.screenshot(path=str(ROOT/'previews/v26-mobile-workstation.png'),full_page=False)
            report['tests']['screenshots']='passed'
            await browser.close()
    finally:server.shutdown()
    report_file=ROOT/'QA_BROWSER_RESULTS.json';report_file.write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    try:asyncio.run(main())
    except Exception as e:
        import traceback;traceback.print_exc();sys.exit(1)
