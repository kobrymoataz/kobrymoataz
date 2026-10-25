/**
 * V29 public geographical context. The atlas contains verified reference locations,
 * not live tracking, travel data or operational telemetry. No API keys or private data.
 * Repo evidence reads only public metadata directly from the GitHub API on demand.
 */
(() => {
  'use strict';
  const stage=document.querySelector('.globe-stage');
  if (!stage) return;
  const atlas=document.getElementById('atlasView');
  const pins=document.getElementById('atlasPins');
  const network=document.getElementById('atlasNetwork');
  const modeButtons=[...document.querySelectorAll('[data-perspective-mode]')];
  const lighting=document.getElementById('globeLighting');
  const connections=document.getElementById('globeConnections');
  const t=key=>window.siteI18n?.t(key)||key;
  const globe=()=>window.MKGlobeV29;
  const REGION={left:-26,right:32,bottom:26,top:60,width:960,height:520};
  const sites=[
    {id:'madrid',name:'Madrid',lat:40.4168,lng:-3.7038,kind:'institutional',story:'dossierMadrid',url:'https://www.mycdic.org/'},
    {id:'rabat',name:'Rabat',lat:34.0209,lng:-6.8416,kind:'institutional',story:'dossierRabat',url:'https://www.mycdic.org/'},
    {id:'brussels',name:'Brussels',lat:50.8503,lng:4.3517,kind:'institutional',story:'dossierBrussels',url:'https://www.mycdic.org/president/'},
    {id:'ciudad-real',name:'Ciudad Real',lat:38.9848,lng:-3.9274,kind:'academic',story:'dossierCiudad',url:'https://www.uclm.es/'}
  ];
  let selected='madrid',mode='earth',showConnections=true,dusk=false;
  const byId=id=>sites.find(s=>s.id===id)||sites[0];
  const xy=s=>({x:((s.lng-REGION.left)/(REGION.right-REGION.left))*REGION.width,
    y:((REGION.top-s.lat)/(REGION.top-REGION.bottom))*REGION.height});
  const fmtCoordinate=(v,positive,negative)=>Math.abs(v).toFixed(4)+'° '+(v>=0?positive:negative);
  function renderDossier(){
    const s=byId(selected);
    document.getElementById('placeTitle').textContent=s.name;
    document.getElementById('placeNarrative').textContent=t(s.story);
    document.getElementById('placeCategory').textContent=t(s.kind==='academic'?'contextAcademic':'contextInstitutional');
    document.getElementById('placeCoordinates').textContent=fmtCoordinate(s.lat,'N','S')+' · '+fmtCoordinate(s.lng,'E','W');
    const link=document.getElementById('placeSource');link.href=s.url;
    pins.querySelectorAll('button[data-place]').forEach(b=>{
      const isSelected=b.dataset.place===s.id;
      b.classList.toggle('is-active',isSelected);b.setAttribute('aria-pressed',String(isSelected));
    });
    stage.dataset.selectedPlace=selected;
  }
  function createAtlas(){
    pins.replaceChildren();
    for (const s of sites){
      const pos=xy(s),b=document.createElement('button');
      b.type='button';b.className='atlas-pin';b.dataset.place=s.id;
      b.style.setProperty('--x',((pos.x/REGION.width)*100)+'%');
      b.style.setProperty('--y',((pos.y/REGION.height)*100)+'%');
      b.setAttribute('aria-label',s.name);b.setAttribute('aria-pressed','false');
      const caption=document.createElement('span');caption.className='atlas-pin-caption';caption.textContent=s.name;b.append(caption);
      b.addEventListener('click',()=>select(s.id));pins.append(b);
    }
    renderNetwork();renderDossier();
  }
  function renderNetwork(){
    network.replaceChildren();
    if(!showConnections)return;
    const origin=xy(sites[0]);
    for(const s of sites.slice(1,3)){
      const end=xy(s),curve=document.createElementNS('http://www.w3.org/2000/svg','path');
      const cx=(origin.x+end.x)/2,cy=Math.min(origin.y,end.y)-38;
      curve.setAttribute('d',`M ${origin.x.toFixed(2)} ${origin.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`);
      network.append(curve);
    }
  }
  function select(id){
    selected=byId(id).id;renderDossier();
    globe()?.chooseLocation(selected);
  }
  function updateModes(){
    stage.dataset.mode=mode;
    const instruction=stage.querySelector('.globe-instruction');
    if(instruction)instruction.textContent=t(mode==='atlas'?'perspectiveAtlasInstruction':'globeInstruction');
    atlas.hidden=mode!=='atlas';
    modeButtons.forEach(b=>{
      const on=b.dataset.perspectiveMode===mode;
      b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));
    });
    globe()?.setMode(mode);
    if(mode==='atlas'){
      const status=stage.querySelector('[data-globe-status]');
      if(status)status.textContent=t('perspectiveAtlas').toUpperCase()+' · WGS84';
    }else if(stage.dataset.renderer==='webgl'){
      const status=stage.querySelector('[data-globe-status]');
      if(status)status.textContent=t('globeStatusWebGL');
    }
  }
  function chooseMode(next){
    if(next==='earth'&&stage.dataset.renderer!=='webgl'){
      mode='atlas';
      const status=stage.querySelector('[data-globe-status]');
      if(status)status.textContent=t('perspectiveModeFallback');
    }else mode=next==='atlas'?'atlas':'earth';
    updateModes();
  }
  function toggleLighting(){
    dusk=!dusk;globe()?.setLighting(dusk);
    lighting.setAttribute('aria-pressed',String(dusk));
    lighting.textContent=t(dusk?'perspectiveDaylight':'perspectiveLighting');
  }
  function toggleConnections(){
    showConnections=!showConnections;
    connections.setAttribute('aria-pressed',String(showConnections));
    connections.textContent=t(showConnections?'perspectiveConnections':'perspectiveConnectionsOff');
    globe()?.setConnections(showConnections);renderNetwork();
  }
  modeButtons.forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.perspectiveMode)));
  lighting.addEventListener('click',toggleLighting);
  connections.addEventListener('click',toggleConnections);
  document.addEventListener('mk:perspective-place',e=>{if(e.detail?.id){selected=e.detail.id;renderDossier();}});
  document.addEventListener('mk:globe-unavailable',()=>chooseMode('atlas'));
  document.addEventListener('portfolio:locale',()=>{
    renderDossier();lighting.textContent=t(dusk?'perspectiveDaylight':'perspectiveLighting');
    connections.textContent=t(showConnections?'perspectiveConnections':'perspectiveConnectionsOff');
    updateModes();
  });
  createAtlas();
  // V28 WebGL core runs before this deferred script. In case WebGL is blocked,
  // present a functioning interactive atlas instead of a broken static canvas.
  if(stage.dataset.renderer==='fallback')chooseMode('atlas');
  else updateModes();

  // Public GitHub information: no local secrets, API tokens or fabricated metrics.
  const container=document.getElementById('repoEvidence');
  if(!container)return;
  const names=['repoverity','submissionledger','flowfault'];
  const status=document.getElementById('repoEvidenceStatus');
  const refresh=document.getElementById('repoEvidenceRefresh');
  const cacheKey='mk:public-repo-evidence:v29';
  let started=false,repoData=null,live=false;
  function readCache(){try{const obj=JSON.parse(sessionStorage.getItem(cacheKey)||'null');if(obj&&Date.now()-obj.at<10*60*1000)return obj.items;}catch{}return null;}
  function writeCache(items){try{sessionStorage.setItem(cacheKey,JSON.stringify({items,at:Date.now()}));}catch{}}
  function updateEvidence(){
    status.textContent=t(live?'evidenceLive':(started?'evidenceOffline':'evidencePending'));
    for(const el of container.querySelectorAll('[data-repo]')){
      const item=repoData?.[el.dataset.repo],node=el.querySelector('[data-repo-meta]');
      if(item&&Number.isFinite(item.stars)&&!Number.isNaN(Date.parse(item.updated))){
        const locale=window.siteI18n?.locale||'en';
        const formatted=new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(item.updated));
        node.textContent='★ '+new Intl.NumberFormat(locale).format(item.stars)+' · '+t('evidenceUpdated')+' '+formatted;
      }else node.textContent=t('evidenceWaiting');
    }
  }
  async function getRepo(name,signal){
    const response=await fetch('https://api.github.com/repos/kobrymoataz/'+name,{signal,headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error('GitHub public API '+response.status);
    const value=await response.json();
    if(typeof value.stargazers_count!=='number'||!value.updated_at||value.full_name?.toLowerCase()!=='kobrymoataz/'+name)throw Error('Unexpected GitHub metadata');
    return {stars:value.stargazers_count,updated:value.updated_at};
  }
  async function loadEvidence(force=false){
    if(started&&!force)return;
    started=true;refresh.disabled=true;status.textContent='…';
    if(!force){const cached=readCache();if(cached){repoData=cached;live=true;refresh.disabled=false;updateEvidence();return;}}
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
    const settled=await Promise.allSettled(names.map(name=>getRepo(name,controller.signal)));
    clearTimeout(timer);
    const collected={};settled.forEach((r,i)=>{if(r.status==='fulfilled')collected[names[i]]=r.value;});
    live=Object.keys(collected).length>0;repoData=collected;
    if(live)writeCache(collected);
    refresh.disabled=false;updateEvidence();
  }
  refresh.addEventListener('click',()=>loadEvidence(true));
  document.addEventListener('portfolio:locale',()=>{if(started)updateEvidence();});
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting){io.disconnect();loadEvidence();}},{rootMargin:'220px'});
    io.observe(container);
  }else{loadEvidence();}
  window.MKPerspectiveV29={select,chooseMode,loadEvidence,getState:()=>({selected,mode,showConnections,dusk,githubLive:live})};
})();
