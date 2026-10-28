/* V32.3 quick navigation. No remote APIs, no changes to existing tools. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const opener=$('#quicknavOpen'),overlay=$('#quicknavDialog'),closer=$('#quicknavClose'),search=$('#quicknavSearch'),results=$('#quicknavResults');
if(!opener||!overlay||!closer||!search||!results)return;
const t=k=>window.siteI18n?.t(k)||k;
const destinations=[
 {key:'v323NavWork',hash:'#work',group:'01 / PORTFOLIO'},
 {key:'v323NavTools',hash:'#tools',group:'02 / TOOLS'},
 {key:'v323NavToolkit',hash:'#stack',group:'03 / EXPERTISE'},
 {key:'v323NavPerspective',hash:'#perspective',group:'04 / CONTEXT'},
 {key:'v323NavProfile',hash:'#profile',group:'05 / PROFILE'},
 {key:'v323NavContact',hash:'#contact',group:'06 / CONTACT'},
 {key:'v323NavTrust',button:'#hubTrustLaunch',group:'TOOL / TRUSTOPS'},
 {key:'v323NavAuto',button:'#hubAutoLaunch',group:'TOOL / AUTOMATION'},
 {key:'v323NavStudio',button:'#hubStudioLaunch',group:'TOOL / ENGINEERING'},
 {key:'v323NavSystems',button:'#systemsLaunch',group:'TOOL / SYSTEMS'}
];
let shown=[],active=0,returnTo=null;
function render(){
 const term=search.value.trim().toLocaleLowerCase();
 shown=destinations.filter(item=>(t(item.key)+' '+item.group).toLocaleLowerCase().includes(term));
 active=Math.min(active,Math.max(0,shown.length-1));
 results.replaceChildren();
 if(!shown.length){const empty=document.createElement('p');empty.className='cmd-empty';empty.textContent=t('v323PaletteEmpty');results.append(empty);return;}
 shown.forEach((item,i)=>{
   const row=document.createElement('button');row.type='button';row.className='cmd-item';
   row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===active));row.dataset.active=String(i===active);
   const label=document.createElement('span');label.textContent=t(item.key);
   const tag=document.createElement('small');tag.textContent=item.group;
   row.append(label,tag);
   row.addEventListener('mouseenter',()=>{active=i;sync()});
   row.addEventListener('click',()=>activate(item));
   results.append(row);
 });
}
function sync(){Array.from(results.querySelectorAll('.cmd-item')).forEach((b,i)=>{b.dataset.active=String(i===active);b.setAttribute('aria-selected',String(i===active));});results.querySelectorAll('.cmd-item')[active]?.scrollIntoView({block:'nearest'});}
function open(){if(!overlay.hidden)return;returnTo=document.activeElement;overlay.hidden=false;document.body.classList.add('palette-open');search.value='';active=0;render();search.focus();}
function close({restore=true}={}){if(overlay.hidden)return;overlay.hidden=true;document.body.classList.remove('palette-open');if(restore)(returnTo?.isConnected?returnTo:opener).focus();}
function activate(item){
 const target=item.button?$(item.button):$(item.hash);
 close({restore:false});
 if(item.button){target?.click();return;}
 if(target){target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});history.replaceState(null,'',item.hash);target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
}
opener.addEventListener('click',open);
closer.addEventListener('click',()=>close());
overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});
search.addEventListener('input',()=>{active=0;render()});
overlay.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();close();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(shown.length){active=(active+(e.key==='ArrowDown'?1:-1)+shown.length)%shown.length;sync()}return}
 if(e.key==='Enter'&&document.activeElement===search){e.preventDefault();if(shown[active])activate(shown[active]);return}
 if(e.key==='Tab'){
  const nodes=[closer,search,...results.querySelectorAll('.cmd-item')].filter(n=>!n.disabled);
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.altKey)return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();if(overlay.hidden)open();else close();
 }
});
document.addEventListener('portfolio:locale',()=>{opener.setAttribute('aria-label',t('v323Quick'));closer.setAttribute('aria-label',t('v323PaletteClose'));search.setAttribute('aria-label',t('v323PalettePlaceholder'));render()});
})();
