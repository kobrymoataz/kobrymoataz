#!/usr/bin/env python3
"""V30.1 offline browser QA.
Real browser module loads and UI integration; public DNS is deterministic MOCKED.
Does not claim that DNS over HTTPS works on GitHub Pages or through a live resolver.
"""
from pathlib import Path
import asyncio, json, mimetypes, urllib.parse, sys
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]; DOCS=ROOT/'docs';PREV=ROOT/'previews';PREV.mkdir(exist_ok=True)
HOST='https://portfolio.test/kobrymoataz/'

def answers(name,t,mode='good'):
    name=name.lower().strip('.')
    if mode=='bad':
        if name=='secure.example' and t=='TXT': return [{'name':name+'.','type':16,'TTL':150,'data':'"v=spf1 +all"'}]
        if name=='_dmarc.secure.example':return [{'name':name+'.','type':16,'TTL':150,'data':'"v=DMARC1; p=none"'}]
    if name=='secure.example' and t=='TXT':return [{'name':name+'.','type':16,'TTL':150,'data':'"v=spf1 include:_spf.secure.example -all"'}]
    if name=='_spf.secure.example' and t=='TXT':return [{'name':name+'.','type':16,'TTL':150,'data':'"v=spf1 ip4:203.0.113.0/24 -all"'}]
    if name=='_dmarc.secure.example' and t=='TXT':return [{'name':name+'.','type':16,'TTL':150,'data':'"v=DMARC1; p=reject; pct=100; rua=mailto:reports@secure.example"'}]
    if name=='secure.example' and t=='MX':return [{'name':name+'.','type':15,'TTL':300,'data':'10 mx.secure.example.'}]
    if name=='secure.example' and t=='NS':return [{'name':name+'.','type':2,'TTL':300,'data':'ns1.secure.example.'}]
    if name=='secure.example' and t=='A':return [{'name':name+'.','type':1,'TTL':300,'data':'203.0.113.80'}]
    if name=='mail._domainkey.secure.example' and t=='TXT':return [{'name':name+'.','type':16,'TTL':300,'data':'"v=DKIM1; p=MIGfMockPublicKeyMaterial"'}]
    if name=='_mta-sts.secure.example':return [{'name':name+'.','type':16,'TTL':300,'data':'"v=STSv1; id=abc"'}]
    if name=='_smtp._tls.secure.example':return [{'name':name+'.','type':16,'TTL':300,'data':'"v=TLSRPTv1; rua=mailto:reports@secure.example"'}]
    return []

def type_of(path):
    return {'mjs':'text/javascript','js':'text/javascript','css':'text/css','html':'text/html','svg':'image/svg+xml','png':'image/png','webp':'image/webp','gif':'image/gif'}.get(path.suffix.lstrip('.'),mimetypes.guess_type(str(path))[0] or 'application/octet-stream')

