import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, AtSign, BookOpen, Braces,
  Check, ChevronRight, CircleDot, Code2, Database,
  Github, Globe2, Linkedin,
  Mail, Menu, MonitorSmartphone, Radio, Send, ServerCog,
  ShieldCheck, Workflow, X
} from 'lucide-react';
import { architecture, cvMailto, connections, mailLayers, stack } from './data/portfolio';

const CyberScene = lazy(() => import('./components/CyberScene'));
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="three-fallback" /> : this.props.children; }
}
const base = import.meta.env.BASE_URL;

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return <div className="eyebrow"><span className="eyebrow-index">{index}</span><span className="eyebrow-divider" />{children}</div>;
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.14 }} transition={{ duration: 0.64, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}

function External({ children, href, className = '' }: { children: ReactNode; href: string; className?: string }) {
  return <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}>{children}</a>;
}

const navigation = [
  ['about', 'About'],
  ['systems', 'Systems'],
  ['expertise', 'Expertise'],
  ['experience', 'Experience'],
  ['contact', 'Contact']
] as const;

function Navigation() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.classList.toggle('menu-open', open); return () => document.body.classList.remove('menu-open'); }, [open]);
  return <header className="site-header">
    <div className="site-header-inner wrap">
      <a className="brand" href="#top" aria-label="Moataz Kobry home"><span className="brand-symbol">M<span>.</span>K</span><span className="brand-wordmark">MOATAZ KOBRY<small>CYBER & AI SYSTEMS</small></span></a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navigation.map(([id, label]) => <a href={'#' + id} key={id}>{label}</a>)}
      </nav>
      <div className="nav-end"><External className="nav-cv" href={cvMailto}>Request CV <ArrowUpRight size={16}/></External><button type="button" className="mobile-menu" onClick={() => setOpen(v => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>
    </div>
    <AnimatePresence>{open && <motion.nav className="mobile-nav" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} aria-label="Mobile navigation">{navigation.map(([id,label])=><a key={id} href={'#'+id} onClick={()=>setOpen(false)}>{label}<ArrowUpRight size={16}/></a>)}<External href={cvMailto} className="mobile-cta">Request CV<ArrowUpRight size={16}/></External></motion.nav>}</AnimatePresence>
  </header>;
}

function Hero() {
  const reduce = useReducedMotion();
  return <section className="hero" id="top">
    <div className="hero-radial" aria-hidden="true" />
    <div className="wrap hero-layout">
      <div className="hero-copy">
        <motion.div className="signal-line" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{duration:.65}}><span className="signal-dot" /> <span>BUILDING SINCE 2016</span><span className="signal-slash">/</span><span>COMPUTING • AI • SYSTEMS</span></motion.div>
        <motion.div initial={reduce?false:{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.85,delay:.08}}>
          <h1 className="hero-title"><span className="hero-title-small">THE WORK OF</span><span className="hero-name">MOATAZ <em>KOBRY</em><span className="name-dot">.</span></span></h1>
          <p className="hero-statement">I design digital systems <span>that work beyond the interface.</span></p>
          <p className="hero-description">Computing, AI automation, cybersecurity and institutional platforms. I build the technical foundations behind public-facing websites, operational workflows and trusted digital communications.</p>
        </motion.div>
        <motion.div className="hero-actions" initial={reduce?false:{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.23}}>
          <a href="#systems" className="button button-primary">Explore my work <ArrowUpRight size={18}/></a>
          <External href={cvMailto} className="button button-outline">Request my CV <ArrowRight size={18}/></External>
        </motion.div>
        <div className="hero-micro"><span><CircleDot size={13}/> UCLM · ESI CIUDAD REAL</span><span><Globe2 size={13}/> MADRID · INTERNATIONAL</span></div>
      </div>
      <div className="hero-media" aria-label="Moataz Kobry portrait with three-dimensional Cyber and AI visualization">
        <div className="hero-mesh" aria-hidden="true">{reduce ? <div className="three-fallback"/> : <SceneBoundary><Suspense fallback={<div className="three-fallback"/>}><CyberScene /></Suspense></SceneBoundary>}</div>
        <div className="photo-ambient" aria-hidden="true" />
        <div className="portrait-frame"><div className="portrait-inner"><img src={`${base}moataz-photo.png`} alt="Moataz Kobry, formal black-and-white portrait" loading="eager"/></div><span className="portrait-index">01 / PROFILE</span><span className="portrait-edge"/></div>
        <div className="orbit-caption"><span className="tiny-square"/> ENGINEERING THINKING <span>×</span> INSTITUTIONAL SCALE</div>
      </div>
    </div>
    <div className="hero-bottom wrap"><span>SCROLL TO EXPLORE</span><ArrowDown size={15}/><span className="hero-bottom-rule"/><span>PORTFOLIO / 2026</span></div>
  </section>;
}

