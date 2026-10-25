import assert from 'node:assert/strict';
import {parseRepository,dependenciesFromPackageLock,dependenciesFromRequirements,auditRepository} from '../docs/repo-audit-core.mjs';
assert.deepEqual(parseRepository('https://github.com/kobrymoataz/repoverity/tree/main'),{owner:'kobrymoataz',name:'repoverity'});
assert.throws(()=>parseRepository('https://example.org/owner/repo'));
assert.throws(()=>parseRepository('localhost/repo/extra'));
const lock={packages:{'':{},'node_modules/left-pad':{version:'1.3.0'},'node_modules/a/node_modules/nested':{version:'1.0.0'},'node_modules/wild':{version:'^2.0.0'}}};
assert.deepEqual(dependenciesFromPackageLock(lock).map(x=>x.name),['left-pad']);
assert.deepEqual(dependenciesFromRequirements('requests==2.31.0\nflask>=2.0\n# ignore').map(x=>x.name),['requests']);
const responses=new Map([
 ['https://api.github.com/repos/example/project',{full_name:'example/project',default_branch:'main',private:false,html_url:'https://github.com/example/project',visibility:'public',license:{spdx_id:'MIT'},stargazers_count:1}],
 ['https://api.github.com/repos/example/project/git/trees/main?recursive=1',{tree:[{type:'blob',path:'.github/workflows/ci.yml'},{type:'blob',path:'SECURITY.md'},{type:'blob',path:'package-lock.json'}]}],
 ['https://api.github.com/repos/example/project/releases?per_page=1',[{tag_name:'v1.0.0',published_at:'2026-10-01'}]],
 ['https://api.github.com/repos/example/project/contents/package-lock.json?ref=main',{encoding:'base64',content:Buffer.from(JSON.stringify(lock)).toString('base64')}],
 ['https://api.securityscorecards.dev/projects/github.com/example/project',{score:7.5,date:'2026-10-20',checks:[{name:'Code-Review',score:5,reason:'test'}]}],
 ['https://api.osv.dev/v1/querybatch',{results:[{vulns:[{id:'GHSA-TEST-0001'}]}]}]
]);
const calls=[];const fetcher=async(url,opts={})=>{calls.push([url,opts.method||'GET']);return responses.has(url)?{ok:true,json:async()=>responses.get(url)}:{ok:false,status:404,json:async()=>({})}};
const report=await auditRepository('example/project',{fetcher});
assert.equal(report.metadata.name,'example/project');assert.equal(report.dependencies.length,1);assert.equal(report.vulnerabilities.length,1);assert.ok(report.checks.some(x=>x.key==='ci'&&x.status==='observed'));assert.equal(calls.filter(x=>x[1]==='POST').length,1);
const unavailable=await auditRepository('example/project',{fetcher:async(url)=>url.endsWith('/repos/example/project')?{ok:true,json:async()=>responses.get(url)}:{ok:false,status:403},scorecard:true});
assert.ok(unavailable.checks.some(x=>x.status==='unknown'));assert.equal(unavailable.vulnerabilities.length,0);
let aborted=false;const abort=new AbortController();abort.abort();try{await auditRepository('example/project',{fetcher:async()=>{throw new Error('should not reach')},signal:abort.signal})}catch{aborted=true};assert.ok(aborted);
console.log('PASS V30.2: parsing, dependency scope, CI evidence, Scorecard, OSV, unavailable providers, abort');
