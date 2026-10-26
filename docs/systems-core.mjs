/** V32.1 Systems Operations: compare known exported audit snapshots without network requests.
 * No untrusted raw payloads, credentials or report detail text are retained.
 * Imported reports are user-provided evidence, never independently verified.
 */
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,max=100000)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:null;
const count=(obj,key)=>{const n=int(obj?.[key]);if(n===null)throw Error(`Invalid or missing count: ${key}`);return n;};
const safeDate=v=>typeof v==='string'&&v.length<=40&&!Number.isNaN(Date.parse(v))?new Date(v).toISOString():null;
const validKey=v=>typeof v==='string'&&/^[a-z0-9_-]{1,64}$/i.test(v);
const allowState={dns:['pass','warn','fail','info','unknown'],repo:['observed','advisory','info','unknown']};
export const MAX_FILE_BYTES=2_000_000;
export const MAX_HISTORY=24;
export const SCHEMA='mk-systems-snapshot/v32.1';
export function parseSystemsReport(text,{capturedAt=new Date().toISOString()}={}){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error('Expected a JSON report under 2 MB.');
 let raw;try{raw=JSON.parse(text);}catch{throw Error('Invalid JSON report.');}
 if(!isObj(raw))throw Error('A supported report object is required.');
 const base={schema:SCHEMA,capturedAt:safeDate(capturedAt)||new Date().toISOString(),sourceAt:null,source:'User-imported report; not independently verified',partial:false,metrics:{},signals:[]};
 if(raw.schema==='trustops-audit-v1'){
  if(typeof raw.domain!=='string'||raw.domain.length>253||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(raw.domain))throw Error('Invalid DNS report domain.');
  if(!isObj(raw.counts)||!Array.isArray(raw.findings)||raw.findings.length>200)throw Error('Invalid DNS report structure.');
  const metrics=Object.fromEntries(allowState.dns.map(k=>[k,count(raw.counts,k)]));
  const signals=raw.findings.map(f=>{
   if(!isObj(f)||!validKey(f.id)||!allowState.dns.includes(f.state))throw Error('Invalid DNS finding.');
   return {key:f.id.toLowerCase(),state:f.state};
  });
  if(new Set(signals.map(x=>x.key)).size!==signals.length)throw Error('Repeated DNS finding identifiers.');
  const observed=Object.fromEntries(allowState.dns.map(s=>[s,signals.filter(x=>x.state===s).length]));
  for(const s of allowState.dns)if(observed[s]!==metrics[s])throw Error('DNS finding totals do not match the report counts.');
  return {...base,kind:'dns',target:raw.domain.toLowerCase(),sourceAt:safeDate(raw.finishedAt),partial:raw.partial===true||metrics.unknown>0,metrics,signals};
 }
 if(raw.version==='30.2'){
  if(typeof raw.repository!=='string'||!/^[a-z0-9-]{1,39}\/\.?[a-z0-9_-][a-z0-9_.-]{0,99}$/i.test(raw.repository))throw Error('Invalid GitHub repository identifier.');
  if(!Array.isArray(raw.checks)||!Array.isArray(raw.coverage)||raw.checks.length>250)throw Error('Invalid repository report structure.');
  const seen=new Map();const signals=raw.checks.map(f=>{
   if(!isObj(f)||!validKey(f.key)||!allowState.repo.includes(f.status))throw Error('Invalid repository finding.');
   const key=f.key.toLowerCase();const n=seen.get(key)||0;seen.set(key,n+1);return {key:`${key}:${n}`,state:f.status};
  });
  const metrics=Object.fromEntries(allowState.repo.map(s=>[s,signals.filter(x=>x.state===s).length]));
  return {...base,kind:'repo',target:raw.repository.toLowerCase(),sourceAt:safeDate(raw.finishedAt),partial:metrics.unknown>0||raw.coverage.some(c=>typeof c==='string'&&/unavailable|incomplete|truncated|skipped/i.test(c)),metrics,signals};
 }
 if(raw.schema==='mk-evidence-pack/v31.2'){
  const digest=raw.provenance?.workflowSha256;
  if(typeof digest!=='string'||!/^[a-f\d]{64}$/i.test(digest)||!isObj(raw.summary)||!isObj(raw.summary.reliabilityCounts)||!isObj(raw.summary.securityCounts))throw Error('Invalid redacted Automation evidence pack.');
  const metrics={reliabilityCritical:count(raw.summary.reliabilityCounts,'critical'),reliabilityWarning:count(raw.summary.reliabilityCounts,'warning'),reliabilityInfo:count(raw.summary.reliabilityCounts,'info'),securityCritical:count(raw.summary.securityCounts,'critical'),securityWarning:count(raw.summary.securityCounts,'warning'),securityInfo:count(raw.summary.securityCounts,'info')};
  return {...base,kind:'automation',target:'Redacted workflow',fingerprint:digest.toLowerCase(),sourceAt:safeDate(raw.generatedAt),partial:true,metrics,signals:[]};
 }
 throw Error('Supported exports: TrustOps DNS JSON, RepoVerity repository JSON, or redacted Automation Evidence Pack JSON.');
}
export function validateSnapshot(s){
 if(!isObj(s)||s.schema!==SCHEMA||!['dns','repo','automation'].includes(s.kind)||typeof s.target!=='string'||s.target.length>254||!isObj(s.metrics)||!Array.isArray(s.signals)||s.signals.length>250)throw Error('Invalid stored snapshot.');
 for(const [k,v] of Object.entries(s.metrics))if(!validKey(k)||int(v)===null)throw Error('Invalid stored metrics.');
 for(const sig of s.signals)if(!isObj(sig)||!validKey(sig.key.split(':')[0])||!['pass','warn','fail','info','unknown','observed','advisory'].includes(sig.state))throw Error('Invalid stored finding.');
 return s;
}
export function safeSnapshot(s){
 validateSnapshot(s);
 const allowed=s.kind==='dns'?allowState.dns:s.kind==='repo'?allowState.repo:['reliabilityCritical','reliabilityWarning','reliabilityInfo','securityCritical','securityWarning','securityInfo'];
 const metrics={};for(const k of allowed){const v=s.metrics[k];if(int(v)===null)throw Error('Corrupt stored metrics.');metrics[k]=v;}
 if(s.kind==='dns'&&!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(s.target))throw Error('Invalid stored DNS target.');
 if(s.kind==='repo'&&!/^[a-z0-9-]{1,39}\/[a-z0-9_.-]{1,100}$/i.test(s.target))throw Error('Invalid stored repository target.');
 if(s.kind==='automation'&&s.target!=='Redacted workflow')throw Error('Invalid stored workflow target.');
 const signals=s.signals.map(x=>({key:String(x.key).slice(0,72),state:x.state}));
 return {schema:SCHEMA,kind:s.kind,target:s.target,partial:s.partial===true,source:'User-imported report; not independently verified',sourceAt:safeDate(s.sourceAt),capturedAt:safeDate(s.capturedAt)||new Date().toISOString(),metrics,signals,...(s.kind==='automation'&&/^[a-f0-9]{64}$/.test(s.fingerprint||'')?{fingerprint:s.fingerprint}:{})};
}
export function compareSnapshots(before,after){
 validateSnapshot(before);validateSnapshot(after);
 if(before.kind!==after.kind||before.target!==after.target)throw Error('Choose two snapshots of the same system target and report type.');
 const metrics={};for(const key of new Set([...Object.keys(before.metrics),...Object.keys(after.metrics)])){
  const old=before.metrics[key]??0,now=after.metrics[key]??0;metrics[key]={before:old,after:now,delta:now-old};
 }
 const previous=new Map(before.signals.map(x=>[x.key,x.state]));const current=new Map(after.signals.map(x=>[x.key,x.state]));
 const changes=[];
 for(const key of new Set([...previous.keys(),...current.keys()])){
  const from=previous.get(key)||null,to=current.get(key)||null;
  if(from!==to)changes.push({key,before:from,after:to});
 }
 return {schema:'mk-systems-comparison/v32.1',kind:before.kind,target:before.target,workflowFingerprintsDiffer:before.kind==='automation'&&before.fingerprint!==after.fingerprint,previousAt:before.sourceAt||before.capturedAt,currentAt:after.sourceAt||after.capturedAt,partial:before.partial||after.partial,metrics,changes:changes.slice(0,250),limitations:['Imported snapshots are unverified, may have different collection coverage and do not prove production health.','Counts and observed finding states are compared; changes are not automatically classified as security improvements.','Redacted Automation packs have no stable workflow identifier; comparing two packs does not establish that they describe the same workflow.','Raw report details, workflow parameters, tokens, source URLs and credentials are not retained.']};
}
export function makeRunbook(s){
 validateSnapshot(s);
 const a=[];
 if(s.kind==='dns'){
  if(s.metrics.fail)a.push('sysStepDnsFail');
  if(s.metrics.warn)a.push('sysStepDnsWarn');
  if(s.metrics.unknown||s.partial)a.push('sysStepDnsUnknown');
 }else if(s.kind==='repo'){
  if(s.metrics.advisory)a.push('sysStepRepoAdvisory');
  if(s.metrics.unknown||s.partial)a.push('sysStepRepoUnknown');
 }else{
  if(s.metrics.securityWarning||s.metrics.securityCritical)a.push('sysStepAutoSecurity');
  if(s.metrics.reliabilityCritical||s.metrics.reliabilityWarning)a.push('sysStepAutoReliability');
  a.push('sysStepAutoRecheck');
 }
 if(!a.length)a.push('sysStepNone');
 return a;
}
export function addSnapshot(history,s){
 validateSnapshot(s);
 const clean=history.flatMap(x=>{try{return [safeSnapshot(x)];}catch{return [];}}).slice(0,MAX_HISTORY-1);
 return [safeSnapshot(s),...clean];
}
export function exportComparison(result){
 if(!isObj(result)||result.schema!=='mk-systems-comparison/v32.1')throw Error('No supported comparison to export.');
 return JSON.stringify(result,null,2);
}
