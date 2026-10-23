'use strict';
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = $('#progress');
  const header = $('#siteHeader');
  let scheduled = false;
  const anchors = $$('.nav a');
  const targets = anchors.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function updateScroll() {
    if (progress) {
      const extent = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${extent > 0 ? (scrollY / extent * 100) : 0}%`;
    }
    header?.classList.toggle('scrolled', scrollY > 14);
    const line = scrollY + innerHeight * 0.35;
    let active = null;
    for (const el of targets) if (el.offsetTop <= line) active = el.id;
    anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${active}`));
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, {passive:true});
  updateScroll();

  const toggle = $('#menuToggle');
  const nav = $('#primaryNav');
  function closeNav() { nav?.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }
  toggle?.addEventListener('click', () => {
    const next = !nav.classList.contains('open');
    nav.classList.toggle('open', next);
    toggle.setAttribute('aria-expanded', String(next));
    document.body.classList.toggle('menu-open', next);
  });
  $$('.nav a').forEach(a => a.addEventListener('click', closeNav));
  addEventListener('resize', () => { if (innerWidth > 820) closeNav(); }, {passive:true});
  addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  const filters = $$('.filter');
  const tools = $$('.tool');
  function setFilter(filter) {
    let visible = 0;
    tools.forEach((item, index) => {
      const show = filter === 'all' || item.dataset.type === filter;
      item.hidden = !show;
      if (show) {
        visible++;
        if (!prefersReduced && window.gsap) {
          window.gsap.fromTo(item, {opacity:0, y:14, scale:.97}, {opacity:1, y:0, scale:1, duration:.48, delay:Math.min(visible - 1, 12) * .034, overwrite:true, ease:'power3.out'});
        }
      }
    });
    filters.forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.tabIndex = 0;
    });
    const count = $('#toolsCount');
    if (count) count.textContent = `${String(visible).padStart(2, '0')} TECHNOLOGIES`;
  }
  filters.forEach((btn, index) => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    btn.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      let i = index;
      if (e.key === 'ArrowRight') i=(i+1)%filters.length;
      if (e.key === 'ArrowLeft') i=(i-1+filters.length)%filters.length;
      if (e.key === 'Home') i=0;
      if (e.key === 'End') i=filters.length-1;
      filters[i].focus(); setFilter(filters[i].dataset.filter);
    });
  });
  setFilter('all');

  const toast = $('#toast');
  let toastTimer = null;
  $('#copyEmail')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('president@mycdic.org');
      if (toast) { toast.textContent = 'Email address copied'; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(() => toast.classList.remove('show'), 2500); }
    } catch {
      location.href = 'mailto:president@mycdic.org';
    }
  });

  // Progressive enhancement: content remains visible even when the animation CDN is unavailable.
  if (!prefersReduced && window.gsap) {
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.from('.hero-kicker', {opacity:0, y:12, duration:.75, delay:.12, ease:'power2.out'});
    gsap.from('.hero-title .hero-name', {opacity:0, y:55, clipPath:'inset(0 0 100% 0)', duration:1.1, delay:.18, ease:'power4.out'});
    gsap.from('.hero-title em', {opacity:0, y:52, clipPath:'inset(0 0 100% 0)', duration:1.2, delay:.33, ease:'power4.out'});
    gsap.from(['.hero-lead','.hero-discipline','.hero-actions'], {opacity:0, y:20, duration:.8, stagger:.13, delay:.7, ease:'power3.out'});
    gsap.from('.portrait-frame', {opacity:0, y:35, scale:1.045, duration:1.4, delay:.35, ease:'power3.out'});
    gsap.from(['.pback-one','.pback-two'], {opacity:0,x:-25,duration:1.25,stagger:.13,delay:.75,ease:'power3.out'});
    gsap.to('.portrait-orbit', {rotation:360, duration:38, ease:'none', repeat:-1, transformOrigin:'center center'});
    gsap.to('.portrait-back.pback-one', {y:-8,x:4, duration:5, ease:'sine.inOut', repeat:-1, yoyo:true});
    if (window.ScrollTrigger) {
      $$('.section .section-head, .intro-grid, .cap-card, .work-card, .arch-item, .security-layout, .perspective-copy, .contact-bottom').forEach(el => {
        gsap.fromTo(el, {y:22, opacity:.86}, {y:0,opacity:1,duration:.9,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 94%',once:true}});
      });
      gsap.fromTo('.arch-item',{borderColor:'rgba(139,116,83,.3)'},{borderColor:'rgba(208,174,122,.65)',duration:.5,stagger:.11,yoyo:true,repeat:1,scrollTrigger:{trigger:'.architecture-flow',start:'top 78%',once:true}});
      gsap.to('.hero-geometry .g1', {y:75, rotation:24, ease:'none', scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.6}});
    }
  }
})();