function TrackStrip() {
  return <div className="strip-wrap"><div className="wrap metrics-strip">
    <div className="metric"><strong>2016<span className="metric-mark">/</span></strong><span>IN TECHNOLOGY SINCE</span></div>
    <div className="metric"><strong>100<span className="metric-plus">+</span></strong><span>DIGITAL WEBSITES & PLATFORMS</span></div>
    <div className="metric"><strong>02</strong><span>FLAGSHIP INSTITUTIONAL SYSTEMS</span></div>
    <div className="metric metric-last"><strong>UCLM</strong><span>ESI · COMPUTING & AI</span></div>
  </div></div>;
}

function About() {
  return <section className="section about-section wrap" id="about">
    <Reveal><SectionLabel index="01">INTRODUCTION</SectionLabel><div className="about-grid"><h2 className="section-title section-title-large">Technology is the craft.<br/><span className="text-muted">Systems are the work.</span></h2><div className="about-body"><p>My work sits between computing, automation and the realities of running institutions. I write software, connect services and design platforms with attention to reliability, clarity and long-term use.</p><p>I study <strong>Computing at UCLM’s Escuela Superior de Informática</strong>, with a focus on artificial intelligence and automation, while building and maintaining practical digital projects beyond the classroom.</p><External href={connections.president} className="inline-link">The institutional side of my work <ArrowUpRight size={17}/></External></div></div></Reveal>
  </section>;
}

