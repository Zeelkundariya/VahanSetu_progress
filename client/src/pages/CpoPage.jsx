import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  Zap, Download, Plus, Server, IndianRupee, TrendingUp, Activity, 
  Layout, Inbox, MapPin, ExternalLink, Trash2, Trophy, Terminal, 
  HeartPulse, X, ShieldCheck
} from 'lucide-react';
import { api, showToast } from '../api';

export default function CpoPage() {
  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState({
    active_bays: 0, total_bays: 0, revenue: 0, revenue_growth: 0,
    kwh: 0, sessions: 0, network_uptime: 99.8
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  const [deployLoading, setDeployLoading] = useState(false);
  const [deployData, setDeployData] = useState({
    name: '', address: '', lat: '', lng: '', connector: 'CCS2 Combo (DC Fast)', power: 60, bays: 4
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Live sync
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/host/dashboard');
      if (res.data.status === 'success') {
        setStations(res.data.stations || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.recent_events) setEvents(res.data.recent_events);
      }
    } catch (e) {
      console.error("Stewardship sync failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setDeployLoading(true);
    try {
      const res = await api.post('/api/host/deploy', deployData);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowDeploy(false);
        setDeployData({ name: '', address: '', lat: '', lng: '', connector: 'CCS2 Combo (DC Fast)', power: 60, bays: 4 });
        fetchData();
      } else {
        showToast(res.data.message || 'Deployment Rejected', 'error');
      }
    } catch (e) {
      showToast('Quantum Provisioning Error', 'error');
    } finally {
      setDeployLoading(false);
    }
  };

  const [removeLoading, setRemoveLoading] = useState(null);

  const handleRemove = async (id) => {
    if (!window.confirm("⚠️ Are you sure you want to decommission this station? This action cannot be undone.")) return;
    setRemoveLoading(id);
    try {
      const res = await api.delete(`/api/host/station/${id}`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowDetails(false);
        fetchData();
      } else {
        showToast(res.data.message || 'Decommissioning Failed', 'error');
      }
    } catch (e) {
      console.error("Removal fail:", e);
      showToast('Nexus Protocol Error during removal', 'error');
    } finally {
      setRemoveLoading(null);
    }
  };

  const openDetails = (station) => {
    setSelectedStation(station);
    setShowDetails(true);
  };

  if (loading && stations.length === 0) return (
    <div className="vs-loading-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
      <div className="vs-spinner"></div>
      <span style={{ marginLeft: 16, color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Initializing Infrastructure Console...</span>
    </div>
  );

  return (
    <div className="app">
      <Navbar />
      
      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: 1680 }}>
          {/* Header */}
          <div className="vs-flex-between" style={{ marginBottom: 40 }}>
            <div>
              <h1 className="vs-page-title vs-icon-text" style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.8px', margin: 0, textTransform: 'uppercase' }}>
                 <Zap size={38} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' }} />
                 <span>Infrastructure</span> <span style={{ color: 'var(--cyan)' }}>Console</span>
              </h1>
              <p className="vs-page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 4 }}>Manage your charging stations, monitor revenue, and track grid performance.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="vs-btn vs-btn-secondary vs-icon-text" style={{ padding: '12px 24px' }}>
                <Download size={15} /> Export
              </button>
              <button className="vs-btn vs-btn-primary vs-icon-text" onClick={() => setShowDeploy(true)} style={{ padding: '12px 24px' }}>
                <Plus size={15} /> Deploy Station
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
             <div className="vs-glass" style={{ padding: 28, borderRadius: 20, borderTop: '4px solid var(--cyan)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Server size={13} /> Active Stations</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--cyan)' }}>{stations.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>{stats.active_bays}/{stats.total_bays} bays available</div>
             </div>
             <div className="vs-glass" style={{ padding: 28, borderRadius: 20, borderTop: '4px solid var(--gold)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><IndianRupee size={13} /> Total Revenue</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--gold)' }}>
                   ₹{stats.revenue.toLocaleString()}
                   <span style={{ fontSize: '0.68rem', background: 'rgba(0,255,135,0.1)', color: 'var(--green)', padding: '3px 8px', borderRadius: 6, marginLeft: 8 }}><TrendingUp size={11} inline /> {stats.revenue_growth}%</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>Gross earnings this cycle</div>
             </div>
             <div className="vs-glass" style={{ padding: 28, borderRadius: 20, borderTop: '4px solid var(--green)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Zap size={13} /> Energy Delivered</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{stats.kwh.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>kWh</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>Across {stats.sessions} sessions</div>
             </div>
             <div className="vs-glass" style={{ padding: 28, borderRadius: 20, borderTop: '4px solid var(--purple)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Activity size={13} /> Network Uptime</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--purple)' }}>{stats.network_uptime}%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>Mean availability across nodes</div>
             </div>
          </div>

          <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 36 }}>
            {/* Left: Station Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--glass-border-2)', paddingBottom: 12 }}>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, textTransform: 'uppercase', letterSpacing: '-1px' }}>
                    <Layout size={22} color="var(--cyan)" /> Your Stations
                 </div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stations.length} REGISTERED</div>
              </div>

              {stations.length === 0 ? (
                <div className="vs-glass" style={{ textAlign: 'center', padding: '80px 40px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 24 }}>
                   <Inbox size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
                   <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', marginBottom: 10 }}>Registry Empty</div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>Deploy your first charging node to the VahanSetu network to start monitoring real-time grid telemetry.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                  {stations.map(station => {
                    const totalBays = station.total_bays || 4;
                    const freeBays = station.available_bays || 0;
                    const usedBays = totalBays - freeBays;
                    return (
                      <div key={station.id} className="vs-glass vs-tilt" style={{ 
                        padding: 24, borderRadius: 24, borderTop: '4px solid var(--green)', 
                        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        background: 'var(--bg-glass)', backdropFilter: 'blur(30px)'
                      }}>
                        <div style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(0,255,135,0.1)', color: 'var(--green)', padding: '4px 10px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ONLINE</div>
                        
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#fff', marginBottom: 6, letterSpacing: '-0.5px' }}>{station.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
                          <MapPin size={12} color="var(--cyan)" /> {station.address}
                        </div>
                        
                        {/* Metric Pods */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                           {[
                             { lbl: 'Bays Free', val: `${freeBays}/${totalBays}`, color: 'var(--cyan)' },
                             { lbl: '₹/kWh', val: `₹${station.price_per_kwh || '15.0'}`, color: 'var(--gold)' },
                             { lbl: 'Power', val: `${station.power_kw}kW`, color: 'var(--green)' }
                           ].map((m, idx) => (
                             <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border-2)', borderRadius: 14, padding: '16px 8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: m.color }}>{m.val}</div>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{m.lbl}</div>
                             </div>
                           ))}
                        </div>

                        {/* Bay Signal Dots */}
                        <div style={{ marginTop: 'auto' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, padding: '0 4px' }}>
                              <span style={{ opacity: 0.8 }}>Active Bay Signal</span>
                              <span>{usedBays}/{totalBays} Busy</span>
                           </div>
                           <div style={{ display: 'flex', gap: 10, padding: '14px 24px', background: '#07090f', borderRadius: 40, border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                              {Array.from({ length: totalBays }).map((_, i) => (
                                <div key={i} style={{ 
                                    width: 8, height: 8, borderRadius: '50%', 
                                    background: i < usedBays ? 'var(--cyan)' : '#1a2233',
                                    boxShadow: i < usedBays ? '0 0 12px var(--cyan), 0 0 20px var(--cyan)' : 'none',
                                    animation: i < usedBays ? 'pulse 2s infinite' : 'none'
                                }} />
                              ))}
                              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700 }}>{station.connector_type || 'CCS2'}</span>
                           </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                           <button className="vs-btn vs-btn-sm vs-btn-secondary" onClick={() => openDetails(station)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.03)' }}>
                              <ExternalLink size={14} /> Details
                           </button>
                           <button className="vs-btn vs-btn-sm vs-btn-secondary" onClick={() => handleRemove(station.id)} disabled={removeLoading === station.id} style={{ flex: 1, padding: 10, color: 'var(--red)', background: 'rgba(255,61,107,0.05)' }}>
                              {removeLoading === station.id ? 'Decommissioning...' : <><Trash2 size={14} /> Remove</>}
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Top Performing */}
              <div className="vs-glass" style={{ padding: 28, borderRadius: 24, background: 'var(--bg-glass)' }}>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Trophy size={16} color="var(--gold)" /> Top Performing Node
                 </div>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: 'var(--cyan)', marginBottom: 16, letterSpacing: '-0.5px' }}>{stations[0]?.name || 'Analyzing Grid...'}</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '12px 0', borderBottom: '1px solid var(--glass-border-2)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Load Factor</span>
                    <span style={{ fontWeight: 800, color: 'var(--green)' }}>74% Optimal</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '12px 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Revenue Share</span>
                    <span style={{ fontWeight: 800, color: 'var(--gold)' }}>38% Network</span>
                 </div>
              </div>

              {/* Activity Log */}
              <div className="vs-glass" style={{ padding: 28, borderRadius: 24, background: 'var(--bg-glass)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignContent: 'center', marginBottom: 20 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                       <Terminal size={16} color="var(--purple)" /> Activity Log
                    </div>
                    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--cyan)', padding: '4px 10px', border: '1px solid var(--cyan-dim)', borderRadius: 6, background: 'rgba(0,240,255,0.05)' }}>LIVE FEED</span>
                 </div>
                 <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 8 }}>
                    {events.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12 }}>Standby for telemetry...</div>
                    ) : (
                      events.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i === events.length - 1 ? 'none' : '1px solid var(--glass-border-2)', fontSize: '0.75rem' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />
                              <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                           </div>
                           <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                 <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.7rem' }}>TRANSACTION_LOG</span>
                                 <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.65rem' }}>{ev.start_time.slice(-8, -3)}</span>
                              </div>
                              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                 Node <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{ev.station_name}</span> processed <span style={{ color: 'var(--green)', fontWeight: 700 }}>{ev.energy_kwh}kWh</span> for <span style={{ color: 'var(--gold)', fontWeight: 700 }}>₹{ev.cost}</span>
                              </span>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>

              {/* System Health */}
              <div className="vs-glass" style={{ padding: 28, borderRadius: 24, background: 'var(--bg-glass)' }}>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <HeartPulse size={16} color="var(--green)" /> Core Grid Health
                 </div>
                 {[
                   { l: 'Main Database', v: 'Active (WAL)', c: 'var(--green)' },
                   { l: 'API Latency', v: '12ms', c: 'var(--green)' },
                   { l: 'Cloud Sync', v: 'Secured', c: 'var(--green)' },
                   { l: 'Security Layer', v: 'Encrypted', c: 'var(--cyan)' }
                 ].map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '12px 0', borderBottom: i === 3 ? 'none' : '1px solid var(--glass-border-2)' }}>
                       <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{h.l}</span>
                       <span style={{ fontWeight: 800, color: h.c }}>{h.v}</span>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedStation && (
        <div className="vs-modal-overlay" onClick={() => setShowDetails(false)}>
           <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 40, borderRadius: 32 }}>
              <div className="vs-flex-between" style={{ marginBottom: 32 }}>
                 <div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{selectedStation.name}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {selectedStation.address}</p>
                 </div>
                 <button className="vs-btn-icon" onClick={() => setShowDetails(false)} style={{ background: 'rgba(255,255,255,0.05)' }}><X /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                <div className="vs-glass" style={{ padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                   <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Total Revenue</div>
                   <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)' }}>₹{selectedStation.total_revenue?.toLocaleString() || 0}</div>
                </div>
                <div className="vs-glass" style={{ padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                   <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Total Sessions</div>
                   <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan)' }}>{selectedStation.sessions_count || 0}</div>
                </div>
                <div className="vs-glass" style={{ padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                   <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Interface</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)' }}>{selectedStation.connector_type}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 20, marginBottom: 32 }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>Live Bay Telemetry</h4>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedStation.total_bays}, 1fr)`, gap: 12 }}>
                   {Array.from({ length: selectedStation.total_bays }).map((_, i) => (
                     <div key={i} style={{ height: 60, borderRadius: 12, background: i < (selectedStation.total_bays - selectedStation.available_bays) ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: i < (selectedStation.total_bays - selectedStation.available_bays) ? 'var(--cyan)' : 'var(--text-muted)', marginBottom: 6, boxShadow: i < (selectedStation.total_bays - selectedStation.available_bays) ? '0 0 10px var(--cyan)' : 'none' }}></div>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.6 }}>B{i+1}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                 <button className="vs-btn vs-btn-secondary" style={{ flex: 1, padding: 16 }} disabled={removeLoading === selectedStation.id} onClick={() => handleRemove(selectedStation.id)}>
                    {removeLoading === selectedStation.id ? 'Processing...' : <><Trash2 size={16} color="var(--red)" /> Decommission Station</>}
                 </button>
                 <button className="vs-btn vs-btn-primary" style={{ flex: 1, padding: 16 }} onClick={() => setShowDetails(false)}>Close Inspector</button>
              </div>
           </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeploy && (
        <div className="vs-modal-overlay" onClick={() => setShowDeploy(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, padding: 40, borderRadius: 32 }}>
            <div className="vs-flex-between" style={{ marginBottom: 32 }}>
              <h2 className="vs-modal-title" style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-1px' }}>
                <ShieldCheck size={26} color="var(--cyan)" /> Deploy New Node
              </h2>
              <button className="vs-btn-icon" onClick={() => setShowDeploy(false)} style={{ background: 'rgba(255,255,255,0.05)' }}><X /></button>
            </div>
            <form onSubmit={handleDeploy}>
               <div className="vs-float-group" style={{ marginBottom: 24 }}>
                  <input className="vs-float-input" required placeholder=" " value={deployData.name} onChange={e => setDeployData({...deployData, name: e.target.value})} style={{ fontSize: '1rem', padding: '16px 18px' }} />
                  <label className="vs-float-label">Station Name / Alias</label>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                  <div className="vs-float-group">
                    <input className="vs-float-input" required placeholder=" " type="number" step="any" value={deployData.lat} onChange={e => setDeployData({...deployData, lat: e.target.value})} />
                    <label className="vs-float-label">Latitude</label>
                  </div>
                  <div className="vs-float-group">
                    <input className="vs-float-input" required placeholder=" " type="number" step="any" value={deployData.lng} onChange={e => setDeployData({...deployData, lng: e.target.value})} />
                    <label className="vs-float-label">Longitude</label>
                  </div>
               </div>

               <div className="vs-float-group" style={{ marginBottom: 24 }}>
                  <input className="vs-float-input" required placeholder=" " value={deployData.address} onChange={e => setDeployData({...deployData, address: e.target.value})} />
                  <label className="vs-float-label">Physical Street Address</label>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interface Type</label>
                    <select className="vs-input" value={deployData.connector} onChange={e => setDeployData({...deployData, connector: e.target.value})} style={{ background: 'var(--bg-deep)', borderRadius: 14 }}><option>CCS2 Combo (DC Fast)</option><option>Type 2 (AC Heavy)</option></select>
                  </div>
                  <div className="vs-float-group" style={{ marginTop: 18 }}>
                    <input className="vs-float-input" required placeholder=" " type="number" value={deployData.power} onChange={e => setDeployData({...deployData, power: e.target.value})} />
                    <label className="vs-float-label">Max Power (kW)</label>
                  </div>
               </div>

               <div className="form-actions" style={{ display: 'flex', gap: 16 }}>
                  <button type="button" className="vs-btn vs-btn-secondary" style={{ flex: 1, padding: 18, borderRadius: 16 }} onClick={() => setShowDeploy(false)}>Abort</button>
                  <button type="submit" disabled={deployLoading} className="vs-btn vs-btn-primary" style={{ flex: 2, padding: 18, borderRadius: 16, fontSize: '1rem' }}>{deployLoading ? 'Deploying...' : 'Authorize Deployment'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