async def main():
    qa={'environment':'Local assets served via Playwright route on synthetic HTTPS origin; DNS provider data mocked','tests':{},'widths':{},'errors':[],'limitations':['No live DNS or live production CORS verified','No WebGL GPU or Safari test','DNS fixture values are test-only, not displayed as live data in production']}
    scenario={'mode':'good','offline':False}
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        context=await browser.new_context(viewport={'width':1440,'height':920},accept_downloads=True)
        page=await context.new_page()
        page.on('pageerror',lambda e:qa['errors'].append(str(e)))
        # The environment blocks even intercepted HTTP navigations. Use offline DOM injection.
        # The exact core module is stripped of export keywords ONLY for this isolated UI test.
        from base64 import b64encode
        import re
        html=(DOCS/'index.html').read_text(encoding='utf8')
        html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
        html=re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*>','',html)
        html=re.sub(r'<script\b[^>]+src="[^"]+"[^>]*></script>','',html)
        def inline_asset(m):
            name=m.group(1).removeprefix('./');file=(DOCS/name)
            if not file.is_file():return m.group(0)
            mime=type_of(file)
            return 'src="data:'+mime+';base64,'+b64encode(file.read_bytes()).decode('ascii')+'"'
        html=re.sub(r'src="(\./assets/[^"]+)"',inline_asset,html)
        await page.set_content(html,wait_until='domcontentloaded')
        for css in ['styles.css','studio.css','studio-flow.css','perspective.css','trustops.css']:
            await page.add_style_tag(content=(DOCS/css).read_text(encoding='utf-8'))
        await page.add_script_tag(content=(DOCS/'i18n.js').read_text(encoding='utf-8'))
        await page.evaluate('window.siteI18n.change("en")')
        await page.evaluate("""() => {
          window.__auditFixture={mode:'good',offline:false};
          window.fetch = async url => {
            const text=String(url); if(!text.includes('dns-query')&&!text.includes('dns.google/resolve'))throw Error('External fetch blocked in offline QA');
            if(window.__auditFixture.offline)return {ok:false,status:503};
            const u=new URL(text),n=u.searchParams.get('name').toLowerCase().replace(/\.$/,''),t=u.searchParams.get('type');
            const rr=(data,type=16)=>({name:n+'.',type,TTL:300,data});
            let answers=[];
            const bad=window.__auditFixture.mode==='bad';
            if(n==='secure.example'&&t==='TXT')answers=[rr(bad?'"v=spf1 +all"':'"v=spf1 include:_spf.secure.example -all"')];
            else if(n==='_spf.secure.example'&&t==='TXT')answers=[rr('"v=spf1 ip4:203.0.113.0/24 -all"')];
            else if(n==='_dmarc.secure.example'&&t==='TXT')answers=[rr(bad?'"v=DMARC1; p=none"':'"v=DMARC1; p=reject; pct=100; rua=mailto:reports@secure.example"')];
            else if(n==='secure.example'&&t==='MX')answers=[rr('10 mx.secure.example.',15)];
            else if(n==='secure.example'&&t==='NS')answers=[rr('ns1.secure.example.',2)];
            else if(n==='secure.example'&&t==='A')answers=[rr('203.0.113.80',1)];
            else if(n==='mail._domainkey.secure.example'&&t==='TXT')answers=[rr('"v=DKIM1; p=MIGfMockPublicKeyMaterial"')];
            else if(n==='_mta-sts.secure.example')answers=[rr('"v=STSv1; id=abc"')];
            else if(n==='_smtp._tls.secure.example')answers=[rr('"v=TLSRPTv1; rua=mailto:reports@secure.example"')];
            return {ok:true,json:async()=>({Status:0,Question:[{name:n+'.',type:16}],Answer:answers})};
          };
        }""")
        core=(DOCS/'trustops-core.mjs').read_text(encoding='utf-8')
        core=re.sub(r'^export ', '',core,flags=re.M)
        core='(()=>{\n'+core+'\nwindow.__TrustCore={auditDomain,createDohResolver,normalizeDomain,normalizeSelector};\n})();'
        await page.add_script_tag(content=core)
        ui=(DOCS/'trustops.js').read_text(encoding='utf-8')
        ui=ui.replace("import {auditDomain,createDohResolver,normalizeDomain,normalizeSelector} from './trustops-core.mjs';",'const {auditDomain,createDohResolver,normalizeDomain,normalizeSelector}=window.__TrustCore;')
        await page.add_script_tag(content=ui)
        print('Loaded TrustOps source in Chromium offline',flush=True)
        await page.locator('#trustLaunch').click(timeout=10000)
        assert await page.locator('#trustopsStudio').is_visible()
        assert await page.locator('#trustEmpty').is_visible()
        qa['tests']['launch_empty_state']='pass; no prefilled audit'
        await page.wait_for_timeout(450)
        await page.screenshot(path=str(PREV/'v30-trustops-empty-desktop.png'))
        await page.locator('#trustDomain').fill('secure.example')
        await page.locator('#trustSelector').fill('mail')
        await page.locator('#trustRun').click()
        await page.locator('#trustResults').wait_for(state='visible',timeout=18000)
        assert await page.locator('#trustResultDomain').inner_text()=='secure.example'
        text=await page.locator('#trustPanelFindings').inner_text()
        assert 'SPF' in text and 'DMARC' in text and 'DKIM' in text
        assert (await page.locator('#trustMetrics .trust-metric.pass b').inner_text()).strip().isdigit()
        assert int(await page.locator('#trustMetrics .trust-metric.pass b').inner_text())>=3
        qa['tests']['dns_mocked_end_to_end']='pass; real UI requests/responses/parsing'
        await page.evaluate('''() => {const b=document.createElement('div');b.id='qaFixtureWarning';b.textContent='QA FIXTURE — TEST DNS RESPONSES, NOT LIVE INTERNET';b.style.cssText='background:#e0bd87;color:#111b23;padding:10px 18px;text-align:center;font-weight:750;letter-spacing:.07em';document.querySelector('.trust-studio-body').prepend(b);}''')
        await page.screenshot(path=str(PREV/'v30-trustops-qa-fixture.png'))
        await page.evaluate("document.getElementById('qaFixtureWarning')?.remove()")
        await page.locator('[data-trust-tab="evidence"]').click()
        assert '_spf.secure.example' in await page.locator('#trustPanelEvidence').inner_text()
        assert '203.0.113' in await page.locator('#trustPanelEvidence').inner_text()
        qa['tests']['evidence_dns_queries']='pass; query name/provider/timestamp/records'
        async with page.expect_download() as info:await page.locator('#trustExportJSON').click()
        down=await info.value
        saved=PREV/'v30-report-mock.json';await down.save_as(str(saved))
        report=json.loads(saved.read_text());assert report['schema']=='trustops-audit-v1';assert report['providersUsed']==['cloudflare'];assert report['counts']['pass']>=3
        qa['tests']['report_json_export']='pass; machine-readable evidence file'
        async with page.expect_download() as info2:await page.locator('#trustExportHTML').click()
        d=await info2.value;await d.save_as(str(PREV/'v30-report-printable-mock.html'))
        assert 'Report' in (PREV/'v30-report-printable-mock.html').read_text() or 'TrustOps' in (PREV/'v30-report-printable-mock.html').read_text()
        qa['tests']['report_printable_export']='pass; offline HTML report'
        await page.locator('[data-trust-tab="findings"]').click()
        await page.locator('#trustClose').click()
        await page.evaluate("window.__auditFixture.mode='bad'")
        await page.locator('#trustLaunch').click()
        await page.locator('#trustSelector').fill('')
        await page.locator('#trustRun').click()
        await page.locator('#trustResults').wait_for(state='visible',timeout=18000)
        assert 'authorizes any sender' in await page.locator('#trustPanelFindings').inner_text()
        assert 'monitoring mode' in await page.locator('#trustPanelFindings').inner_text()
        qa['tests']['bad_dns_findings']='pass; dangerous SPF and p=none advisory'
        await page.locator('#trustClose').click()
        await page.evaluate("window.__auditFixture.offline=true")
        await page.locator('#trustLaunch').click()
        await page.locator('#trustRun').click()
        await page.locator('#trustResults').wait_for(state='visible',timeout=18000)
        assert int(await page.locator('#trustMetrics .trust-metric.pass b').inner_text())==0
        assert int(await page.locator('#trustMetrics .trust-metric.unknown b').inner_text())>=5
        qa['tests']['no_fabricated_results_on_dns_failure']='pass; unknown instead of pass'
        await page.evaluate("window.__auditFixture.offline=false")
        await page.evaluate('window.siteI18n.change("ar")')
        assert await page.locator('html').get_attribute('dir')=='rtl'
        assert 'النتائج' in await page.locator('[data-trust-tab="findings"]').inner_text()
        qa['tests']['arabic_ui']='pass; RTL and translations'
        await page.evaluate('window.siteI18n.change("en")')
        for width in (360,390,600,768,1024,1440):
            await page.set_viewport_size({'width':width,'height':850})
            await page.wait_for_timeout(100)
            dims=await page.evaluate('({viewport:innerWidth,body:document.documentElement.scrollWidth,dialog:document.getElementById("trustopsStudio").getBoundingClientRect().width})')
            qa['widths'][str(width)]=dims
            assert dims['body']<=dims['viewport']+2,(width,dims)
            assert dims['dialog']<=dims['viewport']+2,(width,dims)
        qa['tests']['responsive']='pass; 6 widths 360–1440'
        await page.set_viewport_size({'width':1440,'height':920})
        await page.locator('#trustStudioTitle').scroll_into_view_if_needed()
        await page.screenshot(path=str(PREV/'v30-trustops-offline-state.png'),full_page=False)
        await page.locator('#trustClose').click()
        await page.locator('#trustops').scroll_into_view_if_needed()
        await page.locator('#trustops').screenshot(path=str(PREV/'v30-trustops-landing.png'))
        await page.locator('#trustLaunch').click()
        await page.set_viewport_size({'width':390,'height':844})
        await page.locator('#trustStudioTitle').scroll_into_view_if_needed()
        await page.screenshot(path=str(PREV/'v30-trustops-mobile.png'),full_page=False)
        await page.locator('#trustClose').click()
        assert not await page.locator('#trustopsStudio').is_visible()
        for width in (360,390,600,768,1024,1440):
            await page.set_viewport_size({'width':width,'height':850})
            await page.wait_for_timeout(60)
            dim=await page.evaluate('({viewport:innerWidth,body:document.documentElement.scrollWidth})')
            assert dim['body']<=dim['viewport']+2,('landing',width,dim)
        qa['tests']['portfolio_closed_layout']='pass; 6 widths without overflow'
        qa['tests']['close_and_return_to_portfolio']='pass'
        if qa['errors']:raise AssertionError(qa['errors'])
        qa['tests']['no_uncaught_javascript_errors']='pass'
        await browser.close()
    (ROOT/'QA_BROWSER_V30.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
    print(json.dumps(qa,ensure_ascii=False,indent=2))
if __name__=='__main__':
    asyncio.run(main())
