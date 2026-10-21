from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, json, re
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'docs'
css=(D/'styles.css').read_text()
html=(D/'index.html').read_text()
js=(D/'app.js').read_text()
def data_uri(p):
 data=p.read_bytes()
 mime='image/webp' if p.suffix=='.webp' else ('image/svg+xml' if p.suffix=='.svg' else 'image/png')
 return f'data:{mime};base64,{base64.b64encode(data).decode()}'
html=html.replace('<link rel="stylesheet" href="styles.css" />',f'<style>{css}</style>')
html=html.replace('src="assets/portrait.webp"',f'src="{data_uri(D/"assets/portrait.webp")}"')
html=re.sub(r'<script defer src="https://[^\"]+"[^>]*></script>','',html)
html=html.replace('<script defer src="app.js"></script>','')
results={}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for label,w,h in [('desktop',1440,900),('mobile',390,844),('tablet',768,1024)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html,wait_until='domcontentloaded')
  page.add_script_tag(content=js)
  # set local SVGs as data URIs for this offline QA
  names=[file.stem for file in (D/'logos').glob('*.svg')]
  uri_map={name:data_uri(D/'logos'/f'{name}.svg') for name in names}
  page.evaluate('''(icons)=>{document.querySelectorAll('.tech-card img').forEach(im=>{const k=im.getAttribute('src').split('/').pop().replace('.svg','');if(icons[k])im.src=icons[k]})}''',uri_map)
  page.wait_for_timeout(1200)
  page.screenshot(path=str(ROOT/'qa'/f'{label}-top.png'),full_page=False)
  page.screenshot(path=str(ROOT/'qa'/f'{label}-full.png'),full_page=True)
  page.locator('#stack').scroll_into_view_if_needed()
  page.wait_for_timeout(350)
  page.screenshot(path=str(ROOT/'qa'/f'{label}-stack.png'),full_page=False)
  dims=page.evaluate('''()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,techCount:document.querySelectorAll('.tech-card').length,portraitLoaded:document.querySelector('.portrait-mat img')?.naturalWidth>0,brokenImgs:[...document.querySelectorAll('img')].filter(img=>!img.complete||img.naturalWidth===0).map(i=>i.getAttribute('src').slice(0,32)),wideText:[...document.querySelectorAll('h1,h2,h3,p,.tech-card,.metric,.work-tab')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left<-2)}).slice(0,12).map(x=>x.textContent.trim().slice(0,55))})''')
  page.locator('button.stack-filter[data-filter="automation"]').click()
  filtered=page.locator('.tech-card:not([hidden])').count()
  page.locator('button.work-tab[data-work="management"]').click()
  tabSelected=page.locator('.work-tab.is-active').get_attribute('data-work')
  dims.update({'filteredAutomation':filtered,'workTab':tabSelected,'errors':errors})
  results[label]=dims
  page.close()
 browser.close()
(ROOT/'qa'/'results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
