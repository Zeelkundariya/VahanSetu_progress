import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import FleetPage from './pages/FleetPage';
import CpoPage from './pages/CpoPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import PremiumPage from './pages/PremiumPage';
import EconomyPage from './pages/EconomyPage';
import AdminPage from './pages/AdminPage';
import Toast from './components/Toast';
import Background from './components/Background';
import VoiceAssistant from './components/VoiceAssistant';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("GLOBAL_CRASH:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', background: '#04060f' }}>
          <div>
            <h1 style={{ fontSize: '3rem', color: 'var(--cyan)' }}>System Breach Detected</h1>
            <p style={{ opacity: 0.6 }}>A quantum render failure occurred. Auto-stabilizing...</p>
            <button className="vs-btn" onClick={() => window.location.reload()}>Re-Initialize</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(0,240,255,0.2)', borderTop: '3px solid var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'Inter,sans-serif' }}>Initializing VahanSetu...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/map"       element={<Protected><MapPage /></Protected>} />
      <Route path="/fleet"     element={<Protected><FleetPage /></Protected>} />
      <Route path="/cpo"       element={<Protected><CpoPage /></Protected>} />
      <Route path="/analytics" element={<Protected><AnalyticsPage /></Protected>} />
      <Route path="/profile"   element={<Protected><ProfilePage /></Protected>} />
      <Route path="/premium"   element={<Protected><PremiumPage /></Protected>} />
      <Route path="/economy"   element={<Protected><EconomyPage /></Protected>} />
      <Route path="/admin"     element={<Protected><AdminPage /></Protected>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Background />
        <Toast />
        <div id="vs-debug-hud" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: '#0f0', fontSize: '10px', padding: '5px', pointerEvents: 'none' }}>
           VahanSetu Debug: {window.location.pathname}
        </div>
        <ErrorBoundary>
          <VoiceAssistant />
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
