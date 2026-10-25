/* V28 engine regressions: graph edits affect execution, FIFO queue, retry backoff,
   dead-letter, pause/resume, approval, persistence-ready export and trace integrity. */
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const quietConsole={...console,warn:()=>{},info:()=>{}};const ctx={window:{},crypto:webcrypto,indexedDB:undefined,TextEncoder,Uint8Array,DataView,JSON,Date,Math,console:quietConsole,setTimeout,clearTimeout};
vm.createContext(ctx);
for(const file of ['studio-engine.js','studio-flow-engine.js'])vm.runInContext(readFileSync('docs/'+file,'utf8'),ctx,{filename:file});
const make=()=>{const engine=new ctx.window.MKStudioEngine();engine.emit=()=>{};engine.state.flow=null;return engine;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,label,ms=5000){const started=Date.now();while(Date.now()-started<ms){if(predicate())return;await wait(15);}throw Error('Timeout waiting for '+label);}
const setCfg=async(e,patch)=>e.flowUpdateConfig({latencyMs:30,backoffMs:50,retryLimit:1,simulateDeliveryFailureOnce:false,requireHumanReview:false,...patch});

const e=make();
await e.init();
await setCfg(e,{});
assert.deepEqual(Array.from(e.flowPlan()),['INTAKE','VALIDATE','STORE','QUEUE','DELIVER','VERIFY']);
await e.flowEditStage('STORE',false);
assert.deepEqual(Array.from(e.flowPlan()),['INTAKE','VALIDATE','QUEUE','DELIVER','VERIFY']);
const first=await e.runWorkflow('normal');
await until(()=>e.state.jobs.find(j=>j.id===first)?.status==='DELIVERED','normal delivery');
assert.equal(e.state.jobs[0].plan.includes('STORE'),false);
assert.ok(!('data/records/'+first.toLowerCase()+'.json' in e.state.files));
assert.equal(e.state.jobs[0].retries,0);
assert.ok(e.state.jobs[0].events.some(v=>v.stage==='QUEUE'));
await e.flowEditStage('STORE',true);
await e.flowMove('QUEUE',-1);
assert.deepEqual(Array.from(e.flowPlan()),['INTAKE','VALIDATE','QUEUE','STORE','DELIVER','VERIFY']);

const retry=await e.runWorkflow('retry');
const after=await e.runWorkflow('normal');
assert.equal(e.state.jobs.find(j=>j.id===after).status,'QUEUED');
await until(()=>e.state.jobs.find(j=>j.id===retry)?.status==='DELIVERED','retry result');
await until(()=>e.state.jobs.find(j=>j.id===after)?.status==='DELIVERED','queued second job');
const retried=e.state.jobs.find(j=>j.id===retry),second=e.state.jobs.find(j=>j.id===after);
assert.equal(retried.retries,1);assert.equal(retried.attempts,2);
assert.ok(Date.parse(second.completedAt)>0 && Date.parse(retried.completedAt)>0); // queued work may finish while first job waits for retry backoff
assert.deepEqual(Array.from(retried.plan),['INTAKE','VALIDATE','QUEUE','STORE','DELIVER','VERIFY']);
assert.ok(e.state.files['data/records/'+retry.toLowerCase()+'.json']);

const missing=await e.runWorkflow('missing');await until(()=>e.state.jobs.find(j=>j.id===missing)?.status==='FAILED','missing validation');
assert.ok(e.state.files['data/dead-letter/'+missing.toLowerCase()+'.json']);

const review=await e.runWorkflow('review');await until(()=>e.state.jobs.find(j=>j.id===review)?.status==='REVIEW','approval gate');
await e.approve(review);await until(()=>e.state.jobs.find(j=>j.id===review)?.status==='DELIVERED','approved delivery');
const approved=e.state.jobs.find(j=>j.id===review);assert.ok(approved.events.some(x=>x.message.includes('Human approval recorded')));

const exhausted=await e.runWorkflow('exhausted');await until(()=>e.state.jobs.find(j=>j.id===exhausted)?.status==='FAILED','retry budget exhausted');
assert.equal(e.state.jobs.find(j=>j.id===exhausted).attempts,2);
assert.equal(e.state.jobs.find(j=>j.id===exhausted).retries,1);
assert.ok(e.state.files['data/dead-letter/'+exhausted.toLowerCase()+'.json']);

const queued=await e.runWorkflow('normal');const toCancel=await e.runWorkflow('normal');await e.flowControl('cancel',toCancel);
assert.equal(e.state.jobs.find(j=>j.id===toCancel).status,'CANCELLED');
await until(()=>e.state.jobs.find(j=>j.id===queued)?.status==='DELIVERED','active job following cancel');

const paused=await e.runWorkflow('normal');await e.flowControl('pause',paused);
assert.equal(e.state.jobs.find(j=>j.id===paused).status,'PAUSED');await wait(80);assert.equal(e.state.jobs.find(j=>j.id===paused).status,'PAUSED');
await e.flowControl('resume',paused);await until(()=>e.state.jobs.find(j=>j.id===paused)?.status==='DELIVERED','resume');

const cfgFirst=await e.runWorkflow('normal');await e.flowUpdateConfig({retryLimit:0});
await until(()=>e.state.jobs.find(j=>j.id===cfgFirst)?.status==='DELIVERED','snapshot job');
assert.equal(e.state.jobs.find(j=>j.id===cfgFirst).configuration.retryLimit,1);
assert.equal(JSON.parse(e.read('config.json')).retryLimit,0);

const metrics=e.flowMetrics();assert.equal(metrics.total,e.state.jobs.length);assert.ok(metrics.delivered>=5);assert.ok(metrics.failed>=2);assert.ok(metrics.retries>=2);assert.ok(metrics.avgMs>0);assert.ok(metrics.events>15);
const trace=e.flowTrace(retry);assert.equal(trace.schema,'mk-flow-trace-v28');assert.equal(trace.job.id,retry);assert.ok(trace.job.events.length>5);
const exportData=JSON.parse(e.export());assert.equal(exportData.schema,'mk-studio-v28');assert.ok(exportData.state.flow);assert.equal(exportData.state.flow.version,28);

const n=make();await n.init();await n.import(exportData);assert.equal(n.state.jobs.length,e.state.jobs.length);assert.equal(n.flowPlan()[2],'QUEUE');
console.log('V28 FLOW REGRESSION PASS | queue + retry + DLQ + approval + pause/resume + cancel + graph execution + measured metrics + import');
