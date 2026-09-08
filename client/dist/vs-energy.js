/**
 * VahanSetu — NEXUS VOLT Animation Engine v5.0
 * =============================================
 * Renders:
 *  1. Electric network graph (nodes + flowing particles)
 *  2. Cinematic EV car + charger SVG scene
 *  3. Energy beam animation (car ↔ charger)
 *  4. 3D card tilt physics
 *  5. Button ripple effects
 *  6. Floating orb particles
 *  7. Counter animations
 *  8. Toast notifications
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     1. ELECTRIC NETWORK CANVAS (BACKGROUND)
  ───────────────────────────────────────── */
  const CFG = {
    NODE_COUNT:        28,
    RADIUS_MIN:         2,
    RADIUS_MAX:         5,
    CONNECT_DIST:      220,
    MAX_CONN:            3,
    PARTS_PER_LINK:      2,
    SPEED_MIN:         0.3,
    SPEED_MAX:         1.0,
    PART_RADIUS:       2.5,
    COLORS: ['#00f0ff', '#b56dff', '#00ffa3', '#ffffff'],
  };

  const canvas = document.getElementById('vs-energy-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, nodes = [], edges = [], particles = [], lastT = 0;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildGraph();
    }

    function buildGraph() {
      nodes = []; edges = []; particles = [];
      for (let i = 0; i < CFG.NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          r: CFG.RADIUS_MIN + Math.random() * (CFG.RADIUS_MAX - CFG.RADIUS_MIN),
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          color: CFG.COLORS[Math.floor(Math.random() * CFG.COLORS.length)],
          pulse: Math.random() * Math.PI * 2,
        });
      }
      rebuildEdges();
    }

    function rebuildEdges() {
      edges = []; particles = [];
      const used = new Map();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < CFG.CONNECT_DIST) {
            const ci = used.get(i) || 0, cj = used.get(j) || 0;
            if (ci < CFG.MAX_CONN && cj < CFG.MAX_CONN) {
              const edge = { a: nodes[i], b: nodes[j], dist, opacity: 1 - dist / CFG.CONNECT_DIST };
              edges.push(edge);
              used.set(i, ci + 1); used.set(j, cj + 1);
              for (let k = 0; k < CFG.PARTS_PER_LINK; k++) {
                particles.push({
                  edge, progress: Math.random(),
                  speed: CFG.SPEED_MIN + Math.random() * (CFG.SPEED_MAX - CFG.SPEED_MIN),
                  rev: Math.random() < 0.3,
                  color: CFG.COLORS[Math.floor(Math.random() * CFG.COLORS.length)],
                  alpha: 0.4 + Math.random() * 0.6,
                });
              }
            }
          }
        }
      }
    }

    function drawFrame(t) {
      const dt = Math.min(t - lastT, 33); lastT = t;
      ctx.clearRect(0, 0, W, H);

      /* Edges */
      edges.forEach(e => {
        const g = ctx.createLinearGradient(e.a.x, e.a.y, e.b.x, e.b.y);
        const hex = (n) => Math.floor(n).toString(16).padStart(2, '0');
        g.addColorStop(0, e.a.color + hex(e.opacity * 60));
        g.addColorStop(1, e.b.color + hex(e.opacity * 60));
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y);
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke();
      });

      /* Nodes */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.03;

        const pf = 0.85 + 0.15 * Math.sin(n.pulse + t * 0.002);
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5 * pf);
        gr.addColorStop(0, n.color + 'cc');
        gr.addColorStop(0.4, n.color + '22');
        gr.addColorStop(1, n.color + '00');
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 5 * pf, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pf, 0, Math.PI * 2);
        ctx.fillStyle = n.color; ctx.shadowColor = n.color; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
      });

      /* Particles */
      particles.forEach(p => {
        const step = (p.speed / p.edge.dist) * dt * 0.06;
        p.progress = p.rev ? p.progress - step : p.progress + step;
        if (p.progress > 1) p.progress = 0;
        if (p.progress < 0) p.progress = 1;
        const px = p.edge.a.x + (p.edge.b.x - p.edge.a.x) * p.progress;
        const py = p.edge.a.y + (p.edge.b.y - p.edge.a.y) * p.progress;
        ctx.beginPath(); ctx.arc(px, py, CFG.PART_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.globalAlpha = p.alpha; ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      });

      /* Rebuild graph every 4s */
      if (Math.floor(t / 4000) !== Math.floor((t - dt) / 4000)) rebuildEdges();

      requestAnimationFrame(drawFrame);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(drawFrame);
  }

  /* ─────────────────────────────────────────
     2. EV CHARGING SCENE (SVG INJECTION)
  ───────────────────────────────────────── */
  function injectEVScene() {
    const container = document.getElementById('ev-scene-mount');
    if (!container) return;

    container.innerHTML = `
<div class="ev-scene" aria-hidden="true">

  <!-- Charge halo behind car -->
  <div class="ev-charge-halo"></div>

  <!-- Energy streams (animated SVG lines) -->
  <svg class="ev-energy-stream" viewBox="0 0 130 12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <!-- Stream 1 -->
    <line x1="130" y1="4" x2="0" y2="4" stroke="#00f0ff" stroke-width="1.2" stroke-dasharray="8 6"
          stroke-dashoffset="0" opacity="0.7">
      <animate attributeName="stroke-dashoffset" from="0" to="-56" dur="0.8s" repeatCount="indefinite"/>
    </line>
    <!-- Stream 2 -->
    <line x1="130" y1="8" x2="0" y2="8" stroke="#b56dff" stroke-width="1" stroke-dasharray="5 9"
          stroke-dashoffset="0" opacity="0.55">
      <animate attributeName="stroke-dashoffset" from="0" to="-56" dur="1.1s" repeatCount="indefinite"/>
    </line>
    <!-- Stream 3 - bolt pulse -->
    <line x1="130" y1="6" x2="70" y2="6" stroke="#00ffa3" stroke-width="1.5" stroke-dasharray="3 14"
          stroke-dashoffset="0" opacity="0.5">
      <animate attributeName="stroke-dashoffset" from="0" to="-34" dur="0.6s" repeatCount="indefinite"/>
    </line>
    <!-- Glow blob on stream -->
    <circle cx="65" cy="6" r="3.5" fill="#00f0ff" opacity="0.6">
      <animate attributeName="cx" from="130" to="0" dur="1.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;0.8;0.8;0" dur="1.2s" repeatCount="indefinite"/>
    </circle>
  </svg>

  <!-- Cable arc -->
  <svg class="ev-cable" viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M 110,20 Q 80,50 40,40 Q 15,32 10,30" stroke="#00f0ff" stroke-width="2"
          fill="none" stroke-linecap="round" opacity="0.5">
      <animate attributeName="d"
        values="M 110,20 Q 80,50 40,40 Q 15,32 10,30;M 110,22 Q 82,48 42,38 Q 16,30 10,28;M 110,20 Q 80,50 40,40 Q 15,32 10,30"
        dur="2.5s" repeatCount="indefinite"/>
    </path>
    <circle cx="110" cy="20" r="3" fill="#00f0ff" opacity="0.9">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="10" cy="30" r="2.5" fill="#00ffa3" opacity="0.9">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </svg>

  <!-- EV Car SVG (inline) -->
  <div class="ev-car-wrap">
    <svg width="180" height="80" viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg">
      <!-- Ground shadow -->
      <ellipse cx="90" cy="74" rx="68" ry="6" fill="rgba(0,240,255,0.08)"/>

      <!-- Body -->
      <rect x="10" y="38" width="160" height="28" rx="6" fill="#0c1428"/>
      <!-- Cabin -->
      <path d="M 38,38 Q 45,12 75,10 L 125,10 Q 148,12 150,38 Z" fill="#0c1428"/>
      <!-- Windshields (glass blue) -->
      <path d="M 48,38 Q 52,18 75,16 L 107,16 Q 118,18 122,38 Z" fill="rgba(0,200,240,0.15)" stroke="rgba(0,240,255,0.25)" stroke-width="1"/>
      <!-- Rear window -->
      <path d="M 122,38 Q 134,20 148,38 Z" fill="rgba(0,200,240,0.1)" stroke="rgba(0,240,255,0.15)" stroke-width="0.8"/>
      <!-- Front window split -->
      <line x1="90" y1="16" x2="90" y2="38" stroke="rgba(0,240,255,0.2)" stroke-width="0.8"/>

      <!-- Car outline glow -->
      <rect x="10" y="38" width="160" height="28" rx="6" fill="none" stroke="rgba(0,240,255,0.3)" stroke-width="1"/>
      <path d="M 48,38 Q 52,18 75,16 L 107,16 Q 118,18 122,38 Z" fill="none" stroke="rgba(0,240,255,0.2)" stroke-width="0.8"/>

      <!-- Front/rear bumpers -->
      <rect x="4" y="46" width="12" height="10" rx="3" fill="#0a1020" stroke="rgba(0,240,255,0.3)" stroke-width="0.8"/>
      <rect x="164" y="46" width="12" height="10" rx="3" fill="#0a1020" stroke="rgba(0,240,255,0.25)" stroke-width="0.8"/>

      <!-- Headlights -->
      <ellipse cx="16" cy="48" rx="5" ry="3" fill="rgba(0,240,255,0.6)">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
      </ellipse>
      <!-- Headlight beam -->
      <path d="M 18,46 L 0,38" stroke="rgba(0,240,255,0.3)" stroke-width="4" stroke-linecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite"/>
      </path>

      <!-- Taillights -->
      <ellipse cx="168" cy="48" rx="4" ry="2.5" fill="rgba(255,61,107,0.8)">
        <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite"/>
      </ellipse>

      <!-- Wheels -->
      <circle cx="42" cy="66" r="12" fill="#060c1e" stroke="rgba(0,240,255,0.25)" stroke-width="1.5"/>
      <circle cx="42" cy="66" r="6"  fill="none"   stroke="rgba(0,240,255,0.4)"  stroke-width="1">
        <animateTransform attributeName="transform" type="rotate" from="0 42 66" to="360 42 66" dur="1.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="42" cy="66" r="2.5" fill="rgba(0,240,255,0.6)"/>

      <circle cx="138" cy="66" r="12" fill="#060c1e" stroke="rgba(0,240,255,0.25)" stroke-width="1.5"/>
      <circle cx="138" cy="66" r="6"  fill="none"   stroke="rgba(0,240,255,0.4)"  stroke-width="1">
        <animateTransform attributeName="transform" type="rotate" from="0 138 66" to="360 138 66" dur="1.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="138" cy="66" r="2.5" fill="rgba(0,240,255,0.6)"/>

      <!-- Charging port indicator -->
      <circle cx="158" cy="36" r="4" fill="rgba(0,255,163,0.7)" stroke="rgba(0,255,163,0.9)" stroke-width="0.5">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="r" values="3.5;4.5;3.5" dur="1.2s" repeatCount="indefinite"/>
      </circle>

      <!-- Body gradient overlay -->
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,240,255,0.06)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>
      </defs>
      <rect x="10" y="38" width="160" height="28" rx="6" fill="url(#bodyGrad)"/>
    </svg>
  </div>

  <!-- Charging Station SVG -->
  <div class="ev-charger-wrap">
    <svg width="64" height="120" viewBox="0 0 64 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Post -->
      <rect x="22" y="40" width="20" height="68" rx="4" fill="#0a1424" stroke="rgba(0,240,255,0.2)" stroke-width="1"/>

      <!-- Screen/Body -->
      <rect x="8" y="4" width="48" height="56" rx="8" fill="#0d1830" stroke="rgba(0,240,255,0.35)" stroke-width="1.5">
        <animate attributeName="stroke" values="rgba(0,240,255,0.3);rgba(0,240,255,0.7);rgba(181,109,255,0.7);rgba(0,240,255,0.3)" dur="2s" repeatCount="indefinite"/>
      </rect>

      <!-- Screen display -->
      <rect x="12" y="8" width="40" height="26" rx="4" fill="rgba(0,30,50,0.8)" stroke="rgba(0,240,255,0.2)" stroke-width="0.5"/>
      <!-- Screen glow -->
      <rect x="12" y="8" width="40" height="26" rx="4" fill="rgba(0,240,255,0.06)">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite"/>
      </rect>
      <!-- Bolt icon on screen -->
      <path d="M 32,16 L 24,32 L 32,32 L 32,42 L 40,26 L 32,26 Z" fill="#00f0ff" opacity="0.9">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite"/>
      </path>

      <!-- Charging level bars -->
      <rect x="14" y="38" width="8" height="14" rx="2" fill="rgba(0,255,163,0.8)"/>
      <rect x="24" y="40" width="8" height="12" rx="2" fill="rgba(0,255,163,0.6)"/>
      <rect x="34" y="42" width="8" height="10" rx="2" fill="rgba(0,255,163,0.4)">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.9s" repeatCount="indefinite"/>
      </rect>

      <!-- Connector plug -->
      <rect x="24" y="60" width="16" height="12" rx="3" fill="#0a1424" stroke="rgba(0,240,255,0.4)" stroke-width="1"/>
      <circle cx="29" cy="66" r="1.5" fill="rgba(0,240,255,0.6)"/>
      <circle cx="35" cy="66" r="1.5" fill="rgba(0,240,255,0.6)"/>

      <!-- Glow rings on charger -->
      <circle cx="32" cy="30" r="20" fill="none" stroke="rgba(0,240,255,0.08)" stroke-width="1">
        <animate attributeName="r" values="20;26;20" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>

      <!-- Base foot -->
      <rect x="18" y="106" width="28" height="10" rx="3" fill="#080f20" stroke="rgba(0,240,255,0.15)" stroke-width="1"/>
    </svg>
  </div>

  <!-- Road -->
  <div class="ev-road"></div>
</div>`;
  }

  /* ─────────────────────────────────────────
     3. 3D TILT EFFECT
  ───────────────────────────────────────── */
  function initTilt() {
    document.querySelectorAll('.vs-tilt').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
        const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
        card.style.transform =
          `perspective(900px) rotateX(${dy * -7}deg) rotateY(${dx * 7}deg) translateZ(12px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });
  }

  /* ─────────────────────────────────────────
     4. FLOATING ORBS
  ───────────────────────────────────────── */
  function spawnOrbs() {
    const c = document.getElementById('vs-orb-container');
    if (!c) return;
    const colors = ['var(--cyan)', 'var(--purple)', 'var(--green)', 'var(--cyan)', 'var(--cyan)'];
    for (let i = 0; i < 32; i++) {
      const orb = document.createElement('div');
      orb.className = 'vs-orb';
      const sz     = 1 + Math.random() * 3.5;
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const dur    = 14 + Math.random() * 22;
      const delay  = Math.random() * 24;
      const drift  = (Math.random() - 0.5) * 220;
      orb.style.cssText = `
        left:${Math.random() * 100}%;bottom:-10px;
        width:${sz}px;height:${sz}px;
        background:${color};box-shadow:0 0 ${sz * 5}px ${color};
        animation-duration:${dur}s;animation-delay:-${delay}s;
        --drift:${drift}px;opacity:0;`;
      c.appendChild(orb);
    }
  }

  /* ─────────────────────────────────────────
     5. RIPPLE EFFECT
  ───────────────────────────────────────── */
  function initRipple() {
    // Inject keyframe once
    if (!document.getElementById('vs-ripple-kf')) {
      const s = document.createElement('style');
      s.id = 'vs-ripple-kf';
      s.textContent = '@keyframes vs-ripple { to { transform:scale(1); opacity:0; } }';
      document.head.appendChild(s);
    }
    document.addEventListener('click', e => {
      const btn = e.target.closest('.vs-btn');
      if (!btn) return;
      const r    = btn.getBoundingClientRect();
      const span = document.createElement('span');
      const size = Math.max(r.width, r.height) * 2.2;
      span.style.cssText = `
        position:absolute;border-radius:50%;pointer-events:none;z-index:99;
        background:rgba(255,255,255,0.22);
        width:${size}px;height:${size}px;
        left:${e.clientX - r.left - size/2}px;
        top:${e.clientY - r.top - size/2}px;
        transform:scale(0);animation:vs-ripple 0.7s ease-out forwards;`;
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(span);
      setTimeout(() => span.remove(), 750);
    });
  }

  /* ─────────────────────────────────────────
     6. COUNTER ANIMATION
  ───────────────────────────────────────── */
  function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur    = parseInt(el.dataset.dur || '1400', 10);
      const float  = !Number.isInteger(target);
      const t0     = performance.now();
      const tick   = (now) => {
        const p   = Math.min((now - t0) / dur, 1);
        const e   = 1 - Math.pow(1 - p, 3); // ease-out cubic
        const val = target * e;
        el.textContent = prefix + (float ? val.toFixed(1) : Math.round(val)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ─────────────────────────────────────────
     7. MAGNETIC BUTTON EFFECT
  ───────────────────────────────────────── */
  function initMagnetic() {
    document.querySelectorAll('.vs-btn-primary, .vs-btn-gold').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r  = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) * 0.18;
        const dy = (e.clientY - r.top  - r.height / 2) * 0.18;
        btn.style.transform = `translateX(${dx}px) translateY(${dy}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
        setTimeout(() => btn.style.transition = '', 400);
      });
    });
  }

  /* ─────────────────────────────────────────
     8. INTERSECTION-BASED ENTRANCE ANIMATIONS
  ───────────────────────────────────────── */
  function initScrollReveal() {
    const items = document.querySelectorAll('.vs-stat-card, .vs-glass, .chart-card');
    if (!items.length || !window.IntersectionObserver) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, i * 60);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    items.forEach((el, i) => {
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(24px)';
      el.style.transition = `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms`;
      obs.observe(el);
    });
  }

  /* ─────────────────────────────────────────
     9. TOAST NOTIFICATION SYSTEM
  ───────────────────────────────────────── */
  function showToast(msg, type = 'success') {
    let c = document.querySelector('.vs-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'vs-toast-container';
      document.body.appendChild(c);
    }
    const toast = document.createElement('div');
    toast.className = `vs-toast ${type}`;
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info', warning: 'alert-triangle' };
    const icon = icons[type] || 'message-square';
    toast.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;"></i><span>${msg}</span>`;
    c.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; }, 3500);
    setTimeout(() => toast.remove(), 4000);
  }

  /* ─────────────────────────────────────────
     10. INIT
  ───────────────────────────────────────── */
  function init() {
    injectEVScene();
    initTilt();
    spawnOrbs();
    initRipple();
    initMagnetic();
    initScrollReveal();
    setTimeout(animateCounters, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  window.vsAnimate = {
    showToast,
    refreshTilt: initTilt,
    animateCounters,
  };

}());
