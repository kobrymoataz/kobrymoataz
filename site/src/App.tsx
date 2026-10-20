import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check,
  ChevronRight, Database, FileCode2,
  GitBranch, Globe2, Layers3,
  Mail, Menu, Radar, ShieldCheck, Workflow, X
} from 'lucide-react';
import portrait from './assets/portrait.webp';

gsap.registerPlugin(ScrollTrigger);
const OrbScene = lazy(() => import('./components/OrbScene'));

const cvMailto = `mailto:president@mycdic.org?subject=${encodeURIComponent('CV Request — Moataz Kobry')}&body=${encodeURIComponent('Hello Mr Kobry,\n\nI would like to request your CV.\n\nName:\nOrganisation:\nPurpose:\n\nBest regards,')}`;
const links = {
  github: 'https://github.com/kobrymoataz',
  linkedin: 'https://www.linkedin.com/in/kobrymoataz/',
  instagram: 'https://www.instagram.com/kobrymoataz/',
  president: 'https://www.mycdic.org/president/',
  council: 'https://www.mycdic.org/',
  email: 'mailto:president@mycdic.org',
};

const nav = [
  ['about', 'About'],
  ['systems', 'Systems'],
  ['expertise', 'Expertise'],
  ['record', 'Record'],
  ['perspective', 'Perspective'],
] as const;

const layers = [
  { id: 'interface', no: '01', title: 'Public interface', type: 'Access layer', short: 'A clear entry point for users and organisations.', detail: 'Official sites, responsive interfaces, application intake and reliable information architecture.', tags: ['React', 'UX structure', 'Web platforms'] },
  { id: 'operations', no: '02', title: 'Operations', type: 'Control layer', short: 'The internal tools people use to get work done.', detail: 'Administrative workspaces, review stages, roles, structured records and day-to-day coordination.', tags: ['PHP', 'JavaScript', 'Workflows'] },
  { id: 'data', no: '03', title: 'Data & APIs', type: 'Integration layer', short: 'The connective tissue of a platform.', detail: 'Databases, APIs and the interfaces between operational records, public services and external providers.', tags: ['PostgreSQL', 'MongoDB', 'REST APIs'] },
  { id: 'automation', no: '04', title: 'Automation', type: 'Execution layer', short: 'Repetitive work handled with dependable logic.', detail: 'Google Apps Script, document generation, email workflows, record synchronisation and scheduled operations.', tags: ['Python', 'Apps Script', 'Google APIs'] },
  { id: 'trust', no: '05', title: 'Trust & validation', type: 'Assurance layer', short: 'Clear records and verifiable outputs.', detail: 'Reference checks, access boundaries, email authentication and traceable communications.', tags: ['Verification', 'SPF / DKIM', 'Operational security'] },
] as const;

const stacks = [
  { id: 'applications', tab: 'Applications', title: 'Building the interface and the service.', items: ['JavaScript', 'React', 'React Native', 'Node.js', 'PHP', 'Java', 'Python'], note: 'Frontends, backends, mobile interfaces and the services that connect them.' },
  { id: 'intelligence', tab: 'AI & automation', title: 'Making systems work intelligently.', items: ['Applied AI', 'Python', 'Google Apps Script', 'Google Workspace APIs', 'Workflow orchestration', 'Data processing'], note: 'Automation that connects forms, records, emails, documents and business processes.' },
  { id: 'infrastructure', tab: 'Data & tooling', title: 'Reliable foundations.', items: ['PostgreSQL', 'MongoDB', 'SQL', 'REST APIs', 'Git', 'GitHub', 'GitHub Actions'], note: 'Data models, integration surfaces, revision history and dependable release workflows.' },
  { id: 'security', tab: 'Security', title: 'Security as a systems concern.', items: ['Cybersecurity', 'DNS', 'SPF', 'DKIM', 'DMARC', 'SMTP', 'Sender reputation'], note: 'Authentication, configuration and resilient communications infrastructure.' },
] as const;

