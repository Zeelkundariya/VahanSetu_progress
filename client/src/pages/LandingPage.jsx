import { useState, useEffect } from 'react';
import { api, showToast } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, MapPin, Zap, Truck, LayoutDashboard, 
  Crown, Activity, Sparkles, CheckCircle, 
  Heart, Diamond, Radar, KeyRound, UserPlus, AlertCircle, ArrowRight, Route, BarChart3, LogOut, Search, Mic
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

function CountUp({ value, suffix = '', duration = 2000 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(end)) return;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(update);
      else setDisplay(end);
    };
    requestAnimationFrame(update);
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, { 
    maximumFractionDigits: value.toString().includes('.') ? 1 : 0 
  });
  return <span>{formatted}{suffix}</span>;
}

export default function LandingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [authTab, setAuthTab] = useState('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
    if (window.vsAnimate) window.vsAnimate.refreshTilt();
  }, [authTab]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authTab === 'login' ? '/login' : '/signup';
      const { data } = await api.post(endpoint, formData);
      if (data.success) {
        if (authTab === 'login') {
          showToast(`🛡️ Access Granted: Welcome back, ${data.user.name}.`, 'success');
          setUser(data.user);
          setTimeout(() => navigate('/map'), 800);
        } else {
          showToast('💎 Identity Provisioned: Please log in.', 'success');
          setAuthTab('login');
        }
      } else {
        showToast(data.message || 'Authentication Failure', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Security Protocol: Connection Refused', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-wrapper">
      {/* ── LANDING NAVBAR ── */}
      <nav className="vs-navbar" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '18px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', backdropFilter: 'none' }}>
        <Link to="/" className="vs-logo" style={{ textDecoration: 'none' }}>
           <Logo />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {user ? (
            <Link to="/map" className="vs-btn vs-btn-sm vs-btn-secondary vs-icon-text">
              <LayoutDashboard size={14} /> Dashboard
            </Link>
          ) : (
             <button onClick={() => { setAuthTab('login'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="vs-btn vs-btn-sm vs-btn-primary">
                Login
             </button>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow">
            <div className="eyebrow-dot"></div>
            Powered by AI Charge Intelligence
          </div>

          <h1 className="hero-title">
            Bridge to the<br />
            <span className="accent">Electric Future</span>
          </h1>

          <p className="hero-sub">
            India's most advanced EV charging network. Discover stations in real-time,
            plan AI-optimized routes, manage your fleet, and monitor live availability —
            all in one cinematic platform.
          </p>

          <div className="hero-cta">
            <Link to="/map" className="vs-btn vs-btn-primary vs-icon-text" style={{ padding: '15px 32px', fontSize: '1rem', borderRadius: 14 }}>
              <MapPin size={18} /> Explore Live Map
            </Link>
            <Link to="/premium" className="vs-btn vs-btn-secondary vs-icon-text" style={{ padding: '15px 24px', fontSize: '1rem', borderRadius: 14 }}>
              <Diamond size={18} /> Premium Plans
            </Link>
          </div>

          <div className="hero-features">
            <div className="feature-pill"><MapPin size={13} color="var(--cyan)" /> Live Utility</div>
            <div className="feature-pill"><Zap size={13} color="var(--purple)" /> Logistics AI</div>
            <div className="feature-pill"><Truck size={13} color="var(--green)" /> Fleet Console</div>
            <div className="feature-pill"><ShieldCheck size={13} color="var(--gold)" /> Host Portal</div>
            <div className="feature-pill"><Diamond size={13} color="var(--purple)" /> Vault Access</div>
          </div>
        </div>

        <div className="hero-right">
          <div className="auth-card">
            <div className="auth-tabs">
              <button className={`auth-tab vs-icon-text ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>
                <KeyRound size={14} /> Identity Access
              </button>
              <button className={`auth-tab vs-icon-text ${authTab === 'signup' ? 'active' : ''}`} onClick={() => setAuthTab('signup')}>
                <UserPlus size={14} /> Register Profile
              </button>
            </div>

            <div className="auth-panels">
              <div className="auth-panel active">
                <div className="auth-title">
                  {user ? `Welcome back, ${user.name.split(' ')[0]}` : (authTab === 'login' ? 'Welcome back' : 'Join VahanSetu')}
                </div>
                <div className="auth-caption">
                  {user ? 'You are currently authenticated in the VahanSetu Nexus.' : (authTab === 'login' ? 'Sign in to your VahanSetu account' : 'Create your free account in seconds')}
                </div>

                {user ? (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px', background: 'rgba(0,240,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.1)', marginBottom: '24px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000' }}>
                         {user.name && user.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 700 }}>SESSION ACTIVE</div>
                      </div>
                    </div>
                    <Link to="/map" className="vs-btn vs-btn-primary auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                       Enter the Network <ArrowRight size={18} />
                    </Link>
                    <button onClick={async () => {
                       const { logout } = await import('../api');
                       await logout();
                       setUser(null);
                    }} className="vs-btn vs-btn-secondary" style={{ width: '100%', marginTop: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                       Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuth}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '0.65rem', fontWeight: 800, color: authTab === 'login' ? 'var(--cyan)' : 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', background: authTab === 'login' ? 'rgba(0,240,255,0.05)' : 'rgba(0,255,135,0.05)', padding: '8px 12px', borderRadius: 6, width: 'fit-content' }}>
                      {authTab === 'login' ? <ShieldCheck size={12} /> : <UserPlus size={12} />}
                      {authTab === 'login' ? 'Security Protocol Active' : 'Identity Provisioning'}
                    </div>

                    {authTab === 'signup' && (
                      <div className="vs-float-group">
                        <input className="vs-float-input" type="text" required placeholder=" " value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <label className="vs-float-label">Full Legal Name</label>
                      </div>
                    )}

                    <div className="vs-float-group">
                      <input className="vs-float-input" type="email" required placeholder=" " value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      <label className="vs-float-label">Gmail Identity (@gmail.com)</label>
                    </div>

                    <div className="vs-float-group">
                      <input className="vs-float-input" type="password" required placeholder=" " value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      <label className="vs-float-label">Access Key (min 6 chars)</label>
                    </div>

                    <button type="submit" disabled={loading} className="vs-btn vs-btn-primary auth-submit">
                      {loading ? 'Processing...' : (authTab === 'login' ? 'Enter the Network →' : 'Create Account — It\'s Free')}
                    </button>
                  </form>
                )}

                {!user && (
                  <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {authTab === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setAuthTab(authTab === 'login' ? 'signup' : 'login')} style={{ color: 'var(--cyan)', fontWeight: 600, background: 'none', border: 'none', marginLeft: 5, cursor: 'pointer' }}>
                      {authTab === 'login' ? "Create one free" : "Sign in instead"}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="num"><CountUp value={500} suffix="+" /></div>
          <div className="stat-label">Charging Stations</div>
        </div>
        <div className="stat-item">
          <div className="num"><CountUp value={12} suffix="k+" /></div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-item">
          <div className="num"><CountUp value={99} suffix="%" /></div>
          <div className="stat-label">Network Uptime</div>
        </div>
        <div className="stat-item">
          <div className="num"><CountUp value={2.8} suffix="M kWh" /></div>
          <div className="stat-label">Energy Delivered</div>
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <section className="features-section">
        <div className="features-header">
          <div className="vs-pill vs-pill-cyan vs-icon-text" style={{ marginBottom: 18 }}>
            <Sparkles size={14} /> Platform Capabilities
          </div>
          <div className="features-title">Everything you need to<br /><span className="vs-gradient-text">charge smarter</span></div>
          <p className="features-subtitle">A unified platform for EV drivers, fleet operators, and charging station owners. Built with precision, designed for the future.</p>
        </div>

        <div className="features-grid">
          {[
            { 
              icon: <MapPin />, title: 'Real-time Station Map', 
              desc: 'Live occupancy data, queue predictions, and smart filtering across India\'s charging network. Never wait in an unknown queue again.',
              accent: 'linear-gradient(90deg,var(--cyan),var(--purple))', glow: 'rgba(0,240,255,0.06)', iconColor: 'var(--cyan)'
            },
            { 
              icon: <Route />, title: 'AI Trip Planner', 
              desc: 'Our neural engine calculates the optimal route with strategic charging stops, battery estimations, and real-time surge pricing awareness.',
              accent: 'linear-gradient(90deg,var(--purple),var(--cyan))', glow: 'rgba(181,109,255,0.06)', iconColor: 'var(--purple)'
            },
            { 
              icon: <Truck />, title: 'Fleet Auto-scheduler', 
              desc: 'AI assigns optimal chargers to every vehicle in your fleet simultaneously, minimizing downtime and maximizing throughput across your operation.',
              accent: 'linear-gradient(90deg,var(--green),var(--cyan))', glow: 'rgba(0,255,163,0.05)', iconColor: 'var(--green)'
            },
            { 
              icon: <Crown />, title: 'Premium Intelligence', 
              desc: 'Predictive occupancy forecasts, zero-queue routing hints, and early access to new AI features. Unlock the VahanSetu advantage.',
              accent: 'linear-gradient(90deg,var(--gold),var(--cyan))', glow: 'rgba(255,214,10,0.04)', iconColor: 'var(--gold)'
            },
            { 
              icon: <LayoutDashboard />, title: 'CPO Station Portal', 
              desc: 'Register chargers, monitor live sessions, track revenue, and access detailed analytics for your charging hardware business.',
              accent: 'linear-gradient(90deg,var(--cyan),var(--green))', glow: 'rgba(0,240,255,0.06)', iconColor: 'var(--cyan)'
            },
            { 
              icon: <BarChart3 />, title: 'Deep Analytics', 
              desc: 'Hourly demand heatmaps, station performance rankings, revenue forecasting, and sustainability impact metrics at your fingertips.',
              accent: 'linear-gradient(90deg,var(--purple),var(--green))', glow: 'rgba(181,109,255,0.05)', iconColor: 'var(--purple)'
            }
          ].map((f, i) => (
            <div key={i} className="feat-card vs-tilt" style={{ '--feat-accent': f.accent, '--feat-glow': f.glow, '--feat-icon-color': f.iconColor, '--feat-icon-bg': `${f.iconColor}1a`, '--feat-icon-border': `${f.iconColor}26`, '--feat-icon-glow': `${f.iconColor}33` }}>
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-card-title">{f.title}</div>
              <p className="feat-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="cta-section">
        <div className="cta-eyebrow">
          <div className="eyebrow-dot" style={{ background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}></div>
          Live Network · 500+ Stations
        </div>
        <h2 className="cta-title">Start your electric journey today</h2>
        <p className="cta-subtitle">Join thousands of EV owners who use VahanSetu to find, plan, and manage their charging experience smarter.</p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => { setAuthTab('signup'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="vs-btn vs-btn-primary vs-icon-text" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 16 }}>
            <Sparkles size={18} /> Get Started Free
          </button>
          <Link to="/map" className="vs-btn vs-btn-secondary vs-icon-text" style={{ padding: '16px 28px', fontSize: '1.05rem', borderRadius: 16 }}>
            <MapPin size={18} /> View Live Map
          </Link>
        </div>

        <div className="trust-row">
          <div className="trust-badge"><ShieldCheck size={14} color="var(--cyan)" /> Bank-grade security</div>
          <div className="trust-badge"><CheckCircle size={14} color="var(--green)" /> No credit card needed</div>
          <div className="trust-badge"><Zap size={14} color="var(--gold)" /> Live in 30 seconds</div>
          <div className="trust-badge"><Heart size={14} color="var(--red)" /> Built for India</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-copy">© 2026 VahanSetu Nexus. All rights reserved.</div>
        <div className="footer-links">
          <Link to="#">Privacy</Link>
          <Link to="#">Terms</Link>
          <Link to="#">Documentation</Link>
          <Link to="#">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
