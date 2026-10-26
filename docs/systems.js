/* V32.1 browser-local systems operations console. Only summaries are held in memory.
   Explicit save persists bounded summaries; raw imported reports are never persisted. */
import {MAX_FILE_BYTES,MAX_HISTORY,parseSystemsReport,compareSnapshots,makeRunbook,addSnapshot,exportComparison,safeSnapshot} from './systems-core.mjs';
import {openIncidentCase,changeIncidentCase,diagnosticTimeline,serializeCasebook,restoreCasebook,MAX_CASES,MAX_CASEBOOK_BYTES} from './systems-incidents-core.mjs';
const $=id=>document.getElementById(id),T=k=>window.siteI18n?.t(k)||k;
const LEGACY_KEY='mk-systems-history-v32-1';
const KEY='mk-systems-casebook-v32-2';
const panel=$('systemsPanel');if(!panel)throw Error('Systems console markup missing.');
const state={history:[],cases:[],comparison:null,priorFocus:null,dirty:false};
const mapKind={dns:'sysDns',repo:'sysRepo',automation:'sysAutomation'};
const status=(s,error=false)=>{const el=$('systemsStatus');el.textContent=s;el.dataset.error=error?'true':'false'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
function humanTimestamp(s){try{return new Date(s).toLocaleString(document.documentElement.lang||'en',{dateStyle:'medium',timeStyle:'short'});}catch{return ''}}
function markDirty(dirty=true){
 state.dirty=dirty;const note=$('systemsDirty');note.textContent=T(dirty?'sysUnsaved':'sysSavedState');note.dataset.saved=String(!dirty);
}
function loadHistory(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const loaded=restoreCasebook(raw);state.history=loaded.history;state.cases=loaded.cases;markDirty(false);return;}
  const old=localStorage.getItem(LEGACY_KEY);
  if(!old){markDirty(false);return;}
  const arr=JSON.parse(old);if(!Array.isArray(arr))throw Error('Invalid legacy history');
  state.history=arr.slice(0,MAX_HISTORY).flatMap(x=>{try{return [safeSnapshot(x)];}catch{return [];}});
  markDirty(true);status(T('sysLegacyMigrated'));
 }catch{state.history=[];state.cases=[];markDirty(false);status(T('sysRecoveryError'),true)}
}
const caseStatusKeys={open:'sysCaseOpenState',investigating:'sysCaseInvestigating',closed:'sysCaseClosed'};
const casePriorityKeys={unassessed:'sysCaseUnassessed',low:'sysCaseLow',medium:'sysCaseMedium',high:'sysCaseHigh'};
function renderTimeline(){
 const host=$('systemsTimeline');host.replaceChildren();let timeline=[];
 try{timeline=diagnosticTimeline(state.history);}catch(err){status(err.message,true);}
 if(!timeline.length){host.append(el('p',T('sysTimelineEmpty'),'sys-empty'));return;}
 for(const entry of timeline){
  const item=el('article',undefined,'sys-timeline-item');item.append(el('small',humanTimestamp(entry.previousAt)+' → '+humanTimestamp(entry.currentAt)));
  item.append(el('strong',`${T(mapKind[entry.kind])} · ${entry.target}`));
  const metrics=el('div',undefined,'sys-metrics');
  for(const x of entry.deltas){metrics.append(el('span',`${x.metric}: ${x.delta>0?'+':''}${x.delta}`));}
  metrics.append(el('span',`${entry.changedSignals} ${T('sysTimelineSignals')}`));
  if(entry.identical)item.append(el('p',T('sysTimelineUnchanged'),'sys-small'));else item.append(metrics);
  if(entry.partial)item.append(el('small',T('sysPartial'),'sys-partial'));
  host.append(item);
 }
}
function renderCases(){
 const host=$('systemsCases');host.replaceChildren();$('systemsCaseCount').textContent=`${state.cases.length}/${MAX_CASES}`;
 if(!state.cases.length){host.append(el('p',T('sysCasesEmpty'),'sys-empty'));return;}
 for(const c of state.cases){
  const card=el('article',undefined,'sys-case');card.dataset.caseId=c.id;
  card.append(el('h4',`${T('sysCaseId')} ${c.id.slice(0,21)} · ${T(mapKind[c.kind])}`));
  const label=el('p',c.identity.split('|').slice(1).join('|'));card.append(label);
  const note=el('small',T('sysCaseStaticWarning'));card.append(note);
  const badges=el('div',undefined,'sys-case-badges');badges.append(el('span',T(caseStatusKeys[c.status])),el('span',T(casePriorityKeys[c.priority])));card.append(badges);
  const controls=el('div',undefined,'sys-case-controls');
  for(const [type,list,current,labelKey,keys] of [['status',['open','investigating','closed'],c.status,'sysCaseStatus',caseStatusKeys],['priority',['unassessed','low','medium','high'],c.priority,'sysCasePriority',casePriorityKeys]]){
   const wrapper=el('label');wrapper.append(el('span',T(labelKey)));
   const select=el('select');select.dataset.field=type;select.dataset.caseId=c.id;select.setAttribute('aria-label',`${T(labelKey)} ${c.id}`);
   for(const value of list){const opt=el('option',T(keys[value]));opt.value=value;select.append(opt);}select.value=current;wrapper.append(select);controls.append(wrapper);
  }card.append(controls);
  const eventlist=el('ol',undefined,'sys-case-eventlog');
  for(const event of c.events.slice(-6))eventlist.append(el('li',`${humanTimestamp(event.at)} · ${T(event.action==='opened'?'sysCaseEventOpened':event.action==='status'?'sysCaseEventStatus':'sysCaseEventPriority')}: ${T(event.action==='priority'?casePriorityKeys[event.value]:caseStatusKeys[event.value])}`));
  card.append(eventlist);host.append(card);
 }
}
function saveJson(text,filename){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function refresh(){
 const a=$('systemsBaseline'),b=$('systemsCurrent');const before=a.value,after=b.value;
 for(const select of [a,b])select.replaceChildren();
 state.history.forEach((s,i)=>{const title=`${i+1} · ${T(mapKind[s.kind])} · ${s.target} · ${humanTimestamp(s.sourceAt||s.capturedAt)}`;
  for(const select of [a,b]){const option=el('option',title);option.value=String(i);select.append(option);}
 });
 if(state.history.length){a.value=before&&Number(before)<state.history.length?before:String(Math.min(1,state.history.length-1));b.value=after&&Number(after)<state.history.length?after:'0';if(a.value===b.value&&state.history.length>1)a.value=String(Number(b.value)===0?1:0);}
 $('systemsCompare').disabled=state.history.length<2;
 $('systemsSave').disabled=!(state.history.length||state.cases.length);
 $('systemsBackup').disabled=!(state.history.length||state.cases.length);
 $('systemsExport').disabled=!state.comparison;
 $('systemsHistoryCount').textContent=`${state.history.length}/${MAX_HISTORY}`;
 const caseSource=$('systemsCaseSnapshot');const selectedSource=caseSource.value;caseSource.replaceChildren();state.history.forEach((s,i)=>{const opt=el('option',`${i+1} · ${T(mapKind[s.kind])} · ${s.target}`);opt.value=String(i);caseSource.append(opt);});if(selectedSource&&Number(selectedSource)<state.history.length)caseSource.value=selectedSource;
 $('systemsCaseOpen').disabled=!state.history.length;
 renderTimeline();renderCases();
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
 state.comparison=null;if(accepted)markDirty();refresh();showComparison();showRunbook();
 status(`${accepted} ${T('sysImported')}${errors.length?' · '+errors.slice(0,3).join(' | '):''}`,!!errors.length);
}
function open(){state.priorFocus=document.activeElement;panel.hidden=false;document.body.classList.add('systems-open');$('systemsClose').focus();}
function close(){if(state.dirty&&!confirm(T('sysUnsavedClose')))return;panel.hidden=true;document.body.classList.remove('systems-open');state.priorFocus?.focus?.();}
$('systemsLaunch')?.addEventListener('click',open);
$('systemsClose').addEventListener('click',close);
$('systemsFiles').addEventListener('change',ev=>{readFiles(ev.target.files);ev.target.value='';});
document.addEventListener('systems:import',ev=>{try{const report=ev.detail?.report;const snap=parseSystemsReport(JSON.stringify(report));state.history=addSnapshot(state.history,snap);state.comparison=null;markDirty();refresh();showComparison();showRunbook();open();status(T('sysImportedDirect'));}catch(err){open();status(err.message,true);}});
$('systemsCompare').addEventListener('click',()=>{
 try{const before=state.history[Number($('systemsBaseline').value)],after=state.history[Number($('systemsCurrent').value)];
  if(!before||!after||before===after)throw Error(T('sysSelectTwo'));
  state.comparison=compareSnapshots(before,after);status(T('sysCompared'));showComparison();refresh();}
 catch(err){state.comparison=null;showComparison();refresh();status(err.message,true);}
});
$('systemsSave').addEventListener('click',()=>{try{localStorage.setItem(KEY,serializeCasebook(state.history,state.cases));localStorage.removeItem(LEGACY_KEY);markDirty(false);status(T('sysSaved'));}catch(err){status(`${T('sysStorageFailure')} ${err.message}`,true)}});
$('systemsClear').addEventListener('click',()=>{if(!confirm(T('sysClearCasebook')))return;
 state.history=[];state.cases=[];state.comparison=null;try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY)}catch{}markDirty(false);refresh();showComparison();showRunbook();status(T('sysCleared'));
});
$('systemsExport').addEventListener('click',()=>{if(!state.comparison)return;
 saveJson(exportComparison(state.comparison),'systems-comparison-v32-2.json');
});
$('systemsCaseOpen').addEventListener('click',()=>{
 try{
  const s=state.history[Number($('systemsCaseSnapshot').value)];if(!s)throw Error(T('sysEmpty'));
  const id='case-'+crypto.randomUUID();state.cases=openIncidentCase(s,state.cases,{id});markDirty();refresh();status(T('sysCaseOpened'));
 }catch(err){status(err.message,true);}
});
$('systemsCases').addEventListener('change',event=>{
 const select=event.target;if(!(select instanceof HTMLSelectElement))return;
 const id=select.dataset.caseId,field=select.dataset.field;const index=state.cases.findIndex(c=>c.id===id);if(index<0||!['status','priority'].includes(field))return;
 try{state.cases[index]=changeIncidentCase(state.cases[index],{[field]:select.value});markDirty();renderCases();status(T('sysCaseUpdated'));}
 catch(err){renderCases();status(err.message,true);}
});
$('systemsBackup').addEventListener('click',()=>{
 try{saveJson(JSON.stringify(JSON.parse(serializeCasebook(state.history,state.cases)),null,2),'systems-casebook-v32-2.json');status(T('sysCasebookExported'));}
 catch(err){status(err.message,true)}
});
$('systemsRestoreFile').addEventListener('change',async ev=>{
 const input=ev.target,file=input.files?.[0];input.value='';if(!file)return;
 if(file.size>MAX_CASEBOOK_BYTES){status(T('sysCasebookTooLarge'),true);return;}
 try{
  const contents=await file.text();const restored=restoreCasebook(contents);
  if((state.history.length||state.cases.length)&&!confirm(T('sysRestoreConfirm')))return;
  state.history=restored.history;state.cases=restored.cases;state.comparison=null;markDirty();refresh();showComparison();showRunbook();status(T('sysRestored'));
 }catch(err){status(`${T('sysRecoveryError')} ${err.message}`,true)}
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
document.addEventListener('portfolio:locale',()=>{refresh();showComparison();showRunbook();markDirty(state.dirty);});
