
// Mobile nav
const nav = document.querySelector('.nav');
document.querySelector('.menu-toggle')?.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// GSAP animations
if (window.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.to('.hero-card', { y: -10, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  gsap.utils.toArray('.reveal').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      delay: i * 0.03,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%'
      }
    });
  });

  gsap.to('.connector', {
    opacity: .65,
    duration: 1.2,
    repeat: -1,
    yoyo: true,
    stagger: 0.12,
    ease: 'sine.inOut'
  });

  gsap.utils.toArray('.logo-card').forEach((card) => {
    card.addEventListener('mouseenter', () => gsap.to(card, { y: -6, scale: 1.02, duration: .25, ease: 'power2.out' }));
    card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, scale: 1, duration: .25, ease: 'power2.out' }));
  });
}

// Counters
const counters = document.querySelectorAll('[data-counter]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const targetText = el.getAttribute('data-counter') || '0';
    const target = parseInt(targetText, 10);
    let current = 0;
    const suffix = el.textContent.includes('+') ? '+' : '';
    const timer = setInterval(() => {
      current += Math.ceil(target / 30);
      if (current >= target) {
        el.textContent = target + suffix;
        clearInterval(timer);
      } else {
        el.textContent = current + suffix;
      }
    }, 40);
    counterObserver.unobserve(el);
  });
}, {threshold: 0.45});
counters.forEach(c => counterObserver.observe(c));

// Three.js scene
(function createScene(){
  if (!window.THREE) return;
  const canvas = document.getElementById('scene-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 16;

  const group = new THREE.Group();
  scene.add(group);

  const sphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.2, 2),
    new THREE.MeshBasicMaterial({ color: 0x6cb6ff, wireframe: true, transparent: true, opacity: 0.18 })
  );
  sphere.position.set(4.6, 0.2, -2);
  group.add(sphere);

  const ringGeo = new THREE.TorusGeometry(6.8, 0.05, 16, 120);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6cb6ff, transparent: true, opacity: 0.18 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = 1.2;
  ring1.position.set(4.4, -0.2, -2.2);
  group.add(ring1);
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.rotation.y = .8;
  ring2.position.set(4.4, -0.2, -2.2);
  group.add(ring2);

  const stars = new THREE.BufferGeometry();
  const starCount = 180;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 40;
    positions[i + 1] = (Math.random() - 0.5) * 24;
    positions[i + 2] = (Math.random() - 0.5) * 25;
  }
  stars.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starField = new THREE.Points(
    stars,
    new THREE.PointsMaterial({ color: 0xd1eaff, size: 0.06, transparent: true, opacity: 0.8 })
  );
  scene.add(starField);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
  });

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.0025;
    sphere.rotation.x += 0.0013;
    ring1.rotation.z += 0.0016;
    ring2.rotation.x += 0.0012;
    group.rotation.y += (mouseX - group.rotation.y) * 0.03;
    group.rotation.x += (-mouseY - group.rotation.x) * 0.03;
    renderer.render(scene, camera);
  }
  animate();
})();
