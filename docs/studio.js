/* V28 Studio UI. Embedded xterm.js and CodeMirror; no remote execution. */
(() => {
'use strict';
const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const ui=$('#engineeringStudio'),open=$('#studioLaunch');if(!ui||!open||!window.MKStudioEngine)return;
const engine=new window.MKStudioEngine();let current='src/handler.js',editor=null,term=null,cmd='',history=[],historyCursor=0,dirty=false,lastFocus=null,testsRun='Not run',runtimeSQL=null,pythonWorker=null,sqlLoading=null,flowUI=null;
const results=$('#studioTestsOutput'),terminalEl=$('#studioXterm');
const out=(message,level='info')=>{if(!term)return;const color={info:'\x1b[38;2;200;216;225m',good:'\x1b[38;2;138;213;169m',warn:'\x1b[38;2;233;195;124m',error:'\x1b[38;2;240;144;130m',dim:'\x1b[38;2;136;159;175m'}[level]||'';String(message).split('\n').forEach(line=>term.writeln(color+line.replace(/\r/g,'')+'\x1b[0m'));};
const prompt=()=>term?.write('\r\n\x1b[38;2;210;178;127mmk@studio\x1b[0m \x1b[38;2;164;178;190m~/workspace\x1b[0m % ');
const setSave=(str)=>{$('#studioSaveState').textContent=str;};
function render(){const m=engine.state;$('#studioFileCount').textContent=engine.paths().length+' files';$('#studioCommitCount').textContent=m.commits.length+' commits';$('#studioTestCount').textContent=testsRun;$('#studioJobCount').textContent=m.jobs.length+' jobs';$('#studioGitInfo').textContent=m.head?'HEAD '+m.head.slice(0,12)+'\n'+m.commits.at(-1).message:'No local commits';
 const files=$('#studioFiles');files.replaceChildren();engine.paths().forEach(path=>{const b=document.createElement('button');b.type='button';b.className='studio-file';b.dataset.active=String(path===current);b.textContent=(path.endsWith('.js')?'◇  ':path.endsWith('.json')?'▣  ':path.endsWith('.sql')?'◈  ':'◫  ')+path;b.addEventListener('click',()=>openFile(path));files.append(b);});
 const states={queued:0,delivered:0,failed:0,retries:0};m.jobs.forEach(j=>{if(['RUNNING','QUEUED','RETRY_WAIT','PAUSED','REVIEW'].includes(j.status))states.queued++;if(j.status==='DELIVERED')states.delivered++;if(j.status==='FAILED')states.failed++;states.retries+=(j.retries||0);});Object.entries(states).forEach(([k,v])=>{$('#studio'+k[0].toUpperCase()+k.slice(1)).textContent=v});
 const ev=$('#studioEvents');ev.replaceChildren();if(!m.events.length){ev.textContent='No events yet. Run a workflow in the terminal.';return;}m.events.slice(-18).reverse().forEach(item=>{const node=document.createElement('div');node.className='studio-event';node.dataset.level=item.level;const time=document.createElement('time');time.textContent=new Date(item.at).toLocaleTimeString([],{hour12:false})+' · '+item.id;const msg=document.createElement('div');msg.textContent=item.stage+' · '+item.message;node.append(time,msg);ev.append(node)});
}
function openFile(name){if(dirty&&!confirm('Discard unsaved changes to '+current+'?'))return;try{current=name;const value=engine.read(name);if(editor){editor.setValue(value);editor.setOption('mode', name.endsWith('.js')?'javascript':name.endsWith('.json')?'application/json':name.endsWith('.sql')?'text/x-sql':name.endsWith('.py')?'python':'text/plain');editor.refresh();}else $('#studioCode').value=value;dirty=false;$('#studioDirty').textContent='SAVED';$('#studioEditorTitle').textContent=name;render();}catch(e){alert(e.message);}}
async function saveEditor(){const text=editor?editor.getValue():$('#studioCode').value;try{await engine.write(current,text);dirty=false;$('#studioDirty').textContent='SAVED';setSave('SAVED · THIS BROWSER');}catch(e){out(e.message,'error');alert(e.message)}}
function selectTab(name){$$('[data-studio-tab]',ui).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.studioTab===name)));$$('[data-studio-panel]',ui).forEach(p=>p.dataset.active=String(p.dataset.studioPanel===name));if(name==='editor'){setTimeout(()=>editor?.refresh(),20);}if(name==='terminal'){setTimeout(()=>{resizeTerm();term?.focus();},30);}if(name==='python')$('#studioPython').value=engine.state.pythonCode||'';if(name==='sql')$('#studioSQL').value=engine.state.files['queries/overview.sql']||'SELECT sqlite_version();';if(name==='flow')flowUI?.render();}
function resizeTerm(){if(!term)return;const w=terminalEl.clientWidth,h=terminalEl.clientHeight;try{term.resize(Math.max(30,Math.floor((w-18)/8.4)),Math.max(8,Math.floor((h-16)/17.7)));}catch(e){console.warn('xterm resize',e)}}
function startTerm(){if(typeof window.Terminal!=='function'){terminalEl.innerHTML='<p style="padding:20px">Terminal library unavailable. Editor, tests, files and workflows remain functional.</p>';return;}
 try{term=new window.Terminal({cols:80,rows:24,cursorBlink:true,scrollback:550,fontSize:12,fontFamily:'Menlo,Consolas,monospace',theme:{background:'#090f14',foreground:'#e9edf1',cursor:'#cfac79'}});term.open(terminalEl);terminalEl.addEventListener('pointerdown',()=>setTimeout(()=>term?.focus(),0));term.on('data',onTermData);resizeTerm();out('ENGINEERING STUDIO / V28 · Local Git objects, editable workflow graph and traced job execution','good');out('Type help for supported commands. No actual OS shell, remote Git push, or email access.','dim');prompt();}catch(e){console.error(e);terminalEl.textContent='Terminal initialization failed: '+e.message;}}
