import {LIMITS,importWorkflow,analyzeWorkflow,updateNodeReliability,createSampleWorkflow,reportAsHtml,summarizeExecution} from './automation-core.mjs';
const $=id=>document.getElementById(id);
const shell=$('automationStudio');
if(shell){
 const state={doc:null,report:null,baseline:null,selected:null,filter:'all',previousFocus:null,dirty:false,exported:false,undo:[],redo:[],execution:null};
 const copy={
 en:{open:'OPEN AUTOMATION STUDIO',empty:'Import a workflow or load the clearly marked sample to begin.',loaded:'Workflow parsed locally. No network requests were made.',changed:'Settings changed in browser memory. Export the updated workflow to keep your changes.',invalid:'Unable to import workflow',sample:'SAMPLE DATA / NOT YOUR WORKFLOW',live:'LOCAL WORKFLOW / NOT EXECUTED',critical:'critical',warning:'warnings',info:'advisories',all:'All findings',none:'No findings in this filter. This does not certify runtime reliability.',node:'Select a node to inspect and edit.',saved:'Updated node settings; the analysis was rerun.',report:'Download report',privacy:'Private analysis in your browser. Nothing is uploaded.',imported:'Imported JSON from your device.',readOnly:'Only bounded n8n retry and error-continuation settings can be edited here. Other data is preserved in exports.',compare:'Changes since original import',baseline:'Original',current:'Now',noChange:'No change in finding counts yet.',badType:'Select a valid JSON file (max 2 MB).',drop:'Drop n8n workflow JSON here',sampleTitle:'The example is a training fixture, not a live service.',errorNoDoc:'Import a workflow first.',graph:'Graph overview',knownNode:'In workflow',unknownNode:'Not in imported workflow',confirmClose:"Keep editing? Unsaved workflow changes will be discarded.",confirmReplace:"Replace this workflow and discard unsaved changes?",matches:"matches",noMatch:"No matching nodes.",inspect:'Inspect ↗'},
 fr:{open:'OUVRIR LE STUDIO AUTOMATION',empty:'Importez un workflow ou chargez l’exemple identifié pour commencer.',loaded:'Workflow analysé localement, sans requête réseau.',changed:'Paramètres modifiés en mémoire locale. Exportez le workflow pour conserver les changements.',invalid:'Impossible d’importer le workflow',sample:'EXEMPLE / PAS VOTRE WORKFLOW',live:'WORKFLOW LOCAL / NON EXÉCUTÉ',critical:'critiques',warning:'avertissements',info:'conseils',all:'Tous les résultats',none:'Aucun résultat dans ce filtre. Cela ne certifie pas la fiabilité.',node:'Sélectionnez un nœud pour l’inspecter.',saved:'Paramètres mis à jour et analyse relancée.',report:'Télécharger le rapport',privacy:'Analyse locale. Aucun fichier envoyé.',imported:'JSON importé depuis cet appareil.',readOnly:'Seuls les paramètres de reprise et de gestion d’erreur prévus sont modifiables. Les autres données sont préservées.',compare:'Depuis l’import initial',baseline:'Initial',current:'Actuel',noChange:'Aucun changement dans les résultats.',badType:'Choisissez un fichier JSON valide (max. 2 Mo).',drop:'Déposez le JSON n8n ici',sampleTitle:'L’exemple est pédagogique, pas un service réel.',errorNoDoc:'Importez d’abord un workflow.',graph:'Vue du graphe',knownNode:'Dans le workflow',unknownNode:'Inconnu dans ce workflow',confirmClose:"Continuer ? Les modifications non exportées seront perdues.",confirmReplace:"Remplacer ce workflow et perdre les modifications non exportées ?",matches:"résultats",noMatch:"Aucun nœud correspondant.",inspect:'Inspecter ↗'},
 es:{open:'ABRIR AUTOMATION STUDIO',empty:'Importa un flujo o carga el ejemplo identificado para empezar.',loaded:'Flujo analizado localmente. No se realizaron solicitudes de red.',changed:'Configuración cambiada en memoria. Exporta el flujo para conservar los cambios.',invalid:'No se pudo importar el flujo',sample:'EJEMPLO / NO ES TU FLUJO',live:'FLUJO LOCAL / SIN EJECUTAR',critical:'críticos',warning:'advertencias',info:'avisos',all:'Todos los hallazgos',none:'Sin hallazgos en este filtro. No certifica fiabilidad.',node:'Selecciona un nodo para inspeccionarlo.',saved:'Configuración actualizada y análisis repetido.',report:'Descargar informe',privacy:'Análisis privado en el navegador. No se suben archivos.',imported:'JSON importado desde tu dispositivo.',readOnly:'Solo se pueden editar ajustes limitados de reintento y errores. El resto se conserva.',compare:'Cambios desde la importación',baseline:'Original',current:'Ahora',noChange:'Sin cambios en los recuentos.',badType:'Selecciona un JSON válido (máx. 2 MB).',drop:'Suelta aquí el JSON de n8n',sampleTitle:'Ejemplo didáctico; no es un servicio real.',errorNoDoc:'Importa primero un flujo.',graph:'Vista del grafo',knownNode:'En el flujo',unknownNode:'No aparece en el flujo',confirmClose:"¿Continuar? Se perderán los cambios no exportados.",confirmReplace:"¿Sustituir este flujo y perder los cambios no exportados?",matches:"resultados",noMatch:"No hay nodos coincidentes.",inspect:'Inspeccionar ↗'},
 ar:{open:'فتح استوديو الأتمتة',empty:'استورد ملف سير عمل أو حمّل المثال المميز بوضوح للبدء.',loaded:'تم تحليل سير العمل محلياً دون أي اتصال بالشبكة.',changed:'تم تعديل الإعدادات في ذاكرة المتصفح. صدّر ملف سير العمل لحفظ التغييرات.',invalid:'تعذر استيراد سير العمل',sample:'ملف تجريبي / ليس سير عملك',live:'سير عمل محلي / لم يُنفذ',critical:'حرجة',warning:'تحذيرات',info:'ملاحظات',all:'جميع النتائج',none:'لا توجد نتائج لهذا المرشح. هذا لا يثبت سلامة التشغيل.',node:'اختر عقدة لفحص إعداداتها.',saved:'تم تحديث الإعدادات وإعادة التحليل.',report:'تنزيل التقرير',privacy:'تحليل خاص داخل المتصفح، دون رفع الملفات.',imported:'تم استيراد JSON من جهازك.',readOnly:'يمكن تعديل خيارات إعادة المحاولة والتعامل مع الأخطاء فقط. تُحفظ بقية البيانات عند التصدير.',compare:'التغييرات منذ الاستيراد',baseline:'الأصل',current:'الحالي',noChange:'لم تتغير أعداد النتائج.',badType:'اختر ملف JSON صالحاً (حتى 2 ميغابايت).',drop:'ضع ملف n8n JSON هنا',sampleTitle:'هذا مثال تدريبي وليس خدمة حقيقية.',errorNoDoc:'استورد سير العمل أولاً.',graph:'مخطط سير العمل',knownNode:'ضمن سير العمل',unknownNode:'غير موجود في سير العمل',confirmClose:"هل تريد المتابعة؟ ستُفقد التعديلات غير المصدرة.",confirmReplace:"هل تريد استبدال سير العمل وفقدان التعديلات غير المصدرة؟",matches:"نتائج",noMatch:"لا توجد عقد مطابقة.",inspect:'فحص ↗'}
 };
 const t=k=>(copy[document.documentElement.lang]||copy.en)[k]||copy.en[k]||k;
 const el=(tag,cl,txt)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(txt!==undefined)x.textContent=String(txt);return x};
 function showStatus(txt,error=false){const node=$('automationStatus');node.textContent=txt;node.dataset.error=String(error);}
 const focusable='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[role="button"][tabindex="0"]';
 const outside=[];
 function confirmChanges(kind='confirmClose'){return !state.dirty||state.exported||window.confirm(t(kind));}
 function open(){
   if(!shell.hidden)return;
   state.previousFocus=document.activeElement;shell.hidden=false;document.body.classList.add('auto-lock');
   for(const child of [...document.body.children]){if(child===shell||child.tagName==='SCRIPT')continue;outside.push([child,child.inert]);child.inert=true;}
   $('automationImport').focus();
 }
 function close(){
   if(!confirmChanges())return false;
   shell.hidden=true;document.body.classList.remove('auto-lock');
   for(const [node,wasInert] of outside.splice(0))node.inert=wasInert;
   state.previousFocus?.focus?.();return true;
 }
 $('automationLaunch').addEventListener('click',open);$('automationClose').addEventListener('click',close);
 shell.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
     e.preventDefault();$('autoNodeSearch').focus();return;
   }
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
     e.preventDefault();if(e.shiftKey)redoChange();else undoChange();return;
   }
   if(e.key==='Tab'){
     const nodes=[...shell.querySelectorAll(focusable)].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));
     if(!nodes.length)return;
     if(!shell.contains(document.activeElement)){e.preventDefault();nodes[0].focus();return;}
     if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}
     if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}
   }
 });
 function download(filename,body,mime){const url=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1600)}
 function load(doc,isSample){state.doc=doc;state.selected=null;state.dirty=false;state.exported=false;state.undo=[];state.redo=[];state.filter='all';state.report=analyzeWorkflow(doc);state.execution=null;state.baseline={...state.report.counts};
   $('automationPaste').value='';$('autoNodeSearch').value='';$('automationFilter').value='all';$('autoExecutionResults').hidden=true;$('autoExecutionStatus').textContent='';render();showStatus(isSample?t('sampleTitle'):t('loaded'));
 }
 function importText(text){try{const doc=importWorkflow(text);if(!confirmChanges('confirmReplace'))return;load(doc,false)}catch(e){showStatus(`${t('invalid')}: ${e.message}`,true)}}
 $('automationImport').addEventListener('change',async e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file)return;
   if(file.size>LIMITS.bytes||!/\.json$/i.test(file.name)){showStatus(t('badType'),true);return}
   try{importText(await file.text())}catch(e){showStatus(e.message,true)}
 });
 $('automationAnalyze').addEventListener('click',()=>importText($('automationPaste').value));
 $('automationSample').addEventListener('click',()=>{if(confirmChanges('confirmReplace'))load(createSampleWorkflow(),true)});
 const drop=$('automationDrop');
 for(const ev of ['dragenter','dragover'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')});
 for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')});
 drop.addEventListener('drop',async e=>{const f=e.dataTransfer?.files?.[0];if(!f)return;if(f.size>LIMITS.bytes||!/\.json$/i.test(f.name)){showStatus(t('badType'),true);return}importText(await f.text())});
 function drawGraph(){const svg=$('automationGraph');svg.replaceChildren();const r=state.report;if(!r)return;
   const ns='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
   const nodes=r.graph.nodes,edges=r.graph.edges,byName=new Map(nodes.map((n,i)=>[n.name,i]));
   const rank=new Array(nodes.length).fill(0);const indeg=new Array(nodes.length).fill(0),out=nodes.map(()=>[]);
   for(const e of edges){const a=byName.get(e.source),b=byName.get(e.target);if(a===undefined||b===undefined||a===b)continue;out[a].push(b);indeg[b]++}
   const q=[];indeg.forEach((n,i)=>{if(n===0)q.push(i)});let count=0;
   for(let j=0;j<q.length;j++){const i=q[j];count++;for(const b of out[i]){rank[b]=Math.max(rank[b],rank[i]+1);if(--indeg[b]===0)q.push(b)}}
   // Cycle fallback: flatten to avoid an infinite layout loop.
   if(count<nodes.length){for(let i=0;i<nodes.length;i++)if(indeg[i]>0)rank[i]=Math.min(rank[i],6)}
   const cols=new Map();nodes.forEach((n,i)=>{const c=Math.min(rank[i],8);if(!cols.has(c))cols.set(c,[]);cols.get(c).push(i)});
   const pos=new Map();for(const [col,idxs]of cols){idxs.forEach((idx,j)=>{pos.set(idx,{x:36+col*238,y:42+j*110})})}
   const lastColumn=Math.max(0,...cols.keys()),maxHeight=Math.max(340,...[...cols.values()].map(a=>a.length*110+70));
   svg.setAttribute('viewBox',`0 0 ${Math.max(640,(lastColumn+1)*238+36)} ${maxHeight}`);
   const defs=make('defs'),marker=make('marker',{id:'auto-arrow',markerWidth:8,markerHeight:8,refX:7,refY:3,orient:'auto'});marker.append(make('path',{d:'M0 0L0 6L7 3z',fill:'#c9a66d'}));defs.append(marker);svg.append(defs);
   for(const e of edges){const from=pos.get(byName.get(e.source)),to=pos.get(byName.get(e.target));if(!from||!to)continue;
     const startX=from.x+188,startY=from.y+32,endX=to.x,endY=to.y+32,mx=(startX+endX)/2;
     svg.append(make('path',{d:`M${startX},${startY} C${mx},${startY} ${mx},${endY} ${endX},${endY}`,fill:'none',stroke:'#c9a66d','stroke-opacity':'.6','stroke-width':'1.7','marker-end':'url(#auto-arrow)'}));
   }
   nodes.forEach((n,i)=>{const p=pos.get(i),active=state.selected===n.id;const g=make('g',{class:`auto-svg-node${active?' selected':''}`,tabindex:0,role:'button','aria-label':`Inspect ${n.name}`,'data-node-id':n.id});
     g.append(make('rect',{x:p.x,y:p.y,width:188,height:65,rx:10,fill:active?'#443520':'#17212b',stroke:active?'#ecd0a4':'#6b665c','stroke-width':active?2:1}));
     const circle=make('circle',{cx:p.x+19,cy:p.y+20,r:5,fill:n.disabled?'#6d7680':n.trigger?'#caa96f':'#7da4a0'});g.append(circle);
     const title=make('text',{x:p.x+31,y:p.y+24,fill:'#f0ebe3','font-size':12,'font-weight':600});title.textContent=n.name.length>23?n.name.slice(0,22)+'…':n.name;g.append(title);
     const kind=make('text',{x:p.x+12,y:p.y+49,fill:'#a8abae','font-size':10});kind.textContent=n.type.split('.').at(-1).slice(0,26)+(n.disabled?' / disabled':'');g.append(kind);
     g.addEventListener('click',()=>selectNode(n.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(n.id)}});svg.append(g);
   });
 }
 function nodeFor(id){return state.doc?.nodes.find((n,i)=>String(n.id??`node-${i}`)===id)}
 function selectNode(id){state.selected=id;const n=nodeFor(id);if(!n)return;const box=$('automationInspector');box.hidden=false;
   $('autoNodeName').textContent=n.name;$('autoNodeType').textContent=n.type;$('autoRetry').checked=n.retryOnFail===true;
   $('autoMaxTries').value=Math.max(1,Math.min(5,Number.isInteger(n.maxTries)?n.maxTries:3));
   $('autoBackoff').value=Math.max(0,Math.min(60000,Number.isInteger(n.waitBetweenTries)?n.waitBetweenTries:1000));
   $('autoErrorMode').value=['stopWorkflow','continueRegularOutput','continueErrorOutput'].includes(n.onError)?n.onError:'stopWorkflow';
   $('autoInspectorHint').textContent=t('readOnly');drawGraph();
   shell.querySelectorAll('[data-auto-node]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.autoNode===id)));
 }
 $('automationNodeForm').addEventListener('submit',e=>{e.preventDefault();if(!state.doc||!state.selected)return;
   try{const updated=updateNodeReliability(state.doc,state.selected,{retryOnFail:$('autoRetry').checked,maxTries:Number($('autoMaxTries').value),waitBetweenTries:Number($('autoBackoff').value),onError:$('autoErrorMode').value});
   if(JSON.stringify(updated)===JSON.stringify(state.doc)){showStatus(t('noChange'));return;}
   state.undo.push(state.doc);if(state.undo.length>30)state.undo.shift();state.redo=[];state.doc=updated;state.report=analyzeWorkflow(state.doc);state.dirty=true;state.exported=false;render();selectNode(state.selected);showStatus(t('changed'));}
   catch(err){showStatus(err.message,true)}
 });
 function renderFindings(){const host=$('automationFindings');host.replaceChildren();const r=state.report;if(!r)return;
   const list=r.findings.filter(f=>state.filter==='all'||f.severity===state.filter);
   if(!list.length){host.append(el('p','auto-muted',t('none')));return}
   for(const f of list){const item=el('article','auto-finding '+f.severity),head=el('div','auto-finding-head');head.append(el('strong','',f.title),el('span','auto-severity',f.severity));item.append(head,el('small','auto-node-ref',f.nodeName||r.name),el('p','',f.detail));
     const next=el('p','auto-action',f.action);item.append(next);
     if(f.nodeId){const b=el('button','auto-mini-button','Inspect node ↗');b.type='button';b.addEventListener('click',()=>{selectNode(f.nodeId);$('automationGraphWrap').scrollIntoView({block:'nearest',behavior:'smooth'})});item.append(b)}host.append(item)}
 }
 $('autoExecutionImport').addEventListener('change',async e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file)return;
   if(file.size>LIMITS.bytes||!/\.json$/i.test(file.name)){$('autoExecutionStatus').textContent=t('badType');return}
   try{const summary=summarizeExecution(await file.text(),state.doc);state.execution=summary;renderExecution();$('autoExecutionStatus').textContent=`${summary.runCount} run record(s), ${summary.failedRuns} flagged error(s). This is an imported snapshot, not live monitoring.`;}
   catch(err){$('autoExecutionStatus').textContent=err.message}
 });
 function renderExecution(){const host=$('autoExecutionResults');host.replaceChildren();const run=state.execution;if(!run){host.hidden=true;return}host.hidden=false;
   host.append(el('p','auto-caveat',`${run.runCount} node run(s) / ${run.failedRuns} explicit error(s) · ${run.executionStatus||'Status not supplied'}`));
   if(!run.records.length){host.append(el('p','auto-caveat','No node run records in this execution.'));return}
   for(const rec of run.records){const row=el('div','auto-run '+rec.status),a=el('div'),b=el('div');
      a.append(el('strong','',rec.nodeName),el('small','',rec.knownNode?t('knownNode'):t('unknownNode')));
      b.append(el('span','',rec.status+(rec.errorType?' · '+rec.errorType:'')),el('small','',`${rec.durationMs??'?'} ms · ${rec.startTime||'time unavailable'}`));
      row.append(a,b);if(rec.knownNode){const node=state.report?.graph.nodes.find(n=>n.name===rec.nodeName);if(node){const button=el('button','auto-mini-button',t('inspect'));button.type='button';button.addEventListener('click',()=>selectNode(node.id));row.append(button)}}host.append(row);
   }
 }
 $('automationFilter').addEventListener('change' ,e=>{state.filter=e.target.value;renderFindings()});
 function renderNodes(){
   const list=$('autoNodeList');list.replaceChildren();
   const nodes=state.report?.graph.nodes||[];
   const q=$('autoNodeSearch').value.trim().toLocaleLowerCase();
   const matched=nodes.filter(n=>(n.name+' '+n.type).toLocaleLowerCase().includes(q));
   $('autoNodeCount').textContent=matched.length+' / '+nodes.length+' '+t('matches');
   if(!matched.length){list.append(el('p','auto-caveat',t('noMatch')));return;}
   for(const n of matched){const b=el('button','auto-node-item',n.name);b.type='button';b.dataset.autoNode=n.id;b.setAttribute('aria-pressed',String(state.selected===n.id));b.title=n.type;b.addEventListener('click',()=>selectNode(n.id));list.append(b);}
 }
 $('autoNodeSearch').addEventListener('input',renderNodes);
 function historyChange(direction){
   const origin=direction==='undo'?state.undo:state.redo;
   const target=direction==='undo'?state.redo:state.undo;
   if(!origin.length)return;
   target.push(state.doc);state.doc=origin.pop();
   state.report=analyzeWorkflow(state.doc);state.dirty=state.undo.length>0;state.exported=false;
   render();if(state.selected&&nodeFor(state.selected))selectNode(state.selected);
   showStatus(state.dirty?t('changed'):t('loaded'));
 }
 function undoChange(){historyChange('undo')}
 function redoChange(){historyChange('redo')}
 $('automationUndo').addEventListener('click',undoChange);
 $('automationRedo').addEventListener('click',redoChange);
 function render(){const r=state.report;if(!r)return;
   $('autoWorkspace').hidden=false;$('autoEmpty').hidden=true;
   $('autoWorkflowName').textContent=r.name;$('autoWorkflowFlag').textContent=r.sample?t('sample'):t('live');
   for(const [name,value]of Object.entries({Nodes:r.nodeCount,Edges:r.edgeCount,Triggers:r.recognizedTriggers,Critical:r.counts.critical,Warnings:r.counts.warning,Advisories:r.counts.info})){
      const cell=$(`autoStat${name}`);if(cell)cell.textContent=String(value);
   }
   const baseline=state.baseline||r.counts;$('autoComparison').textContent=`${t('compare')}: ${t('baseline')} ${baseline.critical} / ${baseline.warning} / ${baseline.info} → ${t('current')} ${r.counts.critical} / ${r.counts.warning} / ${r.counts.info} (${t('critical')} / ${t('warning')} / ${t('info')})`;
   $('automationUndo').disabled=!state.undo.length;$('automationRedo').disabled=!state.redo.length;
   renderNodes();drawGraph();renderFindings();
 }
 function exportSlug(){return 'workflow-'+(state.report?.name||'export').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'workflow'}
 $('automationExportWorkflow').addEventListener('click',()=>{if(!state.doc)return showStatus(t('errorNoDoc'),true);download(`${exportSlug()}-v31-1.json`,JSON.stringify((({__mkSample,...workflow})=>workflow)(state.doc),null,2),'application/json;charset=utf-8');state.exported=true;showStatus(t('loaded'))});
 $('automationExportJSON').addEventListener('click',()=>{if(!state.report)return showStatus(t('errorNoDoc'),true);download(`${exportSlug()}-audit.json`,JSON.stringify({...state.report,baselineCounts:state.baseline,executionSummary:state.execution},null,2),'application/json;charset=utf-8')});
 $('automationExportHTML').addEventListener('click',()=>{if(!state.report)return showStatus(t('errorNoDoc'),true);download(`${exportSlug()}-audit.html`,reportAsHtml(state.report),'text/html;charset=utf-8')});
 $('automationOpenRepo').addEventListener('click',()=>{if(close()){$('trustLaunch')?.click();$('trustModeRepo')?.click()}});
 document.addEventListener('portfolio:locale',()=>{
   if(state.report){render();if(state.selected)selectNode(state.selected);if(state.execution)renderExecution()}else showStatus(t('empty'));
 });
 window.addEventListener('beforeunload',e=>{if(state.dirty&&!state.exported){e.preventDefault();e.returnValue='';}});
 showStatus(t('empty'));
 const params=new URLSearchParams(location.search);if(params.has('automation'))open();
}
