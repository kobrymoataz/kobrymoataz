/* V23 workflow-simulator / v2. Browser-only deterministic examples: no network requests. */
(()=>{
'use strict';
const root=document.getElementById('engineeringLab');if(!root)return;
const t=key=>window.siteI18n?.t(key)||key;
const q=s=>root.querySelector(s);
const nodes=[...root.querySelectorAll('.lab-node')];
const log=q('#labLog'),badge=q('#labBadge'),eventCount=q('#labEventCount');
const run=q('#labRun'),step=q('#labStep'),resetBtn=q('#labReset'),failure=q('#injectFailure');
const modes=[...root.querySelectorAll('[data-lab-scenario]')];
const phaseMetric=q('#labStageMetric'),retryMetric=q('#labRetryMetric'),scenarioMetric=q('#labScenarioMetric'),trace=q('#labTrace');
const events=['labStartMsg','labValidateMsg','labStoreMsg','labQueueMsg','labDeliverMsg','labDoneMsg'];
let phase=0,mode='normal',auto=false,timer=0,failedOnce=false,reviewOnce=false,retries=0,history=[],finished=false,outcome='ready';
function halt(){auto=false;clearTimeout(timer);timer=0;}
function logRender(){log.replaceChildren();const entries=history.length?history:[{key:'labIdle'}];entries.forEach(({key},i)=>{const li=document.createElement('li');li.textContent=history.length?`${String(i+1).padStart(2,'0')}  ${t(key)}`:t(key);log.appendChild(li);});log.scrollTop=log.scrollHeight;eventCount.textContent=`${String(history.length).padStart(2,'0')} ${t('labEvents')}`;}
function ui(){
 const stopped=finished||phase>=6;
 nodes.forEach((n,i)=>{n.classList.toggle('active',i===phase&&!stopped);n.classList.toggle('done',i<phase);n.classList.toggle('retry',i===4&&failedOnce&&phase===4);});
 badge.textContent=outcome==='blocked'?'BLOCKED':outcome==='review'?'REVIEW':stopped?t('labFinished'):(auto?t('labRunning'):t('labReady'));
 run.disabled=stopped;step.disabled=stopped;failure.disabled=phase>0||mode!=='normal';
 if(phaseMetric)phaseMetric.textContent=`${String(Math.min(phase,6)).padStart(2,'0')} / 06`;
 if(retryMetric)retryMetric.textContent=String(retries).padStart(2,'0');
 if(scenarioMetric)scenarioMetric.textContent=t(({normal:'labModeNormal',retry:'labModeRetry',missing:'labModeMissing',review:'labModeReview'})[mode]);
 if(trace)trace.style.width=(Math.min(phase,6)/6*100)+'%';
 logRender();
}
function advance(){
 if(finished||phase>=6){halt();return;}
 if(phase===1&&mode==='missing'){history.push({key:'labMissingMsg'});finished=true;outcome='blocked';halt();ui();return;}
 if(phase===2&&mode==='review'&&!reviewOnce){reviewOnce=true;history.push({key:'labReviewMsg'});outcome='review';halt();ui();return;}
 if(phase===2&&mode==='review'&&outcome==='review'){history.push({key:'labApprovedMsg'});outcome='running';}
 const wantsFailure=mode==='retry'||(mode==='normal'&&failure.checked);
 if(phase===4&&wantsFailure&&!failedOnce){failedOnce=true;retries++;history.push({key:'labFailureMsg'});ui();return;}
 if(phase===4&&failedOnce)history.push({key:'labRetryMsg'});
 else history.push({key:events[phase]});
 phase++;
 if(phase>=6){history.push({key:'labDoneNote'});finished=true;halt();}
 ui();
}
function schedule(){if(!auto)return;if(finished){halt();ui();return;}timer=setTimeout(()=>{advance();schedule();},620);}
function reset(){halt();phase=0;failedOnce=false;reviewOnce=false;retries=0;history=[];finished=false;outcome='ready';ui();}
modes.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.labScenario;modes.forEach(x=>{const on=x===b;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',String(on));});failure.checked=mode==='retry';reset();}));
run.addEventListener('click',()=>{if(finished)return;halt();auto=true;outcome='running';ui();schedule();});
step.addEventListener('click',()=>{halt();advance();ui();});
resetBtn.addEventListener('click',reset);
document.addEventListener('portfolio:locale',ui);
window.addEventListener('pagehide',halt);
reset();
})();
