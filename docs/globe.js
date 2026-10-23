/** A geographically grounded globe with local map texture. The static fallback is always available. */
const canvas = document.querySelector('#globeCanvas');
const host = canvas?.closest('.globe-stage');
const state = window.portfolioGlobeMotion || {paused:window.matchMedia('(prefers-reduced-motion: reduce)').matches,visible:false,upgraded:false};
if (canvas && host && !state.paused) {
  try {
    // Defer the optional Three.js upgrade until the globe is near the viewport.
    await new Promise(resolve => {
      const preload = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { preload.disconnect(); resolve(); }
      }, {rootMargin:'240px 0px', threshold:0});
      preload.observe(host);
    });
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const map = await new Promise((resolve, reject) => {
      new THREE.TextureLoader().load('./assets/img/earth-texture.webp', resolve, undefined, reject);
    });
    map.colorSpace = THREE.SRGBColorSpace;
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43,1,.1,40);
    camera.position.set(0,0,7.8);
    const stage = new THREE.Group();
    scene.add(stage);
    const globeGroup = new THREE.Group();stage.add(globeGroup);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(2.02,72,52),
      new THREE.MeshStandardMaterial({map,roughness:.88,metalness:.08})
    );
    globeGroup.add(globe);
    scene.add(new THREE.AmbientLight(0xa8bdcb,.68));
    const warm = new THREE.DirectionalLight(0xffe1b4,2.1);
    warm.position.set(-3,4,6);scene.add(warm);
    const blue = new THREE.DirectionalLight(0x55799a,.36);blue.position.set(3,-1,-4);scene.add(blue);
    // Atmospheric shell: bright only at the rim, no opaque graphic blocking the Earth.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.15,64,46),
      new THREE.ShaderMaterial({
        uniforms:{glowColor:{value:new THREE.Color(0xc7a06a)}},
        vertexShader:`varying vec3 vNormal; varying vec3 vEye; void main(){ vec4 viewPos=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vEye=normalize(-viewPos.xyz);gl_Position=projectionMatrix*viewPos; }`,
        fragmentShader:`uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vEye; void main(){float f=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),3.0);gl_FragColor=vec4(glowColor,f*.27);}`,
        transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false
      })
    );
    stage.add(atmosphere);
    const surfaceMaterial=new THREE.LineBasicMaterial({color:0xc9ae80,transparent:true,opacity:.13});
    const surfaceGroup=new THREE.Group();globeGroup.add(surfaceGroup);
    function lines(points,material){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material)}
    // Thin longitude and latitude lines, behind country detail.
    for (let lat=-60;lat<=60;lat+=30){const y=2.04*Math.sin(lat*Math.PI/180),r=2.04*Math.cos(lat*Math.PI/180),points=[];for(let i=0;i<=90;i++){const a=i/90*Math.PI*2;points.push(new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)));}surfaceGroup.add(lines(points,surfaceMaterial))}
    for (let lng=0;lng<180;lng+=30){const points=[];const a=lng*Math.PI/180;for(let i=0;i<=90;i++){const t=-Math.PI/2+i/90*Math.PI;points.push(new THREE.Vector3(2.04*Math.cos(t)*Math.cos(a),2.04*Math.sin(t),2.04*Math.cos(t)*Math.sin(a)));}surfaceGroup.add(lines(points,surfaceMaterial))}
    const orbitMat=new THREE.LineBasicMaterial({color:0xedd0a0,transparent:true,opacity:.53});
    const orbits=[];
    for (const [rx,ry,rot] of [[3.12,1.12,.4],[3.04,.9,2.12],[3.08,1.05,3.46]]) {
      const pts=[];for(let k=0;k<=170;k++){const a=k/170*2*Math.PI;pts.push(new THREE.Vector3(rx*Math.cos(a),ry*Math.sin(a),0));}
      const orbit=lines(pts,orbitMat);orbit.rotation.set(rot*.48,rot,rot*.19);stage.add(orbit);orbits.push(orbit);
    }
    function coordinate(lat,lng,r=2.06){const phi=lat*Math.PI/180,theta=lng*Math.PI/180;return new THREE.Vector3(r*Math.cos(phi)*Math.cos(theta),r*Math.sin(phi),r*Math.cos(phi)*Math.sin(theta))}
    const cities=[[40,-4],[34,-6],[50,4],[41,29],[25,55],[36,16],[48,2],[43,-73]];
    const markers=[];
    for(const [lat,lng] of cities){const node=new THREE.Mesh(new THREE.SphereGeometry(.043,12,12),new THREE.MeshBasicMaterial({color:0xffd08d}));node.position.copy(coordinate(lat,lng));globeGroup.add(node);markers.push(node)}
    const arcs=[];
    for(const [i,j] of [[0,1],[0,2],[0,3],[1,4],[2,6]]){
      const a=markers[i].position.clone(),b=markers[j].position.clone();
      const mid=a.clone().add(b).normalize().multiplyScalar(2.7);
      const curve=new THREE.QuadraticBezierCurve3(a,mid,b);
      const path=lines(curve.getPoints(54),new THREE.LineBasicMaterial({color:0xeac18a,transparent:true,opacity:.42}));globeGroup.add(path);arcs.push(curve);
    }
    const satellites=arcs.map(curve=>{const p=new THREE.Mesh(new THREE.SphereGeometry(.027,10,10),new THREE.MeshBasicMaterial({color:0xffe4b4}));globeGroup.add(p);return p});
    const pointGeo=new THREE.BufferGeometry();const starPoints=new Float32Array(175*3);
    for(let i=0;i<starPoints.length;i+=3){starPoints[i]=(Math.random()-.5)*12;starPoints[i+1]=(Math.random()-.5)*10;starPoints[i+2]=-3-Math.random()*4}
    pointGeo.setAttribute('position',new THREE.BufferAttribute(starPoints,3));
    scene.add(new THREE.Points(pointGeo,new THREE.PointsMaterial({color:0xc8b99d,size:.013,transparent:true,opacity:.35})));
    let paused=true,last=0,frame=0,visible=false;
    let targetX=.23,targetY=.07;
    host.addEventListener('pointermove',event=>{const rect=host.getBoundingClientRect();targetX=((event.clientX-rect.left)/rect.width-.5)*.22;targetY=(event.clientY-rect.top)/rect.height-.5;},{passive:true});
    function resize(){const rect=canvas.getBoundingClientRect();const w=Math.max(100,rect.width),h=Math.max(100,rect.height);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
    const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
    function loop(t=0){if(paused||state.paused||document.hidden)return;frame=requestAnimationFrame(loop);const dt=Math.min((t-last)/1000||.016,.045);last=t;
      globeGroup.rotation.y+=dt*.072;
      stage.rotation.y+=dt*.014;
      stage.rotation.x+=(targetY*.12-stage.rotation.x)*.018;
      stage.rotation.z+=(targetX*.10-stage.rotation.z)*.016;
      orbits.forEach((o,i)=>{o.rotation.z+=dt*(i%2?-.04:.03)});
      satellites.forEach((p,i)=>p.position.copy(arcs[i].getPoint(((t*.00006+i*.18)%1))));
      renderer.render(scene,camera);
    }
    const observer=new IntersectionObserver(entries=>{const shouldRun=!!entries[0]?.isIntersecting;if(shouldRun===visible)return;visible=shouldRun;state.visible=visible;paused=!shouldRun;cancelAnimationFrame(frame);if(shouldRun){last=0;loop()}},{threshold:.01});
    observer.observe(host);
    // Hide static globe only after first rendered frame and successful asset load.
    renderer.render(scene,camera);host.classList.add('has-webgl');state.upgraded=true;window.portfolioGlobe2D?.stop();
    document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden&&visible&&!state.paused){paused=false;last=0;loop()}else paused=true});
    window.addEventListener('portfolio:globeMotion',()=>{cancelAnimationFrame(frame);paused=state.paused||!visible||document.hidden;if(!paused){last=0;frame=requestAnimationFrame(loop)} });
  } catch(err) {
    // The Earth fallback remains visible when the Three.js CDN or WebGL is unavailable.
    console.info('Showing the local globe illustration.');
  }
}
