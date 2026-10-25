/** TrustOps Repository Intelligence V30.2: read-only public evidence with explicit coverage. */
const API='https://api.github.com';
export function parseRepository(input){
 let value=String(input||'').trim().replace(/\/+$/,'');
 if(/^https?:\/\//i.test(value)){
  const url=new URL(value);if(!['github.com','www.github.com'].includes(url.hostname.toLowerCase()))throw Error('Only github.com public repositories are supported.');
  value=url.pathname.replace(/^\/+/, '').split('/').slice(0,2).join('/');
 }
 const m=/^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)\/([a-zA-Z0-9_.-]{1,100})$/.exec(value);
 if(!m||m[2]==='.'||m[2]==='..'||m[2].endsWith('.git')&&m[2].length===4)throw Error('Enter a valid owner/repository (e.g. octocat/Hello-World).');
 return {owner:m[1],name:m[2].replace(/\.git$/,'')};
}
export function dependenciesFromPackageLock(lock,limit=20){
 const out=[];const list=Object.entries(lock?.packages||{});
 for(const [path,info] of list){if(!path.startsWith('node_modules/')||path.includes('/node_modules/',13))continue;
  const name=path.slice(13),v=info?.version;
  if(!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(String(v||'')))continue;
  out.push({name,version:v,ecosystem:'npm',path});if(out.length>=limit)break;
 }
 return out;
}
export function dependenciesFromRequirements(s,limit=20){const out=[];for(const line of String(s||'').split(/\r?\n/)){
 const x=line.trim();if(!x||x.startsWith('#'))continue;
 const m=/^([A-Za-z0-9][A-Za-z0-9_.-]*)==([0-9][A-Za-z0-9._+!-]*)\s*(?:#.*)?$/.exec(x);
 if(m){out.push({name:m[1],version:m[2],ecosystem:'PyPI',path:'requirements.txt'});if(out.length>=limit)break;}
 }return out;}
function evidence(status,source,detail,url=null){return{status,source,detail,url,checkedAt:new Date().toISOString()};}
async function callJSON(url,{fetcher=fetch,signal,timeout=9000,headers={}}={}){
 const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),timeout);const onAbort=()=>ctl.abort();signal?.addEventListener('abort',onAbort,{once:true});
 try{const res=await fetcher(url,{signal:ctl.signal,headers:{Accept:'application/vnd.github+json',...headers}});
  if(!res.ok){const err=new Error(`HTTP ${res.status}`);err.http=res.status;throw err;}
  return await res.json();
 }finally{clearTimeout(t);signal?.removeEventListener('abort',onAbort);}
}
export async function auditRepository(input,{fetcher=fetch,signal,onProgress=()=>{},limit=20,scorecard=true,osv=true}={}){
 const {owner,name}=parseRepository(input),full=`${owner}/${name}`,base=`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
 const report={version:'30.2',repository:full,startedAt:new Date().toISOString(),finishedAt:null,scope:'Unauthenticated public GitHub APIs, optional Scorecard, and exact pinned dependency matches',checks:[],dependencies:[],vulnerabilities:[],raw:[],coverage:[],metadata:null,limits:['No access to private repository settings or secret scanning','No definitive security grade','No live build execution','Dependency checks cover only inspected exact versions','OSV advisory matches do not prove exploitability']};
 function finding(key,status,title,detail,source,url){report.checks.push({key,status,title,detail,source,url,checkedAt:new Date().toISOString()});}
 async function read(url,label,{optional=true,headers}={}){onProgress(label);try{const data=await callJSON(url,{fetcher,signal,headers});report.raw.push({label,url,status:'observed',summary:Array.isArray(data)?`${data.length} entries`:data?.sha||data?.name||'JSON response',checkedAt:new Date().toISOString()});return data;}catch(e){if(signal?.aborted)throw e;report.raw.push({label,url,status:'unavailable',error:e.message,checkedAt:new Date().toISOString()});if(!optional)throw e;return null;}}
 const repo=await read(base,'GitHub repository metadata',{optional:false});if(repo.private)throw Error('Private repositories are not supported.');
 const branch=repo.default_branch||'main';report.metadata={name:repo.full_name||full,description:repo.description||'',stars:repo.stargazers_count??null,openIssues:repo.open_issues_count??null,updated:repo.pushed_at||null,defaultBranch:branch,archived:!!repo.archived,license:repo.license?.spdx_id||null,htmlUrl:repo.html_url||`https://github.com/${full}`};
 finding('metadata','info','Repository metadata',`Public ${repo.visibility||'repository'}; default branch ${branch}; last pushed ${repo.pushed_at||'unknown'}.`,'GitHub REST API',report.metadata.htmlUrl);
 if(repo.archived)finding('archived','info','Repository is archived','Archived projects generally do not receive active maintenance.','GitHub metadata',report.metadata.htmlUrl);
 const tree=await read(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`,'Repository tree');
 const entries=Array.isArray(tree?.tree)?tree.tree:[];const paths=new Set(entries.filter(e=>e.type==='blob').map(e=>e.path));const treeTruncated=!!tree?.truncated;
 report.coverage.push(tree?treeTruncated?'GitHub tree truncated; file inventory incomplete':'Public repository tree inspected':'File inventory unavailable');
 const has=(p)=>paths.has(p), any=(re)=>[...paths].filter(p=>re.test(p));
 if(tree){
 const policies=['SECURITY.md','.github/SECURITY.md'];const sec=policies.filter(has);
 finding('security_policy',sec.length?'observed':'advisory',sec.length?'Security policy found':'No public security policy detected',sec.length?sec.join(', '):'No SECURITY.md found in accessible file tree. This does not prove the project lacks an internal reporting process.','Public repository tree',`${report.metadata.htmlUrl}/security/policy`);
 const ci=any(/^\.github\/workflows\/[^/]+\.ya?ml$/i);
 finding('ci',ci.length?'observed':'advisory',ci.length?'GitHub Actions workflows found':'No GitHub Actions workflow detected',ci.length?ci.slice(0,8).join(', '):'No workflow YAML files were found in the accessible tree. External CI is not assessed.','Public repository tree',`${report.metadata.htmlUrl}/actions`);
 const policy=any(/(^|\/)(CODEOWNERS|CONTRIBUTING\.md|CODE_OF_CONDUCT\.md|dependabot\.ya?ml)$/i);
 finding('governance',policy.length?'observed':'info',policy.length?'Project governance files':'Governance files not detected',policy.length?policy.slice(0,10).join(', '):'Not found in the inspected tree.','Public repository tree',report.metadata.htmlUrl);
 const lock=any(/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|go\.sum|requirements\.txt)$/i);
 finding('dependency_lock',lock.length?'observed':'info','Dependency manifests',lock.length?lock.slice(0,12).join(', '):'No supported lock files or requirements.txt observed.','Public repository tree',report.metadata.htmlUrl);
 }
 const releases=await read(`${base}/releases?per_page=1`,'GitHub releases');if(releases)finding('releases',releases.length?'observed':'info',releases.length?'Public release available':'No published GitHub release',releases.length?`Latest: ${releases[0].tag_name} (${releases[0].published_at||'date unknown'})`:'No GitHub release was returned.','GitHub releases',`${report.metadata.htmlUrl}/releases`);
 const selected=has('package-lock.json')?'package-lock.json':has('requirements.txt')?'requirements.txt':null;
 if(selected){const file=await read(`${base}/contents/${selected}?ref=${encodeURIComponent(branch)}`,'Dependency file');if(file?.content&&file.encoding==='base64'){
  try{const decoded=atob(file.content.replace(/\s/g,''));report.dependencies=selected==='package-lock.json'?dependenciesFromPackageLock(JSON.parse(decoded),limit):dependenciesFromRequirements(decoded,limit);report.coverage.push(`${report.dependencies.length} exact dependency versions extracted from ${selected}; capped at ${limit}`);}catch(e){report.coverage.push(`Could not parse ${selected}: ${e.message}`);}
 }else report.coverage.push('Dependency content not accessible; OSV skipped');
 }else report.coverage.push('No root package-lock.json or pinned requirements.txt available for supported OSV analysis');
 if(scorecard){const url=`https://api.securityscorecards.dev/projects/github.com/${owner}/${name}`;onProgress('OpenSSF Scorecard');try{
  const card=await callJSON(url,{fetcher,signal,headers:{Accept:'application/json'}});report.raw.push({label:'OpenSSF Scorecard',url,status:'observed',checkedAt:new Date().toISOString(),summary:`Score ${card.score??'unavailable'}`});
  finding('scorecard','info','OpenSSF Scorecard published result',`Published score ${card.score??'unknown'}; last assessment ${card.date||'unknown'}. This is an external automated assessment, not a security certification.`,'OpenSSF Scorecard',url);
  report.scorecard={score:card.score??null,date:card.date??null,checks:Array.isArray(card.checks)?card.checks.map(c=>({name:c.name,score:c.score,reason:c.reason})).slice(0,35):[]};
 }catch(e){if(signal?.aborted)throw e;report.raw.push({label:'OpenSSF Scorecard',url,status:'unavailable',error:e.message,checkedAt:new Date().toISOString()});finding('scorecard','unknown','Scorecard not available',`No verified Scorecard result: ${e.message}.`,'OpenSSF Scorecard',url);}}
 if(osv&&report.dependencies.length){onProgress('OSV advisory matching');const queries=report.dependencies.map(x=>({package:{name:x.name,ecosystem:x.ecosystem},version:x.version}));const url='https://api.osv.dev/v1/querybatch';try{
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),10000);const onAbort=()=>ctl.abort();signal?.addEventListener('abort',onAbort,{once:true});let res;
 try{res=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries}),signal:ctl.signal});if(!res.ok)throw Error(`OSV HTTP ${res.status}`);const body=await res.json();if(!Array.isArray(body.results))throw Error('Invalid OSV response');
 report.dependencies=report.dependencies.map((x,i)=>({...x,vulnIds:(body.results[i]?.vulns||[]).map(v=>v.id).filter(Boolean)}));report.vulnerabilities=report.dependencies.filter(x=>x.vulnIds.length).flatMap(x=>x.vulnIds.map(id=>({id,package:x.name,version:x.version,ecosystem:x.ecosystem,url:`https://osv.dev/vulnerability/${encodeURIComponent(id)}`})));
 report.raw.push({label:'OSV.dev',url,status:'observed',summary:`${report.dependencies.length} exact versions queried; ${report.vulnerabilities.length} advisory matches`,checkedAt:new Date().toISOString()});
 finding('osv',report.vulnerabilities.length?'advisory':'observed','OSV vulnerability matches',report.vulnerabilities.length?`${report.vulnerabilities.length} advisory matches across ${report.dependencies.filter(x=>x.vulnIds.length).length} packages. Review each advisory and applicability.`:`No OSV advisories returned for ${report.dependencies.length} exact checked versions. This is not proof of safety.`, 'OSV.dev',url);
 }finally{clearTimeout(tm);signal?.removeEventListener('abort',onAbort);}
 }catch(e){if(signal?.aborted)throw e;report.raw.push({label:'OSV.dev',url,status:'unavailable',error:e.message,checkedAt:new Date().toISOString()});finding('osv','unknown','OSV results unavailable',`Advisory lookup could not be verified: ${e.message}.`, 'OSV.dev',url);}}
 else finding('osv','info','OSV analysis not performed',report.dependencies.length?'OSV was disabled.':'No supported exact dependency versions were available.','Audit scope');
 report.finishedAt=new Date().toISOString();return report;
}