function onTermData(data){for(const ch of data){if(ch==='\r'||ch==='\n'){const line=cmd;history.push(line);historyCursor=history.length;term.write('\r\n');cmd='';Promise.resolve(runCommand(line)).catch(e=>out('ERROR: '+e.message,'error')).finally(prompt);}
 else if(ch==='\x7f'){if(cmd){cmd=cmd.slice(0,-1);term.write('\b \b');}}
 else if(ch==='\x03'){term.write('^C');cmd='';prompt();}
 else if(ch.charCodeAt(0)>=32&&cmd.length<240){cmd+=ch;term.write(ch);}}}
async function runCommand(raw){const line=raw.trim();if(!line)return;const parts=line.match(/"[^"]*"|'[^']*'|\S+/g)||[];const a=parts.map(s=>s.replace(/^['"]|['"]$/g,''));const name=(a.shift()||'').toLowerCase();
 if(name==='help'){out('FILES      ls, cat <path>, touch <path>, rm <path>, write <path> <text>, edit <path>');out('GIT        git status, git add ., git commit -m "message", git log, git diff, git show');out('TEST       test, npm test (runs edited JavaScript source and test file)');out('WORKFLOW   workflow run normal|retry|missing|review|exhausted; jobs|logs|approve|pause|resume|cancel|retry|trace');out('GRAPH      flow graph|metrics|enable|disable|move|config; or open Workflow designer tab');out('TOOLS      python, sql, export, pwd, whoami, date, clear');return;}
 if(name==='pwd'){out('/home/browser/workspace (browser-local)');return;}if(name==='whoami'){out('portfolio-visitor (sandbox)');return;}if(name==='date'){out(new Date().toString());return;}
 if(name==='ls'){engine.paths().filter(p=>!a[0]||p.startsWith(a[0])).forEach(p=>out(p,'dim'));return;}
 if(name==='cat'){out(engine.read(a[0]||''));return;}
 if(name==='touch'){await engine.write(a[0],a[0] in engine.state.files?engine.read(a[0]):'');out('Created '+a[0],'good');return;}
 if(name==='write'){const path=a.shift();if(!path||!a.length)throw Error('Usage: write <path> <text>');await engine.write(path,a.join(' ')+'\n');out('Saved '+path,'good');if(path===current)openFile(path);return;}
 if(name==='rm'){if(!a[0])throw Error('Usage: rm <path>');await engine.remove(a[0]);out('Removed '+a[0],'warn');if(a[0]===current)openFile(engine.paths()[0]);return;}
 if(name==='edit'){if(!a[0])throw Error('Usage: edit <path>');openFile(a[0]);selectTab('editor');return;}
 if(name==='git'){const sub=a.shift()||'status';if(sub==='status'){const s=engine.status();out('On branch main · '+(s.head?s.head.slice(0,12):'unborn HEAD'),'dim');s.changes.forEach(c=>out('  '+c.status+': '+c.path,'warn'));if(!s.changes.length)out('Working tree clean','good');if(s.staged.length)out('Staged: '+s.staged.join(', '),'good');return;}
 if(sub==='add'){out('Staged '+engine.stage(a)+' file(s)','good');await engine.save();return;}
 if(sub==='commit'){const idx=a.indexOf('-m');if(idx<0)throw Error('Usage: git commit -m "message"');const sha=await engine.commit(a.slice(idx+1).join(' '));out('[main '+sha.slice(0,12)+'] '+engine.state.commits.at(-1).message,'good');out('Git SHA-1 blobs, tree and commit stored locally. No remote updated.','dim');return;}
 if(sub==='log'){if(!engine.state.commits.length)out('No commits yet.');engine.state.commits.slice(-12).reverse().forEach(c=>out(c.id.slice(0,12)+' '+c.message+' · '+c.at,'dim'));return;}
 if(sub==='show'){const c=engine.state.commits.at(-1);if(!c){out('No HEAD yet');return;}out('commit '+c.id+'\nTree '+c.tree+'\n'+c.message);return;}
 if(sub==='diff'){const baseline=engine.baseline(),state=engine.state.files;for(const item of engine.changes()){out('--- a/'+item.path+'\n+++ b/'+item.path,'dim');const old=(baseline[item.path]||'').split('\n'),nw=(state[item.path]||'').split('\n');if(old.join('\n')===nw.join('\n'))continue;old.filter(x=>x).slice(0,8).forEach(x=>out('- '+x,'warn'));nw.filter(x=>x).slice(0,8).forEach(x=>out('+ '+x,'good'));}if(!engine.changes().length)out('No changes');return;}
 throw Error('Unsupported local git subcommand. Try status/add/commit/log/diff/show.');}
 if(name==='test'||(name==='npm'&&a[0]==='test')){selectTab('test');await runTests();return;}
 if(name==='workflow'){const sub=a.shift()||'status',id=a[0];
   if(sub==='run'){const newId=await engine.runWorkflow(id||'normal');out('Queued '+newId+' with saved graph, request and configuration','good');flowUI?.setSelected(newId);return;}
   if(sub==='jobs'||sub==='status'){const jobs=sub==='jobs'?engine.state.jobs.slice(-16):engine.state.jobs.slice(-1);if(!jobs.length)out('No jobs. Run workflow run normal.','dim');jobs.forEach(j=>out(j.id+'  '+j.status+'  '+j.stage+'  retries='+j.retries+'  attempts='+j.attempts));return;}
   if(sub==='logs'){const matching=id?engine.state.events.filter(e=>e.job===id||e.id===id):engine.state.events;matching.slice(-30).forEach(e=>out((e.job||e.id)+'  '+e.stage+'  '+e.message,e.level==='error'?'error':e.level==='warn'?'warn':'dim'));return;}
   if(['approve','pause','resume','cancel','retry'].includes(sub)){if(!id)throw Error('Usage: workflow '+sub+' JOB-0001');await engine.flowControl(sub,id);out(sub.toUpperCase()+' '+id,'good');flowUI?.setSelected(id);return;}
   if(sub==='trace'){if(!id)throw Error('Usage: workflow trace JOB-0001');const trace=engine.flowTrace(id);out(trace.job.id+'  '+trace.job.status+'  '+trace.job.plan.join(' -> '),'good');trace.job.events.forEach(e=>out(e.at.slice(11,23)+' '+e.stage+' '+e.message,e.level==='error'?'error':'dim'));return;}
   throw Error('Usage: workflow run|jobs|logs|approve|pause|resume|cancel|retry|trace');
 }
 if(name==='flow'){
   const sub=a.shift()||'graph';if(sub==='graph'||sub==='stages'){out('ACTIVE PLAN  '+engine.flowPlan().join(' -> '),'good');if(sub==='graph')selectTab('flow');return;}
   if(sub==='metrics'){const m=engine.flowMetrics();for(const [k,v] of Object.entries(m))out(k+': '+(v??'—'),'dim');return;}
   if(sub==='enable'||sub==='disable'){if(!a[0])throw Error('Usage: flow '+sub+' STORE|QUEUE|VERIFY');await engine.flowEditStage(a[0].toUpperCase(),sub==='enable');out('Graph saved. Next jobs use new stage selection.','good');return;}
   if(sub==='move'){const dir=a[1]==='up'?-1:a[1]==='down'?1:null;if(!dir)throw Error('Usage: flow move STORE|QUEUE up|down');await engine.flowMove((a[0]||'').toUpperCase(),dir);out('Graph order updated.','good');return;}
   if(sub==='config'){if(!a.length){const cfg=JSON.parse(engine.read('config.json'));Object.entries(cfg).forEach(([k,v])=>out(k+' = '+v));return;}const key=a[0],rawValue=a[1];if(!rawValue)throw Error('Usage: flow config latencyMs|retryLimit|backoffMs|requireReference|requireHumanReview|simulateDeliveryFailureOnce <value>');let value;if(rawValue==='true'||rawValue==='false')value=rawValue==='true';else if(/^\d+$/.test(rawValue))value=Number(rawValue);else throw Error('Expected number or true/false');await engine.flowUpdateConfig({[key]:value});out('config.json saved. Future jobs use this setting.','good');return;}
   throw Error('Usage: flow graph|metrics|enable|disable|move|config');
 }
 if(name==='python'){selectTab('python');out('Python panel opened. Executes code in WebAssembly when runtime loads.');return;}if(name==='sql'){selectTab('sql');out('SQLite panel opened. Runtime downloads on demand.');return;}
 if(name==='export'){download('Moataz-Engineering-Workspace-V27.json',engine.export(),'application/json');out('Export generated.','good');return;}
 if(name==='clear'){term?.clear();return;}
 if(['bash','zsh','sudo','ssh','docker','curl','npm','node','systemctl','pip'].includes(name))throw Error('Not an OS shell. This command is not supported. Use the runnable studio tools.');throw Error('Unknown command: '+name+'. Type help.');}
