/* Moataz Kobry · editorial interaction layer
 * Progressive enhancement: navigation, architecture and contact form work without any CDN.
 * GSAP + ScrollTrigger, if available, power the choreographed page motion.
 */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const root=document.documentElement;

  // Menu
  const menuBtn=$('#menu-button');
  const mainNav=$('#main-nav');
  if(menuBtn && mainNav){
    const toggle=(open)=>{mainNav.classList.toggle('is-open',open);menuBtn.setAttribute('aria-expanded', String(open));menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');};
    menuBtn.addEventListener('click',()=>toggle(!mainNav.classList.contains('is-open')));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});
    document.addEventListener('click',e=>{if(!mainNav.contains(e.target) && !menuBtn.contains(e.target))toggle(false);});
  }

  // Scroll position / progress
  const progress=$('.scroll-progress');
  const updateProgress=()=>{
    if(!progress)return;
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    progress.style.width=(Math.min(100,Math.max(0,window.scrollY/max*100)))+'%';
  };
  updateProgress();
  addEventListener('scroll',updateProgress,{passive:true});
  addEventListener('resize',updateProgress,{passive:true});

  // Reveal semantics and safe fallback (no hidden content if observer is unsupported)
  if(!reduceMotion && 'IntersectionObserver' in window){
    const revealElements=$$('[data-reveal]');
    const revealIO=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-revealed');revealIO.unobserve(entry.target);}
      });
    },{rootMargin:'0px 0px -24px 0px',threshold:.055});
    revealElements.forEach(el=>{revealIO.observe(el);});
    root.classList.add('enhanced');
  }

  // Editorial motion via GSAP where loaded, with native CSS and WAAPI as fallback.
  if(!reduceMotion){
    const hero=$$('[data-hero]');
    if(gsap){
      const ST=window.ScrollTrigger;
      if(ST){gsap.registerPlugin(ST);}
      if(hero.length){
        const tl=gsap.timeline({defaults:{ease:'power3.out'}});
        tl.fromTo(hero,{opacity:0,y:45},{opacity:1,y:0,duration:1.05,stagger:.14,clearProps:'transform,opacity'});
        tl.fromTo('.hero-rule',{width:'0%'},{width:'100%',duration:1.12,ease:'expo.out'},'-=.7');
      }
      // Materiality, not constant motion: slow reveal of major rules and call-to-action.
      if(ST){
        $$('.practice-card').forEach(card=>gsap.fromTo(card.querySelector('.practice-mark'),{y:15,opacity:.3},{y:0,opacity:1,duration:.9,ease:'power2.out',scrollTrigger:{trigger:card,start:'top 85%'}}));
        const windowPanel=$('.featured-window');
        if(windowPanel){gsap.fromTo(windowPanel,{y:30,rotate:-1.2},{y:0,rotate:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:windowPanel,start:'top 80%'}});}
        $$('.career-entry').forEach(item=>gsap.fromTo(item,{opacity:.35},{opacity:1,duration:.5,scrollTrigger:{trigger:item,start:'top 82%'}}));
      }
    }else if(hero.length && Element.prototype.animate){
      hero.forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'none'}],{duration:820,delay:90+i*110,fill:'both',easing:'cubic-bezier(.22,1,.36,1)'}));
    }
  }else{
    $$('.is-revealed').forEach(el=>el.style.transform='none');
  }

  // True multi-page navigation: separate index.html per route for direct refresh.
  // A compact editorial page transition enhances navigation without breaking it.
  if(gsap && !reduceMotion){
    $$('a[href]').forEach(link=>{
      const href=link.getAttribute('href');
      if(!href || href.startsWith('#') || href.startsWith('mailto:') || link.target==='_blank' || link.hasAttribute('download'))return;
      let dest;
      try{dest=new URL(href,location.href);}catch{return;}
      if(dest.origin!==location.origin || dest.pathname===location.pathname)return;
      link.addEventListener('click',e=>{
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        e.preventDefault();
        const wipe=$('.page-wipe');
        if(!wipe){location.href=href;return;}
        gsap.fromTo(wipe,{yPercent:100},{yPercent:0,duration:.43,ease:'power2.in',onComplete:()=>{location.href=href;}});
      });
    });
  }

  // Filterable expertise, with real controls
  const filterButtons=$$('[data-filter]');
  const groups=$$('.expertise-group');
  if(filterButtons.length){
    filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
      const chosen=btn.dataset.filter;
      filterButtons.forEach(b=>{const is=b===btn;b.classList.toggle('active',is);b.setAttribute('aria-pressed',String(is));});
      groups.forEach(g=>g.classList.toggle('is-filtered-out',chosen!=='all' && chosen!==g.dataset.group));
      if(window.ScrollTrigger){window.ScrollTrigger.refresh();}
    }));
  }

  // Interactive architecture: one stable composition, content change inside it.
  const stageButtons=$$('[data-stage]');
  const stageNames=['Interface','Application logic','Records & data','Automation','Verification'];
  const stageCopies=[
    'A useful interface gives people a clear way to request, inspect or complete the task.',
    'Rules, permissions and process logic connect the interface to legitimate actions.',
    'Consistent records make operations accountable and keep the system understandable.',
    'Connected services, documents and notifications reduce repetitive work while preserving oversight.',
    'Traceable acknowledgements and verifiable output close the operational loop.'
  ];
  const stageShort=['INTERFACE','LOGIC','DATA','AUTOMATION','VERIFICATION'];
  const selectStage=(idx)=>{
    stageButtons.forEach(b=>{const yes=Number(b.dataset.stage)===idx;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
    const core=$('.diagram-core');const title=$('#stage-name');const copy=$('#stage-copy');
    if(!core||!title||!copy)return;
    const update=()=>{core.innerHTML=String(idx+1).padStart(2,'0')+'<span>'+stageShort[idx]+'</span>';title.textContent=stageNames[idx];copy.textContent=stageCopies[idx];};
    if(gsap&&!reduceMotion){gsap.to([core,title,copy],{opacity:.18,y:7,duration:.17,onComplete:()=>{update();gsap.to([core,title,copy],{opacity:1,y:0,duration:.4,ease:'power3.out'});}});}else update();
  };
  stageButtons.forEach(b=>b.addEventListener('click',()=>selectStage(Number(b.dataset.stage))));

  // Deliberate 3D topology study in the systems lab, without site-wide generic particles.
  const canvas=$('#lattice');
  if(canvas && !reduceMotion){
    const ctx=canvas.getContext('2d');
    if(ctx){
      let angle=0,visible=true;
      const dpr=Math.min(devicePixelRatio||1,2);
      const width=460,height=390;
      canvas.width=width*dpr;canvas.height=height*dpr;ctx.scale(dpr,dpr);
      const points=[];const edges=[];
      for(let row=0;row<7;row++){
        const latitude=-Math.PI/2+(row+.5)*Math.PI/7;
        for(let j=0;j<14;j++){
          const longitude=j*2*Math.PI/14;
          points.push([Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude)]);
          const id=row*14+j;
          edges.push([id,row*14+(j+1)%14]);
          if(row<6)edges.push([id,(row+1)*14+j]);
        }
      }
      const io=new IntersectionObserver(e=>{visible=e[0]?.isIntersecting??true;},{threshold:.01});io.observe(canvas);
      function draw(){
        ctx.clearRect(0,0,width,height);
        if(visible){
          const project=(p)=>{
            const a=angle,ca=Math.cos(a),sa=Math.sin(a);
            const x=p[0]*ca-p[2]*sa,z=p[0]*sa+p[2]*ca;
            const tilt=.35,y=p[1]*Math.cos(tilt)-z*Math.sin(tilt),zz=p[1]*Math.sin(tilt)+z*Math.cos(tilt);
            const factor=1+.07*zz;
            return [width/2+x*133*factor,height/2+y*133*factor,zz];
          };
          const out=points.map(project);
          ctx.strokeStyle='rgba(177,161,135,.23)';ctx.lineWidth=.55;
          edges.forEach(([a,b])=>{const p=out[a],q=out[b];ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();});
          out.forEach(p=>{if(p[2]<-.08)return;ctx.fillStyle='rgba(200,174,131,.34)';ctx.beginPath();ctx.arc(p[0],p[1],1.4,0,Math.PI*2);ctx.fill();});
          angle+=.002;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    }
  }

  // Email composition without pretending that mail was delivered.
  const form=$('#contact-form');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!form.reportValidity())return;
      const data=new FormData(form);
      const name=String(data.get('name')||'').trim();
      const org=String(data.get('organization')||'').trim();
      const type=String(data.get('type')||'Professional inquiry');
      const message=String(data.get('message')||'').trim();
      if(!name||!message)return;
      const subject=`${type} — ${name}`;
      const body=`Hello Moataz,\n\n${message}\n\nName: ${name}\nOrganization: ${org||'Not specified'}\nInquiry: ${type}\n\nRegards,\n${name}`;
      $('#form-status').textContent='Your email application should open. Review the draft and press Send there.';
      location.href=`mailto:president@mycdic.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
