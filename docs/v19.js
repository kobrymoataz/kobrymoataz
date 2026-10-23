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
