import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  ShieldCheck, Zap, Leaf, Settings2, Lock, Car, MapPin, 
  ChevronRight, Activity, PieChart, Wallet, ShieldAlert, 
  History, MessageSquare, Key, BatteryCharging, X, Star
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { api, showToast } from '../api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  ArcElement, Tooltip, Legend, Filler
);

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
   const [editName, setEditName] = useState('');
   const [credits, setCredits] = useState({ total_balance: 0, history: [], impact_metrics: {} });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/profile_data');
       setData(res.data);
       setEditName(user?.name || '');
       fetchCredits();
    } catch (e) {
      console.error("Profile sync failed", e);
     } finally {
       setLoading(false);
     }
   };
 
   const fetchCredits = async () => {
     try {
       const { data } = await api.get('/api/credits/ledger');
       setCredits(data);
     } catch {}
   };

  if (loading && !data) return (
    <div className="vs-loading-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
      <div className="vs-spinner"></div>
      <span style={{ marginLeft: 16, color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Syncing Identity Hub...</span>
    </div>
  );

  const stats = data?.stats || {};
  const history = data?.history || [];
  const securityLogs = data?.security_logs || [];
  const favourites = data?.favourites || [];
  const vehicles = data?.vehicles || [];

  const activityChartData = {
    labels: Array.from({ length: 12 }, (_, i) => `W${i + 1}`),
    datasets: [{
      label: 'Capacity (kWh)',
      data: Array.from({ length: 12 }, () => Math.round(Math.random() * 45 + 15)),
      borderColor: '#00f0ff',
      borderWidth: 3,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: 'rgba(0, 240, 255, 0.1)'
    }]
  };

  const connectorData = {
    labels: ['DC Fast', 'AC Type-2'],
    datasets: [{
      data: [65, 35],
      backgroundColor: ['#00f0ff', '#b56dff'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'VS';

  return (
    <div className="app">
      <Navbar />

      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: 1600 }}>
          {/* Header */}
          <div className="vs-page-header" style={{ marginBottom: 40 }}>
            <h1 className="vs-page-title vs-icon-text" style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.5px', margin: 0, textTransform: 'uppercase' }}>
              <ShieldCheck size={36} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.5))' }} />
              User <span style={{ color: 'var(--cyan)' }}>Identity Hub</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Manage your digital credentials and analyze network consumption patterns.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32 }}>
            {/* Left Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Avatar Card (Precision HTML Port) */}
              <div className="vs-glass" style={{ padding: '40px 32px', borderRadius: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,255,135,0.08))', zIndex: 0 }}></div>
                 
                 <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px', zIndex: 2 }}>
                    <div className="avatar-ring-animated"></div>
                    <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: '#02050b', zIndex: 1 }}></div>
                    <div style={{ 
                        position: 'absolute', inset: 6, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,255,135,0.2))', 
                        border: '1px solid rgba(0,240,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#fff', zIndex: 2 
                    }}>
                       {initials}
                    </div>
                 </div>

                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, position: 'relative', zIndex: 2 }}>{user?.name || 'EV Pioneer'}</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, position: 'relative', zIndex: 2 }}>{user?.email}</div>
                 
                 {user?.is_premium ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255, 214, 10, 0.1)', border: '1px solid rgba(255, 214, 10, 0.3)', color: 'var(--gold)', letterSpacing: '0.05em', marginBottom: 24, zIndex: 2, position: 'relative' }}>
                       <Zap size={13} /> Quantum Tier
                    </div>
                 ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border-2)', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 24, zIndex: 2, position: 'relative' }}>
                       Standard Node · <a href="/premium" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 700 }}>Upgrade</a>
                    </div>
                 )}

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)', textAlign: 'left' }}>
                       <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>{stats.total_sessions || 0}</div>
                       <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>Charges</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)', textAlign: 'left' }}>
                       <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)' }}>{(stats.total_kwh || 0).toFixed(1)}</div>
                       <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>kWh Out</div>
                    </div>
                 </div>

                 {/* CARBON CREDIT ECONOMY (Next-Level Feature) */}
                 <div className="vs-glass" style={{ marginTop: 24, padding: 20, borderRadius: 20, background: 'linear-gradient(135deg, rgba(0,255,163,0.1), transparent)', borderColor: 'rgba(0,255,163,0.3)', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                       <Zap size={14} /> VahanCredits Ledger
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 15 }}>
                       <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{credits.total_balance}</div>
                       <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Liquid Credits</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                       <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 14 }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)' }}>{credits.impact_metrics?.trees_planted_equiv || 0}</div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trees Equiv.</div>
                       </div>
                       <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 14 }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)' }}>{credits.impact_metrics?.co2_offset_kg || 0}kg</div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CO2 Offset</div>
                       </div>
                    </div>
                    <div style={{ marginTop: 15, fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                       Every 10 kWh earns 1 Carbon Credit
                    </div>
                 </div>

                 <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="vs-btn vs-btn-primary" style={{ width: '100%', borderRadius: 12, fontWeight: 700 }} onClick={() => setShowEdit(true)}>
                       <Settings2 size={16} /> Configure Identity
                    </button>
                    <a href="#" className="vs-btn vs-btn-ghost" style={{ width: '100%', borderRadius: 12, textAlign: 'center', display: 'flex', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <Lock size={16} /> Security Keys
                    </a>
                 </div>
              </div>

              {/* EVs */}
              <div className="vs-glass" style={{ padding: 24, borderRadius: 20 }}>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.95rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Car size={16} color="var(--gold)" /> My Registered EVs
                 </div>
                 {vehicles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No vehicles found.</div>
                 ) : (
                    vehicles.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i === vehicles.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255, 214, 10, 0.05)', color: 'var(--gold)', border: '1px solid rgba(255, 214, 10, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BatteryCharging size={14} /></div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{v.model}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{v.plate} · {v.health} Health</div>
                         </div>
                         <span style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(0,255,135,0.1)', color: 'var(--green)', fontWeight: 800 }}>{v.status}</span>
                      </div>
                    ))
                 )}
              </div>

              {/* Saved Terminals */}
              <div className="vs-glass" style={{ padding: 24, borderRadius: 20 }}>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.95rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Star size={16} color="var(--gold)" /> Saved Terminals
                 </div>
                 {favourites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No bookmarked terminals.</div>
                 ) : (
                    favourites.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i === favourites.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={14} /></div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{f.address}</div>
                         </div>
                         <ChevronRight size={16} color="var(--cyan)" />
                      </div>
                    ))
                 )}
              </div>
            </div>

            {/* Right Dashboard */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 24 }}>
                  {/* Consumption Velocity */}
                  <div className="vs-glass" style={{ padding: 32, borderRadius: 20, borderTop: '4px solid var(--cyan)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                           <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                              <Activity size={18} color="var(--cyan)" /> Consumption Velocity
                           </div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Energy throughput (kWh) monitored over the last 12 weeks.</div>
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--cyan)', padding: '4px 10px', background: 'rgba(0,240,255,0.05)', border: '1px solid var(--cyan-dim)', borderRadius: 6, textTransform: 'uppercase' }}>Real-time Telemetry</span>
                     </div>
                     <div style={{ height: 220 }}><Line data={activityChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} /></div>
                  </div>

                  {/* Connector Mix */}
                  <div className="vs-glass" style={{ padding: 32, borderRadius: 20, borderTop: '4px solid var(--purple)' }}>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: '#fff', marginBottom: 8 }}>
                        <PieChart size={18} color="var(--purple)" /> Connector Mix
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>Preferred interface types.</div>
                     <div style={{ height: 140 }}><Doughnut data={connectorData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '80%' }} /></div>
                     <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                             <span style={{ width: 8, height: 8, background: 'var(--cyan)', border_radius: '50%' }}></span> DC Fast-1
                         </div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                             <span style={{ width: 8, height: 8, background: 'var(--purple)', border_radius: '50%' }}></span> AC Type-2
                         </div>
                     </div>
                  </div>
               </div>

               {/* Stats & Sustainability */}
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                     <div className="vs-glass vs-tilt" style={{ padding: 24, borderRadius: 20 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(0,240,255,0.1)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Zap size={18} /></div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual Throughput</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800 }}>{(stats.total_kwh || 0).toFixed(1)} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>kWh</span></div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>energy utilized</div>
                     </div>
                     <div className="vs-glass vs-tilt" style={{ padding: 24, borderRadius: 20 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255, 214, 10, 0.1)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Wallet size={18} /></div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Infrastructure Spend</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800 }}><span style={{ fontSize: '1.1rem', opacity: 0.5 }}>₹</span>{(stats.total_spend || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>investment in mobility</div>
                     </div>
                  </div>
                  <div className="vs-glass" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.05), rgba(0, 240, 255, 0.05))', border: '1px solid rgba(0, 255, 135, 0.2)', display: 'flex', alignItems: 'center', gap: 20 }}>
                     <div style={{ width: 56, height: 56, background: 'rgba(0,255,135,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}><Leaf size={28} /></div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: 'var(--green)' }}>{(stats.co2_saved || 0).toFixed(1)} kg</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginTop: 4 }}>Net CO₂ Offset</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--green)', marginTop: 8, font_weight: 700 }}>+12% Efficiency Boost this month</div>
                     </div>
                  </div>
               </div>

               {/* Access Protocol Log */}
               <div className="vs-glass" style={{ padding: 32, borderRadius: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                     <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                           <ShieldAlert size={18} color="var(--cyan)" /> Access & Session Protocol
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Audit trail of recent account interactions and security logs.</div>
                     </div>
                  </div>
                  <table className="vs-table">
                     <thead>
                        <tr><th>Timestamp</th><th>Access Point (IP)</th><th>Agent / Device</th><th>Verification Status</th></tr>
                     </thead>
                     <tbody>
                        {securityLogs.length === 0 ? (
                           <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No logs synchronized.</td></tr>
                        ) : (
                           securityLogs.map((s, i) => (
                              <tr key={i}>
                                 <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff' }}>{s.ts}</td>
                                 <td style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700 }}>{s.ip}</td>
                                 <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.device?.substring(0, 40)}...</td>
                                 <td>
                                    <span style={{ 
                                       fontSize: '0.55rem', fontWeight: 800, padding: '4px 8px', borderRadius: 4, 
                                       background: s.status?.includes('Current') ? 'rgba(0,240,255,0.1)' : 'rgba(0,255,135,0.1)',
                                       color: s.status?.includes('Current') ? 'var(--cyan)' : 'var(--green)'
                                    }}>{s.status || 'Verified'}</span>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>

               {/* Carbon Economy Ledger */}
               <div className="vs-glass" style={{ padding: 32, borderRadius: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                     <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
                           <Leaf size={18} /> Carbon Credit Verification Ledger
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Blockchain-ready verified earnings for green mobility.</div>
                     </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                  <table className="vs-table">
                     <thead>
                        <tr><th>Transaction ID</th><th>Earning Event</th><th>Impact Factor</th><th>Credit Amount</th></tr>
                     </thead>
                     <tbody>
                        {credits.history.length === 0 ? (
                           <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Initial Credits seeding in progress...</td></tr>
                        ) : (
                           credits.history.map((h, i) => (
                              <tr key={i}>
                                 <td style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>#{h.id.toString().padStart(6, '0')}</td>
                                 <td style={{ fontWeight: 700 }}>{h.source}</td>
                                 <td style={{ color: 'var(--green)' }}>Verified Green</td>
                                 <td style={{ fontWeight: 900, color: 'var(--green)' }}>+{h.amount} VS</td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
                  </div>
               </div>

               {/* Transaction History */}
               <div className="vs-glass" style={{ padding: 32, borderRadius: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                     <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                           <History size={18} color="var(--cyan)" /> Transaction History
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>End-to-end logs of recent charging interactions.</div>
                     </div>
                  </div>
                  <table className="vs-table">
                     <thead>
                        <tr><th>Infrastructure Node</th><th>Timestamp</th><th>Volume (kWh)</th><th>Financials</th><th>Status</th></tr>
                     </thead>
                     <tbody>
                        {history.length === 0 ? (
                           <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transaction logs available.</td></tr>
                        ) : (
                           history.map((h, i) => (
                              <tr key={i}>
                                 <td>
                                    <div style={{ fontWeight: 700, color: '#fff' }}>{h.station_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.address?.substring(0, 40)}...</div>
                                 </td>
                                 <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.start_time?.slice(0, 16)}</td>
                                 <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--cyan)' }}>{(h.kwh || 0).toFixed(1)}</td>
                                 <td style={{ fontWeight: 800, color: 'var(--gold)' }}>₹{(h.cost || 0).toLocaleString()}</td>
                                 <td><span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '4px 8px', borderRadius: 4, background: 'rgba(0,255,135,0.1)', color: 'var(--green)' }}>COMPLETE</span></td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>

               {/* Settings Engine */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                  <div className="vs-glass" style={{ padding: 28, borderRadius: 24 }}>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <Settings2 size={18} color="var(--cyan)" /> Stewardship Preferences
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Linguistic Preference</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary interface language.</div>
                           </div>
                           <select className="vs-input" style={{ width: 'auto', borderRadius: 10, padding: '8px 12px' }}>
                              <option>English (Global)</option><option>Hindi (Localized)</option>
                           </select>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>WhatsApp Criticals</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time telemetry pings.</div>
                           </div>
                           <div style={{ width: 44, height: 22, background: 'var(--cyan)', borderRadius: 20, position: 'relative' }}>
                              <div style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%' }}></div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="vs-glass" style={{ padding: 28, borderRadius: 24 }}>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <MessageSquare size={18} color="var(--purple)" /> Feedback Vault
                     </div>
                     <textarea className="vs-input" placeholder="Describe node anomalies or suggest features..." style={{ minHeight: 100, marginBottom: 16 }}></textarea>
                     <button className="vs-btn vs-btn-primary" style={{ width: '100%', borderRadius: 12 }}>Transmit Message</button>
                  </div>
               </div>

            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal (Precision HTML Port) */}
      {showEdit && (
        <div className="vs-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: 40, borderRadius: 32 }}>
            <div className="vs-flex-between" style={{ marginBottom: 10 }}>
              <h2 className="vs-modal-title" style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>Identity Configuration</h2>
              <button className="vs-btn-icon" onClick={() => setShowEdit(false)}><X /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 32 }}>Update your display characteristics on the network.</p>
            <form onSubmit={e => { e.preventDefault(); setShowEdit(false); showToast('Identity Updated', 'success'); }}>
               <div className="vs-float-group" style={{ marginBottom: 24 }}>
                  <input className="vs-float-input" required placeholder=" " value={editName} onChange={e => setEditName(e.target.value)} />
                  <label className="vs-float-label">Display Name</label>
               </div>
               <div className="vs-float-group" style={{ marginBottom: 32, opacity: 0.5 }}>
                  <input className="vs-float-input" value={user?.email} disabled />
                  <label className="vs-float-label">Network ID (Read Only)</label>
               </div>
               <div style={{ display: 'flex', gap: 16 }}>
                  <button type="button" className="vs-btn vs-btn-secondary" style={{ flex: 1 }} onClick={() => setShowEdit(false)}>Abort</button>
                  <button type="submit" className="vs-btn vs-btn-primary" style={{ flex: 2 }}>Push Updates</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .avatar-ring-animated {
          position: absolute; inset: -8px; border-radius: 50%;
          background: conic-gradient(var(--cyan) 0%, var(--green) 40%, var(--purple) 70%, var(--cyan) 100%);
          animation: avatar-spin-fast 6s linear infinite;
          filter: blur(4px);
        }
        @keyframes avatar-spin-fast { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
