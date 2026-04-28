import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout, showToast } from '../api';
import { useState, useEffect } from 'react';
import Logo from './Logo';
import { 
  MapPin, Truck, Zap, BarChart3, ShieldCheck, 
  Diamond, User, LogOut, Menu, X, Shield, Star
} from 'lucide-react';

export default function Navbar() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [location, navOpen]);

  const handleLogout = async () => {
    try { 
      await logout(); 
      showToast('🛡️ Security Session Terminated', 'success');
    } catch {}
    setUser(null);
    navigate('/');
  };

  const tabs = [
    { path: '/map',       icon: <MapPin size={15} />, label: 'Map' },
    { path: '/fleet',     icon: <Truck size={15} />, label: 'Fleet' },
    { path: '/cpo',       icon: <Zap size={15} />,   label: 'Host Portal' },
    { path: '/analytics', icon: <BarChart3 size={15} />, label: 'Analytics' },
  ];

  if (user?.role === 'admin') {
    tabs.push({ path: '/admin', icon: <ShieldCheck size={15} />, label: 'Control' });
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'VS';

  return (
    <nav className="vs-navbar" role="navigation" aria-label="Main navigation">
      {/* ── LOGO ── */}
      <Link to="/map" className="vs-logo" style={{ textDecoration: 'none' }}>
        <Logo />
      </Link>

      {/* ── NAV LINKS (centre) ── */}
      <div className={`vs-nav-links${navOpen ? ' nav-open' : ''}`} id="navLinks">
        {tabs.map(t => (
          <Link
            key={t.path}
            to={t.path}
            className={`vs-nav-link vs-icon-text${location.pathname.startsWith(t.path) ? ' active' : ''}`}
            onClick={() => setNavOpen(false)}
          >
            {t.icon}
            <span>{t.label}</span>
          </Link>
        ))}

        <Link 
          to="/premium" 
          className={`vs-nav-link vs-icon-text premium-link${location.pathname === '/premium' ? ' active' : ''}`}
          onClick={() => setNavOpen(false)}
        >
          <Diamond size={15} />
          <span>Premium</span>
        </Link>
      </div>

      {/* ── RIGHT SECTION: User Chip + Actions ── */}
      <div className="vs-nav-right">
        {user && (
          <>
            <Link to="/profile" className={`vs-user-chip${location.pathname === '/profile' ? ' active' : ''}`}>
              <div className="vs-user-avatar">{initials}</div>
              <div className="vs-user-info">
                <span className="vs-user-name">{user.name.split(' ')[0]}</span>
                <span className="vs-user-role">
                  {user.role === 'admin' ? (
                    <><Shield size={9} /> Admin</>
                  ) : user.is_premium ? (
                    <><Star size={9} /> Premium</>
                  ) : (
                    <><User size={9} /> Member</>
                  )}
                </span>
              </div>
            </Link>

            {/* Direct Sign Out Button (matches _navbar.html) */}
            <button 
              onClick={handleLogout} 
              className="vs-btn vs-btn-secondary vs-btn-sm vs-icon-text" 
              style={{ display: 'flex' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </>
        )}

        {/* Mobile hamburger */}
        <button 
          className="vs-hamburger vs-btn-icon vs-btn" 
          onClick={() => setNavOpen(!navOpen)}
          aria-expanded={navOpen}
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </nav>
  );
}
