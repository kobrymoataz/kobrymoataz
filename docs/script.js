/*
 * Moataz Kobry — editorial one-page portfolio
 * All content, navigation, filters and interactions work without external libraries.
 * GSAP is an optional enhancement for the introductory sequence only.
 */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // All technology marks are bundled locally: no third-party logo server.
  const technologies = [
    { name: 'JavaScript', icon: 'javascript', groups: ['engineering'] },
    { name: 'TypeScript', icon: 'typescript', groups: ['engineering'] },
    { name: 'Python', icon: 'python', groups: ['engineering', 'automation'] },
    { name: 'Java', icon: 'java', groups: ['engineering'] },
    { name: 'PHP', icon: 'php', groups: ['engineering', 'data'] },
    { name: 'React', icon: 'react', groups: ['engineering'] },
    { name: 'React Native', icon: 'reactnative', groups: ['engineering'] },
    { name: 'Node.js', icon: 'nodejs', groups: ['engineering'] },
    { name: 'MongoDB', icon: 'mongodb', groups: ['data'] },
    { name: 'PostgreSQL', icon: 'postgresql', groups: ['data'] },
    { name: 'Firebase', icon: 'firebase', groups: ['data', 'automation'] },
    { name: 'SQL', icon: 'sql', groups: ['data'] },
    { name: 'GitHub', icon: 'github', groups: ['engineering'] },
    { name: 'Git', icon: 'git', groups: ['engineering'] },
    { name: 'n8n', icon: 'n8n', groups: ['automation'] },
    { name: 'Google Workspace', icon: 'googleworkspace', groups: ['automation'] },
    { name: 'Microsoft 365', icon: 'microsoft365', groups: ['automation'] },
    { name: 'Prompt Engineering', icon: 'prompt', groups: ['automation'] },
    { name: 'AI-assisted Development', icon: 'aicoding', groups: ['automation'] },
    { name: 'Docker', icon: 'docker', groups: ['engineering'] }
  ];

  const systems = {
    public: {
      label: 'PUBLIC DIGITAL PRESENCE',
      title: 'The official digital front door.',
      description: 'A structured public website brings identity, information and engagement into one coherent institutional experience.',
      features: ['Institutional content and navigation', 'Public-facing interactions', 'Reliable information and communication'],
      link: 'https://www.mycdic.org/',
      linkLabel: 'Visit MYCDIC',
      diagram: ['PUBLIC', 'APPLICATION', 'OPERATIONS'],
      sub: ['Experience', 'Logic', 'Records & flows'],
      model: 'MODEL / 01'
    },
    operations: {
      label: 'INSTITUTIONAL OPERATIONS',
      title: 'The work that happens behind the website.',
      description: 'An internal management environment helps organize records, workflows and administrative processes for the people running the institution.',
      features: ['Structured records and internal workflows', 'Coordination across operational functions', 'Management processes designed for continuity'],
      link: 'https://www.mycdic.org/president/',
      linkLabel: 'Institutional role',
      diagram: ['TEAMS', 'RECORDS', 'WORKFLOWS'],
      sub: ['Roles', 'Management', 'Execution'],
      model: 'MODEL / 02'
    },
    automation: {
      label: 'AUTOMATION & DELIVERY',
      title: 'Less repetitive work. More reliable execution.',
      description: 'Automation connects forms, APIs, operational data and communications so that routine processes are easier to coordinate and monitor.',
      features: ['n8n and Google Workspace workflows', 'Mail, documents and integrations', 'Practical checks and operational handoffs'],
      link: 'mailto:president@mycdic.org?subject=Automation%20and%20Digital%20Systems',
      linkLabel: 'Discuss an integration',
      diagram: ['INPUT', 'AUTOMATION', 'OUTPUT'],
      sub: ['Forms & APIs', 'Workflows', 'Delivery'],
      model: 'MODEL / 03'
    }
  };

  function initMobileMenu() {
    const button = document.getElementById('menuToggle');
    const nav = document.getElementById('mobileNav');
    if (!button || !nav) return;

    function closeMenu() {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open navigation');
      nav.hidden = true;
    }

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      button.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
      nav.hidden = open;
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    document.addEventListener('click', event => {
      if (!nav.hidden && !nav.contains(event.target) && !button.contains(event.target)) closeMenu();
    });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  }

  function renderTechnologies(filter = 'all') {
    const grid = document.getElementById('toolGrid');
    const count = document.getElementById('toolCount');
    if (!grid) return;
    const items = technologies.filter(tool => filter === 'all' || tool.groups.includes(filter));
    const fragment = document.createDocumentFragment();

    items.forEach(tool => {
      const item = document.createElement('div');
      item.className = 'tool-item';
      const image = document.createElement('img');
      image.src = `./assets/logos/${tool.icon}.svg`;
      image.alt = '';
      image.width = 34;
      image.height = 34;
      image.loading = 'eager';
      const name = document.createElement('span');
      name.textContent = tool.name;
      item.append(image, name);
      fragment.appendChild(item);
    });

    grid.replaceChildren(fragment);
    if (count) count.textContent = `${String(items.length).padStart(2, '0')} TOOLS & PLATFORMS`;
  }

  function initTechnologyFilter() {
    renderTechnologies('all');
    const buttons = [...document.querySelectorAll('.filter-btn')];
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(other => {
          const active = other === button;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });
        renderTechnologies(button.dataset.filter || 'all');
      });
    });
  }

  function initSystemTabs() {
    const tabs = [...document.querySelectorAll('.system-tab')];
    const tag = document.getElementById('systemTag');
    const title = document.getElementById('systemName');
    const description = document.getElementById('systemDescription');
    const features = document.getElementById('systemFeatures');
    const link = document.getElementById('systemLink');
    const nodes = [...document.querySelectorAll('.diagram-node')];
    const model = document.querySelector('.diagram-live');
    if (!tabs.length || !tag || !title || !description || !features || !link) return;

    function activate(key) {
      const entry = systems[key];
      if (!entry) return;
      tabs.forEach(tab => {
        const active = tab.dataset.system === key;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      tag.textContent = entry.label;
      title.textContent = entry.title;
      description.textContent = entry.description;
      features.replaceChildren(...entry.features.map(text => {
        const li = document.createElement('li'); li.textContent = text; return li;
      }));
      link.href = entry.link;
      link.innerHTML = '';
      link.append(document.createTextNode(entry.linkLabel + ' '));
      const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden','true'); arrow.textContent = '↗'; link.append(arrow);
      nodes.forEach((node, index) => {
        node.querySelector('strong').textContent = entry.diagram[index];
        node.querySelector('small').textContent = entry.sub[index];
      });
      if (model) model.innerHTML = `<i aria-hidden="true"></i> ${entry.model}`;
    }

    tabs.forEach((tab,index) => {
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.addEventListener('click', () => activate(tab.dataset.system));
      tab.addEventListener('keydown', event => {
        let next = null;
        if (event.key === 'ArrowRight') next = tabs[(index+1)%tabs.length];
        if (event.key === 'ArrowLeft') next = tabs[(index-1+tabs.length)%tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length-1];
        if (next) { event.preventDefault(); next.focus(); activate(next.dataset.system); }
      });
    });
  }

  const dataSystems = {
    firebase: {
      tag: 'APPLICATION SERVICES',
      name: 'Application data, connected to the experience.',
      description: 'Firebase offers managed application services and connected data tools. It is one option when a project needs fast integration with an app-facing workflow.',
      keywords: ['Application services', 'Connected data', 'Integration'],
      diagram: 'FIREBASE'
    },
    postgresql: {
      tag: 'RELATIONAL DATABASES',
      name: 'Structured information that remains understandable.',
      description: 'PostgreSQL supports relational models, SQL queries and well-defined records. It is a practical foundation when operational consistency matters.',
      keywords: ['Relational data', 'SQL', 'Structured records'],
      diagram: 'POSTGRESQL'
    },
    mongodb: {
      tag: 'DOCUMENT DATA',
      name: 'Flexible records for changing requirements.',
      description: 'MongoDB uses a document model that fits some evolving workflows, integration payloads and applications with varied data structures.',
      keywords: ['Documents', 'Data models', 'APIs'],
      diagram: 'MONGODB'
    }
  };

  function initDataExplorer() {
    const tabs = [...document.querySelectorAll('.data-tab')];
    const tag = document.getElementById('dataTag');
    const name = document.getElementById('dataName');
    const description = document.getElementById('dataDescription');
    const keywords = document.getElementById('dataKeywords');
    const diagram = document.getElementById('dataDiagramLabel');
    if (!tabs.length || !tag || !name || !description || !keywords || !diagram) return;

    function activate(key) {
      const entry = dataSystems[key];
      if (!entry) return;
      tabs.forEach(tab => {
        const active = tab.dataset.database === key;
        tab.classList.toggle('is-active',active);
        tab.setAttribute('aria-selected',String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      tag.textContent = entry.tag;
      name.textContent = entry.name;
      description.textContent = entry.description;
      diagram.textContent = entry.diagram;
      keywords.replaceChildren(...entry.keywords.map(word => {
        const span = document.createElement('span');
        span.textContent = word;
        return span;
      }));
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab.dataset.database));
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = tabs[(index+1)%tabs.length];
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = tabs[(index-1+tabs.length)%tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length-1];
        if (!next) return;
        event.preventDefault();
        next.focus();
        activate(next.dataset.database);
      });
    });
  }

  function initScrollUI() {
    const progress = document.getElementById('scrollProgress');
    const header = document.getElementById('siteHeader');
    let scheduled = false;
    function update() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (progress) progress.style.width = `${Math.max(0,Math.min(100,window.scrollY/max*100))}%`;
      if (header) header.classList.toggle('is-scrolled',window.scrollY > 20);
      scheduled = false;
    }
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();

    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('is-active',link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-30% 0px -54% 0px', threshold: 0 });
    document.querySelectorAll('section[id]:not(#top)').forEach(section => sectionObserver.observe(section));
  }

  function initReveal() {
    const elements = [...document.querySelectorAll('.reveal')];
    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }
    root.classList.add('js-enhanced');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });
    elements.forEach(el => observer.observe(el));
  }

  function initProfessionalMotion() {
    if (reducedMotion) return;
    const gsap = window.gsap;
    if (!gsap) return;
    // Intentional, restrained entrance animation. No looping portrait movements.
    gsap.from('.hero-index', { opacity: 0, y: 15, duration: .7, delay: .05, ease: 'power2.out' });
    gsap.from('.hero-line', { opacity: 0, y: 42, duration: 1.15, delay: .15, stagger: .12, ease: 'power3.out' });
    gsap.from('.hero-position, .hero-intro, .hero-actions', { opacity: 0, y: 14, duration: .75, stagger: .10, delay: .48, ease: 'power2.out' });
    gsap.from('.portrait-frame', { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, delay: .35, ease: 'power3.inOut', clearProps: 'clipPath' });
  }

  function initContact() {
    const button = document.getElementById('copyEmail');
    const toast = document.getElementById('toast');
    let toastTimer;
    if (!button || !toast) return;
    const email = 'president@mycdic.org';
    button.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(email);
        else {
          const input = document.createElement('textarea');
          input.value = email;
          input.style.position = 'fixed'; input.style.opacity = '0';
          document.body.appendChild(input); input.select();
          if (!document.execCommand('copy')) throw new Error('Copy unavailable');
          input.remove();
        }
        toast.textContent = 'Email address copied to clipboard';
      } catch (_) {
        toast.textContent = `Email: ${email}`;
      }
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTechnologyFilter();
    initSystemTabs();
    initDataExplorer();
    initScrollUI();
    initReveal();
    initProfessionalMotion();
    initContact();
  });
})();
