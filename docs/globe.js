/**
 * Interactive geographic globe. WebGL rendering is self-hosted and has no CDN dependency.
 * Texture: local equirectangular illustration bundled with the website.
 * Institutional markers are contextual locations, not real-time activity data.
 */
(() => {
  'use strict';
  const stage = document.querySelector('.globe-stage');
  const canvas = document.getElementById('globeCanvas');
  if (!stage || !canvas) return;

  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const locations = [
    {id:'madrid',label:'Madrid',sub:'MYCDIC headquarters',lat:40.4168,lng:-3.7038},
    {id:'rabat',label:'Rabat',sub:'Morocco national office',lat:34.0209,lng:-6.8416},
    {id:'brussels',label:'Brussels',sub:'International office',lat:50.8503,lng:4.3517},
    {id:'ciudad-real',label:'Ciudad Real',sub:'UCLM · Escuela Superior de Informática',lat:38.9848,lng:-3.9274}
  ];
  const edges = [[0,1],[0,2]]; // conceptual links, not travel or operational routing
  const status = stage.querySelector('[data-globe-status]');
  const tr=k=>window.siteI18n?.t(k)||k;
  const contextKey={'madrid':'locationMadrid','rabat':'locationRabat','brussels':'locationBrussels','ciudad-real':'locationCiudadReal'};
  let statusKey='';
  const currentPlace = stage.querySelector('[data-globe-place]');
  const currentContext = stage.querySelector('[data-globe-context]');
  const playButton = document.getElementById('globeMotionToggle');
  const zoomPlus = document.getElementById('globeZoomIn');
  const zoomMinus = document.getElementById('globeZoomOut');
  const resetButton = document.getElementById('globeReset');
  const pointButtons = [...stage.querySelectorAll('[data-globe-location]')];
  let auto = !reducedMedia.matches;
  let visible = true;
  let yaw = -.08, tilt = .25, distance = 3.45;
  let velocity = 0;
  let raf = 0;
  let last = 0;
  let active = 0;
  let dragging = false;
  let dragMoved = false;
  let lastPointer = {x:0,y:0};
  let interactionUntil = 0;
  let spinTarget = null;
  const pointers = new Map();
  let pinchPrevious = null;
  let gl = null;
  let program = null;
  let lineProgram = null;
  let pointProgram = null;
  let meshBuffer = null;
  let idxBuffer = null;
  let pointBuffer = null;
  let texture = null;
  let indexCount = 0;
  let lineBuffer = null;
  let lineCount = 0;
  let spotsBuffer = null;
  let spotCount = 0;
  let frameCount = 0;
  let pixelRatio = 1;
  let cssWidth = 400;
  let cssHeight = 400;
  let failed = false;
  let render = () => {};
  let start = () => {}; // Assigned after the WebGL renderer is initialized.
  const identity = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

  function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
  function setStatus(text){statusKey=text;if(status)status.textContent=text;}
  function localizeGlobe(){labelLocation(locations[active]);updateButton();if(status&&statusKey==='INTERACTIVE WEBGL · DRAG TO ROTATE')status.textContent=tr('globeStatusWebGL');if(status&&statusKey==='STATIC VIEW · WEBGL NOT AVAILABLE')status.textContent=tr('globeStatusFallback');}
  document.addEventListener('portfolio:locale',localizeGlobe);
  function labelLocation(loc){
    if(!loc)return;
    currentPlace && (currentPlace.textContent=loc.label);
    currentContext && (currentContext.textContent=tr(contextKey[loc.id]));
    pointButtons.forEach(btn=>{
      const on=btn.dataset.globeLocation===loc.id;
      btn.classList.toggle('is-selected',on);
      btn.setAttribute('aria-pressed',String(on));
    });
  }
  function point(lat,lng,r=1.015){
    const la=lat*Math.PI/180,lo=lng*Math.PI/180;
    return [r*Math.cos(la)*Math.sin(lo),r*Math.sin(la),r*Math.cos(la)*Math.cos(lo)];
  }
  function rotated(p){
    const [x,y,z]=p,cx=Math.cos(tilt),sx=Math.sin(tilt),cy=Math.cos(yaw),sy=Math.sin(yaw);
    const yy=y*cx-z*sx,zz=y*sx+z*cx;
    return [x*cy+zz*sy,yy,-x*sy+zz*cy];
  }
  function viewPosition(pos){
    const q=rotated(pos),z=distance-q[2],scale=1/Math.tan(42*Math.PI/360);
    return [(q[0]*scale/(cssWidth/cssHeight))/z, (q[1]*scale)/z, q[2]];
  }
  function choose(i,fly=true){
    active=i;labelLocation(locations[i]);
    if(fly){
      const target=-locations[i].lng*Math.PI/180;
      const shortest=target-yaw;
      const wrapped=((shortest+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
      spinTarget=yaw+wrapped;
      interactionUntil=performance.now()+5000;
    }
    render();
  }
  function updateButton(){
    if(playButton){playButton.textContent=auto?tr('globePause'):tr('globePlay');playButton.setAttribute('aria-pressed',String(auto));}
  }
  function pauseOrPlay(){auto=!auto;spinTarget=null;updateButton();if(auto)start();render();}
  playButton?.addEventListener('click',pauseOrPlay);
  zoomPlus?.addEventListener('click',()=>{distance=clamp(distance-.36,2.65,5.6);interactionUntil=performance.now()+2400;render();});
  zoomMinus?.addEventListener('click',()=>{distance=clamp(distance+.36,2.65,5.6);interactionUntil=performance.now()+2400;render();});
  resetButton?.addEventListener('click',()=>{yaw=-.08;tilt=.25;distance=3.45;spinTarget=null;velocity=0;choose(0,false);interactionUntil=performance.now()+1700;render();});
  pointButtons.forEach(btn=>btn.addEventListener('click',()=>{const idx=locations.findIndex(x=>x.id===btn.dataset.globeLocation);if(idx>=0)choose(idx);}));

  // Leave an accessible still illustration if WebGL is unavailable.
  try {
    gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false}) ||
      canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if(!gl)throw Error('WebGL unavailable');
    const vertex=`
      attribute vec3 aPosition;
      attribute vec2 aUV;
      uniform float uYaw;
      uniform float uTilt;
      uniform float uDistance;
      uniform float uAspect;
      uniform float uSize;
      varying vec2 vUV;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main(){
        float sx=sin(uTilt),cx=cos(uTilt),sy=sin(uYaw),cy=cos(uYaw);
        vec3 p=vec3(aPosition.x,aPosition.y*cx-aPosition.z*sx,aPosition.y*sx+aPosition.z*cx);
        p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
        vUV=aUV;vNormal=normalize(p);vPos=p;
        float z=uDistance-p.z;
        float focal=2.65;
        gl_Position=vec4(p.x*focal/uAspect,p.y*focal,z*1.01005-.201005,z);
        gl_PointSize=uSize*min(2.0,3.25/z);
      }
    `;
    const fragment=`
      precision mediump float;
      varying vec2 vUV;
      varying vec3 vNormal;
      varying vec3 vPos;
      uniform sampler2D uMap;
      void main(){
        vec3 tex=texture2D(uMap,vUV).rgb;
        float light=max(.0,dot(normalize(vNormal),normalize(vec3(-.33,.51,.78))));
        float shade=.44+.56*light;
        vec3 color=tex*shade;
        float rim=pow(1.0-max(0.0,dot(normalize(vNormal),vec3(0.,0.,1.))),3.2);
        color+=vec3(.42,.30,.16)*rim*.27;
        gl_FragColor=vec4(color,1.0);
      }
    `;
    const flatFragment=`
      precision mediump float;
      uniform vec4 uColor;
      void main(){gl_FragColor=uColor;}
    `;
    const pointFragment=`
      precision mediump float;
      uniform vec4 uColor;
      void main(){
        float radial=length(gl_PointCoord-vec2(.5));
        if(radial>.5)discard;
        gl_FragColor=uColor;
      }
    `;
    const getShader=(type,source)=>{
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const getProgram=(vs,fs)=>{
      const prog=gl.createProgram();gl.attachShader(prog,getShader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,getShader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
      return prog;
    };
    program=getProgram(vertex,fragment);
    lineProgram=getProgram(vertex,flatFragment);
    pointProgram=getProgram(vertex,pointFragment);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0,0,0,0);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([11,24,35,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    // Physically independent local artwork. Its browser URL resolves inside /docs.
    const image=new Image();
    image.onload=()=>{
      if(!gl)return;
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      // Non-POT maps are supported with clamp/linear above.
      stage.dataset.texture='loaded';render();
    };
    image.onerror=()=>{stage.dataset.texture='missing';};
    image.src=window.__V21_EARTH_PREVIEW_DATA_URL || new URL('./assets/img/earth-texture.webp',document.baseURI).href;

    const vertices=[],indices=[];
    const latitudeSteps=96,longitudeSteps=192;
    for(let y=0;y<=latitudeSteps;y++){
      const lat=(.5-y/latitudeSteps)*Math.PI;
      for(let x=0;x<=longitudeSteps;x++){
        const u=x/longitudeSteps,lon=(u-.5)*Math.PI*2;
        const p=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
        vertices.push(...p,u,1-y/latitudeSteps);
      }
    }
    for(let y=0;y<latitudeSteps;y++)for(let x=0;x<longitudeSteps;x++){
      const a=y*(longitudeSteps+1)+x,b=a+longitudeSteps+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
    indexCount=indices.length;
    meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    idxBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idxBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);

    // Elevate two arcs slightly above the sphere. Routes are visual context only.
    const lineVertices=[];
    edges.forEach(([a,b])=>{
      const pa=point(locations[a].lat,locations[a].lng,1.013),pb=point(locations[b].lat,locations[b].lng,1.013);
      const steps=60;
      let prev=pa;
      for(let j=1;j<=steps;j++){
        const t=j/steps;
        const dir=pa.map((p,k)=>p*(1-t)+pb[k]*t);
        const norm=Math.hypot(...dir);
        const alt=1.014+.14*Math.sin(Math.PI*t);
        const curr=dir.map(p=>p*alt/norm);
        lineVertices.push(...prev,0,0,...curr,0,0);
        prev=curr;
      }
    });
    lineCount=lineVertices.length/5;
    lineBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lineVertices),gl.STATIC_DRAW);
    const spots=[];
    locations.forEach(l=>spots.push(...point(l.lat,l.lng,1.035),0,0));
    spotCount=spots.length/5;
    spotsBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,spotsBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(spots),gl.STATIC_DRAW);

    canvas.classList.add('is-active');
    canvas.tabIndex=0;
    canvas.setAttribute('aria-label','Interactive 3D Earth. Drag to rotate; scroll or use buttons to zoom; arrow keys rotate.');
    stage.classList.add('has-webgl-v21');stage.dataset.renderer='webgl';
    setStatus('INTERACTIVE WEBGL · DRAG TO ROTATE');status.textContent=tr('globeStatusWebGL');
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      cssWidth=Math.max(80,rect.width);cssHeight=Math.max(80,rect.height);
      pixelRatio=Math.min(devicePixelRatio||1,1.65);
      canvas.width=Math.round(cssWidth*pixelRatio);canvas.height=Math.round(cssHeight*pixelRatio);
      gl.viewport(0,0,canvas.width,canvas.height);
      render();
    };
    const ro=new ResizeObserver(resize);ro.observe(stage);resize();
    function uniforms(prog,size=1){
      gl.useProgram(prog);
      const val=(key,v)=>gl.uniform1f(gl.getUniformLocation(prog,key),v);
      val('uYaw',yaw);val('uTilt',tilt);val('uDistance',distance);val('uAspect',cssWidth/cssHeight);val('uSize',size*pixelRatio);
      const attr=gl.getAttribLocation(prog,'aPosition');
      const uv=gl.getAttribLocation(prog,'aUV');
      gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,20,0);
      if(uv>=0){gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);}
    }
    function renderFrame(){
      if(!gl||failed)return;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.BLEND);
      gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idxBuffer);
      uniforms(program);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(gl.getUniformLocation(program,'uMap'),0);
      gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
      uniforms(lineProgram);
      gl.uniform4f(gl.getUniformLocation(lineProgram,'uColor'),.86,.68,.40,.58);
      gl.drawArrays(gl.LINES,0,lineCount);
      gl.bindBuffer(gl.ARRAY_BUFFER,spotsBuffer);
      uniforms(pointProgram,6.5);
      gl.uniform4f(gl.getUniformLocation(pointProgram,'uColor'),.98,.79,.47,.98);
      gl.drawArrays(gl.POINTS,0,spotCount);
      gl.depthMask(true);gl.disable(gl.BLEND);
      frameCount++;stage.dataset.frame=String(frameCount);
    }
    render = renderFrame;
    function tick(now){
      raf=0;
      if(!visible||document.hidden)return;
      const dt=Math.min(.055,(now-last)/1000||.016);last=now;
      if(spinTarget!==null){
        const delta=spinTarget-yaw;
        yaw+=delta*Math.min(1,dt*5.6);
        if(Math.abs(delta)<.006)spinTarget=null;
      } else if(!dragging){
        yaw+=velocity*dt;
        velocity*=Math.pow(.11,dt);
        if(auto&&now>interactionUntil)yaw+=dt*.115;
      }
      render();
      if(auto||spinTarget!==null||dragging||Math.abs(velocity)>.004)start();
    }
    start = function(){if(!raf&&visible&&!document.hidden&&!failed){last=performance.now();raf=requestAnimationFrame(tick);}};
    function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}}
    function fitAngle(x){return ((x+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;}
    const pick=(x,y)=>{
      let selected=-1,best=36;
      const rect=canvas.getBoundingClientRect();
      locations.forEach((loc,i)=>{
        const p=rotated(point(loc.lat,loc.lng,1.04));
        if(p[2]<-.04)return;
        const v=viewPosition(point(loc.lat,loc.lng,1.04));
        const sx=(v[0]+1)*.5*rect.width, sy=(1-v[1])*.5*rect.height;
        const dist=Math.hypot(sx-x,sy-y);
        if(dist<best){best=dist;selected=i;}
      });
      return selected;
    };
    const coords=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    canvas.addEventListener('pointerdown',e=>{
      canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      dragging=true;dragMoved=false;lastPointer=coords(e);velocity=0;
      interactionUntil=performance.now()+3000;spinTarget=null;
    });
    canvas.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId)){
        if(e.pointerType==='mouse')canvas.style.cursor=pick(coords(e).x,coords(e).y)>=0?'pointer':'grab';
        return;
      }
      const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){
        const p=[...pointers.values()];const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
        if(pinchPrevious)distance=clamp(distance-(d-pinchPrevious)*.009,2.65,5.6);
        pinchPrevious=d;dragMoved=true;
      }else{
        const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
        if(Math.abs(dx)+Math.abs(dy)>1)dragMoved=true;
        yaw+=dx*.007;tilt=clamp(tilt+dy*.005,-1.10,1.1);
        velocity=dx*.008*60;
      }
      interactionUntil=performance.now()+3200;render();start();
    });
    const pointerEnd=e=>{
      if(!pointers.has(e.pointerId))return;
      const at=coords(e);pointers.delete(e.pointerId);
      if(!pointers.size){
        dragging=false;pinchPrevious=null;
        if(!dragMoved){const i=pick(at.x,at.y);if(i>=0)choose(i,false);}
        interactionUntil=performance.now()+3800;
      }
      if(pointers.size<2)pinchPrevious=null;
      start();
    };
    canvas.addEventListener('pointerup',pointerEnd);
    canvas.addEventListener('pointercancel',pointerEnd);
    canvas.addEventListener('wheel',e=>{
      e.preventDefault();distance=clamp(distance+Math.sign(e.deltaY)*.23,2.65,5.6);
      interactionUntil=performance.now()+3800;render();
    },{passive:false});
    canvas.addEventListener('keydown',e=>{
      const actions={'ArrowLeft':()=>yaw-=.17,'ArrowRight':()=>yaw+=.17,'ArrowUp':()=>tilt=clamp(tilt-.13,-1.1,1.1),'ArrowDown':()=>tilt=clamp(tilt+.13,-1.1,1.1),'+':()=>distance=clamp(distance-.2,2.65,5.6),'-':()=>distance=clamp(distance+.2,2.65,5.6)};
      if(actions[e.key]){e.preventDefault();actions[e.key]();interactionUntil=performance.now()+3800;render();}
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;stop();stage.classList.remove('has-webgl-v21');stage.dataset.renderer='fallback';setStatus('WEBGL UNAVAILABLE · STATIC PREVIEW');[playButton,zoomPlus,zoomMinus,resetButton].forEach(btn=>{if(btn)btn.disabled=true;});});
    const intersection=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;if(visible){render();start();}else stop();},{threshold:.05});intersection.observe(stage);
    document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
    reducedMedia.addEventListener('change',()=>{if(reducedMedia.matches){auto=false;updateButton();stop();} });
    window.addEventListener('pagehide',()=>{stop();ro.disconnect();intersection.disconnect();});
    updateButton();choose(0,false);render();start();
  } catch(err) {
    failed=true;stage.dataset.renderer='fallback';stage.classList.remove('has-webgl-v21');
    setStatus('STATIC VIEW · WEBGL NOT AVAILABLE');if(status)status.textContent=tr('globeStatusFallback');
    [playButton, zoomPlus, zoomMinus, resetButton].forEach(btn=>{if(btn){btn.disabled=true;btn.title='Interactive 3D requires WebGL';}});
    console.warn('Globe fallback activated:',err.message);
  }
})();
