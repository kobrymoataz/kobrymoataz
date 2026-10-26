#!/usr/bin/env python3
"""Offline Chromium UI smoke tests; inline document because local HTTP is policy-blocked."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re

ROOT=Path(__file__).resolve().parents[1]
site=ROOT/'docs'
html=(site/'index.html').read_text()
start=html.index('<section id="automationStudio"')
end=html.index('<section id="engineeringStudio"',start)
fragment=html[start:end]
page_html='<html lang="en"><head><meta charset="utf-8"><style>body{margin:0;background:#0b1218;color:#fafafa}'+(site/'automation.css').read_text()+'</style></head><body><button type="button" id="automationLaunch">Launch automation</button><div id="backgroundProbe"><a href="#">Other page content</a></div>'+fragment+'</body></html>'
core=re.sub(r'^export\s+','',(site/'automation-core.mjs').read_text(),flags=re.M)
ui=(site/'automation.js').read_text().split('\n',1)[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in [(1440,900),(390,844)]:
        context=browser.new_context(viewport={'width':width,'height':height},accept_downloads=True)
        page=context.new_page();errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(page_html,wait_until='domcontentloaded')
        page.add_script_tag(content=core)
        page.add_script_tag(content=ui)
        page.locator('#automationLaunch').click()
        assert page.locator('#automationStudio').is_visible()
        assert page.locator('#backgroundProbe').evaluate('(x)=>x.inert')
        page.locator('#automationSample').click()
        assert page.locator('#autoStatNodes').inner_text()=='3'
        page.locator('#autoNodeSearch').fill('http')
        assert page.locator('#autoNodeList button').count()==1
        page.locator('#autoNodeList button').first.click()
        assert page.locator('#autoNodeName').is_visible()
        page.locator('#autoRetry').check()
        page.locator('#automationNodeForm button[type=submit]').click()
        assert page.locator('#automationUndo').is_enabled()
        page.locator('#automationUndo').click()
        assert page.locator('#automationRedo').is_enabled()
        page.locator('#automationRedo').click()
        # Invalid replacement requests must not erase the original analysis.
        page.locator('#automationPaste').fill('{INVALID')
        page.locator('#automationAnalyze').click()
        assert page.locator('#autoStatNodes').inner_text()=='3'
        # Native prompt blocks closing unless user accepts when changes are pending.
        page.once('dialog',lambda dialog:dialog.dismiss())
        page.locator('#automationClose').click()
        assert page.locator('#automationStudio').is_visible()
        page.once('dialog',lambda dialog:dialog.accept())
        page.locator('#automationClose').click()
        assert page.locator('#automationStudio').is_hidden()
        assert not page.locator('#backgroundProbe').evaluate('(x)=>x.inert')
        page.locator('#automationLaunch').click()
        assert page.locator('#automationStudio').is_visible()
        with page.expect_download() as info:page.locator('#automationExportWorkflow').click()
        assert info.value.suggested_filename.endswith('-v31-1.json')
        page.locator('#automationClose').click()
        assert page.locator('#automationStudio').is_hidden()
        page.evaluate("document.documentElement.lang='ar';document.documentElement.dir='rtl';document.dispatchEvent(new Event('portfolio:locale'))")
        page.locator('#automationLaunch').click()
        assert page.locator('#automationStudio').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),'horizontal overflow'
        assert not errors,errors
        context.close()
        print(f'PASS Chromium inline {width}x{height}: functional search/edit/undo/redo, discard guard, export, focus isolation and RTL sizing')
    browser.close()
