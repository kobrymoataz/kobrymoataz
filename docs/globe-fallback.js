/** Local, texture-mapped rotating globe. Works without network access or WebGL. */
(() => {
  const host = document.querySelector('.globe-stage');
  const canvas = document.getElementById('globeFallbackCanvas');
  if (!canvas || !host) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const button = document.getElementById('globeMotionToggle');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = window.portfolioGlobeMotion = { paused: reduce, visible: false, upgraded: false, ticks: 0 };
  function updateButton() {
    if (!button) return;
    button.textContent = state.paused ? 'Start rotation ↻' : 'Pause rotation Ⅱ';
    button.setAttribute('aria-pressed', String(!state.paused));
  }
  button?.addEventListener('click', () => {
    state.paused = !state.paused;
    updateButton();
    window.dispatchEvent(new CustomEvent('portfolio:globeMotion'));
    if (!state.paused) start();
    else stop();
  });
  updateButton();

  const texture = new Image();
  texture.decoding = 'async';
  texture.src = './assets/img/earth-texture.webp';
  let textureData = null, textureWidth = 0, textureHeight = 0;
  const resolution = 248, radius = resolution / 2 - 4, radiusSq = radius * radius;
  const offscreen = document.createElement('canvas');
  offscreen.width = offscreen.height = resolution;
  const ox = offscreen.getContext('2d', { alpha: true, willReadFrequently: false });
  const frame = ox.createImageData(resolution, resolution);
  const samples = [];
  for (let y=0; y<resolution; y++) {
    for (let x=0; x<resolution; x++) {
      const u=(x+0.5-resolution/2)/radius, v=(y+0.5-resolution/2)/radius;
      if(u*u+v*v >= 1) continue;
      const z=Math.sqrt(1-u*u-v*v);
      const lat=Math.asin(-v);
      const longitude=Math.atan2(u,z);
      const diffuse=Math.max(.30, Math.min(1, .38 + .65*(z*.78 - u*.32 + v*-.3)));
      samples.push([4*(y*resolution+x), longitude, .5-lat/Math.PI, diffuse, z]);
    }
  }
  let angle = -.18, last = 0, raf = 0, stageSize = 0, lastDraw = 0;
  function resize(){
    const side=Math.max(200, Math.min(630, Math.round(host.clientWidth)));
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=canvas.height=Math.round(side*dpr);
    canvas.style.width=canvas.style.height=`${side}px`;
    context.setTransform(dpr,0,0,dpr,0,0);
    stageSize=side;
  }
  const ro=new ResizeObserver(resize);ro.observe(host);resize();

  function render() {
    if(!textureData || !stageSize) return;
    const px=frame.data;
    px.fill(0);
    for (const [target, baseLongitude, latitude, light] of samples) {
      let u=(baseLongitude+angle)/(Math.PI*2)+.5;
      u=u-Math.floor(u);
      const tx=Math.min(textureWidth-1, (u*textureWidth)|0);
      const ty=Math.min(textureHeight-1, (latitude*textureHeight)|0);
      const src=(ty*textureWidth+tx)*4;
      px[target] = (textureData[src]*light)|0;
      px[target+1] = (textureData[src+1]*light)|0;
      px[target+2] = (textureData[src+2]*light)|0;
      px[target+3] = 255;
    }
    ox.putImageData(frame,0,0);
    const width=stageSize, mid=width/2, R=width*.36;
    context.clearRect(0,0,width,width);
    context.save();
    const halo=context.createRadialGradient(mid,mid,R*.35,mid,mid,R*1.52);
    halo.addColorStop(0,'rgba(216,167,96,0)');halo.addColorStop(.63,'rgba(216,167,96,.12)');halo.addColorStop(1,'rgba(216,167,96,0)');
    context.fillStyle=halo;context.beginPath();context.arc(mid,mid,R*1.5,0,Math.PI*2);context.fill();
    context.beginPath();context.arc(mid,mid,R+.5,0,Math.PI*2);context.clip();
    context.drawImage(offscreen,mid-R,mid-R,R*2,R*2);
    context.restore();
    context.strokeStyle='rgba(202,168,117,.42)';context.lineWidth=1.3;
    context.beginPath();context.arc(mid,mid,R,0,2*Math.PI);context.stroke();
    // restrained animated orbit and three symbolic network nodes
    context.save(); context.translate(mid,mid);context.rotate(-.34);
    context.beginPath();context.ellipse(0,0,R*1.24,R*.34,0,0,Math.PI*2);
    context.strokeStyle='rgba(218,181,129,.35)';context.lineWidth=1.3;context.stroke();
    for(let i=0;i<3;i++){
      const a=angle*1.1 + i*Math.PI*2/3;
      context.beginPath();context.arc(Math.cos(a)*R*1.24,Math.sin(a)*R*.34,3.4,0,2*Math.PI);
      context.fillStyle='#eacba3';context.fill();
    }
    context.restore();
    state.ticks++;
    canvas.dataset.frame=String(state.ticks);
    host.classList.add('has-canvas-fallback');
  }
  function loop(t){
    if(state.paused || !state.visible || state.upgraded || document.hidden){raf=0;return;}
    raf=requestAnimationFrame(loop);
    if(t-lastDraw<45) return; // <= 22 fps for a quiet CPU profile
    angle+=Math.min(.038,(t-last||45)*.000036);
    last=t;lastDraw=t;render();
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  function start(){if(!state.visible || state.upgraded || state.paused || document.hidden || raf)return;last=performance.now();raf=requestAnimationFrame(loop);}
  texture.onload=()=>{
    const src=document.createElement('canvas');src.width=texture.naturalWidth;src.height=texture.naturalHeight;
    const c=src.getContext('2d',{willReadFrequently:true});c.drawImage(texture,0,0);
    const pixels=c.getImageData(0,0,src.width,src.height);textureData=pixels.data;textureWidth=src.width;textureHeight=src.height;
    render();start();
  };
  texture.onerror=()=>{host.dataset.globeStatus='static-image';};
  const observer=new IntersectionObserver(entries=>{
    state.visible=!!entries[0]?.isIntersecting;
    if(state.visible)start(); else stop();
  }, {rootMargin:'80px 0px',threshold:.01});observer.observe(host);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  window.addEventListener('pagehide',()=>{stop();ro.disconnect();observer.disconnect();});
  window.portfolioGlobe2D={stop,start,render};
})();
