/**
 * TrustOps Studio v30.1 — DNS-only, non-invasive diagnostics.
 * Real answers are obtained from a user-selected public DNS-over-HTTPS resolver.
 * Audits never test SMTP, send messages, or verify a DKIM signature.
 * Pure functions + dependency-injected resolver allow deterministic regression tests.
 */
export const DNS_TYPES = Object.freeze({A:1,NS:2,CNAME:5,MX:15,TXT:16,AAAA:28});
export const PROVIDERS = Object.freeze({google:'Google Public DNS',cloudflare:'Cloudflare 1.1.1.1'});
const EVIDENCE_MAX = 60;
const SPF_MAX_DEPTH = 5;
const SPF_MAX_EXTRA = 14;

export function normalizeDomain(input) {
  const v = String(input ?? '').trim().replace(/\.$/,'').toLowerCase();
  if (!v || v.length>253 || !/^[a-z0-9.-]+$/.test(v)) throw new Error('Enter a domain name such as example.com (IDNs must be in punycode).');
  const labels=v.split('.');
  if(labels.length<2 || labels.some(l=>!l || l.length>63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(l))) throw new Error('Enter a valid public-style domain, without https:// or paths.');
  if(/^\d+$/.test(labels.at(-1)) || labels.at(-1).length<2) throw new Error('Enter a hostname with a valid top-level domain.');
  if(['local','localhost','internal','lan','localdomain','onion'].includes(labels.at(-1))) throw new Error('Private or local-only names are not sent to public DNS resolvers.');
  return v;
}
export function normalizeSelector(input) {
  const s=String(input??'').trim().toLowerCase();
  if(!s) return '';
  if(s.length>125 || !/^[a-z0-9_-]+(?:\.[a-z0-9_-]+){0,2}$/.test(s) || s.split('.').some(x=>x.length>63)) throw new Error('DKIM selector must be one to three labels (for example google or selector1).');
  return s;
}
// JSON DoH providers encode each TXT chunk in quotes; concatenate chunks with no spaces.
export function decodeTxt(value) {
  const str=String(value??'').trim();
  const pieces=[...str.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m=>m[1].replace(/\\([\\"])/g,'$1'));
  return pieces.length ? pieces.join('') : str;
}
export function parseTags(record) {
  const tags={};const duplicates=[];
  for (const chunk of String(record).split(';')) {
    const n=chunk.indexOf('=');if(n<0) continue;
    const k=chunk.slice(0,n).trim().toLowerCase(),v=chunk.slice(n+1).trim();
    if(!k)continue;
    if(Object.hasOwn(tags,k))duplicates.push(k);
    else tags[k]=v;
  }
  return {tags,duplicates};
}
export function spfTerms(record) {
  const tokens=String(record).trim().split(/\s+/);
  const direct=tokens.filter(token=>/^[+?~\-]?(?:include:|a(?:[:/]|$)|mx(?:[:/]|$)|ptr(?:[:/]|$)|exists:)/i.test(token)||/^redirect=/i.test(token));
  const nested=tokens.map(token=>token.replace(/^[+?~\-]/,''))
     .filter(t=>/^(include:|redirect=)/i.test(t)).map(t=>t.replace(/^(include:|redirect=)/i,''));
  return {tokens,directCount:direct.length,nested};
}
function txtOf(response) {return (response?.Answer||[]).filter(x=>x.type===DNS_TYPES.TXT).map(x=>decodeTxt(x.data));}
function createFinding(id,title,state,detail,recommendation='',records=[]) {return {id,title,state,detail,recommendation,records};}
function isDnsMissing(response){return response && [0,3].includes(response.Status);}
function messageOf(error){return error?.name==='AbortError'?'Query canceled':String(error?.message||error||'Resolver unavailable');}
function detectNx(response){return response?.Status===3;}

/** DoH resolver with an automatic fallback only when request/network fails, not on valid NXDOMAIN. */
export function createDohResolver({provider='cloudflare',fetchImpl=fetch,timeoutMs=9000}={}){
  const source=provider==='google'?'google':'cloudflare';
  return async (name,type,{signal}={})=>{
    let lastError;
    for(const id of [source,source==='google'?'cloudflare':'google']){
      const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
      const relay=()=>ctrl.abort();signal?.addEventListener('abort',relay,{once:true});
      try {
        if(signal?.aborted)throw new DOMException('Aborted','AbortError');
        const u=id==='cloudflare'?'https://cloudflare-dns.com/dns-query':'https://dns.google/resolve';
        const url=new URL(u);url.searchParams.set('name',name);url.searchParams.set('type',type);
        const resp=await fetchImpl(url.toString(),{method:'GET',headers:id==='cloudflare'?{Accept:'application/dns-json'}:{Accept:'application/json'},signal:ctrl.signal,cache:'no-store',credentials:'omit'});
        if(!resp.ok)throw new Error(`${PROVIDERS[id]} returned HTTP ${resp.status}`);
        const body=await resp.json();
        if(!Number.isInteger(body.Status)||!Array.isArray(body.Question||[]))throw new Error('Unexpected DNS response format');
        if(![0,3].includes(body.Status))throw new Error(`DNS resolver returned code ${body.Status}`);
        return {...body,provider:id};
      } catch(e){if(signal?.aborted)throw new DOMException('Aborted','AbortError');lastError=e;}
      finally{clearTimeout(timer);signal?.removeEventListener('abort',relay);}
    }
    throw new Error(`Both public resolvers were unavailable (${messageOf(lastError)}). Browser CORS, rate limits or network blocking may be involved.`);
  };
}

/**
 * SPF lookup upper bound is a conservative advisory, NOT full RFC 7208 check_host.
 * Includes/redirects are resolved up to fixed depth; macros, dynamic includes and
 * real evaluation paths are not modeled. Returns completeness flag explicitly.
 */
export async function estimateSpf(record,query,root,{signal}={}){
 let queried=0,complete=true;const branches=[],seen=new Set();
 async function walk(value,domain,depth){
   const bits=spfTerms(value); let worst=bits.directCount;
   if(depth>=SPF_MAX_DEPTH && bits.nested.length){complete=false;return worst;}
   for(const target of bits.nested){
     if(!target||target.includes('%')||target.includes('/')){complete=false;continue;}
     if(seen.has(target)){complete=false;continue;}
     if(queried>=SPF_MAX_EXTRA){complete=false;break;}
     seen.add(target);queried++;
     try{
       const sub=await query(target,'TXT',{signal}); const records=txtOf(sub).filter(t=>/^v=spf1(?:\s|$)/i.test(t));
       if(records.length!==1){complete=false;branches.push({domain:target,lookup:'unresolved SPF'});continue;}
       const child=await walk(records[0],target,depth+1); worst+=child;
       branches.push({domain:target,lookup:child});
     }catch(e){if(signal?.aborted)throw e;complete=false;branches.push({domain:target,lookup:'unavailable'});}
     finally{seen.delete(target);}
   }
   return worst;
 }
 const upperBound=await walk(record,root,0);
 return {upperBound,complete,branches,queries:queried};
}

/** Audit domain using live resolver or mocked resolver for QA. */
export async function auditDomain({domain,selector='',provider='cloudflare',resolver,onProgress,signal,now=()=>new Date().toISOString()}={}) {
  const normalized=normalizeDomain(domain);const sel=normalizeSelector(selector);
  const query=resolver||createDohResolver({provider});
  const evidence=[],findings=[],startedAt=now();
  const report={schema:'trustops-audit-v1',product:'TrustOps Studio 30.1',domain:normalized,selector:sel||null,startedAt,finishedAt:'',requestedResolver:provider,coverage:'Public DNS snapshot only; no SMTP, DKIM signature, DMARC alignment or delivery tests',findings,evidence,partial:false};
  async function check(name,type){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    onProgress?.({name,type,index:evidence.length+1});
    try{
      const answer=await query(name,type,{signal});
      if(![0,3].includes(answer.Status))throw new Error('DNS status '+answer.Status);
      evidence.push({name,type,provider:answer.provider||'injected resolver',dnsStatus:answer.Status,answers:(answer.Answer||[]).filter(x=>Number.isInteger(x.type)&&typeof x.data==='string').slice(0,EVIDENCE_MAX).map(x=>({name:x.name,type:x.type,ttl:x.TTL,data:x.data})),checkedAt:now()});
      return answer;
    }catch(e){if(signal?.aborted)throw e;report.partial=true;evidence.push({name,type,provider:'unavailable',error:messageOf(e),checkedAt:now()});return null;}
  }
  // The smallest set of reads is deterministic, with additional bounded SPF/DKIM reads.
  const lookups=[
    [normalized,'TXT'],[normalized,'MX'],[normalized,'NS'],[normalized,'A'],
    [`_dmarc.${normalized}`,'TXT'],[`_mta-sts.${normalized}`,'TXT'],[`_smtp._tls.${normalized}`,'TXT']
  ];
  if(sel){lookups.push([`${sel}._domainkey.${normalized}`,'TXT']);lookups.push([`${sel}._domainkey.${normalized}`,'CNAME']);}
  const results=await Promise.all(lookups.map(([n,t])=>check(n,t)));
  const [txt,mx,ns,a,dmarc,mta,tls,dkim,dkimCname]=results;
  // Do not diagnose missing SPF/DMARC on a domain that the resolver says does not exist.
  if([txt,mx,ns,a].every(r=>r?.Status===3)) {
    report.partial=true;
    findings.push(createFinding('domain','Domain DNS existence','unknown','The resolver returned NXDOMAIN for the requested domain on all baseline queries. Authentication and routing settings cannot be assessed.','Check the domain spelling or whether the domain has been registered and delegated.',evidence));
    report.finishedAt=now();
    report.counts={pass:0,warn:0,fail:0,info:0,unknown:1};
    report.providersUsed=[...new Set(evidence.map(e=>e.provider).filter(x=>x!=='unavailable'))];
    return report;
  }
  const evidenceOf=(...names)=>evidence.filter(e=>names.includes(e.name));
  const domainTxt=txtOf(txt),spfRecords=domainTxt.filter(x=>/^v=spf1(?:\s|$)/i.test(x));
  if(!txt){findings.push(createFinding('spf','SPF','unknown','Unable to retrieve TXT records. DNS outcome cannot be determined.','Retry with a working DNS resolver.',evidenceOf(normalized)));}
  else if(spfRecords.length===0){findings.push(createFinding('spf','SPF','warn','No SPF record was found at this exact domain.','If the domain sends mail, identify all legitimate senders before publishing an SPF record.',evidenceOf(normalized)));}
  else if(spfRecords.length>1){findings.push(createFinding('spf','SPF','fail',`${spfRecords.length} SPF records exist. Multiple SPF policies produce a permanent error.`,'Consolidate SPF policies into one TXT record.',evidenceOf(normalized)));}
  else {
    const spf=spfRecords[0],terms=spfTerms(spf),hasBroad=/\+all(?:\s|$)|(?:^|\s)all(?:\s|$)/i.test(spf);
    let estimate;
    if(terms.directCount || terms.nested.length) estimate=await estimateSpf(spf,check,normalized,{signal});
    const count=estimate?.upperBound??0;
    const incomplete=estimate?!estimate.complete:false;
    let state='pass';const notes=[];
    if(hasBroad){state='fail';notes.push('The +all mechanism authorizes any sender.');}
    if(count>10){state=incomplete?'warn':'fail';notes.push(`${count} estimated DNS-lookup terms across discovered SPF branches; the SPF limit is 10 per evaluation path.`);}
    if(!/([~?\-+]?)all(?:\s|$)/i.test(spf)&&!/\bredirect=/i.test(spf)){if(state==='pass')state='warn';notes.push('No terminal all mechanism or redirect was found.');}
    if(terms.tokens.some(x=>/^\+?ptr/i.test(x))){if(state==='pass')state='warn';notes.push('PTR mechanisms are discouraged by RFC 7208.');}
    if(incomplete){if(state==='pass')state='warn';notes.push('Nested lookup inspection was incomplete (macros, recursion limits or DNS errors).');report.partial=true;}
    notes.push(`Direct lookup terms: ${terms.directCount}. Conservative discovered-branch estimate: ${count}; this is not a full SPF check_host evaluation.`);
    findings.push(createFinding('spf','SPF',state,notes.join(' ')||'A single SPF policy was found.','Review all sending services before tightening -all; avoid duplicate SPF records.',evidenceOf(normalized)));
    report.spf={record:spf,directLookupTerms:terms.directCount,estimatedBranchTerms:count,estimateComplete:!incomplete,branches:estimate?.branches||[]};
  }
  if(!dmarc){findings.push(createFinding('dmarc','DMARC','unknown','Could not retrieve the DMARC TXT response.','Try again with a different resolver.',evidenceOf(`_dmarc.${normalized}`)));}
  else {
    const dm=txtOf(dmarc).filter(t=>/^v=DMARC1(?:\s*;|\s*$)/i.test(t));
    if(dm.length===0) findings.push(createFinding('dmarc','DMARC','warn','No DMARC policy was found at this exact domain. Organizational-domain inheritance was not evaluated.','If you send mail, publish a valid DMARC policy after validating SPF/DKIM alignment.',evidenceOf(`_dmarc.${normalized}`)));
    else if(dm.length>1) findings.push(createFinding('dmarc','DMARC','fail','Multiple DMARC policies are published at the same name.','Consolidate to one valid DMARC record.',evidenceOf(`_dmarc.${normalized}`)));
    else {
      const rec=dm[0],parsed=parseTags(rec),policy=parsed.tags.p?.toLowerCase(),pct=parsed.tags.pct===undefined?100:Number(parsed.tags.pct);
      let state='pass',detail='';
      if(!/^v=DMARC1\s*;/i.test(rec)||!['none','quarantine','reject'].includes(policy)||parsed.duplicates.length ||!Number.isInteger(pct)||pct<0||pct>100){state='fail';detail='Malformed DMARC policy (check v/p tags, duplicate tags and pct).';}
      else if(policy==='none'){state='warn';detail='DMARC is in monitoring mode (p=none), not an enforcement policy.';}
      else if(pct<100){state='warn';detail=`DMARC p=${policy} but policy sampling is ${pct}%, not full coverage.`;}
      else detail=`DMARC requests p=${policy} for ${pct}% of applicable messages.`;
      if(!parsed.tags.rua) detail+=' No aggregate-report destination (rua) was found.';
      detail+=' Record publication does not prove individual messages pass DMARC alignment.';
      findings.push(createFinding('dmarc','DMARC',state,detail,'Monitor aggregate reports and validate sender alignment before moving to stricter enforcement.',evidenceOf(`_dmarc.${normalized}`)));
      report.dmarc={record:rec,tags:parsed.tags};
    }
  }
  if(!mx) findings.push(createFinding('mx','Mail routing (MX)','unknown','MX lookup was unavailable.','Retry the DNS lookup.',evidenceOf(normalized)));
  else {
    const records=(mx.Answer||[]).filter(x=>x.type===DNS_TYPES.MX),nullMx=records.some(x=>/^0\s+\.?$/.test(String(x.data).trim()));
    findings.push(nullMx?createFinding('mx','Mail routing (MX)','info','Null MX is published: the domain explicitly indicates it does not accept email.','No MX action is needed if this is intentional.',evidenceOf(normalized)):
      records.length?createFinding('mx','Mail routing (MX)','pass',`${records.length} public MX record(s) found. This does not test whether SMTP accepts connections.`,'Confirm actual inbound routing separately if needed.',evidenceOf(normalized)):
      createFinding('mx','Mail routing (MX)','warn','No MX record was found. SMTP may fall back to address records; mail acceptance is not established by this scan.','If inbound email is intended, verify mail provider instructions and MX settings.',evidenceOf(normalized)));
  }
  if(!ns||!a) findings.push(createFinding('dns','DNS availability','unknown','One or more baseline NS/A lookups failed.','Retry when the resolver is reachable.',evidenceOf(normalized)));
  else {
    const nsCount=(ns.Answer||[]).filter(x=>x.type===DNS_TYPES.NS).length,addr=(a.Answer||[]).filter(x=>x.type===DNS_TYPES.A).length;
    const state=nsCount?'pass':'info';
    findings.push(createFinding('dns','DNS baseline',state,`${nsCount} public NS answer(s), ${addr} IPv4 A answer(s). Missing A does not mean the domain is offline (AAAA, CNAME or other configurations may apply).`,'These answers are resolver snapshots, not authoritative-zone or hosting audits.',evidenceOf(normalized)));
  }
  for(const [id,label,response,prefix,version] of [
    ['mtasts','MTA-STS DNS signal',mta,`_mta-sts.${normalized}`,'STSv1'],
    ['tlsrpt','TLS reporting DNS signal',tls,`_smtp._tls.${normalized}`,'TLSRPTv1']
  ]){
    if(!response){findings.push(createFinding(id,label,'unknown','DNS response unavailable.','Retry if this feature is relevant.',evidenceOf(prefix)));continue;}
    const rec=txtOf(response).filter(s=>new RegExp(`^v=${version}(?:;|\\s*$)`,'i').test(s));
    findings.push(rec.length?createFinding(id,label,'info',`${rec.length} matching DNS signal(s) found. This does not verify HTTPS policy files, TLS sessions or reporting delivery.`,'Check the complete policy or report endpoint separately.',evidenceOf(prefix)):
      createFinding(id,label,'info','No matching optional DNS signal was found.','Optional; consider only after core authentication and transport requirements.',evidenceOf(prefix)));
  }
  if(!sel){findings.push(createFinding('dkim','DKIM selector','unknown','Not checked: a DKIM selector is needed to locate a public key. DKIM signatures and signing practices cannot be inferred from a domain alone.','Enter the selector used by your mail service (e.g. google, selector1).',[]));}
  else if(!dkim){findings.push(createFinding('dkim','DKIM selector','unknown','DKIM TXT response unavailable.','Try another resolver or verify the selector.',evidenceOf(`${sel}._domainkey.${normalized}`)));}
  else {
    const name=`${sel}._domainkey.${normalized}`;let txtRecs=txtOf(dkim),target=null;
    if(!txtRecs.length&&dkimCname){const c=(dkimCname.Answer||[]).find(x=>x.type===DNS_TYPES.CNAME);if(c?.data){target=String(c.data).replace(/\.$/,'');if(/^[a-z0-9.-]+$/i.test(target)&&target.length<=253){const response=await check(target,'TXT');txtRecs=txtOf(response);} }}
    const records=txtRecs.filter(t=>/(?:^v=DKIM1(?:\s*;|\s*$)|(?:^|;)\s*p=)/i.test(t));
    if(!records.length) findings.push(createFinding('dkim','DKIM selector','warn',`No DKIM key was found for selector “${sel}”${target?` (CNAME ${target})`:''}. This does not prove that the domain does not sign mail using other selectors.`, 'Confirm the selector configured at the sending provider.',evidenceOf(name,target)));
    else {
      const parsed=parseTags(records[0]); const key=parsed.tags.p;
      const state=key===undefined||parsed.duplicates.length?'warn':key===''?'warn':'pass';
      findings.push(createFinding('dkim','DKIM selector',state,key===''?'A published DKIM selector has an empty public key (revoked).':key===undefined?'A selector record exists but no p= key tag was found.':`Public key material was found for selector “${sel}”${target?' through a CNAME':''}. This does NOT validate DKIM signatures on actual messages.`, 'Check an actual signed message to confirm correct DKIM verification and domain alignment.',evidenceOf(name,target)));
      report.dkim={selector:sel,cname:target,keyPublished:Boolean(key)};
    }
  }
  report.finishedAt=now(); report.counts=findings.reduce((a,f)=>(a[f.state]=(a[f.state]||0)+1,a),{pass:0,warn:0,fail:0,info:0,unknown:0});
  report.providersUsed=[...new Set(evidence.map(e=>e.provider).filter(x=>x!=='unavailable'))];
  return report;
}

export function summarize(report) {
  const c=report.counts;return `${report.domain} • ${c.pass} observed checks • ${c.warn} advisories • ${c.fail} configuration issues • ${c.unknown} unverified`;
}