const protocols = [
  { key: 'SPF', sub: 'Who can send', desc: 'Define which servers are authorised to send email on behalf of a domain. It is an essential DNS-based signal for sender legitimacy.', number: '01 / SENDER POLICY' },
  { key: 'DKIM', sub: 'Message integrity', desc: 'Cryptographically sign outgoing messages so the receiving server can validate the signature and the sending domain.', number: '02 / MESSAGE SIGNATURE' },
  { key: 'DMARC', sub: 'Policy & alignment', desc: 'Align the visible From domain with authenticated sending domains, set policy and use reports to monitor abuse.', number: '03 / DOMAIN POLICY' },
] as const;

const record = [
  { value: '2016', unit: 'FIRST BUILDS', title: 'Started with the web', detail: 'An early interest in web development became a long-running practice of creating digital products and online platforms.' },
  { value: '100+', unit: 'DIGITAL PROJECTS', title: 'Websites & platforms', detail: 'A body of work spanning public websites, digital services and more structured operational systems.' },
  { value: '02', unit: 'INSTITUTIONAL SYSTEMS', title: 'Beyond a public website', detail: 'Developed MYCDIC’s official website and its dedicated internal platform for council operations and management.' },
  { value: 'UCLM', unit: 'ESI · COMPUTING', title: 'An academic foundation', detail: 'Computing at the Escuela Superior de Informática, with interests centred on AI, automation and intelligent systems.' },
] as const;

class SceneFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="orbit-fallback" aria-hidden="true" /> : this.props.children; }
}

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const remote = /^https?:\/\//.test(href);
  return <a className={className} href={href} target={remote ? '_blank' : undefined} rel={remote ? 'noopener noreferrer' : undefined}>{children}</a>;
}
function Eyebrow({ no, children }: { no: string; children: ReactNode }) {
  return <div className="eyebrow"><span>{no}</span><i aria-hidden="true" />{children}</div>;
}
function SectionHead({ no, kicker, title, description }: { no: string; kicker: string; title: ReactNode; description?: string }) {
  return <div className="section-head js-reveal"><div><Eyebrow no={no}>{kicker}</Eyebrow><h2>{title}</h2></div>{description && <p>{description}</p>}</div>;
}
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`js-reveal ${className}`}>{children}</div>;
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 15);
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => { document.body.classList.toggle('mobile-nav-open', open); return () => document.body.classList.remove('mobile-nav-open'); }, [open]);
  return <>
    <header className={`topbar ${scrolled ? 'topbar-scrolled' : ''}`}>
      <div className="topbar-inner container">
        <a href="#top" className="brand" aria-label="Moataz Kobry homepage"><span className="brand-mark">MK<span>.</span></span><span className="brand-text">MOATAZ KOBRY<small>COMPUTING / CYBER / AI</small></span></a>
        <nav className="desktop-links" aria-label="Main navigation">{nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        <div className="topbar-actions"><ExternalLink href={cvMailto} className="nav-contact">REQUEST CV <ArrowUpRight size={15} /></ExternalLink><button type="button" className="menu-toggle" onClick={() => setOpen(v => !v)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22}/>}</button></div>
      </div>
      <div className="reading-progress" aria-hidden="true"><span id="reading-progress-bar" /></div>
    </header>
    <AnimatePresence>{open && <motion.nav className="mobile-nav" aria-label="Mobile navigation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>{nav.map(([id,label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={17}/></a>)}<a href="#contact" onClick={()=>setOpen(false)}>Contact <ArrowUpRight size={17}/></a></motion.nav>}</AnimatePresence>
  </>;
}

function LivingOrb() {
  const [enabled, setEnabled] = useState(false);
  const reduce = !!useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      setEnabled(!!gl && window.matchMedia('(min-width: 970px)').matches);
    } catch { setEnabled(false); }
  }, [reduce]);
  return <div className="orb-layer" aria-hidden="true"><div className="orb-outline" />{enabled && <SceneFallback><Suspense fallback={null}><OrbScene /></Suspense></SceneFallback>}</div>;
}

