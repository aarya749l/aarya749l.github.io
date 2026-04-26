/* ═══════════════════════════════════════════════════════════════
   AARYA LAD — script.js
   Three.js Background · Custom Cursor · All Interactions
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════
   1. THREE.JS BACKGROUND (kept from original, refined colours)
══════════════════════════════════════ */
(function initThree() {
  const canvas   = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 50);

  /* Mouse tracking */
  const mouse  = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* Particle Field */
  const PARTICLE_COUNT = 1800;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);

  const palette = [
    new THREE.Color(0x38bdf8), // neon blue
    new THREE.Color(0xa78bfa), // neon purple
    new THREE.Color(0x06b6d4), // cyan
    new THREE.Color(0xf472b6), // pink
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * 160;
    positions[i3 + 1] = (Math.random() - 0.5) * 100;
    positions[i3 + 2] = (Math.random() - 0.5) * 80;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
    sizes[i] = Math.random() * 1.5 + 0.3;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.y += sin(uTime * 0.4 + position.x * 0.05) * 0.5;
        pos.x += cos(uTime * 0.3 + position.z * 0.04) * 0.3;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (280.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.2, 0.5, d);
        gl_FragColor = vec4(vColor, alpha * 0.75);
      }`
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* Wireframe shapes */
  function makeWireframe(geometry, colorHex, opacity = 0.12) {
    const edges = new THREE.EdgesGeometry(geometry);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex, transparent: true, opacity, blending: THREE.AdditiveBlending,
    });
    return new THREE.LineSegments(edges, mat);
  }

  const ico  = makeWireframe(new THREE.IcosahedronGeometry(10, 1), 0x38bdf8, 0.14);
  ico.position.set(30, 8, -20); scene.add(ico);

  const octa = makeWireframe(new THREE.OctahedronGeometry(7), 0xa78bfa, 0.12);
  octa.position.set(-32, -5, -15); scene.add(octa);

  const torus = makeWireframe(new THREE.TorusGeometry(8, 2, 12, 36), 0x06b6d4, 0.10);
  torus.position.set(0, -18, -25); scene.add(torus);

  const tetras = [];
  for (let i = 0; i < 6; i++) {
    const t = makeWireframe(new THREE.TetrahedronGeometry(2 + Math.random() * 2), 0xf472b6, 0.15);
    t.position.set(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 30
    );
    t.userData.speed = (Math.random() - 0.5) * 0.008;
    scene.add(t); tetras.push(t);
  }

  /* Nebula */
  const nebulaMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
      }
      void main() {
        vec2 uv = vUv * 3.0;
        float n = noise(uv + uTime * 0.04);
        n += noise(uv * 2.1 - uTime * 0.03) * 0.5;
        n = smoothstep(0.4, 0.9, n);
        vec3 col1 = vec3(0.22, 0.09, 0.55);
        vec3 col2 = vec3(0.02, 0.33, 0.60);
        vec3 col = mix(col1, col2, vUv.x + sin(uTime*0.1)*0.2);
        gl_FragColor = vec4(col * n, n * 0.18);
      }`
  });
  const nebulaPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), nebulaMat);
  nebulaPlane.position.z = -50;
  scene.add(nebulaPlane);

  /* Connection lines */
  const CONNECTIONS = 120;
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending,
  });
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  function rebuildLines() {
    lineGroup.clear();
    for (let i = 0; i < CONNECTIONS; i++) {
      const a = Math.floor(Math.random() * PARTICLE_COUNT) * 3;
      const b = Math.floor(Math.random() * PARTICLE_COUNT) * 3;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([
        positions[a], positions[a+1], positions[a+2],
        positions[b], positions[b+1], positions[b+2],
      ], 3));
      lineGroup.add(new THREE.Line(geo, lineMat));
    }
  }
  rebuildLines();

  /* Animation loop */
  let clock = 0;
  (function animate() {
    requestAnimationFrame(animate);
    clock += 0.01;
    particleMat.uniforms.uTime.value = clock;
    nebulaMat.uniforms.uTime.value   = clock;

    target.x += (mouse.x - target.x) * 0.04;
    target.y += (mouse.y - target.y) * 0.04;
    camera.position.x += (target.x * 6 - camera.position.x) * 0.05;
    camera.position.y += (-target.y * 4 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    ico.rotation.x  += 0.003; ico.rotation.y  += 0.004;
    octa.rotation.x -= 0.005; octa.rotation.z += 0.003;
    torus.rotation.x += 0.004; torus.rotation.y += 0.003;
    tetras.forEach(t => { t.rotation.x += t.userData.speed; t.rotation.y += t.userData.speed * 0.7; });
    particles.rotation.y += 0.0003;

    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setInterval(rebuildLines, 4000);
})();

/* ══════════════════════════════════════
   2. CUSTOM CURSOR
══════════════════════════════════════ */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const trail  = document.getElementById('cursorTrail');
  if (!cursor) return;

  let mx = -100, my = -100, tx = -100, ty = -100;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  (function trackTrail() {
    requestAnimationFrame(trackTrail);
    tx += (mx - tx) * 0.15;
    ty += (my - ty) * 0.15;
    cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
    trail.style.left  = tx + 'px'; trail.style.top  = ty + 'px';
  })();

  document.querySelectorAll('a, button, .skill-chip, .project-card, .tech-pill, .cert-card, .interest-card, .exp-card, .edu-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(2)';
      trail.style.transform  = 'translate(-50%,-50%) scale(0.5)';
      trail.style.opacity    = '0.4';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      trail.style.transform  = 'translate(-50%,-50%) scale(1)';
      trail.style.opacity    = '1';
    });
  });
})();

