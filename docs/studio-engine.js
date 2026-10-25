/* V27 Functional Engineering Studio core. All data remains within this browser.
   Git operations below create actual SHA-1-addressed Git blobs, trees and commits,
   but do not offer remote operations or Git's full CLI semantics. */
(() => {
'use strict';
const stamp=()=>new Date().toISOString();
const encoder=new TextEncoder();
const defaults=()=>({
 'README.md':'# Engineering Studio\n\nEdit JavaScript, run tests, inspect the workflow and make a local commit.\n',
 'src/handler.js':`export function normalize(input) {
  if (!input || typeof input.reference !== 'string' || !input.reference.trim()) throw new Error('reference required');
  if (typeof input.email !== 'string' || !input.email.includes('@')) throw new Error('valid email required');
  return { reference: input.reference.trim(), email: input.email.toLowerCase(), accepted: true };
}
export function calculateRetryDelay(attempt, base = 120) {
  if (!Number.isInteger(attempt) || attempt < 0) throw new Error('invalid attempt');
  return base * (2 ** attempt);
}
`,
 'tests/handler.test.js':`test('normalizes a request', () => {
  const result = normalize({ reference: ' REF-100 ', email: 'TEST@EXAMPLE.ORG' });
  assert.equal(result.reference, 'REF-100');
  assert.equal(result.email, 'test@example.org');
});
test('rejects a missing reference', () => {
  assert.throws(() => normalize({ email: 'a@example.org' }));
});
test('exponential backoff', () => {
  assert.equal(calculateRetryDelay(2), 480);
});
`,
 'config.json':JSON.stringify({service:'delivery-lab',retryLimit:2,latencyMs:180,requireReference:true,simulateDeliveryFailureOnce:true},null,2)+'\n',
 'data/request.json':JSON.stringify({reference:'REQ-1001',email:'visitor@example.org',event:'submission.created'},null,2)+'\n',
 'queries/overview.sql':'CREATE TABLE IF NOT EXISTS deliveries (id INTEGER PRIMARY KEY, reference TEXT, status TEXT);\nINSERT INTO deliveries (reference,status) VALUES (\'REQ-1001\',\'DELIVERED\');\nSELECT * FROM deliveries;\n',
 'analysis.py':"print('Python in the browser')\nprint(sum([2, 3, 5]))\n"
});
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<140&&!p.startsWith('/')&&!p.startsWith('.')&&!p.includes('\\')&&!p.includes('\0')&&!p.split('/').some(s=>s==='..'||s===''||s==='.')&&p.split('/').length<=6;
const byteHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hexBytes=hex=>new Uint8Array(hex.match(/.{2}/g).map(h=>parseInt(h,16)));
const u8=v=>typeof v==='string'?encoder.encode(v):v;
// SHA-1 fallback for local file:// previews where Web Crypto is unavailable.
// Git object hashing is not used for cryptographic authentication.
function sha1Fallback(bytes){
 const len=bytes.length, paddedLen=Math.ceil((len+9)/64)*64, data=new Uint8Array(paddedLen);data.set(bytes);data[len]=0x80;
 const bitLen=len*8;const view=new DataView(data.buffer);view.setUint32(paddedLen-8,Math.floor(bitLen/4294967296),false);view.setUint32(paddedLen-4,bitLen>>>0,false);
 let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;
 const rol=(n,s)=>(n<<s)|(n>>>(32-s));
 for(let off=0;off<paddedLen;off+=64){const w=new Int32Array(80);for(let i=0;i<16;i++)w[i]=view.getInt32(off+i*4,false);for(let i=16;i<80;i++)w[i]=rol(w[i-3]^w[i-8]^w[i-14]^w[i-16],1);
 let a=h0,b=h1,c=h2,d=h3,e=h4;
 for(let i=0;i<80;i++){let f,k;if(i<20){f=(b&c)|((~b)&d);k=0x5a827999}else if(i<40){f=b^c^d;k=0x6ed9eba1}else if(i<60){f=(b&c)|(b&d)|(c&d);k=0x8f1bbcdc}else{f=b^c^d;k=0xca62c1d6}const t=(rol(a,5)+f+e+k+w[i])|0;e=d;d=c;c=rol(b,30);b=a;a=t;}
 h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;
 }
 return [h0,h1,h2,h3,h4].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
}
async function hashObject(type,content){const bytes=u8(content);const head=encoder.encode(type+' '+bytes.length+'\0');const joined=new Uint8Array(head.length+bytes.length);joined.set(head);joined.set(bytes,head.length);const hex=crypto?.subtle?byteHex(new Uint8Array(await crypto.subtle.digest('SHA-1',joined))):sha1Fallback(joined);return {id:hex,type,content:typeof content==='string'?content:Array.from(bytes)};}
function createModel(){return {files:defaults(),stage:{},objects:{},commits:[],head:null,jobs:[],events:[],nextJob:1,activeFile:'src/handler.js',pythonCode:"print('Python in the browser')\nprint(sum([2,3,5]))\n",sqlBytes:null};}
class StudioEngine {
 constructor(){this.state=createModel();this.db=null;this.pending=Promise.resolve();this.listeners=[];this.jobTimer=null;this.saving=false;this.isDurable=false;this.runEpoch=0;}
 on(fn){this.listeners.push(fn);}
 emit(type,data){for(const f of this.listeners){try{f(type,data);}catch(e){console.warn('Studio listener',e);}}}
 async init(){try{this.db=await new Promise((ok,no)=>{const req=indexedDB.open('mk-engineering-studio-v27',1);req.onupgradeneeded=()=>req.result.createObjectStore('root');req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});
   const previous=await new Promise((ok,no)=>{const req=this.db.transaction('root','readonly').objectStore('root').get('model');req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});
   if(previous?.files&&previous?.commits) this.state=previous;
   else await this.migrateV26();
   this.isDurable=true;
 }catch(e){console.warn('Persistent storage not available:',e);this.isDurable=false;}
 this.state.jobs.forEach(j=>{if(j.status==='RUNNING'){j.status='PAUSED';j.updated=stamp();}});
 this.emit('ready',{durable:this.isDurable});return this.state;}
 async migrateV26(){try{const db=await new Promise((ok,no)=>{const r=indexedDB.open('mk-workstation-v26');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}); if(!db.objectStoreNames.contains('state'))return;const old=await new Promise((ok,no)=>{const r=db.transaction('state','readonly').objectStore('state').get('workspace');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}); if(old?.files){for(const [p,txt] of Object.entries(old.files)){if(validPath(p)&&typeof txt==='string'&&txt.length<150000)this.state.files[p]=txt;}if(typeof old.pythonCode==='string')this.state.pythonCode=old.pythonCode.slice(0,12000);this.emit('migration','Imported compatible V26 files into V27.');}db.close();}catch(e){console.info('No V26 workspace migration',e);}}
 async save(){const data=JSON.parse(JSON.stringify(this.state));this.saving=true;this.pending=this.pending.catch(()=>{}).then(()=>new Promise((ok,no)=>{if(!this.db){ok();return;}const tx=this.db.transaction('root','readwrite');tx.objectStore('root').put(data,'model');tx.oncomplete=ok;tx.onerror=()=>no(tx.error);})).then(()=>{this.saving=false;this.emit('saved',this.isDurable);}).catch(e=>{this.isDurable=false;this.saving=false;this.emit('storage-error',e.message)});return this.pending;}
 paths(){return Object.keys(this.state.files).sort();}
 read(path){if(!(path in this.state.files))throw new Error('No file: '+path);return this.state.files[path];}
 async write(path,text){if(!validPath(path))throw new Error('Invalid relative file path');if(typeof text!=='string'||text.length>150000)throw new Error('File must be text under 150 KB');if(this.paths().length>=130&&!(path in this.state.files))throw new Error('Workspace file limit reached');this.state.files[path]=text;this.emit('file',path);await this.save();}
 async remove(path){this.read(path);delete this.state.files[path];this.emit('file',path);await this.save();}
 baseline(){return this.state.commits.at(-1)?.files||{};}
 changes(){const base=this.baseline(),out=[];for(const p of [...new Set([...Object.keys(base),...this.paths()])].sort()){if(base[p]!==this.state.files[p])out.push({path:p,status:p in this.state.files?(p in base?'modified':'new'):'deleted'});}return out;}
 stage(paths){let count=0;const requested=paths.length===1&&['.','-A'].includes(paths[0])?this.changes().map(x=>x.path):paths;for(const path of requested){if(!validPath(path))throw new Error('Invalid path '+path);if(!(path in this.state.files)&&!(path in this.baseline()))throw new Error('Unknown file: '+path);this.state.stage[path]=this.state.files[path]??null;count++;}this.emit('stage',count);return count;}
 async commit(message){if(!message?.trim()||message.length>140)throw new Error('Commit message required (max 140 chars)');const stage=this.state.stage;if(!Object.keys(stage).length)throw new Error('No staged files. Use git add .');const snapshot={...this.baseline()};for(const [p,value] of Object.entries(stage)){if(value===null)delete snapshot[p];else snapshot[p]=value;}
 if(JSON.stringify(Object.entries(snapshot).sort())===JSON.stringify(Object.entries(this.baseline()).sort()))throw new Error('Staged files have no changes');
 const objects={...this.state.objects};const nodes={};for(const [path,value] of Object.entries(snapshot)){const obj=await hashObject('blob',value);objects[obj.id]=obj;const parts=path.split('/');let dir=nodes;for(let i=0;i<parts.length-1;i++){dir[parts[i]]??={};dir=dir[parts[i]];}dir[parts.at(-1)]=obj.id;}
 const writeTree=async node=>{const entries=[];for(const name of Object.keys(node).sort()){const child=node[name],tree=typeof child==='string'?false:true,id=tree?await writeTree(child):child;entries.push({name,mode:tree?'40000':'100644',id});}
 const chunks=entries.map(e=>{const a=encoder.encode(e.mode+' '+e.name+'\0'),b=hexBytes(e.id),c=new Uint8Array(a.length+b.length);c.set(a);c.set(b,a.length);return c;});const bytes=new Uint8Array(chunks.reduce((a,c)=>a+c.length,0));let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const obj=await hashObject('tree',bytes);objects[obj.id]=obj;return obj.id;};
 const tree=await writeTree(nodes);const secs=Math.floor(Date.now()/1000);const author='Portfolio Visitor <local@browser.invalid> '+secs+' +0000';const raw=`tree ${tree}\n${this.state.head?'parent '+this.state.head+'\n':''}author ${author}\ncommitter ${author}\n\n${message.trim()}\n`;const commit=await hashObject('commit',raw);objects[commit.id]=commit;
 this.state.objects=objects;this.state.head=commit.id;this.state.commits.push({id:commit.id,tree,parent:this.state.commits.at(-1)?.id||null,message:message.trim(),at:stamp(),files:snapshot});this.state.stage={};this.emit('commit',commit.id);await this.save();return commit.id;}
 status(){return {changes:this.changes(),staged:Object.keys(this.state.stage),head:this.state.head,commits:this.state.commits.length};}
 async reset(){if(this.jobTimer)clearTimeout(this.jobTimer);this.state=createModel();await this.save();this.emit('reset',null);}
 async runWorkflow(scenario='normal'){
 if(!['normal','retry','missing','review'].includes(scenario))throw Error('Invalid scenario');const cfg=JSON.parse(this.read('config.json')),req=JSON.parse(this.read('data/request.json'));
 if(!Number.isInteger(cfg.retryLimit)||cfg.retryLimit<0||cfg.retryLimit>8)throw Error('retryLimit must be an integer from 0 to 8');if(!Number.isInteger(cfg.latencyMs)||cfg.latencyMs<30||cfg.latencyMs>3000)throw Error('latencyMs must be 30–3000');
 if(this.state.jobs.some(j=>j.status==='RUNNING'))throw Error('Another workflow is already running');
 const job={id:'JOB-'+String(this.state.nextJob++).padStart(4,'0'),scenario,status:'RUNNING',stage:'INTAKE',step:0,attempts:0,retries:0,approved:false,created:stamp(),updated:stamp(),events:[]};this.state.jobs.push(job);this.emit('job',job);await this.save();const stages=['INTAKE','VALIDATE','STORE','QUEUE','DELIVER','VERIFY'];
 const run=async()=>{if(job.status!=='RUNNING')return;const stage=stages[job.step];job.stage=stage;
 const add=(level,message)=>{const e={at:stamp(),id:job.id,stage,level,message};job.events.push(e);this.state.events.push(e);if(this.state.events.length>600)this.state.events.shift();this.emit('event',e);};
 if(stage==='VALIDATE'&&(scenario==='missing'||(cfg.requireReference&&!req.reference)||!req.email||!req.email.includes('@'))){job.status='FAILED';add('error','Validation failed; no valid reference or email.');}
 else if(stage==='DELIVER'&&scenario==='retry'&&job.attempts===0){job.attempts++;if(job.retries>=cfg.retryLimit){job.status='FAILED';add('error','Delivery attempt failed; retry budget exhausted.');}else{job.retries++;add('warn','Delivery timeout; retry '+job.retries+' queued.');}}
 else if(stage==='VERIFY'&&scenario==='review'&&!job.approved){job.status='REVIEW';add('warn','Human review required. Use workflow approve '+job.id);}
 else{if(stage==='STORE'){const record='data/'+job.id.toLowerCase()+'.json';this.state.files[record]=JSON.stringify({reference:req.reference,email:req.email,receivedAt:stamp()},null,2)+'\n';this.emit('file',record);}job.step++;add('info',stage+' completed using local workspace data.');if(job.step===stages.length){job.status='DELIVERED';job.stage='COMPLETE';}}
 job.updated=stamp();this.emit('job',job);await this.save();if(job.status==='RUNNING')this.jobTimer=setTimeout(run,cfg.latencyMs);};this.jobTimer=setTimeout(run,45);return job.id;}
 async approve(id){const j=this.state.jobs.find(j=>j.id===id);if(!j||j.status!=='REVIEW')throw Error('No pending review for '+id);j.approved=true;j.status='RUNNING';j.updated=stamp();await this.save();const cfg=JSON.parse(this.read('config.json'));this.jobTimer=setTimeout(()=>{j.step=5;this.emit('job',j);this.runStep(j);},Math.max(30,cfg.latencyMs));}
 async runStep(job){const e={at:stamp(),id:job.id,stage:'VERIFY',level:'info',message:'Approved delivery acknowledged locally.'};job.step=6;job.status='DELIVERED';job.stage='COMPLETE';job.events.push(e);this.state.events.push(e);job.updated=stamp();this.emit('event',e);this.emit('job',job);await this.save();}
 export(){return JSON.stringify({schema:'mk-studio-v27',created:stamp(),state:this.state},null,2);}
 async import(json){if(json.schema!=='mk-studio-v27'||!json.state?.files)throw Error('Invalid V27 export');const raw=JSON.stringify(json.state);if(raw.length>3000000)throw Error('File too large');for(const [p,t] of Object.entries(json.state.files))if(!validPath(p)||typeof t!=='string'||t.length>150000)throw Error('Invalid project file '+p);this.state=json.state;await this.save();this.emit('reset',null);}
}
window.MKStudioEngine=StudioEngine;
})();
