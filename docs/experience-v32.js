/* V32 enhancement: one entry point to preexisting working studios, no duplicated engines. */
(()=>{
'use strict';
const $=(selector)=>document.querySelector(selector);
const $$=(selector)=>Array.from(document.querySelectorAll(selector));
const t=(key)=>window.siteI18n?.t(key)||key;
for(const [button,target] of [['#hubTrustLaunch','#trustLaunch'],['#hubAutoLaunch','#automationLaunch'],['#hubStudioLaunch','#studioLaunch']]){
  $(button)?.addEventListener('click',()=>$(target)?.click());
}
// All 18 technologies remain in the document and in the filters. Featured mode limits initial noise.
const skills=$$('.skill');const filters=$$('.category');const expand=$('#toolkitExpand');const count=$('#toolCount');
let expanded=false;
function selectedCategory(){return filters.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.category||'all';}
function applyToolkitVisibility(){
  const category=selectedCategory();const collapsed=category==='all'&&!expanded;
  skills.forEach((card,index)=>{card.hidden=(category!=='all'&&card.dataset.category!==category)||(collapsed&&index>=6);});
  const shown=skills.filter(card=>!card.hidden);
  if(count)count.textContent=`${shown.length} / ${skills.length}`;
  if(expand){expand.hidden=category!=='all';expand.setAttribute('aria-expanded',String(expanded));expand.textContent=t(expanded?'v32LessTools':'v32MoreTools');}
  const active=skills.find(card=>card.getAttribute('aria-pressed')==='true');
  if(active?.hidden&&shown[0])shown[0].click();
}
filters.forEach(button=>button.addEventListener('click',applyToolkitVisibility));
expand?.addEventListener('click',()=>{expanded=!expanded;applyToolkitVisibility();});
document.addEventListener('portfolio:locale',applyToolkitVisibility);
applyToolkitVisibility();
// Direct copy is optional: the visible mailto link remains the primary, functional action.
const copy=$('#copyContactEmail');const status=$('#copyContactStatus');
copy?.addEventListener('click',async()=>{
  try{
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText('president@mycdic.org');
    if(status)status.textContent=t('v32Copied');
  }catch{if(status)status.textContent=t('v32CopyFailed');}
});
// Keep navigation focused on the content currently visible, with tool subsections grouped together.
const nav=$$('.desktop-nav a[href^="#"]');
if('IntersectionObserver' in window){
  const targets=['#work','#tools','#trustops','#automation','#lab','#stack','#perspective','#profile'].map(s=>$(s)).filter(Boolean);
  const io=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;
      const current=['trustops','automation','lab'].includes(entry.target.id)?'tools':entry.target.id;
      nav.forEach(a=>{const on=a.getAttribute('href')==='#'+current;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    }
  },{rootMargin:'-15% 0px -60% 0px',threshold:0});targets.forEach(x=>io.observe(x));
}
})();