function Systems() {
  const [active, setActive] = useState(0);
  const item = architecture[active];
  return <section className="section system-section" id="systems"><div className="wrap">
    <Reveal><div className="section-topline"><SectionLabel index="02">SYSTEMS & ARCHITECTURE</SectionLabel><span className="section-reference">DESIGN / DEVELOP / OPERATE</span></div><div className="section-heading-grid"><h2 className="section-title">Built for real<br/><em>operations.</em></h2><p className="section-intro">A digital platform only works when its interfaces, data, automation and validation hold together. This is how I approach the systems behind the screen.</p></div></Reveal>
    <Reveal className="architecture-panel" delay={.08}>
      <div className="architecture-panel-top"><div><span className="mono label-sub">SYSTEM MODEL / INTERACTIVE</span><h3>From request to result.</h3></div><div className="panel-state"><span className="signal-dot"/> SELECT A LAYER</div></div>
      <div className="architecture-nodes" role="tablist" aria-label="System architecture components">{architecture.map((node,index)=><button type="button" role="tab" aria-selected={active===index} className={`architecture-node ${active===index?'is-active':''}`} key={node.id} onClick={()=>setActive(index)}><span className="architecture-node-top"><span>{node.number}</span><ChevronRight size={17}/></span><strong>{node.title}</strong><small>{node.sub}</small></button>)}</div>
      <AnimatePresence mode="wait"><motion.div key={item.id} className="architecture-detail" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.24}}><div className="detail-index">NODE_{item.number}<span className="detail-square"/></div><div className="detail-body"><h4>{item.title}</h4><p>{item.detail}</p></div><div className="detail-tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div></motion.div></AnimatePresence>
    </Reveal>
    <div className="project-grid">
      <Reveal className="project-card"><div className="project-top"><span>01 / DIGITAL PLATFORM</span><Globe2 size={24}/></div><div className="project-art project-art-web"><div className="fake-browser"><div className="fake-browser-bar"><span/><span/><span/><b>WWW.MYCDIC.ORG</b></div><div className="fake-browser-content"><i>MYCDIC</i><b>Institutional digital presence</b><p>PUBLIC COMMUNICATIONS · STRUCTURED CONTENT</p><div className="browser-lines"><span/><span/><span/></div></div></div></div><div className="project-details"><h3>Official Council Website</h3><p>Designed and developed the official public website, bringing institutional content, communications and digital workflows into a coherent experience.</p><div className="tagline"><Pill>Public-facing</Pill><Pill>Web systems</Pill><Pill>Content architecture</Pill></div><External href="https://www.mycdic.org/" className="project-link">Visit platform <ArrowUpRight size={17}/></External></div></Reveal>
      <Reveal className="project-card" delay={.1}><div className="project-top"><span>02 / INTERNAL SYSTEM</span><ServerCog size={24}/></div><div className="project-art project-art-admin"><div className="fake-dashboard"><div className="dashboard-sidebar"><span/><span/><span/><span/><span/></div><div className="dashboard-body"><div className="dashboard-line"/><div className="dashboard-row"><span/><span/><span/></div><div className="dashboard-table"><span/><span/><span/><span/></div></div></div></div><div className="project-details"><h3>Institutional Management Platform</h3><p>Built an internal platform for council operations and management, supporting structured records, institutional workflows and administrative processes.</p><div className="tagline"><Pill>Management systems</Pill><Pill>Automation</Pill><Pill>Operations</Pill></div><External href={connections.president} className="project-link">Institutional context <ArrowUpRight size={17}/></External></div></Reveal>
    </div>
  </div></section>;
}

const categories = Object.keys(stack) as (keyof typeof stack)[];
const categoryIcons = [<Braces size={21}/>, <Code2 size={21}/>, <ServerCog size={21}/>, <MonitorSmartphone size={21}/>, <Database size={21}/>, <Workflow size={21}/>];

function Expertise() {
  const [selected, setSelected] = useState<keyof typeof stack>('Languages');
  return <section className="section expertise-section wrap" id="expertise">
    <Reveal><div className="section-topline"><SectionLabel index="03">TOOLKIT & EXPERTISE</SectionLabel><span className="section-reference">PRACTICAL ENGINEERING STACK</span></div><div className="section-heading-grid"><h2 className="section-title">A toolkit for<br/><em>execution.</em></h2><p className="section-intro">Languages, frameworks and services are selected for the job: accessible interfaces, back-end logic, reliable databases, integrated workflows and maintainable systems.</p></div></Reveal>
    <Reveal className="stack-console"><div className="stack-console-left"><div className="stack-top"><span className="mono label-sub">TECHNOLOGY INDEX</span><span className="stack-version">STACK.V10</span></div><div className="stack-categories" role="tablist" aria-label="Technology categories">{categories.map((category,index)=><button type="button" role="tab" aria-selected={selected===category} className={selected===category?'active':''} onClick={()=>setSelected(category)} key={category}>{categoryIcons[index]}<span>{category}</span><ArrowUpRight size={14}/></button>)}</div></div><div className="stack-console-right"><span className="mono label-sub">SELECTED CATEGORY / {categories.indexOf(selected)+1} OF {categories.length}</span><AnimatePresence mode="wait"><motion.div key={selected} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.18}}><h3>{selected}</h3><div className="stack-tags">{stack[selected].map((tool,index)=><span key={tool} style={{animationDelay:`${index*70}ms`}}>{tool}<span className="stack-tag-plus">↗</span></span>)}</div></motion.div></AnimatePresence><div className="stack-footer"><CircleDot size={15}/> Built around real workflows, not skill percentages.</div></div></Reveal>
    <Reveal className="google-panel"><div className="google-icon"><Workflow size={29}/></div><div className="google-copy"><span className="mono label-sub">AUTOMATION / GOOGLE ECOSYSTEM</span><h3>Google Apps Script & Workspace</h3><p>Form intake, structured registers, Drive files, document generation, Gmail workflows and Google APIs connected to operational platforms.</p><div className="google-tags"><Pill>Apps Script</Pill><Pill>Sheets</Pill><Pill>Drive</Pill><Pill>Gmail</Pill><Pill>Docs</Pill><Pill>Forms</Pill></div></div><div className="google-circuit" aria-hidden="true"><div className="circuit-orbit"><span>G</span></div><i/><i/><i/></div></Reveal>
  </section>;
}

