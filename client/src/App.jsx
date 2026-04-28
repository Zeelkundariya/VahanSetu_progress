import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import FleetPage from './pages/FleetPage';
import CpoPage from './pages/CpoPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import PremiumPage from './pages/PremiumPage';
import Toast from './components/Toast';
import Background from './components/Background';

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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
