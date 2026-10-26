/**
 * V31.2 Security & Evidence Pack. All parsing and scans run locally.
 * Reports deliberately exclude workflow parameters, raw execution payloads,
 * URLs, headers, credentials and raw third-party evidence.
 * A scan is NOT execution, penetration testing, or a security certification.
 */
import {validateWorkflow, analyzeWorkflow, LIMITS} from './automation-core.mjs';
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeInt=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000?v:0;
const caption=v=>String(v??'').slice(0,120);
const claim=(rule,severity,title,detail,action,node)=>({rule,severity,title,detail,action,nodeName:caption(node?.name),nodeId:node?.id==null?null:caption(node.id),basis:'Imported n8n workflow JSON; static configuration inspection'});
const remoteURL=url=>{if(typeof url!=='string'||url.startsWith('=')||url.includes('{{'))return null;
 try{const parsed=new URL(url);if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')return null;
 return {https:parsed.protocol==='https:',local:['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname.toLowerCase())};
 }catch{return null;}
};
export function inspectSecurity(doc){
 const input=validateWorkflow(doc),findings=[],coverage={inspected:0,unknownDynamicUrls:0,disabled:0};
 for(const n of input.nodes){if(n.disabled){coverage.disabled++;continue;}coverage.inspected++;
  if(!/\.httpRequest$/i.test(n.type))continue;
  const p=isObj(n.parameters)?n.parameters:{};const opts=isObj(p.options)?p.options:{};
  if(opts.allowUnauthorizedCerts===true||opts.ignoreSSLIssues===true||p.ignoreSSLIssues===true||p.allowUnauthorizedCerts===true){
   findings.push(claim('http-tls-verification','warning','TLS certificate verification bypass','An enabled HTTP Request node has a certificate-validation bypass setting enabled.','Review certificate trust and disable the bypass where appropriate.',n));
  }
  const url=remoteURL(p.url);if(url&&!url.https){
   findings.push(claim('http-cleartext',url.local?'info':'warning',url.local?'HTTP loopback endpoint':'Unencrypted HTTP endpoint',url.local?'A literal loopback URL uses HTTP. This may be intentional for a local development service.':'A literal remote HTTP URL is configured. Request contents may not have transport encryption.','Use HTTPS for remote endpoints and verify the service configuration.',n));
  }else if(typeof p.url==='string'&&(p.url.startsWith('=')||p.url.includes('{{'))){coverage.unknownDynamicUrls++;}
  const method=String(p.method??p.requestMethod??'GET').toUpperCase();
  if(n.retryOnFail===true&&['POST','PATCH'].includes(method)){
   findings.push(claim('http-retry-unsafe','warning','Retrying potentially non-idempotent request',`A ${method} request has automatic retry enabled; the export cannot establish whether the target supports idempotency.`, 'Confirm an idempotency key or deduplication mechanism, and bound retry attempts.',n));
  }
  if(n.onError==='continueRegularOutput'&&n.alwaysOutputData===true){
   findings.push(claim('http-ambiguous-failure','info','Error continuation and always-output enabled','This combination can obscure downstream success conditions unless explicitly checked.','Verify downstream branching handles error status.',n));
  }
 }
 const counts={critical:0,warning:0,info:0};for(const f of findings)counts[f.severity]++;
 return {schema:'mk-security-review/v31.2',scope:'Static, read-only analysis of known n8n HTTP Request configuration fields',counts,findings,coverage,limitations:['Dynamic expressions, credentials, upstream proxies and network TLS are not verified.','Unknown and community node types are not judged by these rules.','No requests, execution or active vulnerability testing occur.']};
}
export function importSupplement(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>LIMITS.bytes)throw Error('Evidence file must be JSON under 2 MB.');
 let raw;try{raw=JSON.parse(input)}catch{throw Error('Evidence file is not valid JSON.');}
 if(!isObj(raw))throw Error('Expected a supported TrustOps or RepoVerity JSON report.');
 if(raw.schema==='trustops-audit-v1'&&typeof raw.domain==='string'&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(raw.domain)&&raw.domain.length<=253&&isObj(raw.counts)){
  return {kind:'TrustOps DNS snapshot',source:'imported report, not independently verified',label:caption(raw.domain),partial:raw.partial===true,counts:Object.fromEntries(['pass','warn','fail','unknown'].map(k=>[k,safeInt(raw.counts[k])])),inspectedAt:caption(raw.finishedAt||'not supplied')};
 }
 if(raw.version==='30.2'&&typeof raw.repository==='string'&&/^[a-z0-9-]{1,39}\/[a-z0-9_.-]{1,100}$/i.test(raw.repository)&&Array.isArray(raw.checks)&&Array.isArray(raw.coverage)){
  const counts={observed:0,advisory:0,info:0,unknown:0};for(const c of raw.checks.slice(0,300))if(isObj(c)&&Object.hasOwn(counts,c.status))counts[c.status]++;
  return {kind:'RepoVerity public GitHub snapshot',source:'imported report, not independently verified',label:caption(raw.repository),partial:raw.checks.some(c=>c?.status==='unknown'),counts,inspectedAt:caption(raw.finishedAt||'not supplied')};
 }
 throw Error('Unrecognized report format. Export JSON from TrustOps DNS Audit or RepoVerity Repository Audit.');
}
const key=f=>[f.rule||f.id||'',f.nodeId||f.nodeName||''].join('|');
export function findingDelta(baseline=[],current=[]){
 const before=new Set(baseline.map(key)),after=new Set(current.map(key));
 return {new:current.filter(x=>!before.has(key(x))).map(x=>({rule:x.rule||x.id,severity:x.severity,title:x.title})),resolved:baseline.filter(x=>!after.has(key(x))).map(x=>({rule:x.rule||x.id,severity:x.severity,title:x.title}))};
}
async function sha256(s){
 if(!globalThis.crypto?.subtle?.digest)throw Error('SHA-256 is unavailable in this browser context. Open this page over HTTPS.');
 const bytes=new TextEncoder().encode(s),sum=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(sum),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function buildEvidencePack(doc,{baseline=[],execution=null,supplement=null}={}){
 validateWorkflow(doc);const reliability=analyzeWorkflow(doc),security=inspectSecurity(doc);
 const current=[...reliability.findings.map(f=>({...f,rule:f.id})),...security.findings];
 const nodeRef=f=>{const idx=doc.nodes.findIndex(n=>(f.nodeId!=null&&String(n.id)===String(f.nodeId))||(f.nodeName&&n.name===f.nodeName));return idx<0?'Workflow':`Node ${idx+1}`;};
 const clean=f=>({severity:caption(f.severity),title:caption(f.title),nodeReference:nodeRef(f),basis:caption(f.basis||'Static workflow analysis')});
 const delta=findingDelta(baseline,current),cleanDiff=x=>({severity:caption(x.severity),title:caption(x.title)});
 const digest=await sha256(JSON.stringify(doc));
 return {schema:'mk-evidence-pack/v31.2',generatedAt:new Date().toISOString(),provenance:{workflowSha256:digest,hashMethod:'SHA-256 over current in-memory JSON serialization',workflowName:'Name redacted',sample:doc.__mkSample===true,analyzer:'V31.2 local static analysis; no network or execution'},summary:{nodes:reliability.nodeCount,edges:reliability.edgeCount,reliabilityCounts:reliability.counts,securityCounts:security.counts,securityCoverage:security.coverage},findings:current.map(clean),delta:{new:delta.new.map(cleanDiff),resolved:delta.resolved.map(cleanDiff)},execution:execution?{source:'Imported snapshot, not live monitoring',runCount:safeInt(execution.runCount),failedRuns:safeInt(execution.failedRuns)}:null,supplement:supplement?structuredClone(supplement):null,limitations:['No source workflow, names, credentials, node parameters, execution payload, stack trace, or raw external report is exported.','File integrity fingerprint is not a proof of security or authenticity.','Supplementary imported reports are not reverified, and may be incomplete or outdated.','Absence of a finding does not imply security or runtime reliability.']};
}
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function evidenceHtml(pack){if(pack?.schema!=='mk-evidence-pack/v31.2')throw Error('Unsupported evidence pack.');
 const rows=pack.findings.map(f=>`<tr><td>${escapeHTML(f.severity)}</td><td>${escapeHTML(f.title)}</td><td>${escapeHTML(f.nodeReference)}</td><td>${escapeHTML(f.basis)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>V31.2 Evidence Pack</title><style>body{max-width:960px;margin:2rem auto;padding:0 1.5rem;background:#fff;color:#26313a;font:15px/1.6 system-ui}h1{font:2.2rem Georgia,serif}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}code{overflow-wrap:anywhere}footer{margin-top:30px;color:#56636b}@media print{body{margin:0}}</style><h1>Security & Evidence Pack</h1><p>Local static inspection · ${escapeHTML(pack.generatedAt)}</p><p><strong>Workflow:</strong> ${escapeHTML(pack.provenance.workflowName)}${pack.provenance.sample?' (sample fixture)':''}</p><p><strong>SHA-256:</strong> <code>${escapeHTML(pack.provenance.workflowSha256)}</code></p><p><strong>Security:</strong> ${pack.summary.securityCounts.warning} warnings · ${pack.summary.securityCounts.info} advisories</p><p><strong>Changes:</strong> ${pack.delta.new.length} new · ${pack.delta.resolved.length} resolved findings</p><p><strong>Supplement:</strong> ${escapeHTML(pack.supplement?.kind||'None')} (imported, not reverified)</p><table><thead><tr><th>Severity</th><th>Finding</th><th>Node</th><th>Evidence basis</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No static findings in current rules. Not a safety certification.</td></tr>'}</tbody></table><footer>${pack.limitations.map(escapeHTML).join(' ')}</footer></html>`;
}
