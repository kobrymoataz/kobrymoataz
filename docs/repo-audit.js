import {auditRepository,parseRepository} from './repo-audit-core.mjs';
const q=x=>document.getElementById(x);const dialog=q('trustopsStudio');if(dialog){
 const state={controller:null,report:null,tab:'findings'};
 function switchMode(next){const repo=next==='repo';q('repoAudit').hidden=!repo;q('trustForm').hidden=repo;q('trustPrivacyDNS')&&(q('trustPrivacyDNS').hidden=repo);q('trustEmpty').hidden=repo||!!q('trustResults').hidden===false;q('trustResults').hidden=repo||!q('trustResultDomain').textContent.trim()||q('trustResultDomain').textContent==='—';
  const dnsStatus=dialog.querySelector('.trust-progress');if(dnsStatus)dnsStatus.hidden=repo;
  [...dialog.querySelectorAll('[data-trust-mode]')].forEach(b=>{const yes=b.dataset.trustMode===next;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));});if(repo)q('repoAuditInput').focus();}
 dialog.querySelectorAll('[data-trust-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.trustMode)));
 const param=new URLSearchParams(location.search);if(param.get('trustops')==='repo'||param.has('repoaudit')){
  if(param.has('repoaudit')){q('trustLaunch')?.click();}switchMode('repo');
 }
 function text(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=String(value??'');return e;}
 function href(a,label,url){if(!/^https:\/\/(github\.com|api\.github\.com|api\.securityscorecards\.dev|osv\.dev)\//.test(url||''))return null;const link=text('a','repo-evidence-link',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';a.append(link);return link;}
 function line(title,body,status='info',source='',url=''){const card=document.createElement('article');card.className='repo-audit-card';const head=document.createElement('div');head.className='repo-card-header';head.append(text('h4','',title),text('span','repo-status '+status,status.toUpperCase()));card.append(head,text('p','',body));if(source)card.append(text('small','',source));if(url)href(card,'View evidence ↗',url);return card;}
 function show(tab){state.tab=tab;dialog.querySelectorAll('[data-repo-tab]').forEach(b=>{const yes=b.dataset.repoTab===tab;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));});for(const t of ['findings','dependencies','evidence'])q('repoAuditPanel'+t[0].toUpperCase()+t.slice(1)).hidden=t!==tab;}
 q('repoAuditTabs').addEventListener('click',e=>{const b=e.target.closest('[data-repo-tab]');if(b)show(b.dataset.repoTab)});
 function render(report){state.report=report;q('repoAuditResults').hidden=false;q('repoAuditTitle').textContent=report.repository;
 q('repoAuditMeta').textContent=`${new Date(report.finishedAt).toLocaleString()} · default branch ${report.metadata.defaultBranch} · public API · ${report.coverage.join(' / ')}`;
 const totals={observed:0,advisory:0,info:0,unknown:0};report.checks.forEach(c=>{totals[c.status]=(totals[c.status]||0)+1});const host=q('repoAuditSummary');host.replaceChildren();
 for(const [k,label] of [['observed','OBSERVED'],['advisory','TO REVIEW'],['info','INFORMATION'],['unknown','UNAVAILABLE']]){const c=document.createElement('div');c.className='repo-audit-counter '+k;c.append(text('small','',label),text('strong','',totals[k]||0));host.append(c);}
 const findings=q('repoAuditPanelFindings');findings.replaceChildren(...report.checks.map(c=>line(c.title,c.detail,c.status,c.source,c.url)));
 const deps=q('repoAuditPanelDependencies');deps.replaceChildren();if(!report.dependencies.length)deps.append(line('Exact-version dependency coverage','No supported pinned dependencies could be extracted; this is not a clean vulnerability scan.','unknown'));else{
  deps.append(line('Coverage',`${report.dependencies.length} exact versions inspected or identified; maximum 20 top-level packages. Recursive dependencies outside coverage are not assessed.`,'info'));
  report.dependencies.forEach(x=>deps.append(line(`${x.name}@${x.version}`,x.vulnIds?.length?`${x.vulnIds.length} OSV advisory match(es): ${x.vulnIds.join(', ')}`:'No advisory match returned or OSV request was unavailable.',x.vulnIds?.length?'advisory':'info',`${x.ecosystem} · ${x.path}`)));
 }
 const evidence=q('repoAuditPanelEvidence');evidence.replaceChildren();report.raw.forEach(x=>evidence.append(line(x.label,x.error||x.summary||'JSON evidence retrieved',x.status==='observed'?'observed':'unknown',new Date(x.checkedAt).toLocaleString(),x.url)));
 const note=text('p','repo-audit-coverage',`Scope: ${report.coverage.join(' · ')}. Observations do not certify the security of a repository.`);evidence.prepend(note);show(state.tab);
 }
 function busy(v){q('repoAuditRun').disabled=v;q('repoAuditCancel').hidden=!v;q('repoAuditInput').disabled=v;}
 q('repoAuditForm').addEventListener('submit',async e=>{e.preventDefault();if(state.controller)return;
 let parsed;try{parsed=parseRepository(q('repoAuditInput').value)}catch(error){q('repoAuditStatus').textContent=error.message;return;}
 q('repoAuditResults').hidden=true;state.report=null;state.controller=new AbortController();const ctl=state.controller;busy(true);
 try{const data=await auditRepository(`${parsed.owner}/${parsed.name}`,{signal:ctl.signal,onProgress:s=>q('repoAuditStatus').textContent=`Fetching public evidence: ${s}…`});if(ctl.signal.aborted)return;render(data);q('repoAuditStatus').textContent=`Completed: ${data.checks.length} checks, ${data.dependencies.length} exact dependencies covered; see evidence and limits.`;}
 catch(error){q('repoAuditStatus').textContent=ctl.signal.aborted?'Audit canceled.':`Audit could not finish: ${error.message}. No security result was inferred.`;}
 finally{busy(false);state.controller=null;}
 });
 q('repoAuditCancel').addEventListener('click',()=>state.controller?.abort());
 q('trustClose').addEventListener('click',()=>state.controller?.abort());
 function download(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 const base=()=>`trustops-repo-${state.report.repository.replace('/','-')}-${new Date().toISOString().slice(0,10)}`;
 q('repoExportJSON').addEventListener('click',()=>{if(state.report)download(base()+'.json',JSON.stringify(state.report,null,2),'application/json')});
 q('repoExportHTML').addEventListener('click',()=>{const r=state.report;if(!r)return;const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let html=`<!doctype html><html><head><meta charset="utf-8"><title>TrustOps repository audit</title><style>body{font:15px/1.55 Arial;max-width:950px;margin:auto;padding:36px;color:#202a32}h1,h2{font-family:Georgia}section{padding:16px 0;border-top:1px solid #c3ccd1}small{color:#65727c}p{overflow-wrap:anywhere}@media print{button{display:none}}</style></head><body><button onclick="print()">Print</button><h1>TrustOps Studio · Repository Intelligence</h1><p>${esc(r.repository)} · ${esc(r.finishedAt)}</p><p>Read-only public evidence. Not a security certification.</p><h2>Findings</h2>${r.checks.map(x=>`<section><h3>${esc(x.title)} — ${esc(x.status)}</h3><p>${esc(x.detail)}</p><small>${esc(x.source)} ${esc(x.url||'')}</small></section>`).join('')}<h2>Exact dependency coverage</h2>${r.dependencies.map(x=>`<section><b>${esc(x.name)} ${esc(x.version)}</b><p>${esc((x.vulnIds||[]).join(', ')||'No OSV matches confirmed in this audit')}</p></section>`).join('')}<h2>Coverage limitations</h2>${r.coverage.map(x=>`<p>${esc(x)}</p>`).join('')}</body></html>`;download(base()+'.html',html,'text/html;charset=utf-8')});
}
