/** V32.2. Browser-local incident casebook for imported, unverified evidence.
 * Only normalized snapshots and fixed-choice triage events are stored.
 * A case is a human follow-up, NOT confirmation of a live production incident.
 */
import {safeSnapshot,MAX_HISTORY} from './systems-core.mjs';
export const CASEBOOK_SCHEMA='mk-systems-casebook/v32.2';
export const MAX_CASES=40;
export const MAX_CASE_EVENTS=16;
export const MAX_CASEBOOK_BYTES=500000;
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const allowedStatus=['open','investigating','closed'];
const allowedPriority=['unassessed','low','medium','high'];
const allowedEvents=['opened','status','priority'];
const iso=v=>typeof v==='string'&&v.length<=40&&!Number.isNaN(Date.parse(v))?new Date(v).toISOString():null;
const stamp=v=>iso(v)||new Date().toISOString();
const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,70}$/.test(v);
export function caseIdentity(snapshot){
 const s=safeSnapshot(snapshot);
 return `${s.kind}|${s.kind==='automation'?s.fingerprint||'no-fingerprint':s.target}`;
}
export function safeCase(record){
 if(!isObj(record)||!validId(record.id)||!['dns','repo','automation'].includes(record.kind)||!allowedStatus.includes(record.status)||!allowedPriority.includes(record.priority))throw Error('Invalid incident case.');
 const identity=record.identity;
 if(typeof identity!=='string'||identity.length>320||!/^(dns|repo|automation)\|[a-zA-Z0-9._\/-]{1,255}$/.test(identity)||!identity.startsWith(`${record.kind}|`))throw Error('Invalid case identity.');
 if(record.kind==='automation'&&!/^automation\|[a-f0-9]{64}$/.test(identity))throw Error('Automation case requires a fixed workflow fingerprint.');
 if(!Array.isArray(record.events)||record.events.length<1||record.events.length>MAX_CASE_EVENTS)throw Error('Invalid case event history.');
 const events=record.events.map(x=>{
  if(!isObj(x)||!allowedEvents.includes(x.action)||!iso(x.at)||typeof x.value!=='string'||x.value.length>30)throw Error('Invalid case event.');
  if(x.action==='opened'&&x.value!=='open')throw Error('Invalid opened event.');
  if(x.action==='status'&&!allowedStatus.includes(x.value))throw Error('Invalid status event.');
  if(x.action==='priority'&&!allowedPriority.includes(x.value))throw Error('Invalid priority event.');
  return {action:x.action,value:x.value,at:iso(x.at)};
 });
 if(events[0].action!=='opened')throw Error('Missing opening event.');
 const createdAt=iso(record.createdAt),updatedAt=iso(record.updatedAt);
 if(!createdAt||!updatedAt)throw Error('Invalid case timestamps.');
 // No user-supplied notes, payloads, workflow names, credentials, or raw report data survive.
 return {id:record.id,kind:record.kind,identity,status:record.status,priority:record.priority,createdAt,updatedAt,events};
}
export function openIncidentCase(snapshot,cases=[],{id,now=new Date().toISOString()}={}){
 const s=safeSnapshot(snapshot),identity=caseIdentity(s);
 if(s.kind==='automation'&&!s.fingerprint)throw Error('Workflow fingerprint unavailable; cannot create a stable follow-up case.');
 if(!validId(id)||!iso(now))throw Error('Invalid case identifier or timestamp.');
 if(!Array.isArray(cases))throw Error('Invalid casebook.');
 const clean=cases.map(safeCase);
 if(clean.some(c=>c.id===id))throw Error('Case identifier already exists.');
 if(clean.some(c=>c.identity===identity&&c.status!=='closed'))throw Error('An active follow-up already exists for this target.');
 const item=safeCase({id,kind:s.kind,identity,status:'open',priority:'unassessed',createdAt:now,updatedAt:now,events:[{action:'opened',value:'open',at:now}]});
 return [item,...clean].slice(0,MAX_CASES);
}
export function changeIncidentCase(record,{status,priority,now=new Date().toISOString()}={}){
 const c=safeCase(record);if(!iso(now))throw Error('Invalid update timestamp.');
 if(status!==undefined&&!allowedStatus.includes(status))throw Error('Invalid case status.');
 if(priority!==undefined&&!allowedPriority.includes(priority))throw Error('Invalid case priority.');
 const changes=[];
 if(status!==undefined&&status!==c.status)changes.push({action:'status',value:status,at:stamp(now)});
 if(priority!==undefined&&priority!==c.priority)changes.push({action:'priority',value:priority,at:stamp(now)});
 if(!changes.length)return c;
 c.status=status??c.status;c.priority=priority??c.priority;c.updatedAt=stamp(now);
 c.events=[...c.events,...changes].slice(-MAX_CASE_EVENTS);
 // Preserve opening record if event history becomes capped.
 if(c.events[0].action!=='opened')c.events=[record.events[0],...c.events.slice(-(MAX_CASE_EVENTS-1))];
 return safeCase(c);
}
export function diagnosticTimeline(history){
 if(!Array.isArray(history))throw Error('Invalid inspection history.');
 const snapshots=history.slice(0,MAX_HISTORY).map(safeSnapshot);
 const groups=new Map();
 for(const s of snapshots){const key=caseIdentity(s);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 const timeline=[];
 for(const [identity,items] of groups){
  // Sort by time of import. Never pretend this is a real monitoring timestamp.
  items.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
  for(let i=1;i<items.length;i++){
   const older=items[i-1],newer=items[i];const deltas=[];
   for(const metric of new Set([...Object.keys(older.metrics),...Object.keys(newer.metrics)])){
    const delta=(newer.metrics[metric]??0)-(older.metrics[metric]??0);
    if(delta!==0)deltas.push({metric,delta});
   }
   const previous=new Map(older.signals.map(x=>[x.key,x.state]));
   const current=new Map(newer.signals.map(x=>[x.key,x.state]));
   let changed=0;for(const k of new Set([...previous.keys(),...current.keys()]))if(previous.get(k)!==current.get(k))changed++;
   timeline.push({identity,kind:newer.kind,target:newer.target,previousAt:older.capturedAt,currentAt:newer.capturedAt,partial:older.partial||newer.partial,deltas:deltas.slice(0,20),changedSignals:changed,identical:deltas.length===0&&changed===0});
  }
 }
 return timeline.sort((a,b)=>b.currentAt.localeCompare(a.currentAt)).slice(0,60);
}
export function serializeCasebook(history,cases){
 if(!Array.isArray(history)||!Array.isArray(cases)||history.length>MAX_HISTORY||cases.length>MAX_CASES)throw Error('Casebook exceeds its limits.');
 const normalizedHistory=history.map(safeSnapshot),normalizedCases=cases.map(safeCase);
 if(new Set(normalizedCases.map(x=>x.id)).size!==normalizedCases.length)throw Error('Repeated case identifiers.');
 const out={schema:CASEBOOK_SCHEMA,description:'User-imported static audit evidence and manually triaged follow-ups. Not production monitoring.',history:normalizedHistory,cases:normalizedCases};
 const serialized=JSON.stringify(out);
 if(new TextEncoder().encode(serialized).length>MAX_CASEBOOK_BYTES)throw Error('Casebook exceeds 500 KB.');
 return serialized;
}
export function restoreCasebook(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_CASEBOOK_BYTES)throw Error('Casebook exceeds 500 KB.');
 let raw;try{raw=JSON.parse(text);}catch{throw Error('Invalid casebook JSON.');}
 if(!isObj(raw)||raw.schema!==CASEBOOK_SCHEMA||!Array.isArray(raw.history)||!Array.isArray(raw.cases))throw Error('Unsupported casebook format.');
 const canonical=JSON.parse(serializeCasebook(raw.history,raw.cases));
 return {history:canonical.history,cases:canonical.cases};
}