function Experience() {
  return <section className="section experience-section" id="experience"><div className="wrap">
    <Reveal><div className="section-topline"><SectionLabel index="04">EXPERIENCE</SectionLabel><span className="section-reference">CONTINUITY / RESPONSIBILITY / DELIVERY</span></div><div className="section-heading-grid"><h2 className="section-title">A record of<br/><em>building.</em></h2><p className="section-intro">The technology changes. The work remains: understand the problem, deliver a coherent system and keep improving it as real needs evolve.</p></div></Reveal>
    <div className="timeline"><Reveal className="timeline-item"><div className="timeline-number">2016<span>.</span></div><div className="timeline-content"><h3>Starting with the web</h3><p>Beginning a sustained path in website development, digital products and technical problem-solving.</p></div></Reveal><Reveal className="timeline-item"><div className="timeline-number">100<span>+</span></div><div className="timeline-content"><h3>Websites and digital platforms</h3><p>A growing portfolio of practical web work across public-facing experiences, integrations and operational needs.</p></div></Reveal><Reveal className="timeline-item"><div className="timeline-number">02<span>×</span></div><div className="timeline-content"><h3>Official institutional systems</h3><p>Development of the council’s official website and its internal platform for management and operations.</p></div></Reveal><Reveal className="timeline-item"><div className="timeline-number">AI<span>/</span></div><div className="timeline-content"><h3>Computing & applied automation</h3><p>Work in artificial intelligence, automation, secure communications and infrastructure, alongside Computing studies at UCLM ESI.</p></div></Reveal></div>
  </div></section>;
}

function Security() {
  const [selected, setSelected] = useState('DMARC');
  const layer = mailLayers.find(l=>l.id===selected) ?? mailLayers[2];
  return <section className="section security-section wrap" id="security"><Reveal><div className="section-topline"><SectionLabel index="05">CYBERSECURITY & EMAIL INFRASTRUCTURE</SectionLabel><span className="section-reference">SECURE SYSTEMS / TRUSTED COMMS</span></div><div className="section-heading-grid"><h2 className="section-title">Security is<br/><em>in the details.</em></h2><p className="section-intro">Security-aware development extends from code and process design to authentication, domain configuration, sender reputation and reliable message delivery.</p></div></Reveal>
    <Reveal className="security-console"><div className="security-console-heading"><div className="shield-block"><ShieldCheck size={30}/></div><div><span className="mono label-sub">EMAIL AUTHENTICATION / TECHNICAL LAYERS</span><h3>Deliverability infrastructure</h3></div><span className="security-caption">SELECT TO EXPLORE</span></div><div className="mail-protocols" role="tablist" aria-label="Email security layers">{mailLayers.map(layer=><button key={layer.id} type="button" role="tab" aria-selected={selected===layer.id} className={selected===layer.id?'selected':''} onClick={()=>setSelected(layer.id)}><ShieldCheck size={18}/>{layer.id}<span>{selected===layer.id?<Check size={16}/>:<ChevronRight size={16}/>}</span></button>)}</div><AnimatePresence mode="wait"><motion.div key={layer.id} className="protocol-detail" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.2}}><span className="protocol-code">{layer.id} / CONFIGURATION PRINCIPLE</span><h4>{layer.title}</h4><p>{layer.copy}</p></motion.div></AnimatePresence></Reveal>
  </section>;
}