function Hero() {
  return <section className="hero" id="top">
    <div className="hero-background" aria-hidden="true"/>
    <div className="container hero-grid">
      <div className="hero-left">
        <p className="hero-kicker"><span className="live-dot"/> SYSTEMS, SOFTWARE & THE INSTITUTIONS BEHIND THEM</p>
        <h1 className="hero-title" aria-label="Moataz Kobry"><span className="headline-mask"><span className="headline-line">MOATAZ</span></span><span className="headline-mask"><span className="headline-line name-second">KOBRY<span className="name-stop">.</span></span></span></h1>
        <div className="hero-divider" aria-hidden="true"><span /></div>
        <p className="hero-lead">I build <strong>digital systems</strong><br/> that hold up in the real world.</p>
        <p className="hero-description">Computing, AI automation, cybersecurity and official platforms. From the website people see to the systems that keep an institution running.</p>
        <div className="hero-buttons"><a href="#systems" className="button button-primary">EXPLORE THE WORK <ArrowUpRight size={19}/></a><ExternalLink href={cvMailto} className="button button-quiet">REQUEST MY CV <ArrowRight size={18}/></ExternalLink></div>
        <div className="hero-context"><span><i className="context-bar"/> BUILDING SINCE 2016</span><span>UCLM · ESI CIUDAD REAL</span></div>
      </div>
      <div className="hero-visual"><LivingOrb/><div className="hero-frame"><div className="portrait-surface"><img src={portrait} alt="Moataz Kobry in a formal suit, black-and-white portrait" fetchPriority="high" loading="eager" decoding="async"/></div><div className="frame-border"/><span className="frame-side-label">FIG. 01 / THE BUILDER</span><span className="frame-corner"/></div><div className="hero-visual-caption"><span>THE TECHNICAL WORK</span><strong>Computing × Applied AI</strong><span>THE BROADER VIEW</span></div></div>
    </div>
    <div className="container hero-bottom"><span>SCROLL TO EXPLORE</span><ArrowDown size={16}/><span className="horizontal-rule"/><span>SELECTED WORK / 2026</span></div>
  </section>;
}

function Stats() {
  return <div className="stats-band"><div className="container stats-grid"><div><strong>2016<span className="stat-slash">/</span></strong><small>WORKING WITH DIGITAL SYSTEMS SINCE</small></div><div><strong>100<span className="cyan">+</span></strong><small>WEBSITES & DIGITAL PLATFORMS</small></div><div><strong>02</strong><small>FLAGSHIP COUNCIL SYSTEMS DEVELOPED</small></div><div className="stat-last"><strong>UCLM</strong><small>ESI / COMPUTING & AI</small></div></div></div>;
}

function About() {
  return <section id="about" className="section container about-section"><SectionHead no="01" kicker="THE APPROACH" title={<>A systems mindset.<br/><span className="muted-heading">Not just a technology stack.</span></>}/><div className="about-grid"><Reveal><p className="large-paragraph">My work begins with a simple question: <em>what does this system need to make possible?</em></p></Reveal><Reveal><p>I develop software and digital infrastructure with equal attention to the people using it and the operations running behind it. That means connecting interfaces, data, automation, communications and verification into something dependable.</p><p>I study <strong>Computing at the Escuela Superior de Informática, Universidad de Castilla-La Mancha (UCLM)</strong>, with an interest in AI and automation. Outside university, I have developed more than a hundred digital websites and platforms since 2016.</p><ExternalLink href={links.president} className="text-link">THE INSTITUTIONAL SIDE OF MY WORK <ArrowUpRight size={17}/></ExternalLink></Reveal></div></section>;
}

