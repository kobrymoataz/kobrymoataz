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