'use strict';
/** V19 interactions. HTML content remains fully accessible without GSAP or JavaScript. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const map = {
    JavaScript: 'Interactive interfaces, browser-side logic and connected web applications.',
    TypeScript: 'Typed application code and predictable interfaces across larger implementations.',
    Python: 'Automation scripts, data processing and technical problem solving.',
    Java: 'Object-oriented programming, application logic and reliable service design.',
    PHP: 'Server-side systems, application workflows and integration with relational databases.',
    React: 'Component-based interfaces where users need clear, responsive interactions.',
    'React Native': 'Cross-platform mobile application development and connected workflows.',
    'Node.js': 'JavaScript services, API integrations and backend automation.',
    PostgreSQL: 'Relational records, SQL queries and systems requiring structured data.',
    MongoDB: 'Document-oriented data where an application benefits from flexible structures.',
    Firebase: 'Managed application services and connected workflows where appropriate.',
    n8n: 'Connecting services and orchestrating repeatable operational processes.',
    'Google Workspace': 'Apps Script, official correspondence, document and workflow automation.',
    'Prompt design': 'Designing and testing precise instructions for automation-assisted workflows.',
    'Microsoft 365': 'Document collaboration, office operations and organizational productivity.',
    GitHub: 'Version control, code review, repository collaboration and project delivery.',
    Docker: 'Reproducible development environments and container-based deployment workflows.',
    'Email systems': 'SPF, DKIM, DMARC, DNS, SMTP and responsible sending practices.'
  };
  const tiles = $$('.tool');
  const spotTitle = $('#spotTitle');
  const spotDescription = $('#spotDescription');
  const spotIcon = $('#spotIcon');
  const panel = $('#toolSpotlight');
  function focusTool(button, animate = true) {
    if (!button) return;
    const name = $('span', button)?.textContent.trim() || 'Technology';
    const icon = $('img', button);
    tiles.forEach(tile => tile.setAttribute('aria-pressed', String(tile === button)));
    if (spotTitle) spotTitle.textContent = name;
    if (spotDescription) spotDescription.textContent = map[name] || 'A tool selected according to the platform and delivery requirements.';
    if (icon && spotIcon) spotIcon.src = icon.getAttribute('src');
    if (gsap && !reduced && animate && panel) {
      gsap.fromTo($('.tool-spotlight-copy', panel), {y:8, opacity:.6}, {y:0,opacity:1,duration:.38,ease:'power2.out',overwrite:true});
      gsap.fromTo($('#spotIcon', panel), {rotation:-6,scale:.88}, {rotation:0,scale:1,duration:.45,ease:'back.out(1.6)',overwrite:true});
    }
  }
  tiles.forEach((tile, i) => {
    tile.addEventListener('click', () => focusTool(tile));
    tile.addEventListener('keydown', ev => {
      if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(ev.key)) return;
      const visible = tiles.filter(b => !b.hidden);
      const here = visible.indexOf(tile);
      if (here < 0) return;
      ev.preventDefault();
      const cols = window.innerWidth < 650 ? 2 : window.innerWidth < 1000 ? 4 : 6;
      const jump = ev.key === 'ArrowDown' ? cols : ev.key === 'ArrowUp' ? -cols : ev.key === 'ArrowLeft' ? -1 : 1;
      let idx = ev.key === 'Home' ? 0 : ev.key === 'End' ? visible.length-1 : Math.min(visible.length-1,Math.max(0,here+jump));
      visible[idx].focus();focusTool(visible[idx]);
    });
  });
  focusTool(tiles[0], false);
  // Keep spotlight relevant when users filter the grid.
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    const current = $('.tool[aria-pressed="true"]');
    if (!current || current.hidden) focusTool(tiles.find(t => !t.hidden), false);
  }));
  // More detailed case study descriptions are native <details> controls.
  $$('.case-disclosure').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open || !gsap || reduced) return;
      gsap.fromTo($$('.case-expanded>div', details), {opacity:.55,y:9}, {opacity:1,y:0,duration:.3,stagger:.055,ease:'power2.out',overwrite:true});
    });
  });
  // Email composer: a static GitHub Pages site cannot transmit messages directly.
  $('#contactForm')?.addEventListener('submit', event => {
    const form = event.currentTarget;
    if (!form.checkValidity()) return;
    event.preventDefault();
    const name = $('#contactName').value.trim();
    const reply = $('#contactReply').value.trim();
    const topic = $('#contactTopic').value;
    const message = $('#contactMessage').value.trim();
    const subject = `${topic} — ${name}`;
    const body = `Hello Moataz,\n\n${message}\n\nName: ${name}\nReply email: ${reply}\nTopic: ${topic}\n\nRegards,\n${name}`;
    const email = `mailto:president@mycdic.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const toast = $('#toast');
    if (toast) { toast.textContent = 'Your email application will open. Review and send the message there.'; toast.classList.add('show'); }
    window.location.href = email;
  });
  // Reinforce meaningful motion, without hiding information by default.
  if (gsap && window.ScrollTrigger && !reduced) {
    gsap.registerPlugin(window.ScrollTrigger);
    $$('.case-study').forEach((study, i) => {
      gsap.fromTo(study, {y:36,opacity:.86}, {y:0,opacity:1,duration:1.05,ease:'power3.out',scrollTrigger:{trigger:study,start:'top 87%',once:true}});
      const art = $('.case-browser,.case-dash', study);
      if (art) gsap.fromTo(art,{y:16,opacity:.84},{y:0,opacity:1,duration:1.1,delay:.12,ease:'power2.out',scrollTrigger:{trigger:study,start:'top 84%',once:true}});
    });
    gsap.fromTo('.record-entry', {y:23,opacity:.72}, {y:0,opacity:1,duration:.78,stagger:.12,ease:'power3.out',scrollTrigger:{trigger:'.record-track',start:'top 83%',once:true}});
    window.ScrollTrigger.create({trigger:'#tools',start:'top 82%',once:true,onEnter:()=> {
      const visible = tiles.filter(x => !x.hidden);
      gsap.fromTo(visible,{y:26,opacity:.52},{y:0,opacity:1,duration:.73,stagger:{each:.035,from:'start'},ease:'power3.out',overwrite:true});
    }});
    gsap.fromTo('.contact-form',{y:24,opacity:.82},{y:0,opacity:1,duration:.8,ease:'power2.out',scrollTrigger:{trigger:'.contact-form',start:'top 87%',once:true}});
  }
})();


'use strict';
/** V20: proof-of-work cards; keep content visible without JS. */
(() => {
  const cards = Array.from(document.querySelectorAll('.evidence-card'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cards.length || reduced) return;
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if(!entry.isIntersecting)continue;
      const card=entry.target;
      card.classList.add('evidence-ready');
      io.unobserve(card);
      if(window.gsap)window.gsap.fromTo(card,{y:24,opacity:.86},{y:0,opacity:1,duration:.72,ease:'power3.out',overwrite:'auto'});
    }
  },{threshold:.12,rootMargin:'0px 0px 80px 0px'});
  cards.forEach(card=>io.observe(card));
})();

// V21: subtle native motion enhancements (no content is hidden while loading).
(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;
  if(window.gsap && window.ScrollTrigger){
    const gsap=window.gsap;
    document.querySelectorAll('.cap-card').forEach((card,i)=>{
      gsap.fromTo(card,{y:12,opacity:.88},{y:0,opacity:1,duration:.68,ease:'power2.out',scrollTrigger:{trigger:card,start:'top 93%',once:true}});
    });
    document.querySelectorAll('.evidence-card').forEach(card=>{
      gsap.fromTo(card,{backgroundPosition:'10% 50%'},{backgroundPosition:'90% 50%',duration:2.1,scrollTrigger:{trigger:card,start:'top bottom',end:'bottom top',scrub:.6}});
    });
  }
})();
