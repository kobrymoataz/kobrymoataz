/* V22 engineering lab: an honest, deterministic browser-only state-machine demo.
 * It does not issue HTTP requests, persist records or transmit user data. */
(()=>{
'use strict';
const root=document.getElementById('engineeringLab');if(!root)return;
const t=key=>window.siteI18n?.t(key)||key;
const q=s=>root.querySelector(s), nodes=[...root.querySelectorAll('.lab-node')];
const log=q('#labLog'),badge=q('#labBadge'),eventCount=q('#labEventCount');
const run=q('#labRun'),step=q('#labStep'),resetBtn=q('#labReset'),failure=q('#injectFailure');
let phase=0,auto=false,timer=0,failedOnce=false,history=[];
const events=['labStartMsg','labValidateMsg','labStoreMsg','labQueueMsg','labDeliverMsg','labDoneMsg'];
function logRender(){log.replaceChildren();if(!history.length){const li=document.createElement('li');li.textContent=t('labIdle');log.appendChild(li);}else{history.forEach(({key},index)=>{const li=document.createElement('li');li.textContent=`${String(index+1).padStart(2,'0')}  ${t(key)}`;log.appendChild(li);});}log.scrollTop=log.scrollHeight;eventCount.textContent=`${String(history.length).padStart(2,'0')} ${t('labEvents')}`;}
function ui(){nodes.forEach((n,i)=>{n.classList.toggle('active',i===phase&&phase<6);n.classList.toggle('done',i<phase);n.classList.toggle('retry',i===4&&failedOnce&&phase===4);});badge.textContent=phase===6?t('labFinished'):(auto?t('labRunning'):t('labReady'));step.disabled=phase===6;run.disabled=phase===6;failure.disabled=phase>0;logRender();}
function advance(){if(phase>=6){halt();return;}
 if(phase===4&&failure.checked&&!failedOnce){history.push({key:'labFailureMsg'});failedOnce=true;ui();return;}
 if(phase===4&&failedOnce)history.push({key:'labRetryMsg'});
 else history.push({key:events[phase]});
 phase++;ui();if(phase>=6){history.push({key:'labDoneNote'});halt();ui();}}
function halt(){auto=false;clearTimeout(timer);timer=0;}
function schedule(){if(!auto)return;if(phase>=6){halt();ui();return;}timer=setTimeout(()=>{advance();schedule();},650);}
run.addEventListener('click',()=>{if(phase===6)return;halt();auto=true;ui();schedule();});
step.addEventListener('click',()=>{halt();advance();ui();});
resetBtn.addEventListener('click',()=>{halt();phase=0;failedOnce=false;history=[];failure.disabled=false;ui();});
document.addEventListener('portfolio:locale',ui);
window.addEventListener('pagehide',halt);
ui();
})();
