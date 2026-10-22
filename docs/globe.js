// A lightweight Three.js 3D earth. The CSS globe remains visible if WebGL or the CDN is unavailable.
const canvas = document.getElementById('globeCanvas');
const host = canvas?.closest('.globe-stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (canvas && host && !reduced) {
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42,1,.1,40);
    camera.position.set(0,0,7.1);
    const group = new THREE.Group();
    scene.add(group);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(2.03,60,42), new THREE.MeshPhysicalMaterial({color:0x202a2b,metalness:.34,roughness:.78,transparent:true,opacity:.94}));
    group.add(globe);
    const textureCanvas = document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=512;
    const ctx=textureCanvas.getContext('2d');
    ctx.fillStyle='#142029';ctx.fillRect(0,0,1024,512);
    ctx.fillStyle='#b9986b';ctx.globalAlpha=.77;
    const polys=[
      [[-167,70],[-135,70],[-120,60],[-125,49],[-115,45],[-99,47],[-92,30],[-85,25],[-97,17],[-105,22],[-110,29],[-119,29],[-125,38],[-130,49],[-149,59]],
      [[-81,12],[-70,7],[-60,-3],[-50,-10],[-49,-22],[-61,-38],[-72,-55],[-78,-40],[-73,-28],[-78,-15]],
      [[-13,35],[-5,37],[10,33],[24,30],[34,19],[43,12],[50,4],[41,-13],[32,-23],[18,-34],[11,-35],[9,-17],[-2,-9],[-12,10]],
      [[-10,44],[-9,58],[7,60],[10,72],[29,72],[33,62],[47,54],[66,50],[80,54],[98,50],[120,48],[133,42],[138,35],[126,17],[111,13],[100,18],[87,9],[77,6],[61,23],[52,28],[43,37],[32,41],[22,39],[14,48]],
      [[111,-10],[130,-12],[145,-19],[153,-28],[146,-41],[130,-43],[116,-32]],
      [[-55,80],[-42,83],[-39,70],[-46,62],[-55,65]],
      [[47,-13],[51,-15],[50,-24],[44,-26]],
    ];
    for (const p of polys){ctx.beginPath();p.forEach(([lng,lat],i)=>{const x=(lng+180)/360*1024,y=(90-lat)/180*512;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath();ctx.fill()}
    ctx.globalAlpha=.1;ctx.fillStyle='#f9d6a0'; for(let i=0;i<2200;i++){ctx.fillRect(Math.random()*1024,Math.random()*512,1,1)}
    const tex=new THREE.CanvasTexture(textureCanvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    globe.material.map=tex;globe.material.needsUpdate=true;
    const light=new THREE.DirectionalLight(0xffdfb3,3);light.position.set(-3,3,6);scene.add(light);
    scene.add(new THREE.AmbientLight(0x8ca7c6,.95));
    const geoGrid=new THREE.Group();group.add(geoGrid);
    const lineMaterial=new THREE.LineBasicMaterial({color:0xb99767,transparent:true,opacity:.21});
    const makeLine=pts=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial);
    for(let lat=-60;lat<=60;lat+=30){const r=2.055*Math.cos(lat*Math.PI/180),y=2.055*Math.sin(lat*Math.PI/180);let pts=[];for(let k=0;k<=120;k++){const a=k/120*Math.PI*2;pts.push(new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)))}geoGrid.add(makeLine(pts))}
    for(let lng=0;lng<180;lng+=30){let pts=[];for(let k=0;k<=90;k++){const t=-Math.PI/2+k/90*Math.PI,a=lng*Math.PI/180;pts.push(new THREE.Vector3(2.055*Math.cos(t)*Math.cos(a),2.055*Math.sin(t),2.055*Math.cos(t)*Math.sin(a)))}geoGrid.add(makeLine(pts))}
    const orbitMat=new THREE.LineBasicMaterial({color:0xe2bb7f,transparent:true,opacity:.53});
    const orbits=[];
    for(const [rx,ry,rot] of [[3.0,1.1,.2],[3.15,.93,2.2],[3.12,1.05,4.4]]){
      const pts=[];for(let i=0;i<=180;i++){const a=i/180*2*Math.PI;pts.push(new THREE.Vector3(rx*Math.cos(a),ry*Math.sin(a),0))}
      const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),orbitMat);o.rotation.set(rot*.43,rot,.1+rot*.1);group.add(o);orbits.push(o)
    }
    const nodes=[];
    for (const [lat,lon] of [[40,-4],[33,-6],[50,4],[41,29],[28,77],[-1,37],[25,55],[44,-73],[35,139]]) {
      const a=(lon+180)*Math.PI/180, b=lat*Math.PI/180;
      const v=new THREE.Vector3(2.07*Math.cos(b)*Math.cos(a),2.07*Math.sin(b),2.07*Math.cos(b)*Math.sin(a));
      const node=new THREE.Mesh(new THREE.SphereGeometry(.038,12,12),new THREE.MeshBasicMaterial({color:0xf5ca85}));node.position.copy(v);group.add(node);nodes.push(node)
    }
    const connecting=nodes.slice(0,5).map((node,i)=>{
      const a=node.position, b=nodes[(i+3)%nodes.length].position;
      const mid=a.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(2.95);
      const curve=new THREE.QuadraticBezierCurve3(a,mid,b);
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),new THREE.LineBasicMaterial({color:0xe2b87b,transparent:true,opacity:.48}));
    });connecting.forEach(c=>group.add(c));
    host.classList.add('has-webgl');
    let running=true, raf=0;
    const io=new IntersectionObserver(entries=>{running=entries[0]?.isIntersecting??true;if(running)animate()},{threshold:.01});io.observe(host);
    function resize(){const rect=canvas.getBoundingClientRect();const width=Math.max(1,rect.width), height=Math.max(1,rect.height);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
    resize();const ro=new ResizeObserver(resize);ro.observe(canvas);
    let last=0;
    function animate(time=0){cancelAnimationFrame(raf);if(!running||document.hidden)return;raf=requestAnimationFrame(animate);const dt=Math.min((time-last)/1000||.016,.06);last=time;group.rotation.y+=.105*dt;orbits.forEach((o,i)=>o.rotation.z+=dt*(i%2?-.08:.045));renderer.render(scene,camera)}
    animate();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running)animate()});
  } catch(e) { console.info('Using static globe rendering'); }
}
