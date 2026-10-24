/* V22 portfolio interactions. Progressive enhancement only: base content remains visible. */
(()=>{
'use strict';
const $=(sel,from=document)=>from.querySelector(sel), $$=(sel,from=document)=>[...from.querySelectorAll(sel)];
const t=key=>window.siteI18n?.t(key)||key;
const toggle=$('#menuToggle'),nav=$('#primaryNav');
function menu(open){if(!toggle||!nav)return;nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open&&innerWidth<1051);}
toggle?.addEventListener('click',()=>menu(toggle.getAttribute('aria-expanded')!=='true'));
$$('a[href^="#"]',nav).forEach(a=>a.addEventListener('click',()=>menu(false)));
window.addEventListener('resize',()=>{if(innerWidth>1050)menu(false)},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape')menu(false)});
const progress=$('#readProgress');let scrolling=false;
function updateScroll(){scrolling=false;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);if(progress)progress.style.width=Math.min(100,Math.max(0,(scrollY/max)*100))+'%';}
window.addEventListener('scroll',()=>{if(!scrolling){scrolling=true;requestAnimationFrame(updateScroll)}},{passive:true});updateScroll();
const cards=$$('.skill'), filters=$$('.category'), count=$('#toolCount'), title=$('#spotTitle'),description=$('#spotDescription');
let selected='javascript';
const spotVisual=$('#spotVisual'),spotArea=$('#spotArea'),spotRelated=$('#spotRelated');
const relatedWork={javascript:'RepoVerity · Web platforms',python:'Automation · Data utilities',php:'Institutional workflows',java:'Computing · Core applications',typescript:'Developer tooling',react:'RepoVerity · Interfaces',nodejs:'SubmissionLedger · FlowFault',reactnative:'Cross-platform mobile interfaces',postgresql:'Relational systems',mongodb:'Document data workflows',firebase:'Connected application services',n8n:'Automation workflows',googleworkspace:'Institutional operations',microsoft365:'Enterprise productivity',github:'RepoVerity · Open source',git:'Version control · All projects',docker:'Reproducible environments',cybersecurity:'Email authentication · DNS'};
function focusCard(card,animate=true){
 if(!card||card.hidden)return;selected=card.dataset.skill;
 cards.forEach(c=>c.setAttribute('aria-pressed',String(c===card)));
 const name=$('span',card)?.textContent||'';if(title)title.textContent=name;
 const key='skill'+selected.charAt(0).toUpperCase()+selected.slice(1);
 if(description){description.removeAttribute('data-i18n');description.textContent=t(key);}
 const icon=$('img',card);if(icon&&spotVisual){spotVisual.src=icon.getAttribute('src');spotVisual.alt=name+' logo';}
 if(spotArea)spotArea.textContent=t(({dev:'catDev',data:'catData',automation:'catAutomation',ops:'catOps'})[card.dataset.category]||'catAll');
 if(spotRelated)spotRelated.textContent=relatedWork[selected]||'Engineering systems';
 if(animate&&window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches){window.gsap.fromTo('.spot-logo-frame',{opacity:.4,scale:.84,rotate:-6},{opacity:1,scale:1,rotate:0,duration:.42,ease:'power2.out'});window.gsap.fromTo('.spot-information',{opacity:.72,y:7},{opacity:1,y:0,duration:.3,ease:'power2.out'});}
}
cards.forEach(card=>{card.addEventListener('click',()=>focusCard(card));card.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const visible=cards.filter(c=>!c.hidden),index=visible.indexOf(card);const cols=innerWidth<600?3:innerWidth<1050?4:6;const jump=event.key==='Home'? -index:event.key==='End'?visible.length-1-index:event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-cols:cols;const next=visible[Math.max(0,Math.min(visible.length-1,index+jump))];next?.focus();focusCard(next);});});
filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});const type=button.dataset.category;cards.forEach(card=>{card.hidden=type!=='all'&&card.dataset.category!==type;});const visible=cards.filter(c=>!c.hidden);if(count)count.textContent=`${visible.length} / ${cards.length}`;const current=cards.find(c=>c.dataset.skill===selected);if(!current||current.hidden)focusCard(visible[0],false);if(window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches){window.gsap.fromTo(visible,{opacity:.75,y:14},{opacity:1,y:0,duration:.42,stagger:.025,ease:'power2.out',overwrite:true});}}));
function localizeSelected(){const current=cards.find(c=>c.dataset.skill===selected);focusCard(current,false);}
document.addEventListener('portfolio:locale',localizeSelected);localizeSelected();
const contact=$('#contactForm'),feedback=$('#contactFeedback');
contact?.addEventListener('submit',event=>{event.preventDefault();const name=$('#contactName'),email=$('#contactEmail'),message=$('#contactMessage'),topic=$('#contactTopic');if(!name.value.trim()||!message.value.trim()||!email.validity.valid||!email.value.trim()){feedback.textContent=t('formInvalid');contact.reportValidity();return;}const subject=`${topic.selectedOptions[0]?.textContent||'Professional enquiry'} - ${name.value.trim()}`;const body=`Hello Moataz,\n\n${message.value.trim()}\n\nName: ${name.value.trim()}\nReply email: ${email.value.trim()}\n\nRegards,\n${name.value.trim()}`;feedback.textContent=t('formNotice');const url=`mailto:president@mycdic.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;location.href=url;});
document.addEventListener('portfolio:locale',()=>{if(feedback)feedback.textContent='';});
// Restrained motion. No text is hidden pending the library or JavaScript.
function initMotion(){const gs=window.gsap;if(!gs||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const st=window.ScrollTrigger;if(st)gs.registerPlugin(st);if(st){$$('[data-reveal]').forEach((el,index)=>gs.fromTo(el,{opacity:.88,y:28},{opacity:1,y:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true},delay:(index%2)*.05}));gs.fromTo('.lab-node',{opacity:.7,y:12},{opacity:1,y:0,duration:.48,stagger:.09,ease:'power2.out',scrollTrigger:{trigger:'.lab-flow',start:'top 88%',once:true}});gs.fromTo('.story-timeline>div',{x:12,opacity:.75},{x:0,opacity:1,duration:.64,stagger:.1,scrollTrigger:{trigger:'.story-timeline',start:'top 85%',once:true}});}const picture=$('.portrait-picture');if(picture&&matchMedia('(pointer:fine)').matches){const host=$('.portrait-composition');host?.addEventListener('pointermove',ev=>{const b=host.getBoundingClientRect(),nx=(ev.clientX-b.left)/b.width-.5,ny=(ev.clientY-b.top)/b.height-.5;gs.to(picture,{x:nx*8,y:ny*8,duration:.55,ease:'power2.out',overwrite:true});},{passive:true});host?.addEventListener('pointerleave',()=>gs.to(picture,{x:0,y:0,duration:.7,ease:'power2.out'}));}}
if(document.readyState==='complete')initMotion();else window.addEventListener('load',initMotion,{once:true});
})();
