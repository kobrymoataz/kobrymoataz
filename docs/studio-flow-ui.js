/* V28 visual workflow designer and observability interface. No external graph library.
   SVG positions and enabled nodes are persisted in the same IndexedDB state as the jobs. */
(() => {
'use strict';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const STAGES=['INTAKE','VALIDATE','STORE','QUEUE','DELIVER','VERIFY'];
const DESCRIPTIONS={INTAKE:'Accept a browser-local request payload.',VALIDATE:'Check identifiers and email before execution.',STORE:'Write a JSON record into the local workspace.',QUEUE:'Write an outbox entry, separate from real delivery.',DELIVER:'Apply retry policy and produce a local acknowledgement.',VERIFY:'Close the trace or require a human approval.'};
const svgNS='http://www.w3.org/2000/svg';
const mk=(tag,attrs={},value)=>{const e=document.createElement(tag);for(const [name,text] of Object.entries(attrs))e.setAttribute(name,String(text));if(value!==undefined)e.textContent=String(value);return e;};
const el=(tag,attrs={},value)=>{const e=document.createElementNS(svgNS,tag);for(const [name,text] of Object.entries(attrs))e.setAttribute(name,String(text));if(value!==undefined)e.textContent=String(value);return e;};
const secs=ms=>ms===null?'—':ms<1000?Math.round(ms)+' ms':(ms/1000).toFixed(2)+' s';
const download=(filename,content)=>{const blob=new Blob([content],{type:'application/json'});const url=URL.createObjectURL(blob);const link=mk('a',{href:url,download:filename});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function mount({engine,ui,out,selectTab}){
 const panel=$('#flowDesigner',ui);if(!panel)return null;
 const graph=$('#flowGraph',panel), nodesEl=$('#flowNodes',panel),edgesEl=$('#flowEdges',panel), info=$('#flowStageInfo',panel),cfgForm=$('#flowConfigForm',panel);
 let stage='DELIVER',selectedJob=null,dragging=null,dirtyConfig=false;
 const localeMessages={
  en:{headline:'Design the flow. Inspect every decision.',intro:'Drag a stage to reposition it, select it to inspect configuration, and bypass optional stages. Future jobs execute the selected flow using a snapshot of your saved project files.',graph:'01 / PIPELINE GRAPH',graphHint:'DRAG · SELECT · CONFIGURE',graphNote:'Edges follow the enabled execution order. This is a browser-local workflow, not a connected production system.',inspector:'02 / STAGE INSPECTOR',includeStage:'Include stage in future jobs',order:'EXECUTION ORDER',settings:'SAVED CONFIGURATION / config.json',saveSettings:'Save settings to config.json',execute:'03 / EXECUTE',runs:'Browser-local runs',runsNote:'Creates jobs, saved records, retry events and trace data. No real webhook or email is sent.',queue:'04 / LIVE JOB QUEUE',trace:'05 / TRACE INSPECTOR',exportTrace:'Export trace ↓',operability:'OPERABILITY',recoverable:'Observable, recoverable operations.',recoverNote:'Each run retains its initial configuration, request and stage order. Logs contain real event times. Paused runs survive refresh and require a deliberate resume. Failed jobs write a browser-local dead-letter record.',timings:'RECORDED JOB TIMINGS',timingsNote:'Measured elapsed time from queue entry through completion; not network latency.'},
  fr:{headline:'Concevez le flux. Examinez chaque décision.',intro:'Déplacez une étape, sélectionnez-la pour configurer son comportement et désactivez les étapes facultatives. Les prochains traitements utilisent les fichiers et la structure enregistrés.',graph:'01 / SCHÉMA DU FLUX',graphHint:'DÉPLACER · SÉLECTIONNER · CONFIGURER',graphNote:'Les connexions suivent les étapes actives. Le flux reste local au navigateur, sans service de production connecté.',inspector:'02 / PARAMÈTRES DE L’ÉTAPE',includeStage:'Inclure cette étape dans les prochains traitements',order:'ORDRE D’EXÉCUTION',settings:'CONFIGURATION ENREGISTRÉE / config.json',saveSettings:'Enregistrer dans config.json',execute:'03 / EXÉCUTER',runs:'Traitements locaux',runsNote:'Création de tâches, d’enregistrements, de reprises et de traces. Aucun webhook ou courriel réel n’est envoyé.',queue:'04 / FILE DES TÂCHES',trace:'05 / INSPECTION DES TRACES',exportTrace:'Exporter la trace ↓',operability:'EXPLOITABILITÉ',recoverable:'Des opérations observables et récupérables.',recoverNote:'Chaque tâche conserve une copie des paramètres et de la structure. Les événements sont horodatés; les tâches suspendues nécessitent une reprise explicite.',timings:'DURÉE DES TÂCHES',timingsNote:'Temps écoulé du placement en file à la fin, pas une latence réseau.'},
  es:{headline:'Diseña el flujo. Inspecciona cada decisión.',intro:'Arrastra las etapas para moverlas, selecciónalas para configurar su comportamiento y omite las opcionales. Los próximos trabajos usan los archivos y la estructura guardados.',graph:'01 / DIAGRAMA DEL FLUJO',graphHint:'ARRASTRAR · SELECCIONAR · CONFIGURAR',graphNote:'Las conexiones siguen las etapas activas. Este flujo es local al navegador y no está conectado a producción.',inspector:'02 / INSPECTOR DE ETAPA',includeStage:'Incluir esta etapa en próximos trabajos',order:'ORDEN DE EJECUCIÓN',settings:'CONFIGURACIÓN GUARDADA / config.json',saveSettings:'Guardar en config.json',execute:'03 / EJECUTAR',runs:'Ejecuciones locales',runsNote:'Genera trabajos, registros, reintentos y trazas. No se envían webhooks ni correos reales.',queue:'04 / COLA DE TRABAJOS',trace:'05 / INSPECTOR DE TRAZAS',exportTrace:'Exportar traza ↓',operability:'OPERATIVIDAD',recoverable:'Operaciones observables y recuperables.',recoverNote:'Cada trabajo conserva su configuración, solicitud y etapas originales. Los eventos tienen marcas de tiempo; los trabajos pausados requieren reanudación explícita.',timings:'TIEMPOS REGISTRADOS',timingsNote:'Tiempo entre la entrada en la cola y el cierre, no latencia de red.'},
  ar:{headline:'صمّم مسار العمل. وافحص كل قرار.',intro:'اسحب المراحل لتغيير مواضعها، واختر المرحلة لضبطها، ويمكن تجاوز المراحل الاختيارية. كل مهمة جديدة تستخدم نسخة من الملفات والإعدادات المحفوظة.',graph:'01 / مخطط سير العمل',graphHint:'سحب · اختيار · ضبط',graphNote:'تتبع الروابط ترتيب المراحل المفعلة. تعمل هذه العمليات محليًا في المتصفح، دون اتصال بنظام إنتاج حقيقي.',inspector:'02 / إعدادات المرحلة',includeStage:'تفعيل المرحلة في المهام الجديدة',order:'ترتيب التنفيذ',settings:'الإعدادات المحفوظة / config.json',saveSettings:'حفظ الإعدادات في config.json',execute:'03 / التشغيل',runs:'مهام داخل المتصفح',runsNote:'إنشاء مهام وسجلات ومحاولات إعادة وآثار تنفيذ محلية. لا تُرسل رسائل بريد أو Webhook فعلية.',queue:'04 / قائمة المهام',trace:'05 / سجل تتبع المهمة',exportTrace:'تصدير السجل ↓',operability:'التشغيل والموثوقية',recoverable:'عمليات قابلة للمراقبة والاستعادة.',recoverNote:'تحتفظ كل مهمة بنسخة من إعداداتها وبياناتها ومراحلها. تحمل الأحداث أوقاتًا فعلية، وتتطلب المهام الموقوفة استئنافًا صريحًا.',timings:'مدد التنفيذ المسجلة',timingsNote:'المدة من إدخال المهمة إلى الطابور حتى انتهائها، وليست سرعة اتصال بالشبكة.'}
 };
 function localize(){const language=document.documentElement.lang;const dictionary=localeMessages[language]||localeMessages.en;panel.setAttribute('dir',language==='ar'?'rtl':'ltr');$$('[data-flow-i18n]',panel).forEach(node=>{const key=node.dataset.flowI18n;if(dictionary[key])node.textContent=dictionary[key];});}
 document.addEventListener('portfolio:locale',localize);

 const configIDs={latencyMs:'flowLatency',retryLimit:'flowRetries',backoffMs:'flowBackoff',requireReference:'flowReference',requireHumanReview:'flowReview',simulateDeliveryFailureOnce:'flowFailOnce'};
 function warn(s){$('#flowFeedback').textContent=s||'';}
 function config(){try{return JSON.parse(engine.read('config.json'));}catch(e){warn('Invalid config.json: '+e.message);return null;}}
 function renderStage(){const flow=engine.flowGraph();const node=flow.nodes[stage];$('#flowStageTitle').textContent=stage;
 $('#flowStageInfo').textContent=DESCRIPTIONS[stage]||'';
 const enabled=$('#flowEnable');enabled.checked=node.enabled;enabled.disabled=!['STORE','QUEUE','VERIFY'].includes(stage);
 $('#flowMandatory').textContent=enabled.disabled?'REQUIRED':'OPTIONAL';
 $('#flowOrder').textContent=flow.order.filter(id=>flow.nodes[id].enabled).map(x=>x===stage?'[ '+x+' ]':x).join(' → ');
 $('#flowMoveLeft').disabled=!['STORE','QUEUE'].includes(stage)||flow.order.indexOf(stage)<=2;
 $('#flowMoveRight').disabled=!['STORE','QUEUE'].includes(stage)||flow.order.indexOf(stage)>=3;
 if(!dirtyConfig){const c=config();if(c){for(const [key,id] of Object.entries(configIDs)){const x=$('#'+id);if(x){if(x.type==='checkbox')x.checked=Boolean(c[key]);else x.value=String(c[key]??(key==='backoffMs'?180:''));}}}}
 }
 function svgPosition(evt){const rect=graph.getBoundingClientRect(), vb=graph.viewBox.baseVal;return {x:(evt.clientX-rect.left)/rect.width*vb.width,y:(evt.clientY-rect.top)/rect.height*vb.height};}
 function graphNode(id,node,idx){const g=el('g',{class:'flow-node','data-id':id,transform:`translate(${node.x} ${node.y})`,role:'button',tabindex:0,'aria-label':id+' stage. Click to inspect; drag to reposition.'});
  const selected=stage===id,activeJob=engine.state.jobs.find(j=>j.id===selectedJob),current=activeJob?.status==='RUNNING'&&activeJob.stage===id;
  if(selected)g.classList.add('selected');if(!node.enabled)g.classList.add('disabled');if(current)g.classList.add('running');
  g.append(el('rect',{x:0,y:0,width:176,height:92,rx:12}));g.append(el('text',{x:16,y:20,class:'flow-node-num'},'0'+(idx+1)+' / STAGE'));
  g.append(el('text',{x:16,y:50,class:'flow-node-title'},id));
  g.append(el('text',{x:16,y:72,class:'flow-node-status'},node.enabled?'ENABLED':'BYPASSED'));
  g.append(el('circle',{cx:158,cy:19,r:5,class:'flow-node-indicator'}));
  g.addEventListener('click',()=>{stage=id;renderGraph();renderStage();});
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stage=id;renderGraph();renderStage();}});
  g.addEventListener('pointerdown',evt=>{if(evt.button!==0)return;dragging={id,start:svgPosition(evt),x:node.x,y:node.y,moved:false,g};g.setPointerCapture(evt.pointerId);});
  g.addEventListener('pointermove',evt=>{if(!dragging||dragging.id!==id)return;const at=svgPosition(evt);const dx=at.x-dragging.start.x,dy=at.y-dragging.start.y;if(Math.abs(dx)+Math.abs(dy)>3)dragging.moved=true;const x=Math.max(26,Math.min(780,dragging.x+dx)),y=Math.max(22,Math.min(329,dragging.y+dy));g.setAttribute('transform',`translate(${x} ${y})`);});
  g.addEventListener('pointerup',async evt=>{if(!dragging||dragging.id!==id)return;const d=dragging;dragging=null;if(d.moved){const p=svgPosition(evt);try{await engine.flowPosition(id,d.x+p.x-d.start.x,d.y+p.y-d.start.y)}catch(e){warn(e.message);}}stage=id;renderGraph();renderStage();});
  g.addEventListener('pointercancel',()=>{dragging=null;renderGraph();});return g;
 }
 function renderGraph(){const flow=engine.flowGraph();nodesEl.replaceChildren();edgesEl.replaceChildren();const active=flow.order.filter(id=>flow.nodes[id].enabled);
 for(let i=0;i<active.length-1;i++){const start=flow.nodes[active[i]],end=flow.nodes[active[i+1]];const x1=start.x+88,y1=start.y+46,x2=end.x+88,y2=end.y+46;const delta=Math.abs(x2-x1);const lift=(y2-y1);const path=el('path',{d:`M ${x1} ${y1} C ${x1+(x2-x1)*.48} ${y1+lift*.04}, ${x2-(x2-x1)*.48} ${y2-lift*.04}, ${x2} ${y2}`,class:'flow-edge', 'marker-end':'url(#flowArrow)'});edgesEl.append(path);}
 flow.order.forEach((id,idx)=>nodesEl.append(graphNode(id,flow.nodes[id],idx)));
 $('#flowActiveCount').textContent=active.length+' / '+STAGES.length+' stages active';
 }
 function renderMetrics(){const m=engine.flowMetrics();const ids={flowMetricJobs:m.total,flowMetricQueue:m.queued,flowMetricDone:m.delivered,flowMetricFail:m.failed,flowMetricRetry:m.retries,flowMetricReview:m.review,flowMetricRate:m.successRate===null?'—':m.successRate+'%',flowMetricDuration:secs(m.avgMs)};for(const [id,value] of Object.entries(ids))$('#'+id).textContent=value;
 const line=$('#flowMiniChart');line.replaceChildren();const last=engine.state.jobs.slice(-24),max=Math.max(1000,...last.map(j=>j.durationMs||0));for(const j of last){const b=mk('span',{class:'flow-bar','data-status':j.status,title:j.id+' · '+secs(j.durationMs)});b.style.height=String(Math.max(8,Math.round(((j.durationMs||60)/max)*72)))+'px';line.append(b);}if(!last.length)line.textContent='Run a job to create a timing history.';
 }
 function button(text,action,id){const b=mk('button',{type:'button',class:'flow-action','data-flow-job-action':action,'data-job-id':id},text);return b;}
 function renderJobs(){const list=$('#flowJobs');const jobs=engine.state.jobs.slice(-35).reverse();if(!jobs.length){list.replaceChildren();list.textContent='No jobs yet. Run a scenario to create real local events.';return;}
 if(!selectedJob||!engine.state.jobs.some(j=>j.id===selectedJob))selectedJob=jobs[0].id;
 const known=new Map($$('.flow-job',list).map(x=>[x.dataset.jobId,x]));if(!known.size)list.replaceChildren();const visible=new Set();
 for(const j of jobs){visible.add(j.id);let item=known.get(j.id);
  if(!item){item=mk('div',{class:'flow-job','data-job-id':j.id});const select=mk('button',{type:'button',class:'flow-job-select','data-flow-job':j.id});select.append(mk('strong'));select.append(mk('small'));item.append(select,mk('div',{class:'flow-job-actions'}));}
  item.dataset.selected=String(j.id===selectedJob);item.dataset.status=j.status;
  const label=$('strong',item),subtitle=$('small',item);const a=j.id+'  ·  '+j.scenario,b=j.status+' / '+j.stage+' · '+j.retries+' retries · '+(j.runCount||1)+' run(s)';
  if(label.textContent!==a)label.textContent=a;if(subtitle.textContent!==b)subtitle.textContent=b;
  const actions=$('.flow-job-actions',item);let desired=[];
  if(['QUEUED','RUNNING','RETRY_WAIT'].includes(j.status))desired.push(['Pause','pause']);
  if(j.status==='PAUSED')desired.push(['Resume','resume']);
  if(j.status==='REVIEW')desired.push(['Approve','approve']);
  if(j.status==='FAILED')desired.push(['Replay','retry']);
  if(['QUEUED','RUNNING','RETRY_WAIT','PAUSED','REVIEW'].includes(j.status))desired.push(['Cancel','cancel']);
  const signature=desired.map(x=>x[1]).join(',');if(actions.dataset.actions!==signature){actions.replaceChildren(...desired.map(([label,action])=>button(label,action,j.id)));actions.dataset.actions=signature;}
  list.append(item);
 }
 for(const item of known.values())if(!visible.has(item.dataset.jobId))item.remove();
 }
 function renderTrace(){const container=$('#flowTrace');container.replaceChildren();const j=engine.state.jobs.find(x=>x.id===selectedJob);const exp=$('#flowTraceExport');exp.disabled=!j;
 if(!j){container.textContent='Select a job to inspect every state transition.';$('#flowTraceSummary').textContent='NO JOB SELECTED';return;}
 $('#flowTraceSummary').textContent=j.id+' · '+j.status+' · '+(j.plan||[]).join(' → ')+' · '+secs(j.durationMs);
 for(const [i,e] of (j.events||[]).entries()){const row=mk('div',{class:'flow-trace-entry','data-level':e.level||'info'});const head=mk('div',{class:'flow-trace-heading'});head.append(mk('strong',{},String(i+1).padStart(2,'0')+'  '+e.stage));head.append(mk('time',{},new Date(e.at).toLocaleTimeString([],{hour12:false})));row.append(head,mk('p',{},e.message));container.append(row);}
 }
 function render(){if(!panel)return;renderGraph();renderMetrics();renderJobs();renderTrace();renderStage();}
 function renderOnlyEvents(){renderMetrics();renderJobs();renderTrace();if(!dragging)renderGraph();}
 $('#flowEnable').addEventListener('change',async e=>{try{await engine.flowEditStage(stage,e.target.checked);warn(stage+' '+(e.target.checked?'enabled':'bypassed')+' for future jobs. Running jobs keep their snapshot.')}catch(err){warn(err.message);e.target.checked=!e.target.checked;}});
 $('#flowMoveLeft').addEventListener('click',async()=>{try{await engine.flowMove(stage,-1);warn('Stage order updated.')}catch(e){warn(e.message);}});
 $('#flowMoveRight').addEventListener('click',async()=>{try{await engine.flowMove(stage,1);warn('Stage order updated.')}catch(e){warn(e.message);}});
 $('#flowResetGraph').addEventListener('click',async()=>{if(!confirm('Reset only the flow graph to its default stage positions and order? Existing jobs stay unchanged.'))return;await engine.flowReset();warn('Graph reset.');});
 cfgForm.addEventListener('input',()=>{dirtyConfig=true;warn('Unsaved settings. Save to update config.json.');});
 cfgForm.addEventListener('submit',async e=>{e.preventDefault();const patch={retryLimit:Number($('#flowRetries').value),latencyMs:Number($('#flowLatency').value),backoffMs:Number($('#flowBackoff').value),requireReference:$('#flowReference').checked,requireHumanReview:$('#flowReview').checked,simulateDeliveryFailureOnce:$('#flowFailOnce').checked};try{await engine.flowUpdateConfig(patch);dirtyConfig=false;warn('Settings saved in config.json. Future jobs will use them.');renderStage();}catch(err){warn(err.message);}});
 $$('[data-flow-scenario]',panel).forEach(b=>b.addEventListener('click',async()=>{try{const id=await engine.runWorkflow(b.dataset.flowScenario);selectedJob=id;warn('Queued '+id+'. Graph and settings are snapshotted.');renderOnlyEvents();}catch(e){warn(e.message);}}));
 $('#flowJobs').addEventListener('click',async e=>{const action=e.target.closest('button[data-flow-job-action]');if(action){try{await engine.flowControl(action.dataset.flowJobAction,action.dataset.jobId);selectedJob=action.dataset.jobId;warn(action.dataset.flowJobAction+' applied to '+selectedJob);renderOnlyEvents();}catch(e){warn(e.message);}return;}const selector=e.target.closest('[data-flow-job]');if(selector){selectedJob=selector.dataset.flowJob;renderJobs();renderTrace();renderGraph();}});
 $('#flowTraceExport').addEventListener('click',()=>{if(!selectedJob)return;try{download('Moataz-'+selectedJob+'-trace.json',JSON.stringify(engine.flowTrace(selectedJob),null,2));warn('Trace exported. Local evidence only.');}catch(e){warn(e.message);}});
 engine.on((type)=>{if(['job','event','reset','flow','flow-settings','file'].includes(type)){if(type==='flow'||type==='flow-settings'||type==='reset')render();else renderOnlyEvents();}});
 localize();render();return {render,setSelected(id){selectedJob=id;renderOnlyEvents();}};
}
window.MKFlowUI={mount};
})();
