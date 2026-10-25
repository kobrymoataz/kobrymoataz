#!/usr/bin/env python3
"""V29 offline Chromium verification, via injected local assets and mock public metadata.
Honest scope: no live HTTPS, no Safari or real GPU certification.
"""
import asyncio,json,re,base64,mimetypes
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs';PREV=ROOT/'previews';PREV.mkdir(exist_ok=True)

def content():
    s=(DOCS/'index.html').read_text(encoding='utf8')
    s=re.sub(r'<script\b[^>]+src="[^"]+"[^>]*></script>','',s)
    s=re.sub(r'<link\b[^>]+rel="stylesheet"[^>]*>','',s)
    def inline_img(m):
        raw=m.group(1);path=raw.removeprefix('./');file=DOCS/path
        if not file.is_file():return m.group(0)
        mt=mimetypes.guess_type(path)[0] or 'application/octet-stream'
        return 'src="data:'+mt+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')+'"'
    return re.sub(r'src="(\./assets/[^\"]+)"',inline_img,s)

async def prepare(page,force_no_webgl=False):
    await page.set_content(content(),wait_until='domcontentloaded')
    for sheet in ['styles.css','studio.css','studio-flow.css','perspective.css']:
        await page.add_style_tag(content=(DOCS/sheet).read_text())
    texture=(DOCS/'assets/img/earth-texture.webp').read_bytes()
    uri='data:image/webp;base64,'+base64.b64encode(texture).decode('ascii')
    await page.evaluate('''args => {
       window.__V21_EARTH_PREVIEW_DATA_URL=args.uri;
       window.fetch=async url=>{const n=String(url).split('/').at(-1);return {ok:true,json:async()=>({full_name:'kobrymoataz/'+n,stargazers_count:{repoverity:19,submissionledger:6,flowfault:3}[n]||0,updated_at:'2026-10-22T12:00:00Z'})}};
       if(args.noWebgl){const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){if(['webgl','webgl2','experimental-webgl'].includes(type))return null;return orig.call(this,type,...rest)}}
    }''',{'uri':uri,'noWebgl':force_no_webgl})
    for script in ['i18n.js','app.js','globe.js','perspective.js']:
        await page.add_script_tag(content=(DOCS/script).read_text())
    await page.evaluate('window.siteI18n.change("en")')

async def main():
    report={'environment':'Offline about:blank, self-hosted scripts and images injected, public GitHub response mocked; software Chromium','tests':{},'viewports':{},'javascript_errors':[],'limits':['No live HTTPS/IndexedDB reload test','No Safari or hardware GPU certification','GitHub API metadata is mocked in browser QA']}
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=await browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        page.on('pageerror',lambda err:report['javascript_errors'].append(str(err)))
        await prepare(page)
        assert await page.locator('#atlasPins button').count()==4
        assert await page.locator('#atlasNetwork path').count()==2
        initial=await page.locator('.globe-stage').get_attribute('data-renderer')
        report['tests']['globe_renderer']=initial or 'none'
        await page.locator('[data-perspective-mode="atlas"]').click()
        assert await page.locator('.globe-stage').get_attribute('data-mode')=='atlas'
        report['tests']['atlas_mode']='passed'
        await page.locator('.atlas-pin[data-place="rabat"]').click()
        assert (await page.locator('#placeTitle').inner_text())=='Rabat'
        assert '34.0209' in (await page.locator('#placeCoordinates').inner_text())
        report['tests']['location_selection_and_real_coordinates']='passed'
        await page.locator('#globeConnections').click()
        assert await page.locator('#atlasNetwork path').count()==0
        await page.locator('#globeConnections').click()
        assert await page.locator('#atlasNetwork path').count()==2
        report['tests']['conceptual_connections_switch']='passed'
        # 3D renders only if SwiftShader accepted the WebGL context.
        if initial=='webgl':
            await page.locator('[data-perspective-mode="earth"]').click()
            await page.locator('#perspective').scroll_into_view_if_needed()
            a=await page.locator('.globe-stage').get_attribute('data-yaw')
            await page.wait_for_timeout(1050)
            b=await page.locator('.globe-stage').get_attribute('data-yaw')
            assert a!=b,('3D did not rotate',a,b)
            await page.locator('#globeLighting').click()
            assert await page.locator('#globeLighting').get_attribute('aria-pressed')=='true'
            await page.locator('#globeMotionToggle').click()
            assert await page.locator('#globeMotionToggle').get_attribute('aria-pressed')=='false'
            report['tests']['webgl_software_rotation_lighting_pause']='passed'
            await page.locator('#perspective').screenshot(path=str(PREV/'v29-earth-desktop.png'))
        else:
            report['tests']['webgl_software_rotation_lighting_pause']='not available in this browser'
        await page.locator('[data-perspective-mode="atlas"]').click()
        await page.locator('#perspective').screenshot(path=str(PREV/'v29-atlas-desktop.png'))
        await page.locator('#repoEvidence').scroll_into_view_if_needed()
        await page.wait_for_function('document.querySelector("[data-repo=repoverity] [data-repo-meta]").textContent.includes("19")',timeout=8000)
        assert '6' in await page.locator('[data-repo="submissionledger"] [data-repo-meta]').inner_text()
        report['tests']['public_repo_evidence_with_mock']='passed'
        await page.evaluate('window.siteI18n.change("ar")')
        assert await page.locator('html').get_attribute('dir')=='rtl'
        await page.locator('.atlas-pin[data-place="ciudad-real"]').click()
        assert 'دراسة' in await page.locator('#placeNarrative').inner_text()
        report['tests']['arabic_atlas_dossier']='passed'
        for width in [360,390,640,768,1024,1440]:
            await page.set_viewport_size({'width':width,'height':900})
            await page.wait_for_timeout(95)
            sw=await page.evaluate('({sw:document.documentElement.scrollWidth,iw:innerWidth})')
            report['viewports'][str(width)]=sw
            assert sw['sw']<=sw['iw']+2,(width,sw)
        report['tests']['responsive_no_horizontal_overflow']='passed: 6 widths'
        await page.evaluate('window.siteI18n.change("en")')
        await page.set_viewport_size({'width':390,'height':844})
        await page.locator('#perspective').screenshot(path=str(PREV/'v29-atlas-mobile.png'))
        await page.locator('#top').screenshot(path=str(PREV/'v29-hero-mobile.png'))
        await page.set_viewport_size({'width':1440,'height':900})
        await page.locator('#top').screenshot(path=str(PREV/'v29-hero-desktop.png'))
        # New tab, force WebGL error to prove atlas works without the 3D runtime.
        no_gpu=await browser.new_page(viewport={'width':900,'height':800})
        no_gpu.on('pageerror',lambda err:report['javascript_errors'].append(str(err)))
        await prepare(no_gpu,force_no_webgl=True)
        assert await no_gpu.locator('.globe-stage').get_attribute('data-mode')=='atlas'
        await no_gpu.locator('.atlas-pin[data-place="brussels"]').click()
        assert 'Brussels' in await no_gpu.locator('#placeTitle').inner_text()
        report['tests']['missing_webgl_interactive_fallback']='passed'
        assert not report['javascript_errors'],report['javascript_errors']
        report['tests']['no_uncaught_js_errors']='passed'
        await browser.close()
    (ROOT/'QA_BROWSER_V29.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
    print(json.dumps(report,indent=2,ensure_ascii=False))

if __name__=='__main__':asyncio.run(main())