function Architecture() {
  const [selected, setSelected] = useState(0);
  const node = layers[selected];
  return <section className="section section-systems" id="systems"><div className="container"><SectionHead no="02" kicker="SYSTEMS ARCHITECTURE" title={<>From input to <em>impact.</em></>} description="A strong digital platform is more than a homepage. The working parts have to connect, stay understandable and produce results."/>
    <Reveal className="architecture-wrap">
      <div className="architecture-toolbar"><div><span className="mini-label">SYSTEM MODEL / INTERACTIVE</span><h3>One ecosystem. Five layers.</h3></div><div className="architecture-status"><span className="live-dot"/> SELECT A LAYER TO EXPLORE</div></div>
      <div className="system-nodes" role="tablist" aria-label="System architecture layers">{layers.map((item,i)=><button type="button" role="tab" aria-selected={selected===i} aria-controls="layer-detail" onClick={()=>setSelected(i)} key={item.id} className={`system-node ${selected===i?'selected':''}`}><span className="node-meta"><b>{item.no}</b><ChevronRight size={17}/></span><strong>{item.title}</strong><span>{item.type}</span></button>)}</div>
      <div className="architecture-detail" id="layer-detail" role="tabpanel"><AnimatePresence mode="wait"><motion.div key={node.id} className="architecture-detail-inner" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-7}} transition={{duration:0.28,ease:'easeOut'}}><div className="detail-index">ACTIVE LAYER / {node.no}<span className="detail-pulse"/></div><div className="detail-copy"><h4>{node.short}</h4><p>{node.detail}</p></div><div className="detail-tags">{node.tags.map(tag=><span key={tag}>{tag}</span>)}</div></motion.div></AnimatePresence></div>
    </Reveal>
    <div className="case-grid">
      <Reveal className="case-card case-public"><div className="case-heading"><span className="mini-label">01 / LIVE DIGITAL PRESENCE</span><Globe2 size={23}/></div><div className="case-copy"><h3>The council’s<br/><em>public platform.</em></h3><p>I developed the official MYCDIC website, with the structure and systems behind its public-facing digital presence.</p><ExternalLink href={links.council} className="case-link">VISIT THE OFFICIAL WEBSITE <ArrowUpRight size={17}/></ExternalLink></div><div className="mock-browser" aria-label="Conceptual illustration of a public website"><div className="mock-bar"><i/><i/><i/><span>MYCDIC / WEB</span></div><div className="mock-content"><div className="mock-side"><span/><span/><span/></div><div className="mock-main"><b>PUBLIC PLATFORM</b><span/><span/><span className="mock-button"/></div></div></div></Reveal>
      <Reveal className="case-card case-operations"><div className="case-heading"><span className="mini-label">02 / INTERNAL DIGITAL INFRASTRUCTURE</span><Layers3 size={23}/></div><div className="case-copy"><h3>The system<br/><em>behind the work.</em></h3><p>I developed the council’s internal management platform to structure its operations, records and workflows in one connected environment.</p><span className="case-link muted-link">PLATFORM DEVELOPMENT / OPERATIONS</span></div><div className="mock-dashboard" aria-label="Conceptual illustration of a management system"><div className="dashboard-nav"><span/><span/><span/></div><div className="dashboard-body"><div className="dashboard-squares"><i/><i/><i/></div><div className="dashboard-chart"><span/><span/><span/><span/><span/><span/><span/></div></div></div></Reveal>
    </div>
  </div></section>;
}