function download(name,contents,type){const b=new Blob([contents],{type}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
const runnerHTML=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none';"></head><body><script>
addEventListener('message',async event=>{const data=event.data;if(data?.type!=='run-js-tests')return;const rows=[],pending=[];let failed=false;
const assert={equal(a,b){if(!Object.is(a,b))throw Error('expected '+JSON.stringify(b)+', received '+JSON.stringify(a))},deepEqual(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('expected '+JSON.stringify(b)+', received '+JSON.stringify(a))},ok(a){if(!a)throw Error('expected truthy value')},throws(fn){let hit=false;try{fn()}catch(e){hit=true}if(!hit)throw Error('expected function to throw')}};
const test=(name,fn)=>{const p=Promise.resolve().then(fn).then(()=>rows.push({name,pass:true})).catch(err=>{failed=true;rows.push({name,pass:false,error:String(err.message||err)})});pending.push(p)};
try{const source=data.source.replace(/\\bexport\\s+(?=(?:async\\s+)?function|const|let|class)/g,'');new Function('test','assert',source+'\\n'+data.tests)(test,assert);await Promise.all(pending);parent.postMessage({type:'js-test-result',nonce:data.nonce,rows,failed},'*');}catch(err){parent.postMessage({type:'js-test-result',nonce:data.nonce,rows:[...rows,{name:'Compilation / runtime',pass:false,error:String(err.message||err)}],failed:true},'*');}});
<\/script></body></html>`;
async function runTests(){const btn=$('#studioTestRun');btn.disabled=true;const output=results;output.textContent='Executing tests in restricted iframe...';const nonce=Math.random().toString(36).slice(2),iframe=document.createElement('iframe');iframe.hidden=true;iframe.sandbox='allow-scripts';iframe.srcdoc=runnerHTML;ui.append(iframe);
 try{const data=await new Promise((resolve,reject)=>{let timer=setTimeout(()=>{cleanup();reject(Error('Test timeout (6 s).'))},6000);function cleanup(){clearTimeout(timer);removeEventListener('message',handler)}function handler(ev){if(ev.source!==iframe.contentWindow||ev.data?.nonce!==nonce||ev.data.type!=='js-test-result')return;cleanup();resolve(ev.data)}addEventListener('message',handler);iframe.addEventListener('load',()=>iframe.contentWindow.postMessage({type:'run-js-tests',nonce,source:engine.read('src/handler.js'),tests:engine.read('tests/handler.test.js')},'*'),{once:true})});
 const passed=data.rows.filter(r=>r.pass).length;testsRun=passed+'/'+data.rows.length+' passed';output.textContent=data.rows.map(r=>(r.pass?'PASS ':'FAIL ')+r.name+(r.error?'\n     '+r.error:'')).join('\n')+'\n\n'+testsRun;out(testsRun,data.failed?'error':'good');render();}
 catch(e){testsRun='failed';output.textContent='TEST ERROR: '+e.message;out(e.message,'error');render();}finally{iframe.remove();btn.disabled=false}}
async function loadSQL(){if(runtimeSQL)return runtimeSQL;if(sqlLoading)return sqlLoading;sqlLoading=(async()=>{if(!window.initSqlJs){const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js';await new Promise((ok,no)=>{script.onload=ok;script.onerror=()=>no(Error('SQLite WASM library could not be downloaded'));document.head.append(script)});}const SQL=await window.initSqlJs({locateFile:f=>'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/'+f});runtimeSQL=engine.state.sqlBytes?new SQL.Database(new Uint8Array(engine.state.sqlBytes)):new SQL.Database();return runtimeSQL})();return sqlLoading;}
async function runSQL(){const btn=$('#studioSQLRun'),outbox=$('#studioSQLOut');btn.disabled=true;outbox.textContent='Loading SQLite WebAssembly...';try{const db=await loadSQL(),query=$('#studioSQL').value.slice(0,30000);const data=db.exec(query);outbox.textContent=data.length?data.map(r=>r.columns.join(' | ')+'\n'+r.values.map(v=>v.map(x=>String(x)).join(' | ')).join('\n')).join('\n\n'):'SQL executed successfully; no rows returned.';engine.state.sqlBytes=Array.from(db.export());await engine.write('queries/overview.sql',query);await engine.save();out('SQLite query executed against persistent in-browser database.','good');}catch(e){outbox.textContent='SQLite error: '+e.message;out(e.message,'error');sqlLoading=null;}finally{btn.disabled=false;}}
function createPythonWorker(){const source=`let pyodide=null;onmessage=async e=>{if(e.data.kind!=='run')return;try{if(!pyodide){postMessage({kind:'loading'});importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js');pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'})}let logs=[];pyodide.setStdout({batched:s=>logs.push(s)});pyodide.setStderr({batched:s=>logs.push(s)});const val=await pyodide.runPythonAsync(e.data.code);postMessage({kind:'done',output:logs.join('\\n')+(val===undefined?'':'\\n'+String(val))})}catch(err){postMessage({kind:'error',output:String(err)})}};`;const blob=new Blob([source],{type:'text/javascript'});const url=URL.createObjectURL(blob);const w=new Worker(url);URL.revokeObjectURL(url);return w;}
async function runPython(){const btn=$('#studioPythonRun'),target=$('#studioPythonOut'),code=$('#studioPython').value.slice(0,12000);btn.disabled=true;target.textContent='Loading / executing Pyodide...';engine.state.pythonCode=code;await engine.save();try{pythonWorker?.terminate();pythonWorker=createPythonWorker();await new Promise((ok,no)=>{const timer=setTimeout(()=>{pythonWorker.terminate();no(Error('Python timed out after 20 seconds.'))},20000);pythonWorker.onmessage=e=>{if(e.data.kind==='loading')return;clearTimeout(timer);if(e.data.kind==='error')no(Error(e.data.output));else{target.textContent=e.data.output||'(completed with no output)';ok()}};pythonWorker.onerror=e=>{clearTimeout(timer);no(Error('Python runtime download/execution failed.'))};pythonWorker.postMessage({kind:'run',code})});out('Python executed inside browser WebAssembly.','good');}
 catch(e){target.textContent='Python error: '+e.message;out(e.message,'error');}finally{btn.disabled=false;}}
const optionalEditorScripts=[
 './vendor/codemirror/codemirror.js',
 './vendor/codemirror/javascript.js',
 './vendor/codemirror/python.js',
 './vendor/codemirror/sql.js',
 './vendor/codemirror/matchbrackets.js',
 './vendor/xterm/xterm.js'
];
let editorLibraries=null;
function loadEditorLibraries(){
 if(editorLibraries)return editorLibraries;
 editorLibraries=(async()=>{
   if(!document.querySelector('link[data-studio-editor-css]')){
     const css=document.createElement('link');css.rel='stylesheet';css.href='./vendor/codemirror/codemirror.css';css.dataset.studioEditorCss='true';document.head.append(css);
   }
   for(const src of optionalEditorScripts){
     await new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.async=false;tag.onload=resolve;tag.onerror=()=>reject(new Error('Optional studio library unavailable: '+src));document.head.append(tag)});
   }
 })();
 return editorLibraries;
}
async function boot(){
 try{setSave('LOADING EDITOR / TERMINAL…');await loadEditorLibraries();}
 catch(error){console.warn(error);setSave('OPTIONAL EDITOR LIBRARY UNAVAILABLE · TEXTAREA MODE');}
 await engine.init();setSave(engine.isDurable?'READY · INDEXEDDB':'SESSION ONLY · STORAGE BLOCKED');render();startTerm();
 if(window.CodeMirror){editor=window.CodeMirror.fromTextArea($('#studioCode'),{lineNumbers:true,mode:'javascript',lineWrapping:true,matchBrackets:true,indentUnit:2,tabSize:2,extraKeys:{'Ctrl-S':saveEditor,'Cmd-S':saveEditor}});editor.on('change',()=>{dirty=true;$('#studioDirty').textContent='UNSAVED';});}openFile(current);flowUI=window.MKFlowUI?.mount({engine,ui,out,selectTab,render});
 engine.on((type,data)=>{if(['file','stage','commit','reset','job','event','saved','flow','flow-settings'].includes(type))render();if(type==='storage-error')setSave('STORAGE ERROR · EXPORT YOUR WORK');});
}
let initialized=false;open.addEventListener('click',async()=>{lastFocus=document.activeElement;ui.hidden=false;document.body.style.overflow='hidden';if(!initialized){initialized=true;await boot();}selectTab('editor');$('#studioClose').focus();});
// Localize visible studio controls; code, commands and source paths remain LTR.
const studioStrings={
 en:['Open Advanced Engineering Studio','Close ✕','Export JSON','Import JSON','+ New','Save file','Delete','Run tests ↗','Run SQL ↗','Run Python ↗','Reset local studio','Code editor','Terminal','Workflow designer','Test runner','SQLite','Python'],
 fr:['Ouvrir le studio d’ingénierie avancée','Fermer ✕','Exporter JSON','Importer JSON','+ Nouveau','Enregistrer','Supprimer','Lancer les tests ↗','Exécuter SQL ↗','Exécuter Python ↗','Réinitialiser le studio','Éditeur de code','Terminal','Flux de travail','Tests','SQLite','Python'],
 es:['Abrir el estudio avanzado de ingeniería','Cerrar ✕','Exportar JSON','Importar JSON','+ Nuevo','Guardar archivo','Eliminar','Ejecutar pruebas ↗','Ejecutar SQL ↗','Ejecutar Python ↗','Restablecer estudio','Editor de código','Terminal','Flujos de trabajo','Pruebas','SQLite','Python'],
 ar:['افتح الاستوديو الهندسي المتقدم','إغلاق ✕','تصدير JSON','استيراد JSON','+ ملف جديد','حفظ الملف','حذف','تشغيل الاختبارات ↗','تشغيل SQL ↗','تشغيل Python ↗','إعادة ضبط الاستوديو','محرر الشيفرة','الطرفية','مصمم سير العمل','الاختبارات','SQLite','Python']
};
function localizeStudio(){const x=studioStrings[document.documentElement.lang]||studioStrings.en;
 const ids=['studioLaunch','studioClose','studioExport','studioImport','studioNew','studioSave','studioDelete','studioTestRun','studioSQLRun','studioPythonRun','studioReset'];ids.forEach((id,i)=>{const el=$('#'+id);if(el){if(id==='studioLaunch'){el.firstChild.textContent=x[i]+' ';}else if(id==='studioSave'){el.textContent=x[i];}else el.textContent=x[i];}});
 $$('[data-studio-tab]',ui).forEach((b,i)=>b.textContent=x[11+i]);
}
document.addEventListener('portfolio:locale',localizeStudio);
if(document.readyState!=='loading')localizeStudio();else document.addEventListener('DOMContentLoaded',localizeStudio);
function closeStudio(){ui.hidden=true;document.body.style.overflow='';lastFocus?.focus();}
$('#studioClose').addEventListener('click',closeStudio);
document.addEventListener('keydown',e=>{if(ui.hidden||e.key!=='Tab')return;const nodes=$$('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),.CodeMirror textarea',ui).filter(el=>el.getClientRects().length>0);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});document.addEventListener('keydown',e=>{if(!ui.hidden&&e.key==='Escape')closeStudio();});
$$('[data-studio-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.studioTab)));
$('#studioSave').addEventListener('click',saveEditor);
$('#studioNew').addEventListener('click',async()=>{const name=prompt('New relative file path (example: src/new.js)');if(!name)return;try{if(engine.paths().includes(name))throw Error('File already exists');await engine.write(name,'');openFile(name);editor?.focus();}catch(e){alert(e.message)}});
$('#studioDelete').addEventListener('click',async()=>{if(!confirm('Delete '+current+' from this browser workspace?'))return;await engine.remove(current);dirty=false;openFile(engine.paths()[0]);});
$('#studioTestRun').addEventListener('click',runTests);
$('#studioSQLRun').addEventListener('click',runSQL);$('#studioPythonRun').addEventListener('click',runPython);
$$('[data-studio-run]').forEach(b=>b.addEventListener('click',async()=>{selectTab('terminal');out('> '+b.dataset.studioRun,'dim');try{await runCommand(b.dataset.studioRun)}catch(e){out('ERROR: '+e.message,'error')}prompt()}));
$('#studioExport').addEventListener('click',()=>download('Moataz-Engineering-Studio-V28.json',engine.export(),'application/json'));
$('#studioImport').addEventListener('click',()=>$('#studioImportFile').click());
$('#studioImportFile').addEventListener('change',async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>3e6)throw Error('File too large');await engine.import(JSON.parse(await file.text()));dirty=false;current='src/handler.js';openFile(current);alert('Local project restored.');}catch(err){alert('Import failed: '+err.message)}finally{e.target.value=''}});
$('#studioReset').addEventListener('click',async()=>{if(!confirm('Permanently reset V28 local files, Git objects and operations?'))return;await engine.reset();dirty=false;current='src/handler.js';openFile(current);out('Local workspace reset.','warn')});
addEventListener('resize',()=>{if(!ui.hidden)resizeTerm()});
})();
