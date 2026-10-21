from playwright.sync_api import sync_playwright
from pathlib import Path
import json, traceback, re, base64, mimetypes
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
PAGES=['','systems','work','expertise','institutional','about','contact']
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-web-security'])
    for width,height in [(1440,900),(820,1024),(390,844)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        for name in PAGES:
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            path=DOCS/('index.html' if name=='' else f'{name}/index.html')
            html=path.read_text(encoding='utf-8')
            css=(DOCS/'styles.css').read_text(encoding='utf-8')
            css=css.split('\n',1)[1]
            js=(DOCS/'site.js').read_text(encoding='utf-8')
            html=re.sub(r'<link rel="stylesheet" href="[^"]+">', '<style>'+css+'</style>', html)
            html=re.sub(r'<script defer src="https://[^"]+"></script>', '', html)
            html=re.sub(r'<script defer src="[^"]*site\.js"></script>', '<script>'+js+'</script>', html)
            def fileimg(m):
                rel=m.group(1)
                fp=(path.parent/rel).resolve()
                if not fp.is_file():return m.group(0)
                mime=mimetypes.guess_type(fp.name)[0] or 'application/octet-stream'
                data=base64.b64encode(fp.read_bytes()).decode('ascii')
                return 'src="data:'+mime+';base64,'+data+'"'
            html=re.sub(r'src="([^"]+)"',fileimg,html)
            page.set_content(html, wait_until='domcontentloaded', timeout=20000)
            page.wait_for_timeout(250)
            await_scrolling = page.evaluate('''async () => { for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.78){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,55));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,170)); }''')
            actual=page.evaluate('''() => ({width: document.documentElement.scrollWidth, viewport:innerWidth, images:[...document.images].filter(x=>!x.complete||x.naturalWidth===0).map(x=>x.src), links:[...document.querySelectorAll('a[href]')].length, title:document.title})''')
            overflow=actual['width']>width+2
            key=name or 'home'
            if width==1440 and key in ['home','systems','work','expertise','institutional','about','contact']:
                page.screenshot(path=str(ROOT/f'qa/{key}-desktop.png'),full_page=(key in ['home','work']))
            if width==390 and key in ['home','systems','expertise','contact']:
                page.screenshot(path=str(ROOT/f'qa/{key}-mobile.png'),full_page=False)
            if key=='expertise' and width==1440:
                page.locator('button[data-filter="automation"]').click()
                visible=page.locator('.expertise-group:not(.is-filtered-out)').count()
                actual['automationVisibleGroups']=visible
            if key=='systems' and width==1440:
                page.locator('button[data-stage="3"]').click()
                actual['stageName']=page.locator('#stage-name').inner_text()
            if width==390 and key=='home':
                page.locator('#menu-button').click()
                actual['mobileNavOpened']=page.locator('#main-nav').evaluate('el=>el.classList.contains("is-open")')
            results.append({'page':key,'width':width,'errors':errors,'overflow':overflow,**actual})
            page.close()
        context.close()
    browser.close()
(ROOT/'qa/results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
for r in results:
    print(r['width'],r['page'],'overflow',r['overflow'],'broken',len(r['images']),'errors',len(r['errors']), 'interactive',r.get('automationVisibleGroups',r.get('stageName',r.get('mobileNavOpened',''))))
