/* workflow-simulator / v3 — local demonstration; it never executes OS commands or makes network requests. */
(() => {
  'use strict';
  const root = document.getElementById('engineeringLab');
  if (!root) return;
  const one = (s) => root.querySelector(s);
  const all = (s) => [...root.querySelectorAll(s)];
  const t = (k) => window.siteI18n?.t(k) || k;
  const output = one('#termOutput'), input = one('#termInput'), form = one('#termForm');
  const screen = one('#terminalScreen'), badge = one('#labBadge');
  const buttons = all('[data-lab-scenario]'), nodes = all('.lab-node');
  const ui = {scenario:one('#labScenarioMetric'),retries:one('#labRetryMetric'),stage:one('#labStageMetric'),status:one('#labStatusMetric'),trace:one('#labTrace')};
  const runButton=one('#labRun'),stepButton=one('#labStep'),resetButton=one('#labReset');
  const modes=['normal','retry','missing','review'];
  const commands=['help','run','step','pause','reset','status','trace','logs','scenario','approve','clear','whoami','pwd','ls','cat','date','git','npm','sw_vers','uname','df','ps','top','docker','systemctl','uptime','echo'];
  const phases=[
    ['Intake', 'HTTP request accepted with synthetic reference DEMO-1042.'],
    ['Validate','Required fields validated; all values are mock data.'],
    ['Store','Record persisted to in-memory demo store.'],
    ['Queue','Delivery job written to simulated outbox.'],
    ['Deliver','HMAC-signed webhook delivery simulated successfully.'],
    ['Verify','Acknowledgement matched and trace closed.']
  ];
  let scenario='normal', position=0, retries=0, state='READY', stopped=false, waitingReview=false;
  let didFail=false, reviewApproved=false, timer=null, auto=false, entryHistory=[], commandHistory=[], commandIndex=0;
  let shell='mac', elapsedBase=0, elapsedStart=0, elapsedRunning=false;
  let pausedByUser=false;
  const elapsedNode=one('#labElapsed'), titleNode=one('#terminalTitle'), promptNode=one('#terminalPrompt');
  const formatDuration=(ms)=>{const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor((s%3600)/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
  const elapsedMS=()=>elapsedBase+(elapsedRunning?performance.now()-elapsedStart:0);
  const refreshTime=()=>{if(elapsedNode)elapsedNode.textContent=formatDuration(elapsedMS());};
  const stopwatchStart=()=>{if(!elapsedRunning){elapsedStart=performance.now();elapsedRunning=true;}refreshTime();};
  const stopwatchPause=()=>{if(elapsedRunning){elapsedBase+=performance.now()-elapsedStart;elapsedRunning=false;}refreshTime();};
  const stopwatchReset=()=>{stopwatchPause();elapsedBase=0;refreshTime();};
  const timestamp=()=>formatDuration(elapsedMS());
  setInterval(()=>{if(elapsedRunning)refreshTime();},200);
  function setShell(name){
    if(name!=='mac'&&name!=='linux')return;
    shell=name;
    root.dataset.terminalOs=name;
    titleNode.textContent=name==='mac'?'moataz@portfolio — zsh':'dev@ubuntu — bash';
    promptNode.innerHTML=name==='mac'?'<span>moataz@portfolio</span> ~ %':'<span>dev@ubuntu</span>:~/deployment$';
    all('[data-terminal-os]').forEach(tab=>{const yes=tab.dataset.terminalOs===name;tab.classList.toggle('active',yes);tab.setAttribute('aria-selected',String(yes));tab.tabIndex=yes?0:-1;});
    all('[data-linux-only]').forEach(b=>b.hidden=name!=='linux');
    all('[data-mac-only]').forEach(b=>b.hidden=name!=='mac');
    print(name==='mac'?'Switched to virtual macOS (zsh) session.':'Switched to virtual Ubuntu (bash) session.','accent');
  }

  function print(message, type='info', isEvent=false){
    const line=document.createElement('div'); line.className='term-line term-'+type;
    const stamp=document.createElement('span');stamp.className='term-stamp';stamp.textContent=timestamp();
    const body=document.createElement('span');body.className='term-message';body.textContent=message;
    line.append(stamp,body);output.appendChild(line);
    if(isEvent)entryHistory.push({type,message});
    while(output.childElementCount>100)output.firstElementChild?.remove();
    screen.scrollTop=screen.scrollHeight;
  }
  function promptEcho(text){ const line=document.createElement('div');line.className='term-command';const p=document.createElement('span');p.className='term-user';p.textContent=shell==='mac'?'moataz@portfolio ~ %':'dev@ubuntu:~/deployment$';const v=document.createElement('span');v.textContent=' '+text;line.append(p,v);output.appendChild(line);screen.scrollTop=screen.scrollHeight; }
  function halt(){auto=false;clearTimeout(timer);timer=null;stopwatchPause();}
  function render(){
    const complete=state==='COMPLETED', blocked=state==='BLOCKED';
    nodes.forEach((node,i)=>{
      node.classList.toggle('active',!complete&&!blocked&&i===position);
      node.classList.toggle('done',i<position);
      node.classList.toggle('retry',i===4&&didFail&&position===4);
    });
    ui.scenario.textContent=scenario.toUpperCase();ui.retries.textContent=String(retries).padStart(2,'0');
    ui.stage.textContent=String(Math.min(position,6)).padStart(2,'0')+' / 06';ui.status.textContent=state;
    ui.trace.style.width=(Math.min(position,6)/6*100)+'%';
    badge.textContent=state;badge.dataset.state=state;
    runButton.disabled=complete||blocked||waitingReview;
    stepButton.disabled=complete||blocked||waitingReview;
    buttons.forEach(b=>{const yes=b.dataset.labScenario===scenario;b.setAttribute('aria-pressed',String(yes));b.classList.toggle('is-active',yes);});
  }
  function reset({quiet=false}={}){
    halt(); position=0;retries=0;state='READY';stopped=false;waitingReview=false;reviewApproved=false;didFail=false;pausedByUser=false;entryHistory=[];stopwatchReset();
    render();if(!quiet)print('State reset. Scenario: '+scenario+'.','info');
  }
  function changeScenario(next){
    if(!modes.includes(next)){print('Unknown scenario. Valid: '+modes.join(', ')+'.','error');return false;}
    scenario=next;reset({quiet:true});print('Scenario loaded: '+next+'. Type run or step.','accent');render();return true;
  }
  function advance(){
    if(waitingReview){print('Manual approval required. Enter approve to continue.','warn');return false;}
    if(stopped){print('Simulation ended. Use reset or choose a scenario.','dim');return false;}
    if(position===1&&scenario==='missing'){
      print('VALIDATION_ERROR: verification record DEMO-1042 not found.','error',true);
      print('Stopped safely before storage or delivery.','warn',true);
      state='BLOCKED';stopped=true;halt();render();return false;
    }
    if(position===2&&scenario==='review'&&!waitingReview&&!reviewApproved){
      waitingReview=true;state='AWAITING REVIEW';halt();
      print('REVIEW_REQUIRED: record held for manual approval.','warn',true);
      print('Type approve to release the hold.','accent');render();return false;
    }
    if(position===4&&scenario==='retry'&&!didFail){
      didFail=true;retries+=1;state='RETRYING';
      print('DELIVERY_TIMEOUT: attempt 1 failed; job retained in outbox.','error',true);
      print('Retry scheduled with the same idempotency key.','warn',true);render();return true;
    }
    if(position===4&&didFail){ print('Retry attempt 2 accepted. Delivery recovered.','success',true);}
    else print(phases[position][0].toUpperCase()+'  '+phases[position][1], 'success', true);
    position++;
    state=position===6?'COMPLETED':auto?'RUNNING':'READY';
    if(position===6){stopped=true;halt();print('Trace complete · synthetic data · no network traffic.','accent',true);}
    render();return !stopped;
  }
  function loop(){
    if(!auto)return;
    timer=setTimeout(()=>{if(!auto)return;const cont=advance();if(cont&&auto)loop();},700);
  }
  function start(){
    if(waitingReview){print('Approve the review before continuing.','warn');return;}
    if(stopped){print('This run is closed. Use reset to replay.','warn');return;}
    halt();stopwatchStart();auto=true;state='RUNNING';render();print('Executing scenario '+scenario+' with synthetic job DEMO-1042.','accent');loop();
  }
  function manualStep(){halt();stopwatchStart();if(state==='RUNNING')state='PAUSED';advance();stopwatchPause();render();}
  function approve(){
    if(!waitingReview){print('No approval is pending.','dim');return;}
    waitingReview=false;reviewApproved=true;state='APPROVED';print('Operator approval recorded in local simulation.','success',true);render();
  }
  function status(){print('status='+state+'  scenario='+scenario+'  stage='+position+'/6  retries='+retries+'  elapsed='+formatDuration(elapsedMS())+'  events='+entryHistory.length,'accent');}
  function trace(){
    phases.forEach(([name],idx)=>print((idx<position?'✓':idx===position&&!stopped?'→':'·')+'  '+String(idx+1).padStart(2,'0')+'  '+name.toUpperCase(),idx<position?'success':idx===position?'accent':'dim'));
  }
  function help(){
    print('AVAILABLE COMMANDS  (demo shell; no operating-system access)','accent');
    [
      'help                  show this command list',
      'scenario <name>       normal | retry | missing | review',
      'run [name]            execute the current or named scenario',
      'step                  advance exactly one stage',
      'pause                 suspend automatic execution',
      'approve               release a manual-review hold',
      'status | trace | logs inspect current simulation',
      'reset | clear         restart scenario | clear console',
      'whoami | pwd | ls     virtual, read-only shell information',
      'macOS: git status | npm test | sw_vers | date',
      'Linux: uname -a | docker ps | df -h | systemctl status nginx',
      '↑ / ↓ / Tab           history / command completion'
    ].forEach(text=>print(text,'dim'));
  }
  function executeVirtual(action,args){
    const arg=args.join(' ').trim();
    const linux=shell==='linux';
    if(action==='date'){print('Browser local time: '+new Date().toLocaleString()+' (device clock)','dim');return true;}
    if(action==='echo'){print(args.join(' ').slice(0,180),'dim');return true;}
    if(action==='uptime'){print('demo session elapsed '+formatDuration(elapsedMS())+' · SYNTHETIC, NOT DEVICE UPTIME','dim');return true;}
    if(action==='git'){
      if(arg==='status'){print('On branch main  |  nothing to commit, working tree clean  [DEMO]','success');return true;}
      print('git: demo supports only git status','warn');return true;
    }
    if(action==='npm'){
      if(['test','run test'].includes(arg)){print('> portfolio-demo@1.0.0 test   [SIMULATED]','accent');print('✓ 28 passing checks · no tests were executed','success');return true;}
      print('npm: demo supports npm test only','warn');return true;
    }
    if(action==='sw_vers'){
      print(linux?'sw_vers: not available in virtual Ubuntu':'ProductName: macOS · DEMO shell (not real device details)','dim');return true;
    }
    if(action==='uname'){
      if(linux)print('Linux ubuntu-demo 6.8.0-demo x86_64 GNU/Linux  [SIMULATED]','accent');
      else print('Darwin macbook-demo 24.0.0 arm64  [SIMULATED]','accent');return true;
    }
    if(action==='df'){
      print('Filesystem       Size  Used  Avail  Use%  Mounted on  [MOCK DATA]','dim');
      print('/dev/demo         80G   12G    68G    15%  /','dim');return true;
    }
    if(action==='ps'||action==='top'){
      print('PID  COMMAND               CPU%  MEM%  [SIMULATED]','dim');
      print('101  portfolio-renderer     2.3   1.1','dim');
      print('102  mock-api-worker        0.7   0.6','dim');return true;
    }
    if(action==='docker'){
      if(arg==='ps'){print('CONTAINER ID   IMAGE         STATUS         PORTS  [SIMULATED]','dim');print('demo-091       mock-api      Up 00:04       3000/tcp','success');return true;}
      print('docker: demo supports docker ps only','warn');return true;
    }
    if(action==='systemctl'){
      if(arg==='status nginx'){print('● nginx.service - A simulated web server service','accent');print('   Active: active (running) [MOCK STATUS, NO SERVER CONNECTED]','success');return true;}
      print('systemctl: demo supports systemctl status nginx only','warn');return true;
    }
    return false;
  }
  function execute(raw,fromInput=true){
    const cmd=raw.trim().replace(/\s+/g,' ');
    if(!cmd)return;
    if(fromInput){promptEcho(cmd);commandHistory.push(cmd);commandIndex=commandHistory.length;}
    const [action,...args]=cmd.toLowerCase().split(' ');
    if(executeVirtual(action,args))return;
    switch(action){
      case 'help':help();break;
      case 'scenario':changeScenario(args[0]||'');break;
      case 'run':if(args.length&&!changeScenario(args[0]))break;start();break;
      case 'step':manualStep();break;
      case 'pause':halt();state=stopped?state:'PAUSED';render();print('Execution paused. Type run to continue.','warn');break;
      case 'approve':approve();break;
      case 'reset':reset();break;
      case 'status':status();break;
      case 'trace':trace();break;
      case 'logs':entryHistory.length?entryHistory.slice(-10).forEach(x=>print(x.message,x.type)):print('No events in the current trace.','dim');break;
      case 'clear':output.replaceChildren();print('Console cleared. State is unchanged.','dim');break;
      case 'whoami':print(shell==='mac'?'moataz  (virtual macOS identity)':'dev  (virtual Ubuntu identity)','accent');break;
      case 'pwd':print(shell==='mac'?'/Users/moataz/portfolio-demo  [VIRTUAL]':'/home/dev/deployment  [VIRTUAL]','dim');break;
      case 'ls':print(shell==='mac'?'README.md  package.json  src/  tests/  [VIRTUAL]':'deploy.sh  README.md  mock-api/  logs/  [VIRTUAL]','dim');break;
      case 'cat':args.join(' ')==='readme.md'?print('This local simulator models intake → validate → store → queue → deliver → verify. No data is sent.','dim'):print('cat: virtual file not found. Try cat README.md','error');break;
      default:print((shell==='mac'?'zsh':'bash')+': command not found: '+action+'. Type help for supported demo commands.','error');
    }
  }
  all('[data-terminal-os]').forEach(b=>b.addEventListener('click',()=>setShell(b.dataset.terminalOs)));
  form.addEventListener('submit',ev=>{ev.preventDefault();const cmd=input.value;input.value='';execute(cmd);input.focus();});
  input.addEventListener('keydown',ev=>{
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='l'){ev.preventDefault();execute('clear',false);return;}
    if(ev.ctrlKey&&ev.key.toLowerCase()==='c'){ev.preventDefault();halt();state='PAUSED';render();print('^C  Interrupted virtual simulation.','warn');return;}
    if(ev.key==='ArrowUp'||ev.key==='ArrowDown'){
      if(!commandHistory.length)return;ev.preventDefault();commandIndex=Math.max(0,Math.min(commandHistory.length,commandIndex+(ev.key==='ArrowUp'?-1:1)));
      input.value=commandHistory[commandIndex]||'';input.setSelectionRange(input.value.length,input.value.length);
    }else if(ev.key==='Tab'){
      const matching=commands.filter(c=>c.startsWith(input.value.trim().toLowerCase()));
      if(matching.length===1){ev.preventDefault();input.value=matching[0]+' ';}
    }
  });
  all('[data-command]').forEach(b=>b.addEventListener('click',()=>{execute(b.dataset.command);input.focus();}));
  buttons.forEach(b=>b.addEventListener('click',()=>changeScenario(b.dataset.labScenario)));
  runButton.addEventListener('click',start);stepButton.addEventListener('click',manualStep);resetButton.addEventListener('click',()=>reset());
  document.addEventListener('portfolio:locale',render);
  window.addEventListener('pagehide',halt);
  render();refreshTime();
  print('workflow-simulator v3 · macOS-inspired terminal · browser-only demo','accent');
  print('Nothing runs on your Mac. Type help, or try run retry.','dim');
  // Expose a minimal read-only status hook for QA. No commands can execute arbitrary JS or OS processes.
  window.__mkLabDebug=()=>({scenario,position,retries,state,entryCount:entryHistory.length,shell,elapsed:formatDuration(elapsedMS())});
})();