function Expertise() {
  const [active, setActive] = useState(0);
  const current = stacks[active];
  return <section id="expertise" className="section container expertise-section"><SectionHead no="03" kicker="ENGINEERING ENVIRONMENT" title={<>Tools chosen for<br/><span className="muted-heading">the work at hand.</span></>} description="The stack spans applications, intelligent automation, databases and security. The point is making the parts work together."/>
    <Reveal className="stack-panel"><div className="stack-tabs" role="tablist" aria-label="Engineering skill groups">{stacks.map((group,i)=><button type="button" key={group.id} className={i===active?'active':''} role="tab" aria-selected={active===i} aria-controls="stack-detail" onClick={()=>setActive(i)}><span>0{i+1}</span>{group.tab}<ChevronRight size={15}/></button>)}</div><div className="stack-output" id="stack-detail" role="tabpanel"><AnimatePresence mode="wait"><motion.div key={current.id} initial={{opacity:0,x:22}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}} transition={{duration:.26}}><span className="mini-label">CAPABILITIES / {String(active+1).padStart(2,'0')}</span><h3>{current.title}</h3><p>{current.note}</p><div className="technology-pills">{current.items.map((item,i)=><motion.span key={item} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.32,delay:.025*i}}>{item}</motion.span>)}</div></motion.div></AnimatePresence><div className="stack-decor" aria-hidden="true"><span/><span/><span/><span/></div></div></Reveal>
    <div className="automation-grid"><Reveal className="automation-intro"><div className="icon-square"><Workflow size={27}/></div><span className="mini-label">GOOGLE / AUTOMATION</span><h3>Turning repetitive processes into reliable workflows.</h3><p>Google Apps Script and Workspace services are especially useful when a platform needs to move information between submissions, sheets, documents, mail and its internal records.</p></Reveal><Reveal className="automation-flow" ><div className="flow-heading"><span>WORKFLOW / EXAMPLE</span><span className="live-dot"/></div><div className="flow-row"><div><FileCode2 size={19}/><b>Forms & intake</b><small>Collect submissions</small></div><ArrowRight size={18}/><div><Database size={19}/><b>Sheets & records</b><small>Structure the data</small></div></div><div className="flow-row"><div><GitBranch size={19}/><b>Apps Script</b><small>Run process logic</small></div><ArrowRight size={18}/><div><Mail size={19}/><b>Docs & email</b><small>Produce the output</small></div></div><div className="flow-footer">GOOGLE WORKSPACE APIS <span>INTEGRATED OPERATIONS</span></div></Reveal></div>
  </section>;
}

function Record() {
  return <section id="record" className="section record-section"><div className="container"><SectionHead no="04" kicker="SELECTED TRACK RECORD" title={<>Built over time.<br/><em>Not overnight.</em></>} description="A mix of self-taught beginnings, extensive practical work and formal computing studies."/><div className="record-grid">{record.map((item,i)=><Reveal key={item.value} className="record-item"><div className="record-top"><span className="record-index">0{i+1}</span><span className="record-dot"/></div><strong className="record-value">{item.value}</strong><span className="record-unit">{item.unit}</span><h3>{item.title}</h3><p>{item.detail}</p></Reveal>)}</div></div></section>;
}

function Security() {
  const [selected, setSelected] = useState(0);
  const protocol = protocols[selected];
  return <section className="section security-section" id="security"><div className="container"><SectionHead no="05" kicker="SECURITY & COMMUNICATIONS" title={<>Trust is part of<br/><em>the architecture.</em></>} description="Security-minded development also includes the less visible infrastructure behind identity, email and domain reputation."/>
    <Reveal className="security-layout"><div className="security-left"><div className="security-symbol"><ShieldCheck size={38} strokeWidth={1.3}/><span>SECURE COMMUNICATIONS / 01</span></div><h3>Deliverability is an engineering problem.</h3><p>Well-configured sending domains need more than a working inbox. Authentication, alignment and responsible sending practices are part of a dependable communication system.</p><div className="security-small"><Check size={16}/> DNS configuration · identity signals · monitoring</div></div><div className="security-right"><div className="protocols" role="tablist" aria-label="Email authentication protocols">{protocols.map((p,i)=><button key={p.key} type="button" role="tab" aria-selected={selected===i} aria-controls="protocol-detail" className={selected===i?'selected':''} onClick={()=>setSelected(i)}>{p.key}<span>{p.sub}</span></button>)}</div><AnimatePresence mode="wait"><motion.div key={protocol.key} id="protocol-detail" role="tabpanel" className="protocol-detail" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.28}}><span className="mini-label">{protocol.number}</span><h4>{protocol.key}</h4><p>{protocol.desc}</p><div className="protocol-foot"><span><span className="status-dot"/> SENDER AUTHENTICATION</span><span>DOMAIN / EMAIL / TRUST</span></div></motion.div></AnimatePresence></div></Reveal>
  </div></section>;
}

