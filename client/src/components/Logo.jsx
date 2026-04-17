/* ══════════════════════════════════════════════════════════════
   VAHANSETU — DUAL-CORE MONOGRAM v12 (React Port of logo.html)
   Uses a scoped class `.vs-monogram` to avoid clashing with
   the design system's `.vs-logo` styles.
   ══════════════════════════════════════════════════════════════ */

export default function Logo() {
  return (
    <>
      <style>{`
        .vs-monogram{--c-cyan:#00f2ff;--c-blue:#0066ff;--c-purple:#7c4dff;--c-green:#00ff95;display:inline-flex;align-items:center;gap:16px;text-decoration:none;position:relative;cursor:pointer;perspective:1200px;user-select:none;}
        .vsm-reactor{position:relative;width:62px;height:62px;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.2,1,.3,1);}
        .vs-monogram:hover .vsm-reactor{transform:scale(1.1) rotateX(12deg) rotateY(5deg);}
        .vsm-matrix{position:absolute;inset:0;opacity:.1;background-image:radial-gradient(var(--c-cyan) .8px,transparent .8px),linear-gradient(rgba(0,242,255,.05) 1px,transparent 1px);background-size:10px 10px,100% 10px;border-radius:14px;transform:translateZ(-25px);}
        .vsm-svg{width:100%;height:100%;overflow:visible;}
        .vsm-path-v{fill:#0066ff;opacity:.95;filter:drop-shadow(0 0 10px rgba(0,102,255,.5));}
        .vsm-path-s{fill:url(#vsm-flux-s);filter:drop-shadow(0 0 12px #00f2ff);}
        .vsm-s-rotator{transform-origin:50px 48px;animation:vsm-s-spin 7s cubic-bezier(.4,0,.2,1) infinite;transform-style:preserve-3d;}
        @keyframes vsm-s-spin{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
        .vs-monogram:hover .vsm-s-rotator{animation-duration:3.5s;}
        .vsm-orbit{transform-origin:50px 50px;animation:vsm-orbit-r 12s linear infinite;}
        @keyframes vsm-orbit-r{from{transform:rotateZ(0deg)}to{transform:rotateZ(360deg)}}
        .vsm-bloom{animation:vsm-breathe 4s ease-in-out infinite;}
        @keyframes vsm-breathe{0%,100%{opacity:.85;filter:drop-shadow(0 0 5px #00f2ff)}50%{opacity:1;filter:drop-shadow(0 0 20px #00f2ff) drop-shadow(0 0 35px rgba(0,242,255,.3))}}
        .vsm-brand{font-family:'Outfit','Syne',sans-serif;font-weight:900;font-size:1.55rem;letter-spacing:.14em;background:linear-gradient(90deg,#fff 0%,#00f2ff 33%,#00ff95 66%,#fff 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:vsm-text-flow 4s linear infinite;line-height:1;text-transform:uppercase;filter:drop-shadow(0 0 10px rgba(0,242,255,.2));}
        @keyframes vsm-text-flow{0%{background-position:100% center}100%{background-position:-100% center}}
        .vs-monogram:hover .vsm-brand{letter-spacing:.18em;animation-duration:2s;transition:all .4s ease;}
        .vsm-tag{font-size:.58rem;letter-spacing:.62em;color:rgba(255,255,255,.45);text-transform:uppercase;margin-top:6px;font-weight:800;font-family:'Inter',sans-serif;text-align:left;}
      `}</style>

      <div className="vs-monogram">
        <div className="vsm-reactor">
          <div className="vsm-matrix"></div>
          <svg className="vsm-svg vsm-bloom" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="vsm-flux-s" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2ff" />
                <stop offset="50%" stopColor="#00ff95" />
                <stop offset="100%" stopColor="#00f2ff" />
                <animate attributeName="x1" values="0%;100%;0%" dur="4s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            {/* Hex shield */}
            <path d="M50,4 L94,28 L94,72 L50,96 L6,72 L6,28 Z" fill="none" stroke="rgba(0,242,255,0.12)" strokeWidth="1.5" />
            {/* V shape */}
            <path className="vsm-path-v" d="M15,25 L50,90 L85,25 L70,25 L50,68 L30,25 Z" />
            <path d="M15,25 L50,90 L85,25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
            {/* S rotating */}
            <g className="vsm-s-rotator">
              <path className="vsm-path-s" d="M33,30 L67,30 L67,42 L46,42 L46,48 L67,48 L67,72 L33,72 L33,60 L54,60 L54,54 L33,54 Z" />
              <rect x="33" y="30" width="4" height="4" fill="#fff" opacity="0.8" />
              <rect x="63" y="68" width="4" height="4" fill="#fff" opacity="0.8" />
            </g>
            {/* Orbital */}
            <g className="vsm-orbit">
              <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,242,255,0.1)" strokeWidth="0.5" strokeDasharray="2 12" />
              <circle cx="98" cy="50" r="2.5" fill="#00f2ff" />
              <circle cx="2" cy="50" r="2.5" fill="#00ff95" />
            </g>
            {/* Corner brackets */}
            <g stroke="#00f2ff" strokeWidth="3" fill="none" opacity="0.5">
              <path d="M10,18 L10,10 L18,10" />
              <path d="M90,18 L90,10 L82,10" />
            </g>
          </svg>
        </div>
        <div>
          <div className="vsm-brand">VAHANSETU</div>
          <div className="vsm-tag">UNIFIED EV ECOSYSTEM</div>
        </div>
      </div>
    </>
  );
}
