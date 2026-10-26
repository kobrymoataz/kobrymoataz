/**
 * V31.0 Automation Reliability Studio: deterministic, offline n8n export analysis.
 * This is static analysis; it does NOT execute workflows, contact n8n, or certify security.
 * Deliberately preserve unknown custom/community node settings as unknown rather than unsafe.
 */
export const LIMITS=Object.freeze({bytes:2_000_000,nodes:320,connections:2400});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const maxString=(v,max=150)=>String(v??'').slice(0,max);
export function importWorkflow(input){
  if(typeof input!=='string')throw Error('Expected JSON text from an n8n workflow export.');
  if(new TextEncoder().encode(input).length>LIMITS.bytes)throw Error('File exceeds the 2 MB local analysis limit.');
  let doc;try{doc=JSON.parse(input)}catch{throw Error('Invalid JSON. Export a workflow from n8n as JSON.');}
  return validateWorkflow(doc);
}
export function validateWorkflow(doc){
  if(!isObj(doc)||!Array.isArray(doc.nodes)||!isObj(doc.connections))throw Error('This is not a supported n8n workflow export: nodes[] and connections{} are required.');
  if(doc.nodes.length>LIMITS.nodes)throw Error(`Workflow exceeds the ${LIMITS.nodes}-node analysis limit.`);
  if(Array.from(doc.nodes).some(n=>!isObj(n)||typeof n.name!=='string'||!n.name.trim()||typeof n.type!=='string'||!n.type.trim()))throw Error('Every workflow node must have a name and type.');
  let links=0;
  for(const group of Object.values(doc.connections)){
    if(!isObj(group))throw Error('Invalid workflow connections structure.');
    for(const channels of Object.values(group)){
      if(!Array.isArray(channels))throw Error('Invalid connection channel.');
      for(const lane of channels){
        if(!Array.isArray(lane))throw Error('Invalid connection lane.');
        links+=lane.length;
        if(links>LIMITS.connections)throw Error('Workflow exceeds the connection limit.');
        for(const edge of lane)if(!isObj(edge)||typeof edge.node!=='string')throw Error('Invalid connection target.');
      }
    }
  }
  return doc;
}
function collectEdges(doc){
  const edges=[];
  for(const [source,channels] of Object.entries(doc.connections)){
    for(const [kind,lanes] of Object.entries(channels)){
      lanes.forEach((lane,sourceOutput)=>lane.forEach((link)=>edges.push({source,target:link.node,kind,sourceOutput,targetInput:Number(link.index)||0})));
    }
  }
  return edges;
}
const isTrigger=n=>/(^|\.)((webhook|scheduleTrigger|manualTrigger|errorTrigger|.*Trigger))$/i.test(n.type)&&!n.disabled;
const isHttp=n=>/\.httpRequest$/i.test(n.type);
const isWebhook=n=>/\.webhook$/i.test(n.type);
const nonDisabled=n=>!n.disabled;
function embeddedSecretPaths(root){
  const found=[];
  const walk=(v,path,depth)=>{
    if(depth>9||found.length>=8||!isObj(v)&&!Array.isArray(v))return;
    for(const [k,x] of Object.entries(v).slice(0,200)){
      const full=`${path}.${k}`;
      if(typeof x==='string'&&/(password|secret|api[_-]?key|access[_-]?token|private[_-]?key|authorization)/i.test(k)
        &&x.trim()&&!/^=?\s*\{\{|^\$env\b|^\$credentials\b|^YOUR_|^REPLACE_|^<.*>$|^\*+$/.test(x.trim()))found.push(full);
      else if((Array.isArray(x)||isObj(x)))walk(x,full,depth+1);
    }
  };
  walk(root,'parameters',0);return found;
}
const result=(id,severity,title,detail,action,node=null,scope='static')=>({id,severity,title,detail,action,nodeId:node?.id??null,nodeName:node?.name??null,scope});
export function analyzeWorkflow(input){
 const doc=validateWorkflow(input);const nodes=doc.nodes,edges=collectEdges(doc),byName=new Map(),findings=[];
 const add=(id,sev,title,detail,action,n=null)=>findings.push(result(id,sev,title,detail,action,n));
 const ids=new Set();const active=nodes.filter(nonDisabled);
 nodes.forEach((n,i)=>{
   if(byName.has(n.name))add(`duplicate-name-${i}`,'critical','Duplicate node name',`The name “${maxString(n.name)}” occurs more than once; n8n connections refer to names.`, 'Give every node a unique name.',n);
   else byName.set(n.name,n);
   if(typeof n.id==='string'){
     if(ids.has(n.id))add(`duplicate-id-${i}`,'warning','Duplicate node identifier','Two nodes share the same identifier.','Assign unique node IDs in n8n before import.',n);
     ids.add(n.id);
   }
 });
 const validEdges=[];
 edges.forEach((e,i)=>{
   if(!byName.has(e.source)||!byName.has(e.target))add(`dangling-${i}`,'critical','Broken connection',`Connection ${maxString(e.source)} → ${maxString(e.target)} references a missing node.`, 'Reconnect or remove the broken edge.');
   else validEdges.push(e);
 });
 const activeNames=new Set(active.map(n=>n.name));
 const triggers=active.filter(isTrigger);
 if(!triggers.length)add('no-trigger','warning','No enabled trigger detected','No recognized enabled trigger node was found. This may be intentional for a sub-workflow or a custom trigger.','Check how this workflow is invoked.');
 const adjacency=new Map(nodes.map(n=>[n.name,[]]));
 validEdges.forEach(e=>adjacency.get(e.source).push(e.target));
 const visited=new Set(),stack=triggers.map(n=>n.name);
 while(stack.length){const name=stack.pop();if(visited.has(name))continue;visited.add(name);for(const target of adjacency.get(name)||[])if(!visited.has(target))stack.push(target);}
 for(const n of active){
   if(triggers.length&&!visited.has(n.name))add(`unreachable-${maxString(n.id??n.name)}`,'warning','Node unreachable from recognized triggers',`“${maxString(n.name)}” is not connected to an enabled recognized trigger. This may be intentional for an external sub-workflow.`, 'Inspect the entry point and connect the node if it must execute.',n);
   if(isWebhook(n)&&(!n.parameters?.authentication||n.parameters.authentication==='none'))add(`webhook-auth-${maxString(n.id??n.name)}`,'warning','Webhook authentication not configured',`“${maxString(n.name)}” has no explicit authentication in its exported parameters; downstream protection cannot be checked here.`, 'If appropriate, configure webhook authentication in n8n and restrict its exposure.',n);
   if(isHttp(n)){
     if(n.retryOnFail!==true)add(`http-retry-${maxString(n.id??n.name)}`,'warning','HTTP request retry disabled',`“${maxString(n.name)}” does not enable n8n's retryOnFail option.`, 'Consider bounded retries for transient failures, only when requests are safe to retry.',n);
     if(n.retryOnFail===true&&(!Number.isInteger(n.maxTries)||n.maxTries<2))add(`retry-count-${maxString(n.id??n.name)}`,'info','Review retry count',`“${maxString(n.name)}” has retries enabled without an explicit count of at least 2.`, 'Set an explicit maxTries according to the request type.',n);
   }
   if(n.continueOnFail===true||n.onError==='continueRegularOutput')add(`continue-failure-${maxString(n.id??n.name)}`,'info','Failure continuation enabled',`“${maxString(n.name)}” may continue execution after an error.`, 'Ensure downstream nodes handle failure states and do not treat errors as success.',n);
   const paths=embeddedSecretPaths(n.parameters||{});
   if(paths.length)add(`embedded-values-${maxString(n.id??n.name)}`,'warning','Potential sensitive literal in parameters',`“${maxString(n.name)}” contains ${paths.length} field(s) with credential-like names and literal values; values are never shown in this report. This is heuristic and can be a false positive.`, 'Review the fields locally and use n8n credentials or environment-based references where appropriate.',n);
 }
 // Cycle check: an active graph can intentionally contain cycles; report advisory only.
 const color=new Map();let cycle=false;
 const visit=name=>{color.set(name,1);for(const dst of adjacency.get(name)||[]){if(!activeNames.has(dst))continue;if(color.get(dst)===1)cycle=true;else if(!color.has(dst))visit(dst);}color.set(name,2);};
 for(const n of active)if(!color.has(n.name))visit(n.name);
 if(cycle)add('cycle','info','Cycle detected','The active connection graph includes a cycle. Some feedback structures are intentional, but a cycle can cause repeated work.','Review termination conditions and backoff.');
 if(!doc.settings?.errorWorkflow&&active.some(n=>isHttp(n)||isWebhook(n)))add('error-workflow','info','No workflow-level error workflow configured','The exported settings do not name an errorWorkflow. This is not proof that monitoring is absent.','Consider a dedicated error workflow and incident notification appropriate for production.');
 const counts={critical:0,warning:0,info:0};for(const f of findings)counts[f.severity]++;
 return {schema:'mk-automation-audit/v31',name:maxString(doc.name||'Untitled workflow'),sample:doc.__mkSample===true,createdAt:new Date().toISOString(),nodeCount:nodes.length,enabledNodes:active.length,edgeCount:edges.length,recognizedTriggers:triggers.length,counts,findings,graph:{nodes:nodes.map((n,i)=>({id:String(n.id??`node-${i}`),name:n.name,type:n.type,disabled:!!n.disabled,trigger:isTrigger(n)})),edges:validEdges},limitations:['Static analysis only; no n8n execution, deployment, credential access or runtime telemetry.','Custom/community node behavior and external protections cannot be verified from an export.','No workflow data is sent by this tool; exports you download may contain confidential parameters.']};
}
export function updateNodeReliability(input,nodeId,patch){
 const doc=validateWorkflow(input);
 const matches=doc.nodes.filter((n,i)=>String(n.id??`node-${i}`)===nodeId);
 if(matches.length!==1)throw Error('Choose one valid node to edit.');
 if(!isObj(patch))throw Error('Invalid settings patch.');
 const safeKeys=['retryOnFail','maxTries','waitBetweenTries','onError'];if(Object.keys(patch).some(k=>!safeKeys.includes(k)))throw Error('Unsupported property.');
 if(own(patch,'retryOnFail')&&typeof patch.retryOnFail!=='boolean')throw Error('retryOnFail must be true or false.');
 if(own(patch,'maxTries')&&(!Number.isInteger(patch.maxTries)||patch.maxTries<1||patch.maxTries>5))throw Error('maxTries must be from 1 to 5.');
 if(own(patch,'waitBetweenTries')&&(!Number.isInteger(patch.waitBetweenTries)||patch.waitBetweenTries<0||patch.waitBetweenTries>60000))throw Error('waitBetweenTries must be from 0 to 60000 ms.');
 if(own(patch,'onError')&&!['stopWorkflow','continueRegularOutput','continueErrorOutput'].includes(patch.onError))throw Error('Unsupported onError choice.');
 const updated=JSON.parse(JSON.stringify(doc));const idx=doc.nodes.indexOf(matches[0]);
 for(const [key,value]of Object.entries(patch))updated.nodes[idx][key]=value;
 validateWorkflow(updated);return updated;
}
export function createSampleWorkflow(){return {
 __mkSample:true,name:'Sample / retry hardening exercise',active:false,settings:{executionOrder:'v1'},
 nodes:[
  {id:'trigger-1',name:'Incoming webhook',type:'n8n-nodes-base.webhook',typeVersion:2,position:[200,240],parameters:{httpMethod:'POST',path:'example-intake',authentication:'none'}},
  {id:'http-1',name:'Send to API',type:'n8n-nodes-base.httpRequest',typeVersion:4,position:[490,240],parameters:{method:'POST',url:'https://example.com/api/events'},retryOnFail:false},
  {id:'done-1',name:'Finalize',type:'n8n-nodes-base.noOp',typeVersion:1,position:[780,240],parameters:{}}
 ],connections:{'Incoming webhook':{main:[[{node:'Send to API',type:'main',index:0}]]},'Send to API':{main:[[{node:'Finalize',type:'main',index:0}]]}},pinData:{},tags:[]};}
export function reportAsHtml(report){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const parts=report.findings.map(f=>`<section><h3>${esc(f.title)} <small>${esc(f.severity)}</small></h3><p>${esc(f.nodeName||'Workflow')} · ${esc(f.detail)}</p><p><strong>Next step:</strong> ${esc(f.action)}</p></section>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>V31 workflow report</title><style>body{max-width:850px;margin:3rem auto;padding:0 1.5rem;color:#24303a;font:15px/1.65 system-ui}h1{font:2.1rem Georgia,serif}section{padding:1rem 0;border-top:1px solid #ddd}small{color:#795a27}footer{margin:2rem 0;color:#59616a}@media print{body{margin:0}}</style><h1>${esc(report.name)}</h1><p>Local static workflow audit · ${esc(report.createdAt)} · ${report.nodeCount} nodes · ${report.edgeCount} edges</p><p>${report.counts.critical} critical · ${report.counts.warning} warnings · ${report.counts.info} advisories</p>${parts}<footer>${report.limitations.map(esc).join(' ')}</footer></html>`;
}
/**
 * Optional local n8n execution summary. Raw item/output JSON is never included
 * in this return value. This is NOT a live monitor or replay engine.
 */
export function summarizeExecution(input,workflow){
 if(typeof input!=='string')throw Error('Expected an n8n execution JSON file.');
 if(new TextEncoder().encode(input).length>LIMITS.bytes)throw Error('Execution file exceeds the 2 MB limit.');
 let doc;try{doc=JSON.parse(input)}catch{throw Error('Execution file is not valid JSON.');}
 if(!isObj(doc))throw Error('Expected an execution JSON object.');
 const runData=doc?.data?.resultData?.runData??doc?.resultData?.runData??doc?.runData;
 if(!isObj(runData))throw Error('No n8n resultData.runData execution record was found.');
 const records=[];let count=0;
 const names=new Set(workflow?.nodes?.map(n=>n.name)||[]);
 for(const [nodeName,runs]of Object.entries(runData)){
   if(!Array.isArray(runs))continue;
   for(const run of runs){
     if(!isObj(run))continue;
     if(++count>LIMITS.connections)throw Error('Execution contains too many run records.');
     const duration=Number(run.executionTime),error=isObj(run.error)?run.error:null;
     // Explicit allowlist: never expose input/output payloads, tokens or stack traces.
     records.push({nodeName:maxString(nodeName),knownNode:names.has(nodeName),startTime:typeof run.startTime==='string'?maxString(run.startTime,64):null,durationMs:Number.isFinite(duration)&&duration>=0?Math.min(duration,86400000):null,status:error?'error':'completed',errorType:error?maxString(error.name||'NodeError',60):null});
   }
 }
 records.sort((a,b)=>String(a.startTime||'').localeCompare(String(b.startTime||'')));
 return {schema:'mk-automation-execution-summary/v31',executionId:typeof doc.id==='string'||typeof doc.id==='number'?maxString(doc.id,60):null,executionStatus:typeof doc.status==='string'?maxString(doc.status,60):null,inspectedAt:new Date().toISOString(),runCount:records.length,failedRuns:records.filter(x=>x.status==='error').length,records,limitations:['Imported n8n execution snapshot only; not a live connection or replay.','Raw inputs, outputs, errors, stack traces and credential values are intentionally excluded.','A completed node run does not prove the entire workflow succeeded.']};
}