function Perspective() {
  return <section id="perspective" className="section perspective-section"><div className="container"><SectionHead no="06" kicker="BEYOND THE CODE" title={<>Built with a wider<br/><em>field of view.</em></>} description="Technology is more useful when it understands the environment in which people and institutions operate."/><div className="perspective-layout"><Reveal className="institution-feature"><span className="mini-label">TECHNOLOGY × INSTITUTIONS</span><h3>One foot in engineering.<br/>One in institutional work.</h3><p>As Founder and President of MYCDIC, I bring a practical understanding of organisational needs to the way I design and develop digital infrastructure.</p><ExternalLink href={links.president} className="text-link">ABOUT MY ROLE AT MYCDIC <ArrowUpRight size={17}/></ExternalLink><div className="institution-orb" aria-hidden="true"><Globe2 size={155} strokeWidth={.45}/><span/><span/></div></Reveal><div className="perspective-secondary"><Reveal className="perspective-tile"><div className="tile-icon"><BookOpen size={22}/></div><span className="mini-label">KNOWLEDGE SYSTEMS</span><h3>Wikimedia ecosystem</h3><p>Wikipedia, Wikimedia and Wikidata work, structured public information and discoverability.</p></Reveal><Reveal className="perspective-tile"><div className="tile-icon"><Radar size={22}/></div><span className="mini-label">PUBLIC POSITIONING</span><h3>Media & digital presence</h3><p>PR support, relationships with media, institutional online visibility and cross-channel communications.</p></Reveal></div></div></div></section>;
}

function Contact() {
  return <section id="contact" className="section contact-section"><div className="container"><Reveal className="contact-panel"><div className="contact-orbit" aria-hidden="true"/><span className="mini-label">07 / OPEN CHANNEL</span><h2>Good work starts<br/>with a <em>conversation.</em></h2><p>Have a platform to build, an infrastructure problem to solve, or a reason to collaborate? You can reach me directly.</p><div className="contact-cta"><ExternalLink href={links.email} className="button button-primary">EMAIL ME <ArrowUpRight size={19}/></ExternalLink><ExternalLink href={cvMailto} className="button button-quiet">REQUEST CV <ArrowRight size={18}/></ExternalLink></div><div className="contact-email"><Mail size={17}/><span>president@mycdic.org</span></div></Reveal></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="container footer-inner"><a href="#top" className="footer-brand">MK<span>.</span><small>MOATAZ KOBRY</small></a><div className="footer-links"><ExternalLink href={links.github}>GITHUB <ArrowUpRight size={13}/></ExternalLink><ExternalLink href={links.linkedin}>LINKEDIN <ArrowUpRight size={13}/></ExternalLink><ExternalLink href={links.instagram}>INSTAGRAM <ArrowUpRight size={13}/></ExternalLink><ExternalLink href={links.president}>MYCDIC <ArrowUpRight size={13}/></ExternalLink></div><span className="footer-copy">COMPUTING / AI / SECURITY / INSTITUTIONS</span></div></footer>;
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const context = gsap.context(() => {
      gsap.fromTo('.hero-kicker, .hero-lead, .hero-description, .hero-buttons, .hero-context', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.105, ease: 'power3.out', delay: .16 });
      gsap.fromTo('.headline-line', { yPercent: 112 }, { yPercent: 0, duration: 1.15, stagger: .13, ease: 'power4.out', delay: .08 });
      gsap.fromTo('.hero-frame', { autoAlpha: 0, clipPath: 'inset(12% 0 100% 0)' }, { autoAlpha: 1, clipPath: 'inset(0% 0 0% 0%)', duration: 1.35, ease: 'power3.out', delay: .28 });
      gsap.fromTo('.hero-visual-caption', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .85, delay: 1.05 });
      const elements = gsap.utils.toArray<HTMLElement>('.js-reveal');
      elements.forEach((el) => gsap.fromTo(el, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 93%', once: true } }));
      gsap.fromTo('#reading-progress-bar', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: .25 } });
    }, rootRef);
    return () => context.revert();
  }, [reduced]);
  return <div ref={rootRef} className="app"><Navigation/><main><Hero/><Stats/><About/><Architecture/><Expertise/><Record/><Security/><Perspective/><Contact/></main><Footer/></div>;
}
