/* Moataz Kobry Portfolio | Interaction & motion layer
   This file is intentionally self-contained. The page remains usable even if an optional animation CDN is unavailable. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Navigation
  const menu = $('#menu-button');
  const nav = $('#primary-nav');
  menu?.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
    menu.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  });
  $$('.main-nav a').forEach(link => link.addEventListener('click', () => {
    menu?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('is-open');
  }));
  $('#year').textContent = String(new Date().getFullYear());
  const progress = $('#reading-bar');
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max <= 0 ? 0 : Math.min(100, scrollY / max * 100)}%`;
      scrollTicking = false;
    });
  }, { passive: true });
  const anchorObserver = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      $$('.main-nav a').forEach(a => a.classList.toggle('is-current', a.hash === `#${e.target.id}`));
    }
  }, {rootMargin:'-20% 0px -60% 0px',threshold:0});
  ['work','expertise','stack','profile'].forEach(id => { const el = document.getElementById(id); if (el) anchorObserver.observe(el); });

  // Local icons, no image CDN requests.
  const technologies = [
    ['JavaScript','javascript','languages'], ['TypeScript','typescript','languages'], ['Python','python','languages'], ['Java','java','languages'], ['PHP','php','languages'],
    ['React','react','frameworks'], ['React Native','reactnative','frameworks'], ['Node.js','nodejs','frameworks'],
    ['MongoDB','mongodb','data'], ['PostgreSQL','postgresql','data'], ['Git','git','data'], ['GitHub','github','data'], ['Email Infrastructure','mail','data'], ['Cybersecurity','cybersecurity','data'],
    ['n8n','n8n','automation'], ['Prompt Engineering','prompt','automation'], ['AI-assisted Coding','aicoding','automation'], ['Google Workspace','googleworkspace','automation'], ['Microsoft 365','microsoft365','automation']
  ];
  const grid = $('#technology-grid');
  if (grid) {
    grid.innerHTML = technologies.map(([name, icon, category]) => `
      <div class="tech-card" data-category="${category}" role="listitem">
        <img src="logos/${icon}.svg" alt="" width="44" height="44" loading="lazy" />
        <span>${name}</span>
      </div>`).join('');
    grid.setAttribute('role','list');
  }
  $$('.stack-filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.stack-filter').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    const f=btn.dataset.filter;
    $$('.tech-card').forEach(card => { card.hidden = (f !== 'all' && card.dataset.category !== f); });
  }));

  // Selected systems panel - a functional interaction, not a decorative screenshot.
  const workModes = {
    public: {
      url:'www.mycdic.org', kicker:'OFFICIAL INSTITUTIONAL PORTAL', large:'Public<br>presence.',
      copy:'A clear public-facing experience for institutional information, initiatives and verified content.',
      number:'01 / 02',
      summary:'Website design and development led with MYCDIC and Trendad colleagues.',
      tiles:['INFO','ACCESS','VERIFY']
    },
    management: {
      url:'MYCDIC / INTERNAL SYSTEMS', kicker:'OPERATIONAL MANAGEMENT ENVIRONMENT', large:'Connected<br>operations.',
      copy:'A working model for internal processes, structured records, task coordination and automation.',
      number:'02 / 02',
      summary:'Collaborative digital operations, managed through team-led delivery and iterative improvement.',
      tiles:['RECORDS','WORKFLOWS','DOCUMENTS']
    }
  };
  $$('.work-tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.work-tab').forEach(el => { el.classList.toggle('is-active', el === btn); el.setAttribute('aria-selected', String(el === btn)); });
    const mode = workModes[btn.dataset.work]; if (!mode) return;
    $('#mock-url').textContent = mode.url; $('#mock-kicker').textContent=mode.kicker;
    $('#mock-large').innerHTML=mode.large; $('#mock-copy').textContent=mode.copy;
    $('#work-number').textContent=mode.number; $('#work-summary').textContent=mode.summary;
    $('.mock-tiles').innerHTML=mode.tiles.map(s=>`<span>${s}</span>`).join('');
    const mc = $('.mock-content');
    if (window.gsap && !reduceMotion.matches) {
      window.gsap.fromTo(mc,{opacity:.5,y:6},{opacity:1,y:0,duration:.45,ease:'power2.out'});
    }
  }));

  // Motion through GSAP if available. Visuals remain visible without the CDN.
  const reveals=$$('[data-reveal]');
  function runReveals(){
    if (reduceMotion.matches) return;
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      reveals.forEach((el,idx) => window.gsap.fromTo(el,
        {autoAlpha:0,y:Math.min(28,16+(idx%3)*4)},
        {autoAlpha:1,y:0,duration:.85,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 91%',once:true}}));
      window.gsap.fromTo('.hero-name',{y:26,opacity:0},{y:0,opacity:1,duration:.92,stagger:.12,ease:'power3.out'});
    } else if ('IntersectionObserver' in window) {
      reveals.forEach(el=>el.classList.add('js-reveal'));
      const obs = new IntersectionObserver(entries=>{
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      }, {threshold:.09,rootMargin:'0px 0px -20px 0px'});
      reveals.forEach(el=>obs.observe(el));
    }
  }
  // Do not animate before enough DOM paint to avoid blank cards when returning to the page.
  requestAnimationFrame(runReveals);

  // Subtle animated architectural geometry behind the real photograph, projection in 3D space.
  const stage = $('.portrait-ornament');
  if (stage && !reduceMotion.matches) {
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:.58;pointer-events:none;';
    stage.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const coords=[];
    const latCount=10,lonCount=18;
    for (let lat=0; lat<=latCount; lat++) for(let lon=0;lon<lonCount;lon++) {
      const t=Math.PI*(lat/latCount), a=2*Math.PI*lon/lonCount;
      coords.push([Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)]);
    }
    function resize(){ const dpr=Math.min(devicePixelRatio||1,2); const r=stage.getBoundingClientRect();canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0); }
    resize();window.addEventListener('resize',resize,{passive:true});
    let frame=0, last=0;
    function render(t){
      requestAnimationFrame(render); if(t-last<30)return;last=t;
      const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
      const angle=frame*.006;frame++;
      const points=coords.map(([x,y,z])=>{const xr=x*Math.cos(angle)-z*Math.sin(angle), zr=x*Math.sin(angle)+z*Math.cos(angle);const yr=y*Math.cos(.35)-zr*Math.sin(.35),zp=y*Math.sin(.35)+zr*Math.cos(.35);const f=1/(2-zp*.27);return [w*.52+xr*Math.min(w,h)*.44*f,h*.47+yr*Math.min(w,h)*.44*f];});
      ctx.strokeStyle='rgba(167,180,168,0.38)';ctx.lineWidth=.75;
      for(let lat=0;lat<=latCount;lat++){ctx.beginPath();for(let lon=0;lon<=lonCount;lon++){const p=points[lat*lonCount+lon%lonCount];if(lon===0)ctx.moveTo(...p);else ctx.lineTo(...p)}ctx.stroke()}
      for(let lon=0;lon<lonCount;lon++){ctx.beginPath();for(let lat=0;lat<=latCount;lat++){const p=points[lat*lonCount+lon];if(lat===0)ctx.moveTo(...p);else ctx.lineTo(...p)}ctx.stroke()}
    }
    requestAnimationFrame(render);
  }
})();
