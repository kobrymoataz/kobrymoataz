/* V28 · Workflow & Observability engine.
   Runs real state transitions over browser-local files. No network requests are issued.
   Graph controls determine which stages are executed; events and metrics are derived
   from jobs rather than pre-populated demo counters. */
(() => {
'use strict';
const Engine=window.MKStudioEngine;
if(!Engine)return;
const PHASES=['INTAKE','VALIDATE','STORE','QUEUE','DELIVER','VERIFY'];
const OPTIONAL=new Set(['STORE','QUEUE','VERIFY']);
const POSITIONS=[[78,84],[372,84],[668,84],[668,255],[372,255],[78,255]];
const copy=x=>JSON.parse(JSON.stringify(x));
const now=()=>new Date().toISOString();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const defaultFlow=()=>({version:28,order:[...PHASES],nodes:Object.fromEntries(PHASES.map((id,i)=>[id,{id,enabled:true,x:POSITIONS[i][0],y:POSITIONS[i][1]}])),editedAt:now()});
const knownStatus=new Set(['QUEUED','RUNNING','RETRY_WAIT','REVIEW','PAUSED','DELIVERED','FAILED','CANCELLED']);
const terminalStatus=new Set(['DELIVERED','FAILED','CANCELLED']);
function ensureFlow(state){
 if(!state.flow||!Array.isArray(state.flow.order)||!state.flow.nodes)state.flow=defaultFlow();
 const found=state.flow.order.filter(id=>PHASES.includes(id));
 state.flow.order=[...new Set([...found,...PHASES])];
 // The pipeline has a mandatory intake, validation and delivery stage.
 state.flow.order= ['INTAKE','VALIDATE',...state.flow.order.filter(id=>id==='STORE'||id==='QUEUE'),'DELIVER','VERIFY'];
 const fallback=defaultFlow();
 for(const id of PHASES){const n=state.flow.nodes[id];state.flow.nodes[id]={id,enabled:OPTIONAL.has(id)?n?.enabled!==false:true,x:clamp(Number.isFinite(n?.x)?n.x:fallback.nodes[id].x,26,780),y:clamp(Number.isFinite(n?.y)?n.y:fallback.nodes[id].y,22,329)};}
 if(!Array.isArray(state.jobs))state.jobs=[];
 if(!Array.isArray(state.events))state.events=[];
 return state.flow;
}
function parseConfig(engine){let cfg;try{cfg=JSON.parse(engine.read('config.json'));}catch(e){throw Error('config.json is not valid JSON: '+e.message);}
 if(!cfg||typeof cfg!=='object'||Array.isArray(cfg))throw Error('config.json must be an object');
 if(!Number.isInteger(cfg.retryLimit)||cfg.retryLimit<0||cfg.retryLimit>8)throw Error('retryLimit must be 0–8');
 if(!Number.isInteger(cfg.latencyMs)||cfg.latencyMs<30||cfg.latencyMs>3000)throw Error('latencyMs must be 30–3000');
 cfg.backoffMs=cfg.backoffMs===undefined?180:Number(cfg.backoffMs);
 if(!Number.isInteger(cfg.backoffMs)||cfg.backoffMs<50||cfg.backoffMs>5000)throw Error('backoffMs must be 50–5000');
 for(const key of ['requireReference','requireHumanReview','simulateDeliveryFailureOnce']){if(cfg[key]!==undefined&&typeof cfg[key]!=='boolean')throw Error(key+' must be true or false');}
 return cfg;}
function parseRequest(engine){let payload;try{payload=JSON.parse(engine.read('data/request.json'));}catch(e){throw Error('data/request.json is not valid JSON: '+e.message);}if(!payload||Array.isArray(payload)||typeof payload!=='object')throw Error('Request must be a JSON object');return payload;}
function event(engine,job,level,message,stage=job.stage){const e={seq:engine.state.events.length?Math.max(...engine.state.events.slice(-1).map(x=>x.seq||0))+1:1,at:now(),job:job.id,id:job.id,stage,level,message,run:job.runCount||1};job.events??=[];job.events.push(e);engine.state.events.push(e);if(engine.state.events.length>800)engine.state.events.splice(0,engine.state.events.length-800);engine.emit('event',e);return e;}
function finish(engine,job,status,message,level){job.status=status;job.updated=now();job.completedAt=job.updated;job.durationMs=Math.max(0,Date.parse(job.completedAt)-Date.parse(job.startedAt||job.created));if(message)event(engine,job,level||'info',message);engine.emit('job',job);engine.activeJobId=null;engine.save();setTimeout(()=>engine.flowPump(),0);}
const baseInit=Engine.prototype.init;
Engine.prototype.init=async function(){await baseInit.call(this);ensureFlow(this.state);this.activeJobId=null;this.flowTimeouts=new Map();this.flowTick=null;let changed=false;
 for(const j of this.state.jobs){if(!knownStatus.has(j.status))continue;
  // V27 exports did not contain a graph snapshot on each job. Keep them readable
  // and safely resumable without changing completed outcomes.
  if(!Array.isArray(j.plan)){j.plan=this.flowPlan();let cfg={},payload={};
    try{cfg=JSON.parse(this.state.files['config.json']);}catch(_){}
    try{payload=JSON.parse(this.state.files['data/request.json']);}catch(_){}
    j.configuration={retryLimit:2,latencyMs:180,backoffMs:180,...cfg};j.payload=payload;
    j.runCount=1;j.startedAt=j.created||now();j.events??=[];changed=true;
  }
  if(['RUNNING','RETRY_WAIT','QUEUED'].includes(j.status)){
    j.status='PAUSED';j.nextAttemptAt=null;j.updated=now();changed=true;
  }
 }
 if(changed)await this.save();return this.state;};
Engine.prototype.flowGraph=function(){return ensureFlow(this.state);};
Engine.prototype.flowPlan=function(){const f=this.flowGraph();return f.order.filter(id=>f.nodes[id].enabled);};
Engine.prototype.flowEditStage=async function(id,enabled){const flow=this.flowGraph();if(!PHASES.includes(id))throw Error('Unknown stage');if(!OPTIONAL.has(id))throw Error('This stage is required');flow.nodes[id].enabled=Boolean(enabled);flow.editedAt=now();this.emit('flow',copy(flow));await this.save();};
Engine.prototype.flowMove=async function(id,direction){if(!['STORE','QUEUE'].includes(id))throw Error('Only optional storage/queue order can be swapped');const flow=this.flowGraph();const index=flow.order.indexOf(id),other=index+direction;if(other<0||other>=flow.order.length||!['STORE','QUEUE'].includes(flow.order[other]))throw Error('Keep required stages in a safe order');[flow.order[index],flow.order[other]]=[flow.order[other],flow.order[index]];flow.editedAt=now();this.emit('flow',copy(flow));await this.save();};
Engine.prototype.flowPosition=async function(id,x,y){const flow=this.flowGraph();if(!PHASES.includes(id))throw Error('Unknown stage');flow.nodes[id].x=clamp(Math.round(x),26,780);flow.nodes[id].y=clamp(Math.round(y),22,329);flow.editedAt=now();this.emit('flow',copy(flow));await this.save();};
Engine.prototype.flowReset=async function(){this.state.flow=defaultFlow();this.emit('flow',copy(this.state.flow));await this.save();};
Engine.prototype.flowSettings=()=>PHASES;
Engine.prototype.flowUpdateConfig=async function(patch){const cfg=parseConfig(this);for(const [key,value] of Object.entries(patch)){if(!['retryLimit','latencyMs','backoffMs','requireReference','requireHumanReview','simulateDeliveryFailureOnce'].includes(key))throw Error('Unsupported setting: '+key);cfg[key]=value;}
 const temp={...cfg};if(!Number.isInteger(temp.retryLimit)||temp.retryLimit<0||temp.retryLimit>8||!Number.isInteger(temp.latencyMs)||temp.latencyMs<30||temp.latencyMs>3000||!Number.isInteger(temp.backoffMs)||temp.backoffMs<50||temp.backoffMs>5000)throw Error('Invalid numeric configuration');await this.write('config.json',JSON.stringify(cfg,null,2)+'\n');this.emit('flow-settings',cfg);return cfg;};
Engine.prototype.flowMetrics=function(){const jobs=this.state.jobs,done=jobs.filter(j=>terminalStatus.has(j.status)),times=jobs.filter(j=>j.status==='DELIVERED'&&Number.isFinite(j.durationMs)).map(j=>j.durationMs).sort((a,b)=>a-b);const count=(s)=>jobs.filter(j=>j.status===s).length;return {total:jobs.length,queued:count('QUEUED')+count('RUNNING')+count('RETRY_WAIT'),review:count('REVIEW'),paused:count('PAUSED'),delivered:count('DELIVERED'),failed:count('FAILED'),cancelled:count('CANCELLED'),retries:jobs.reduce((sum,j)=>sum+(j.retries||0),0),events:this.state.events.length,successRate:done.length?Math.round(100*count('DELIVERED')/done.length):null,avgMs:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null,p95Ms:times.length?times[Math.ceil(times.length*.95)-1]:null,deadLetters:jobs.filter(j=>j.status==='FAILED').length};};
Engine.prototype.flowTrace=function(id){const j=this.state.jobs.find(j=>j.id===id);if(!j)throw Error('Unknown job '+id);return {schema:'mk-flow-trace-v28',exportedAt:now(),runtime:'browser-local (no HTTP or email)',job:copy(j)};};
Engine.prototype.flowMark=function(job,message,level='info'){event(this,job,level,message,job.stage);job.updated=now();this.emit('job',job);this.save();};
Engine.prototype.flowPump=function(){if(!this.state.flow)return;if(this.activeJobId){const current=this.state.jobs.find(j=>j.id===this.activeJobId);if(current&&current.status==='RUNNING')return;this.activeJobId=null;}
 const job=this.state.jobs.find(j=>j.status==='QUEUED');if(!job)return;
 this.activeJobId=job.id;job.status='RUNNING';job.stage=job.plan[job.step]||'COMPLETE';job.updated=now();this.flowMark(job,'Job dequeued; starting '+job.stage);
 const delay=Math.max(30,Math.min(3000,job.configuration.latencyMs));this.jobTimer=setTimeout(()=>this.flowStep(job.id),delay);
};
Engine.prototype.flowStep=async function(id){const job=this.state.jobs.find(j=>j.id===id);if(!job||job.status!=='RUNNING'||this.activeJobId!==id)return;
 const stage=job.plan[job.step];if(!stage){finish(this,job,'DELIVERED','Workflow completed in local browser. No external delivery.');return;}
 job.stage=stage;const cfg=job.configuration,payload=job.payload;
 if(stage==='VALIDATE'){
  if(job.scenario==='missing'||(cfg.requireReference!==false&&(!payload.reference||typeof payload.reference!=='string'))||typeof payload.email!=='string'||!/^\S+@\S+\.\S+$/.test(payload.email)){
   event(this,job,'error','Validation failed: missing reference or invalid email.');
   await this.flowDeadLetter(job,'Invalid input');finish(this,job,'FAILED','Job moved to the local dead-letter ledger.','error');return;
  }
 }
 if(stage==='STORE'){const path='data/records/'+job.id.toLowerCase()+'.json';this.state.files[path]=JSON.stringify({job:job.id,reference:payload.reference,email:payload.email,storedAt:now()},null,2)+'\n';this.emit('file',path);}
 if(stage==='QUEUE'){const path='data/outbox/'+job.id.toLowerCase()+'.json';this.state.files[path]=JSON.stringify({job:job.id,kind:'local-delivery',queuedAt:now(),status:'queued'},null,2)+'\n';this.emit('file',path);}
 if(stage==='DELIVER'){
  job.attempts++;
  const shouldFail=(job.scenario==='retry'&&job.attempts===1)||(job.scenario==='exhausted')||(job.scenario==='normal'&&cfg.simulateDeliveryFailureOnce===true&&job.attempts===1);
  if(shouldFail){event(this,job,'warn','Local delivery attempt '+job.attempts+' failed (controlled fault injection).');
   if(job.retries<cfg.retryLimit){job.retries++;job.status='RETRY_WAIT';job.nextAttemptAt=new Date(Date.now()+Math.min(15000,cfg.backoffMs*Math.pow(2,job.retries-1))).toISOString();event(this,job,'warn','Backoff scheduled; retry '+job.retries+' of '+cfg.retryLimit+' at '+job.nextAttemptAt);job.updated=now();this.activeJobId=null;await this.save();this.emit('job',job);
     const wait=Math.max(50,Date.parse(job.nextAttemptAt)-Date.now());const timer=setTimeout(async()=>{this.flowTimeouts.delete(job.id);if(job.status!=='RETRY_WAIT')return;job.status='QUEUED';job.nextAttemptAt=null;event(this,job,'info','Retry became eligible and re-entered the queue.');await this.save();this.emit('job',job);this.flowPump();},wait);this.flowTimeouts.set(job.id,timer);this.flowPump();return;
   }
   await this.flowDeadLetter(job,'Retry budget exhausted');finish(this,job,'FAILED','Retry budget exhausted; local dead-letter record created.','error');return;
  }
  if(this.state.files['data/outbox/'+job.id.toLowerCase()+'.json']){const p='data/outbox/'+job.id.toLowerCase()+'.json';const x=JSON.parse(this.state.files[p]);x.status='acknowledged-locally';x.acknowledgedAt=now();this.state.files[p]=JSON.stringify(x,null,2)+'\n';this.emit('file',p);}
 }
 if(stage==='VERIFY'&&(job.scenario==='review'||cfg.requireHumanReview===true)&&!job.approved){job.status='REVIEW';job.updated=now();event(this,job,'warn','Awaiting explicit human approval in this browser.');this.activeJobId=null;await this.save();this.emit('job',job);this.flowPump();return;}
 job.step++;
 event(this,job,'info',stage+' complete'+(stage==='DELIVER'?' — local acknowledgement only.':'.'));
 job.updated=now();await this.save();this.emit('job',job);
 if(job.step>=job.plan.length){finish(this,job,'DELIVERED','Trace closed. No real webhook or message was sent.','info');}
 else{this.jobTimer=setTimeout(()=>this.flowStep(job.id),Math.max(30,Math.min(3000,cfg.latencyMs)));}
};
Engine.prototype.flowDeadLetter=async function(job,reason){const p='data/dead-letter/'+job.id.toLowerCase()+'.json';this.state.files[p]=JSON.stringify({job:job.id,reason,run:job.runCount||1,retryAttempts:job.retries,failedAt:now(),reference:job.payload?.reference||null},null,2)+'\n';this.emit('file',p);};
Engine.prototype.runWorkflow=async function(scenario='normal'){
 if(!['normal','retry','missing','review','exhausted'].includes(scenario))throw Error('Choose normal, retry, missing, review or exhausted');
 const cfg=parseConfig(this),payload=parseRequest(this),plan=this.flowPlan();if(!plan.includes('INTAKE')||!plan.includes('VALIDATE')||!plan.includes('DELIVER'))throw Error('Mandatory stage missing');
 if(this.state.jobs.length>=100)throw Error('100 job history limit reached; export then reset the workspace');
 const id='JOB-'+String(this.state.nextJob++).padStart(4,'0'),timestamp=now();
 const job={id,scenario,status:'QUEUED',stage:'WAITING',step:0,plan:[...plan],configuration:copy(cfg),payload:copy(payload),graphRevision:this.state.flow.editedAt||timestamp,attempts:0,retries:0,approved:false,created:timestamp,startedAt:timestamp,updated:timestamp,completedAt:null,durationMs:null,runCount:1,events:[]};
 this.state.jobs.push(job);event(this,job,'info','Job queued with snapshot of config, request and graph.');await this.save();this.emit('job',job);this.flowPump();return id;
};
Engine.prototype.flowControl=async function(action,id){const job=this.state.jobs.find(j=>j.id===id);if(!job)throw Error('Unknown job '+id);const active=this.activeJobId===id;
 if(action==='approve'){if(job.status!=='REVIEW')throw Error('Job is not awaiting approval');job.approved=true;job.status='QUEUED';event(this,job,'info','Human approval recorded; re-queued for verification.');}
 else if(action==='pause'){if(!['QUEUED','RUNNING','RETRY_WAIT'].includes(job.status))throw Error('Job cannot be paused in '+job.status);
  if(active){clearTimeout(this.jobTimer);this.activeJobId=null;}const t=this.flowTimeouts?.get(id);if(t){clearTimeout(t);this.flowTimeouts.delete(id);}job.status='PAUSED';job.nextAttemptAt=null;event(this,job,'warn','Job paused by visitor.');}
 else if(action==='resume'){if(job.status!=='PAUSED')throw Error('Job not paused');job.status='QUEUED';event(this,job,'info','Job re-queued after pause.');}
 else if(action==='cancel'){if(terminalStatus.has(job.status))throw Error('Job already completed');if(active){clearTimeout(this.jobTimer);this.activeJobId=null;}const t=this.flowTimeouts?.get(id);if(t){clearTimeout(t);this.flowTimeouts.delete(id);}job.status='CANCELLED';job.completedAt=now();job.durationMs=Math.max(0,Date.parse(job.completedAt)-Date.parse(job.startedAt||job.created));event(this,job,'warn','Job cancelled by visitor.');}
 else if(action==='retry'){if(job.status!=='FAILED')throw Error('Only failed jobs can be replayed');job.status='QUEUED';job.step=0;job.attempts=0;job.retries=0;job.approved=false;job.runCount=(job.runCount||1)+1;job.startedAt=now();job.completedAt=null;job.durationMs=null;job.nextAttemptAt=null;job.stage='WAITING';event(this,job,'info','Manual replay requested. Original config/payload/graph snapshot retained.');}
 else throw Error('Unknown action '+action);
 job.updated=now();await this.save();this.emit('job',job);this.flowPump();return job;
};
Engine.prototype.approve=async function(id){return this.flowControl('approve',id);};
const baseReset=Engine.prototype.reset;
Engine.prototype.reset=async function(){this.flowTimeouts?.forEach(t=>clearTimeout(t));this.flowTimeouts?.clear();clearTimeout(this.jobTimer);this.activeJobId=null;await baseReset.call(this);ensureFlow(this.state);await this.save();this.emit('flow',this.flowGraph());};
const baseExport=Engine.prototype.export;
Engine.prototype.export=function(){const object=JSON.parse(baseExport.call(this));object.schema='mk-studio-v28';object.formatVersion=28;return JSON.stringify(object,null,2);};
const baseImport=Engine.prototype.import;
Engine.prototype.import=async function(json){this.flowTimeouts?.forEach(t=>clearTimeout(t));this.flowTimeouts?.clear();clearTimeout(this.jobTimer);this.activeJobId=null;
 if(!['mk-studio-v27','mk-studio-v28'].includes(json?.schema))throw Error('Expected a V27 or V28 studio export');
 // The compatible V27 object-store validator already checks file paths and size.
 await baseImport.call(this,{...json,schema:'mk-studio-v27'});ensureFlow(this.state);for(const job of this.state.jobs){if(['RUNNING','RETRY_WAIT','QUEUED'].includes(job.status))job.status='PAUSED';}
 await this.save();this.emit('flow',this.flowGraph());};
window.MKFlowEngineVersion='V28';
})();