function Institutional() {
  return <section className="section institutional-section"><div className="wrap"><Reveal><div className="section-topline"><SectionLabel index="06">BEYOND THE CODE</SectionLabel><span className="section-reference">TECHNOLOGY × INSTITUTIONS</span></div><div className="section-heading-grid"><h2 className="section-title">Technical work.<br/><em>Wider context.</em></h2><p className="section-intro">A significant part of my work sits where technology meets institutional communications, international cooperation and public-facing digital presence.</p></div></Reveal><div className="institutional-grid"><Reveal className="institution-card institution-feature"><div className="institution-graphic"><div className="institution-globe"/><span className="institution-coordinates">INSTITUTIONAL / GLOBAL</span></div><div className="institution-body"><span className="mono label-sub">MYCDIC / LEADERSHIP</span><h3>Technology built with an institutional perspective.</h3><p>As founder and president of MYCDIC, I connect the technical and organizational dimensions of digital projects, from public platforms to day-to-day institutional operations.</p><External className="project-link" href={connections.president}>Institutional profile <ArrowUpRight size={17}/></External></div></Reveal><div className="institution-small-stack"><Reveal className="institution-card small"><div className="institution-small-top"><BookOpen size={22}/><span className="mono label-sub">KNOWLEDGE SYSTEMS</span></div><h3>Wikimedia ecosystem</h3><p>Wikipedia, Wikimedia and Wikidata. Structured information, public knowledge and digital discoverability.</p></Reveal><Reveal className="institution-card small" delay={.1}><div className="institution-small-top"><Radio size={23}/><span className="mono label-sub">COMMUNICATIONS</span></div><h3>PR & media relations</h3><p>Public positioning, digital presence and communications that connect organizations with wider audiences.</p></Reveal></div></div></div></section>;
}

function Contact() {
  return <section className="contact-section" id="contact"><div className="wrap"><Reveal className="contact-shell"><div className="contact-background"/><div className="contact-content"><SectionLabel index="07">LET'S CONNECT</SectionLabel><h2>Have a system<br/>worth <em>building?</em></h2><p>Available for conversations around computing, AI automation, cybersecurity, official digital platforms and institutional technology.</p><div className="contact-actions"><External className="button button-primary" href={cvMailto}>Request my CV <ArrowUpRight size={18}/></External><External className="button button-outline" href={connections.email}>Send an email <Mail size={18}/></External></div></div><div className="contact-address"><AtSign size={17}/><span>president@mycdic.org</span></div></Reveal></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="wrap footer-inner"><div className="footer-identity"><span className="brand-symbol">M<span>.</span>K</span><span>MOATAZ KOBRY<small>COMPUTING / AI / SYSTEMS</small></span></div><div className="footer-links"><External href={connections.github}><Github size={17}/> GitHub</External><External href={connections.linkedin}><Linkedin size={17}/> LinkedIn</External><External href={connections.instagram}><Globe2 size={17}/> Instagram</External><External href={connections.email}><Send size={17}/> Email</External></div><span className="footer-credit">© {new Date().getFullYear()} MOATAZ KOBRY</span></div></footer>;
}

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 24, restDelta: .001 });
  return <div className="app-shell"><motion.div className="scroll-progress" style={{ scaleX }} /><Navigation/><main><Hero/><TrackStrip/><About/><Systems/><Expertise/><Experience/><Security/><Institutional/><Contact/></main><Footer/></div>;
}