/* ══════════════════════════════════════
   3. FLOATING NAVBAR — scroll + active links
══════════════════════════════════════ */
(function initNavbar() {
  const nav    = document.getElementById('navbar');
  const links  = document.querySelectorAll('.nav-links a');

  // Scrolled state (blur + border)
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile hamburger
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    menu.classList.toggle('open');
  });
  document.querySelectorAll('.mobile-link').forEach(l =>
    l.addEventListener('click', () => {
      btn.classList.remove('active');
      menu.classList.remove('open');
    })
  );

  // Active link on scroll
  const sections = document.querySelectorAll('section[id]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => io.observe(s));
})();

/* ══════════════════════════════════════
   4. TYPING EFFECT — updated with Aarya's real phrases
══════════════════════════════════════ */
(function initTyping() {
  const el = document.getElementById('typed-text');
  if (!el) return;

  const phrases = [
    'Cybersecurity Learner',
    'Arduino Developer',
    'Problem Solver',
    'ECS Engineering Student',
    'C / C++ Programmer',
  ];

  let phraseIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const phrase = phrases[phraseIdx];
    if (!deleting) {
      charIdx++;
      el.textContent = phrase.slice(0, charIdx);
      if (charIdx === phrase.length) {
        deleting = true;
        return setTimeout(tick, 2000);
      }
      setTimeout(tick, 75);
    } else {
      charIdx--;
      el.textContent = phrase.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        return setTimeout(tick, 300);
      }
      setTimeout(tick, 35);
    }
  }
  setTimeout(tick, 800);
})();

/* ══════════════════════════════════════
   5. SCROLL REVEAL ANIMATIONS
══════════════════════════════════════ */
(function initReveal() {
  const els = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  const io  = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.children].filter(
          c => c.classList.contains('reveal-up') ||
               c.classList.contains('reveal-left') ||
               c.classList.contains('reveal-right')
        );
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('visible'), idx * 90);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => io.observe(el));
})();

/* ══════════════════════════════════════
   6. SKILL BAR ANIMATION
══════════════════════════════════════ */
(function initSkillBars() {
  const fills = document.querySelectorAll('.chip-fill');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const w = entry.target.dataset.w;
        entry.target.style.width = w + '%';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  fills.forEach(f => io.observe(f));
})();

/* ══════════════════════════════════════
   7. 3D TILT ON ABOUT PROFILE CARD
══════════════════════════════════════ */
(function initTilt() {
  const wrapper = document.getElementById('tiltCard');
  if (!wrapper) return;
  const inner = wrapper.querySelector('.image-tilt-inner');
  const shine = wrapper.querySelector('.tilt-shine');

  wrapper.addEventListener('mousemove', e => {
    const rect = wrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    inner.style.transform = `rotateX(${-y*18}deg) rotateY(${x*18}deg) scale(1.03)`;
    shine.style.background = `radial-gradient(circle at ${(x+0.5)*100}% ${(y+0.5)*100}%, rgba(255,255,255,0.18) 0%, transparent 60%)`;
  });
  wrapper.addEventListener('mouseleave', () => {
    inner.style.transform = '';
    shine.style.background = '';
  });
})();

/* ══════════════════════════════════════
   8. PROJECT CARD — MOUSE GLOW
══════════════════════════════════════ */
(function initCardGlow() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(56,189,248,0.07) 0%, rgba(255,255,255,0.04) 60%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });
})();

/* ══════════════════════════════════════
   9. INTEREST + CERT CARD 3D TILT
══════════════════════════════════════ */
(function initCardTilt() {
  const cards = document.querySelectorAll('.interest-card, .cert-card, .edu-card, .exp-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-y*8}deg) rotateY(${x*8}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ══════════════════════════════════════
   10. SMOOTH SCROLL
══════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ══════════════════════════════════════
   11. BUTTON RIPPLE EFFECT
══════════════════════════════════════ */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute; border-radius:50%; background:rgba(255,255,255,0.25);
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
      animation: rippleAnim 0.6s ease-out forwards;
      pointer-events:none;
    `;
    // Inject keyframe once
    if (!document.getElementById('ripple-style')) {
      const s = document.createElement('style');
      s.id = 'ripple-style';
      s.textContent = '@keyframes rippleAnim { from { transform:scale(0); opacity:1; } to { transform:scale(2.5); opacity:0; } }';
      document.head.appendChild(s);
    }
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

/* ══════════════════════════════════════
   12. PARALLAX ON SCROLL (hero)
══════════════════════════════════════ */
(function initParallax() {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.float-card').forEach((c, i) => {
      c.style.transform = `translateY(${y * (0.08 + i * 0.04)}px)`;
    });
  }, { passive: true });
})();
