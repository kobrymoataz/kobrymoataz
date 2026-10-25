import assert from 'node:assert/strict';
import {auditDomain,createDohResolver,decodeTxt,normalizeDomain,normalizeSelector,parseTags,spfTerms,estimateSpf} from '../docs/trustops-core.mjs';
const all = [];
const key=(n,t)=>`${n}|${t}`;
const txt=(name,value)=>({name:name+'.',type:16,TTL:300,data:'"'+value.replace(/"/g,'\\"')+'"'});
function fixture({domain='secure.example',selector='mail', SPF='v=spf1 include:_spf.secure.example -all',DMARC='v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@secure.example',DKIM='v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUA',missing=[],failed=[]}={}){
 const map={
 [key(domain,'TXT')]:[txt(domain,SPF)],
 [key(domain,'MX')]:[{name:domain+'.',type:15,TTL:250,data:'10 mx.secure.example.'}],
 [key(domain,'NS')]:[{name:domain+'.',type:2,TTL:300,data:'ns1.secure.example.'}],
 [key(domain,'A')]:[{name:domain+'.',type:1,TTL:300,data:'203.0.113.1'}],
 [key(`_dmarc.${domain}`,'TXT')]:[txt(`_dmarc.${domain}`,DMARC)],
 [key(`_mta-sts.${domain}`,'TXT')]:[txt(`_mta-sts.${domain}`,'v=STSv1; id=20261024')],
 [key(`_smtp._tls.${domain}`,'TXT')]:[txt(`_smtp._tls.${domain}`,'v=TLSRPTv1; rua=mailto:tls@secure.example')],
 [key(`${selector}._domainkey.${domain}`,'TXT')]:[txt(`${selector}._domainkey.${domain}`,DKIM)],
 [key('_spf.secure.example','TXT')]:[txt('_spf.secure.example','v=spf1 ip4:203.0.113.0/24 -all')]
 };
 for(const key0 of missing){map[key0]=[];}
 return async (name,type,{signal}={})=>{
   const k=key(name,type);all.push(k);
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   if(failed.includes(k)) throw new Error('DNS timeout simulated by fixture');
   return {Status:0,provider:'fixture',Question:[{name,type}],Answer:map[k]||[]};
 };
}
const tests=[];
async function t(name,fn){try{await fn();tests.push([name,true]);console.log('PASS',name);}catch(e){tests.push([name,false]);console.error('FAIL',name,e);}}
await t('domain name and selector validation blocks unsafe path, URL, and whitespace',()=>{
 assert.equal(normalizeDomain(' EXAMPLE.COM. '),'example.com');
 for(const bad of ['https://x.com','x','x..com','example.com/path','127.0.0.1','localhost','.example.com','ab-.com','a'.repeat(70)+'.com','server.local','service.internal','printer.lan'])assert.throws(()=>normalizeDomain(bad));
 assert.equal(normalizeSelector('Selector1'),'selector1');assert.throws(()=>normalizeSelector('bad/selector'));
});
await t('TXT chunk decoding concatenates quotes without adding spaces',()=>{
 assert.equal(decodeTxt('"v=spf1 include:" "_spf.example.com -all"'),'v=spf1 include:_spf.example.com -all');
 assert.deepEqual(parseTags('v=DMARC1; p=reject; pct=50').tags,{v:'DMARC1',p:'reject',pct:'50'});
 assert.equal(spfTerms('v=spf1 a mx include:_spf.example.com -all').directCount,3);
});
await t('live-query-driven audit classifies published SPF, DMARC, MX, DKIM',async()=>{
 const rep=await auditDomain({domain:'secure.example',selector:'mail',resolver:fixture()});
 assert.equal(rep.findings.find(x=>x.id==='spf').state,'pass');
 assert.equal(rep.findings.find(x=>x.id==='dmarc').state,'pass');
 assert.equal(rep.findings.find(x=>x.id==='dkim').state,'pass');
 assert.equal(rep.findings.find(x=>x.id==='mx').state,'pass');
 assert.equal(rep.spf.estimatedBranchTerms,1);
 assert.ok(rep.evidence.some(x=>x.name==='_spf.secure.example'));
 assert.equal(rep.partial,false);
});
await t('dangerous +all is a configuration issue, DMARC monitoring mode is an advisory',async()=>{
 const rep=await auditDomain({domain:'secure.example',resolver:fixture({SPF:'v=spf1 +all',DMARC:'v=DMARC1; p=none'})});
 assert.equal(rep.findings.find(x=>x.id==='spf').state,'fail');
 assert.equal(rep.findings.find(x=>x.id==='dmarc').state,'warn');
 assert.equal(rep.findings.find(x=>x.id==='dkim').state,'unknown');
});
await t('multiple SPF policies report a failure (not a pass)',async()=>{
 const f=fixture();const rep=await auditDomain({domain:'secure.example',resolver:async(name,type,opt)=>{
  const x=await f(name,type,opt);if(name==='secure.example'&&type==='TXT')x.Answer.push(txt(name,'v=spf1 ip4:198.51.100.2 -all'));return x;}});
 assert.equal(rep.findings.find(x=>x.id==='spf').state,'fail');
});
await t('network failures remain unverified and report is partial',async()=>{
 const rep=await auditDomain({domain:'secure.example',selector:'mail',resolver:async()=>{throw Error('offline')}});
 assert.equal(rep.partial,true);
 assert.equal(rep.findings.find(x=>x.id==='spf').state,'unknown');
 assert.equal(rep.findings.find(x=>x.id==='dmarc').state,'unknown');
 assert.equal(rep.counts.pass,0);
 assert.ok(rep.evidence.every(x=>x.error));
});
await t('null MX is treated as intentional no-inbound-mail indication',async()=>{
 const f=fixture();const rep=await auditDomain({domain:'secure.example',resolver:async(n,t,o)=>{
  const r=await f(n,t,o);if(t==='MX')r.Answer=[{type:15,data:'0 .',TTL:300}];return r;}});
 assert.equal(rep.findings.find(x=>x.id==='mx').state,'info');
});
await t('DMARC malformed records are not treated as enforced',async()=>{
 const rep=await auditDomain({domain:'secure.example',resolver:fixture({DMARC:'v=DMARC1; p=invalid; pct=900'})});
 assert.equal(rep.findings.find(x=>x.id==='dmarc').state,'fail');
});
await t('SPF recursion advisory marks unresolved nested records incomplete',async()=>{
 const rep=await auditDomain({domain:'secure.example',resolver:fixture({SPF:'v=spf1 include:no-such.secure.example -all'})});
 assert.equal(rep.findings.find(x=>x.id==='spf').state,'warn');
 assert.equal(rep.partial,true);
});
await t('nonexistent domain does not get misleading missing-SPF warnings',async()=>{
 const rep=await auditDomain({domain:'nonexistent.example',resolver:async(n,t)=>({Status:3,Question:[{name:n,type:t}],Answer:[],provider:'fixture'})});
 assert.equal(rep.findings.length,1);assert.equal(rep.findings[0].state,'unknown');assert.equal(rep.counts.warn,0);
});
await t('selector CNAME leads to separate DKIM TXT record query',async()=>{
 const f=fixture({DKIM:''});const rep=await auditDomain({domain:'secure.example',selector:'mail',resolver:async(n,type,opt)=>{
  if(n==='mail._domainkey.secure.example'&&type==='TXT')return {Status:0,Answer:[],provider:'fixture'};
  if(n==='mail._domainkey.secure.example'&&type==='CNAME')return {Status:0,Answer:[{name:n+'.',type:5,data:'mail.vendor.example.'}],provider:'fixture'};
  if(n==='mail.vendor.example'&&type==='TXT')return {Status:0,Answer:[txt(n,'v=DKIM1; p=abc')],provider:'fixture'};
  return f(n,type,opt);
 }});
 assert.equal(rep.findings.find(x=>x.id==='dkim').state,'pass');
 assert.equal(rep.dkim.cname,'mail.vendor.example');
});
await t('provider resolver fails over, but never fabricates results',async()=>{
 let called=0;
 const resolver=createDohResolver({provider:'cloudflare',fetchImpl:async(url)=>{
  called++;if(url.includes('cloudflare'))throw Error('CORS blocked');
  return {ok:true,json:async()=>({Status:3,Question:[{name:'secure.example.',type:15}],Answer:[]})};
 }});
 const response=await resolver('secure.example','MX');assert.equal(response.provider,'google');assert.equal(response.Status,3);assert.equal(called,2);
});
await t('abort cancels the scan and never returns an invented report',async()=>{
 const c=new AbortController();c.abort();
 await assert.rejects(()=>auditDomain({domain:'secure.example',resolver:fixture(),signal:c.signal}),/Abort/);
});
const passed=tests.filter(x=>x[1]).length;
console.log(`TRUSTOPS V30.1 ${passed}/${tests.length} tests passed`);
if(passed!==tests.length)process.exit(1);
