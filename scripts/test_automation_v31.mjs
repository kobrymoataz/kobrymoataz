import assert from 'node:assert/strict';
import {createSampleWorkflow,importWorkflow,analyzeWorkflow,updateNodeReliability,validateWorkflow,reportAsHtml,LIMITS} from '../docs/automation-core.mjs';
const sample=createSampleWorkflow();
const original=JSON.stringify(sample);
const parsed=importWorkflow(original);
assert.equal(parsed.nodes.length,3);
const report=analyzeWorkflow(parsed);
assert.equal(report.nodeCount,3);
assert.equal(report.edgeCount,2);
assert.equal(report.recognizedTriggers,1);
assert.equal(report.sample,true);
assert.ok(report.findings.some(f=>f.id.startsWith('webhook-auth-')));
assert.ok(report.findings.some(f=>f.id.startsWith('http-retry-')));
assert.equal(report.counts.warning,2);
const edited=updateNodeReliability(parsed,'http-1',{retryOnFail:true,maxTries:3,waitBetweenTries:1200,onError:'stopWorkflow'});
assert.equal(sample.nodes[1].retryOnFail,false,'must not mutate input');
assert.equal(edited.nodes[1].retryOnFail,true);
assert.equal(edited.nodes[1].maxTries,3);
assert.equal(analyzeWorkflow(edited).counts.warning,1);
assert.equal(analyzeWorkflow(edited).edgeCount,2);
const reverted=updateNodeReliability(edited,'http-1',{retryOnFail:false});
assert.equal(analyzeWorkflow(reverted).counts.warning,2);
assert.throws(()=>updateNodeReliability(sample,'http-1',{maxTries:99}),/maxTries/);
assert.throws(()=>updateNodeReliability(sample,'http-1',{onError:'deleteWorkflow'}),/onError/);
assert.throws(()=>updateNodeReliability(sample,'unknown',{retryOnFail:true}),/Choose one valid node/);
assert.throws(()=>updateNodeReliability(sample,'http-1',{credentials:{secret:'bad'}}),/Unsupported property/);
assert.throws(()=>importWorkflow('not json'),/Invalid JSON/);
assert.throws(()=>importWorkflow('{}'),/supported n8n/);
assert.throws(()=>importWorkflow('x'.repeat(LIMITS.bytes+1)),/2 MB/);
assert.throws(()=>validateWorkflow({...sample,nodes:Array.from({length:321},()=>sample.nodes[0])}),/320-node/);
assert.throws(()=>validateWorkflow({...sample,connections:{A:{main:[[{invalid:'edge'}]]}}}),/Invalid connection target/);
const duplicate=structuredClone(sample);duplicate.nodes[1].name=duplicate.nodes[0].name;
assert.ok(analyzeWorkflow(duplicate).findings.some(f=>f.title==='Duplicate node name'));
const missing=structuredClone(sample);missing.nodes.splice(2,1);
assert.ok(analyzeWorkflow(missing).findings.some(f=>f.title==='Broken connection'));
const isolated=structuredClone(sample);isolated.nodes.push({id:'detached',name:'Detached',type:'n8n-nodes-base.noOp',parameters:{}});
assert.ok(analyzeWorkflow(isolated).findings.some(f=>f.title.startsWith('Node unreachable')));
const loop=structuredClone(sample);loop.connections['Finalize']={main:[[{node:'Send to API',type:'main',index:0}]]};
assert.ok(analyzeWorkflow(loop).findings.some(f=>f.title==='Cycle detected'));
const literal=structuredClone(sample);literal.nodes[1].parameters.apiKey='SECRET-DO-NOT-DISCLOSE';
const redacted=analyzeWorkflow(literal);
assert.ok(redacted.findings.some(f=>f.title==='Potential sensitive literal in parameters'));
assert.ok(!JSON.stringify(redacted).includes('SECRET-DO-NOT-DISCLOSE'));
const goodExpression=structuredClone(sample);goodExpression.nodes[1].parameters.apiKey='={{$env.SECRET}}';
assert.ok(!analyzeWorkflow(goodExpression).findings.some(f=>f.title==='Potential sensitive literal in parameters'));
const dangerous=structuredClone(sample);dangerous.nodes[0].name='<script>alert(1)</script>';
const html=reportAsHtml(analyzeWorkflow(dangerous));
assert.ok(!html.includes('<script>'));
assert.ok(html.includes('&lt;script&gt;'));
const custom=structuredClone(sample);custom.nodes[1].foo={customCommunitySetting:'preserved'};
assert.deepEqual(updateNodeReliability(custom,'http-1',{retryOnFail:true}).nodes[1].foo,custom.nodes[1].foo);
console.log('PASS V31: offline n8n parsing, graph, real setting changes, rescan, import bounds, disconnected/cycles, redaction, HTML escaping, preserve unknown settings');
// Execution snapshots are optional imported evidence: never copy raw data or stacks.
const {summarizeExecution}=await import('../docs/automation-core.mjs');
const exec={
 id:'exec-17',status:'error',
 data:{resultData:{runData:{
   'Incoming webhook':[{startTime:'2026-10-25T10:00:00Z',executionTime:11,data:{main:[[{password:'SHOULD_NEVER_LEAK'}]]}}],
   'Send to API':[{startTime:'2026-10-25T10:00:01Z',executionTime:33,error:{name:'NodeApiError',message:'secret 123',stack:'sensitive stack'}}]
 }}}
};
const observed=summarizeExecution(JSON.stringify(exec),sample);
assert.equal(observed.runCount,2);assert.equal(observed.failedRuns,1);assert.equal(observed.records[1].errorType,'NodeApiError');
assert.ok(!JSON.stringify(observed).includes('SHOULD_NEVER_LEAK'));
assert.ok(!JSON.stringify(observed).includes('sensitive stack'));
assert.throws(()=>summarizeExecution('{}',sample),/runData/);
assert.throws(()=>summarizeExecution('{',sample),/not valid JSON/);
console.log('PASS V31 incident evidence: imported execution data, error categories, redacted output, no fake telemetry');
