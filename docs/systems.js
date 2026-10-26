/* V32.1 browser-local systems operations console. Only summaries are held in memory.
   Explicit save persists bounded summaries; raw imported reports are never persisted. */
import {MAX_FILE_BYTES,MAX_HISTORY,parseSystemsReport,compareSnapshots,makeRunbook,addSnapshot,exportComparison,safeSnapshot} from './systems-core.mjs';
const $=id=>document.getElementById(id),T=k=>window.siteI18n?.t(k)||k;
const KEY='mk-systems-history-v32-1';
const panel=$('systemsPanel');if(!panel)throw Error('Systems console markup missing.');
const state={history:[],comparison:null,priorFocus:null};
const mapKind={dns:'sysDns',repo:'sysRepo',automation:'sysAutomation'};
const status=(s,error=false)=>{const el=$('systemsStatus');el.textContent=s;el.dataset.error=error?'true':'false'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
function humanTimestamp(s){try{return new Date(s).toLocaleString(document.documentElement.lang||'en',{dateStyle:'medium',timeStyle:'short'});}catch{return ''}}
function loadHistory(){
 try{const raw=localStorage.getItem(KEY);if(!raw)return;const arr=JSON.parse(raw);if(!Array.isArray(arr))throw Error('Stored data invalid');state.history=arr.slice(0,MAX_HISTORY).flatMap(x=>{try{return [safeSnapshot(x)];}catch{return [];}});}
 catch{state.history=[];status(T('sysStorageFailure'),true)}
}
function refresh(){
 const a=$('systemsBaseline'),b=$('systemsCurrent');const before=a.value,after=b.value;
 for(const select of [a,b])select.replaceChildren();
 state.history.forEach((s,i)=>{const title=`${i+1} · ${T(mapKind[s.kind])} · ${s.target} · ${humanTimestamp(s.sourceAt||s.capturedAt)}`;
  for(const select of [a,b]){const option=el('option',title);option.value=String(i);select.append(option);}
 });
 if(state.history.length){a.value=before&&Number(before)<state.history.length?before:String(Math.min(1,state.history.length-1));b.value=after&&Number(after)<state.history.length?after:'0';if(a.value===b.value&&state.history.length>1)a.value=String(Number(b.value)===0?1:0);}
 $('systemsCompare').disabled=state.history.length<2;
 $('systemsSave').disabled=!state.history.length;
 $('systemsExport').disabled=!state.comparison;
 $('systemsHistoryCount').textContent=`${state.history.length}/${MAX_HISTORY}`;
 const container=$('systemsHistory');container.replaceChildren();
 if(!state.history.length){container.append(el('p',T('sysEmpty'),'sys-empty'));return;}
 for(const s of state.history){const item=el('article',undefined,'sys-history-item');const top=el('div',undefined,'sys-history-top');
  top.append(el('strong',T(mapKind[s.kind])),el('small',humanTimestamp(s.sourceAt||s.capturedAt)));
  item.append(top,el('p',s.target));const metrics=el('div',undefined,'sys-metrics');
  for(const [k,v] of Object.entries(s.metrics))metrics.append(el('span',`${k}: ${v}`));
  item.append(metrics);if(s.partial)item.append(el('small',T('sysPartial'),'sys-partial'));
  container.append(item);
 }
}
function showComparison(){
 const box=$('systemsResult');box.replaceChildren();
 const r=state.comparison;if(!r){box.append(el('p',T('sysCompareEmpty'),'sys-empty'));return;}
 box.append(el('h3',T('sysChanges')),el('p',`${T(mapKind[r.kind])} · ${r.target}`));
 if(r.partial)box.append(el('p',T('sysPartial'),'sys-warning'));
 if(r.workflowFingerprintsDiffer)box.append(el('p',T('sysDifferentFingerprint'),'sys-warning'));
 const table=el('table');const head=el('tr');for(const key of ['sysMetric','sysBefore','sysAfter','sysDelta'])head.append(el('th',T(key)));const thead=el('thead');thead.append(head);table.append(thead);
 const tbody=el('tbody');for(const [key,v] of Object.entries(r.metrics)){
  const tr=el('tr');[key,v.before,v.after,(v.delta>0?'+':'')+v.delta].forEach(value=>tr.append(el('td',value)));tbody.append(tr);
 }table.append(tbody);box.append(table);
 const count=el('p',`${r.changes.length} ${T('sysStateChanges')}`);box.append(count);
 if(r.changes.length){const list=el('ul');for(const x of r.changes.slice(0,30))list.append(el('li',`${x.key}: ${x.before||'—'} → ${x.after||'—'}`));box.append(list);}
 box.append(el('p',T('sysReportNote'),'sys-small'));
}
function showRunbook(){const box=$('systemsRunbook');box.replaceChildren();if(!state.history.length){box.append(el('p',T('sysEmpty')));return;}
 const list=el('ol');for(const step of makeRunbook(state.history[0]))list.append(el('li',T(step)));box.append(list);
}
async function readFiles(files){
 const chosen=[...files].slice(0,10);let accepted=0,errors=[];
 for(const file of chosen){try{
   if(file.size>MAX_FILE_BYTES)throw Error('Maximum 2 MB per JSON file.');
   const text=await file.text(),snap=parseSystemsReport(text);
   state.history=addSnapshot(state.history,snap);accepted++;
  }catch(err){errors.push(`${file.name.slice(0,55)}: ${err.message}`);}
 }
 state.comparison=null;refresh();showComparison();showRunbook();
 status(`${accepted} ${T('sysImported')}${errors.length?' · '+errors.slice(0,3).join(' | '):''}`,!!errors.length);
}
function open(){state.priorFocus=document.activeElement;panel.hidden=false;document.body.classList.add('systems-open');$('systemsClose').focus();}
function close(){panel.hidden=true;document.body.classList.remove('systems-open');state.priorFocus?.focus?.();}
$('systemsLaunch')?.addEventListener('click',open);
$('systemsClose').addEventListener('click',close);
$('systemsFiles').addEventListener('change',ev=>{readFiles(ev.target.files);ev.target.value='';});
document.addEventListener('systems:import',ev=>{try{const report=ev.detail?.report;const snap=parseSystemsReport(JSON.stringify(report));state.history=addSnapshot(state.history,snap);state.comparison=null;refresh();showComparison();showRunbook();open();status(T('sysImportedDirect'));}catch(err){open();status(err.message,true);}});
$('systemsCompare').addEventListener('click',()=>{
 try{const before=state.history[Number($('systemsBaseline').value)],after=state.history[Number($('systemsCurrent').value)];
  if(!before||!after||before===after)throw Error(T('sysSelectTwo'));
  state.comparison=compareSnapshots(before,after);status(T('sysCompared'));showComparison();refresh();}
 catch(err){state.comparison=null;showComparison();refresh();status(err.message,true);}
});
$('systemsSave').addEventListener('click',()=>{try{localStorage.setItem(KEY,JSON.stringify(state.history));status(T('sysSaved'));}catch{status(T('sysStorageFailure'),true)}});
$('systemsClear').addEventListener('click',()=>{if(!confirm(T('sysConfirmClear')))return;
 state.history=[];state.comparison=null;try{localStorage.removeItem(KEY)}catch{}refresh();showComparison();showRunbook();status(T('sysCleared'));
});
$('systemsExport').addEventListener('click',()=>{if(!state.comparison)return;
 const url=URL.createObjectURL(new Blob([exportComparison(state.comparison)],{type:'application/json'}));const a=el('a');a.href=url;a.download='systems-comparison-v32-1.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
});
panel.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'){ev.preventDefault();close();return;}
 if(ev.key==='Tab'){
  const active=[...panel.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')].filter(n=>n.getClientRects().length);
  const first=active[0],last=active[active.length-1];if(!first)return;
  if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
  else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
 }
});
loadHistory();refresh();showComparison();showRunbook();
if(new URLSearchParams(location.search).has('systems'))open();
document.addEventListener('portfolio:locale',()=>{refresh();showComparison();showRunbook();});
