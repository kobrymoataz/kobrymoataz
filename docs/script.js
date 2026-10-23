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
