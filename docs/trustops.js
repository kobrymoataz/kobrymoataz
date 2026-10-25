import {auditDomain,createDohResolver,normalizeDomain,normalizeSelector} from './trustops-core.mjs';
/** TrustOps Studio v30.1 front-end. No saved scans, sample results, or privileged access. */
const root=document.querySelector('#trustopsStudio');
if(root){
  const $=id=>document.getElementById(id);
  const state={report:null,controller:null,previousFocus:null,requestId:0,tab:'findings'};
  const ui={
    en:{running:'Querying live public DNS records…',result:'Live DNS answers retrieved',partial:'Some DNS responses could not be verified. See evidence.',failed:'Live DNS queries could not be completed',canceled:'Scan canceled; no report was produced.',loading:'Checking',ready:'Ready',error:'Error',pass:'OBSERVED',warn:'ADVISORY',fail:'ISSUE',info:'INFO',unknown:'UNVERIFIED',passed:'OBSERVED',warns:'ADVISORIES',fails:'ISSUES',infos:'INFORMATION',unknowns:'UNVERIFIED',checked:'Checked',source:'Resolver',partialLabel:'partial results',detail:'Technical detail (English)',recommend:'Recommended follow-up',none:'No findings require action based on the available DNS responses.',noAnswers:'No DNS answers for this query.',noRaw:'No DNS response available.',reportTitle:'TrustOps Studio — Public DNS Audit',reportScope:'DNS-only interpretation. Not an SMTP test, DKIM message verification, or inbox-delivery assessment.',print:'Print report',unavailable:'A DNS query could not be verified. Treat affected results as unknown.',detailTip:'Technical evidence follows DNS values exactly. Diagnostic explanations are currently in English.'},
    fr:{running:'Consultation des DNS publics en direct…',result:'Réponses DNS reçues',partial:'Certaines réponses DNS sont indisponibles. Voir les preuves.',failed:'Les requêtes DNS directes ont échoué',canceled:'Analyse annulée, aucun rapport produit.',loading:'Analyse',ready:'Prêt',error:'Erreur',pass:'OBSERVÉ',warn:'À EXAMINER',fail:'PROBLÈME',info:'INFO',unknown:'NON VÉRIFIÉ',passed:'OBSERVÉS',warns:'À EXAMINER',fails:'PROBLÈMES',infos:'INFORMATIONS',unknowns:'NON VÉRIFIÉS',checked:'Vérifié',source:'Résolveur',partialLabel:'résultats partiels',detail:'Détail technique (anglais)',recommend:'Suivi recommandé',none:'Aucune action nécessaire selon les données DNS disponibles.',noAnswers:'Aucune réponse DNS pour cette requête.',noRaw:'Réponse DNS indisponible.',reportTitle:'TrustOps Studio — Audit DNS public',reportScope:'Interprétation DNS uniquement. Pas de test SMTP, de signature DKIM ni de réception du courrier.',print:'Imprimer',unavailable:'Une requête DNS n’a pas pu être vérifiée. Ne pas en déduire une absence de protection.',detailTip:'Les preuves techniques conservent les valeurs DNS d’origine. Les explications détaillées sont en anglais.'},
    es:{running:'Consultando registros DNS públicos…',result:'Respuestas DNS recibidas',partial:'Algunas respuestas DNS no están disponibles. Consulta las pruebas.',failed:'No se pudieron completar las consultas DNS',canceled:'Auditoría cancelada, no se generó informe.',loading:'Consultando',ready:'Listo',error:'Error',pass:'OBSERVADO',warn:'ADVERTENCIA',fail:'PROBLEMA',info:'INFO',unknown:'SIN VERIFICAR',passed:'OBSERVADOS',warns:'ADVERTENCIAS',fails:'PROBLEMAS',infos:'INFORMACIÓN',unknowns:'SIN VERIFICAR',checked:'Consultado',source:'Resolver',partialLabel:'resultados parciales',detail:'Detalle técnico (inglés)',recommend:'Seguimiento recomendado',none:'No se requieren acciones según las respuestas DNS disponibles.',noAnswers:'Sin respuestas DNS para la consulta.',noRaw:'Respuesta DNS no disponible.',reportTitle:'TrustOps Studio — Auditoría DNS pública',reportScope:'Solo DNS. No se prueba SMTP, firmas DKIM ni entrega de correo.',print:'Imprimir informe',unavailable:'Una consulta DNS no se pudo verificar; no debe asumirse protección ausente.',detailTip:'Las pruebas conservan los valores DNS. Las explicaciones técnicas detalladas están en inglés.'},
    ar:{running:'جارٍ الاستعلام عن سجلات DNS العامة مباشرة…',result:'تم استرجاع إجابات DNS',partial:'تعذّر التحقق من بعض استعلامات DNS. راجع الأدلة.',failed:'تعذّر إكمال استعلامات DNS المباشرة',canceled:'تم إلغاء الفحص ولم يُنشأ تقرير.',loading:'جارٍ الفحص',ready:'جاهز',error:'خطأ',pass:'تم رصده',warn:'تنبيه',fail:'مشكلة',info:'معلومة',unknown:'غير متحقق',passed:'نتائج مرصودة',warns:'تنبيهات',fails:'مشكلات',infos:'معلومات',unknowns:'غير متحقق',checked:'وقت الفحص',source:'المصدر',partialLabel:'نتائج جزئية',detail:'التفاصيل التقنية (بالإنجليزية)',recommend:'الإجراء المقترح',none:'لا تظهر إجراءات مطلوبة بناءً على نتائج DNS المتاحة.',noAnswers:'لا توجد إجابات DNS لهذا الاستعلام.',noRaw:'لا تتوفر إجابة DNS.',reportTitle:'TrustOps Studio — تقرير فحص DNS العام',reportScope:'تحليل DNS فقط، وليس اختبار SMTP أو تحقق من توقيع DKIM أو وصول البريد.',print:'طباعة التقرير',unavailable:'تعذّر التحقق من استعلام DNS؛ لا تستنتج من ذلك غياب الحماية.',detailTip:'تُعرض أدلة DNS كما وردت، والتفسير التقني المفصل بالإنجليزية.'}
  };
  const locale=()=>ui[document.documentElement.lang]||ui.en;
  const label=k=>locale()[k]||ui.en[k]||k;
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
  function open(){state.previousFocus=document.activeElement;root.hidden=false;document.body.classList.add('trust-lock');$('trustDomain').focus();}
  function close(){if(state.controller){state.controller.abort();state.controller=null;}root.hidden=true;document.body.classList.remove('trust-lock');state.previousFocus?.focus?.();}
  $('trustLaunch').addEventListener('click',open);
  $('trustClose').addEventListener('click',close);
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'){close();return;}
    if(e.key==='Tab'){
      const nodes=[...root.querySelectorAll('a[href],button:not(:disabled):not([hidden]),input:not(:disabled),select:not(:disabled)')].filter(x=>x.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  $('trustCancel').addEventListener('click',()=>{state.controller?.abort();});
  function status(s,index){$('trustStatus').textContent=s;$('trustProgressCount').textContent=index||'—';}
  function setBusy(v){$('trustRun').disabled=v;$('trustCancel').hidden=!v;$('trustDomain').disabled=v;$('trustProvider').disabled=v;$('trustSelector').disabled=v;}
  function selectTab(next){state.tab=next;root.querySelectorAll('[data-trust-tab]').forEach(b=>{const on=b.dataset.trustTab===next;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    for(const [name,id] of [['findings','trustPanelFindings'],['evidence','trustPanelEvidence'],['actions','trustPanelActions']]){$(id).hidden=name!==next;$(id).classList.toggle('active',name===next);}
  }
  $('trustTabs').addEventListener('click',e=>{const b=e.target.closest('[data-trust-tab]');if(b)selectTab(b.dataset.trustTab)});
  $('trustTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...$('trustTabs').querySelectorAll('[data-trust-tab]')];const idx=tabs.findIndex(x=>x.classList.contains('active'));const next=tabs[(idx+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();selectTab(next.dataset.trustTab);});
  function safeFormatTime(s){try{return new Date(s).toLocaleString(document.documentElement.lang||'en',{dateStyle:'medium',timeStyle:'medium'});}catch{return s;}}
  function renderFindings(report){const host=$('trustPanelFindings');host.replaceChildren();
    if(document.documentElement.lang!=='en')host.append(el('p','trust-detail-note',label('detailTip')));
    for(const f of report.findings){const card=el('article','trust-finding'),heading=el('div','trust-finding-top');heading.append(el('h4','',f.title),el('span','trust-badge '+f.state,label(f.state)));
      card.append(heading,el('p','',f.detail));
      if(f.recommendation){const hint=el('div','trust-record-summary');hint.append(el('strong','',label('recommend')+': '),document.createTextNode(f.recommendation));card.append(hint);}
      host.append(card);
    }
  }
  function renderEvidence(report){const host=$('trustPanelEvidence');host.replaceChildren();
    for(const ev of report.evidence){const card=el('article','trust-evidence-card');card.append(el('h4','',`${ev.name} / ${ev.type}`));
      card.append(el('p','',`${label('source')}: ${ev.provider} · ${label('checked')}: ${safeFormatTime(ev.checkedAt)} · ${ev.dnsStatus===undefined?'UNAVAILABLE':`DNS ${ev.dnsStatus}`}`));
      const raw=(ev.error||(!ev.answers?.length?label('noAnswers'):ev.answers.map(x=>`TTL ${x.ttl??'?'} | RR ${x.type} | ${x.data}`).join('\n')));card.append(el('pre','',raw));host.append(card);
    }
  }
  function renderActions(report){const host=$('trustPanelActions');host.replaceChildren();
    const next=report.findings.filter(x=>['fail','warn','unknown'].includes(x.state));
    if(!next.length){host.append(el('p','',label('none')));return;}
    next.forEach((f,i)=>{const card=el('div','trust-action'),step=el('strong','',String(i+1).padStart(2,'0')),body=el('div');body.append(el('h4','',f.title),el('p','',f.recommendation||f.detail));card.append(step,body);host.append(card);});
  }
  function render(report){state.report=report;$('trustEmpty').hidden=true;$('trustResults').hidden=false;$('trustResultDomain').textContent=report.domain;
    $('trustResultMeta').textContent=`${safeFormatTime(report.finishedAt)} · ${report.providersUsed.join(' / ')||'DNS unavailable'}${report.partial?` · ${label('partialLabel')}`:''}`;
    const counts=report.counts,host=$('trustMetrics');host.replaceChildren();
    for(const [key,name] of [['pass','passed'],['warn','warns'],['fail','fails'],['info','infos'],['unknown','unknowns']]){const card=el('div','trust-metric '+key);card.append(el('small','',label(name)),el('b','',counts[key]||0));host.append(card);}
    renderFindings(report);renderEvidence(report);renderActions(report);selectTab(state.tab);
  }
  $('trustForm').addEventListener('submit',async e=>{
    e.preventDefault();if(state.controller)return;
    let domain,selector;
    try{domain=normalizeDomain($('trustDomain').value);selector=normalizeSelector($('trustSelector').value);}
    catch(error){status(error.message,'!');$('trustDomain').focus();return;}
    state.requestId++;const id=state.requestId;state.report=null;$('trustResults').hidden=true;$('trustEmpty').hidden=false;
    state.controller=new AbortController();const ctl=state.controller;setBusy(true);status(label('running'),'0 / ?');
    try{
      const report=await auditDomain({domain,selector,provider:$('trustProvider').value,signal:ctl.signal,onProgress:({index,name,type})=>{if(id===state.requestId)status(`${label('loading')}: ${name} [${type}]`,`${index}`);}});
      if(ctl.signal.aborted)return;
      render(report);
      const allUnavailable=report.evidence.length>0&&report.evidence.every(x=>x.error);
      status(allUnavailable?label('failed'):report.partial?label('partial'):label('result'),`${report.evidence.filter(x=>!x.error).length} / ${report.evidence.length}`);
      $('trustResults').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    }catch(error){status(ctl.signal.aborted?label('canceled'):(error.message||label('failed')),'!');}
    finally{if(id===state.requestId){state.controller=null;setBusy(false);}}
  });
  function downloadFile(name,content,mime){const data=new Blob([content],{type:mime});const u=URL.createObjectURL(data),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
  const slug=()=>`trustops-${state.report?.domain||'domain'}-${new Date().toISOString().slice(0,10)}`;
  $('trustExportJSON').addEventListener('click',()=>{if(state.report)downloadFile(slug()+'.json',JSON.stringify(state.report,null,2),'application/json;charset=utf-8');});
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function htmlReport(report){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(label('reportTitle'))} · ${escapeHtml(report.domain)}</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#19232e;max-width:920px;margin:40px auto;padding:0 22px}h1,h2{font-family:Georgia,serif}h1{font-size:2.4rem}small,footer{color:#687681}section{border-top:1px solid #cbd2d5;margin:23px 0;padding-top:16px}code,pre{font:13px/1.6 ui-monospace,monospace;overflow-wrap:anywhere;white-space:pre-wrap}p{margin:7px 0}.state{font-weight:700;text-transform:uppercase}.state.fail{color:#9f3636}.state.warn{color:#91610d}.state.pass{color:#1c744a}button{background:#18232e;color:#fff;padding:10px 16px;border:0}@media print{button{display:none}body{margin:5mm auto}}</style></head><body><button onclick="window.print()">${escapeHtml(label('print'))}</button><h1>TrustOps Studio</h1><p>${escapeHtml(report.domain)} · ${escapeHtml(report.finishedAt)}</p><p>${escapeHtml(label('reportScope'))}</p><p>${escapeHtml(report.providersUsed.join(' / '))}</p><h2>Findings</h2>${report.findings.map(f=>`<section><h3>${escapeHtml(f.title)} · <span class="state ${escapeHtml(f.state)}">${escapeHtml(f.state)}</span></h3><p>${escapeHtml(f.detail)}</p><p><strong>Follow-up:</strong> ${escapeHtml(f.recommendation)}</p></section>`).join('')}<h2>DNS evidence</h2>${report.evidence.map(ev=>`<section><h3>${escapeHtml(ev.name)} / ${escapeHtml(ev.type)}</h3><p>${escapeHtml(ev.provider)} · ${escapeHtml(ev.checkedAt)}</p><pre>${escapeHtml(ev.error||ev.answers?.map(a=>a.data).join('\n')||'No records')}</pre></section>`).join('')}<footer>Public DNS snapshot only. No emails, SMTP sessions or messages were inspected. Generated locally in the user’s browser.</footer></body></html>`;}
  $('trustExportHTML').addEventListener('click',()=>{if(!state.report)return;downloadFile(slug()+'.html',htmlReport(state.report),'text/html;charset=utf-8');});
  document.addEventListener('portfolio:locale',()=>{if(!state.controller&&state.report){render(state.report);const allUnavailable=state.report.evidence.length>0&&state.report.evidence.every(x=>x.error);status(allUnavailable?label('failed'):state.report.partial?label('partial'):label('result'),`${state.report.evidence.filter(x=>!x.error).length} / ${state.report.evidence.length}`);}else if(!state.controller&&!state.report)status(label('ready'),'—');});
  const params=new URLSearchParams(location.search);if(params.has('trustops'))open();
}
