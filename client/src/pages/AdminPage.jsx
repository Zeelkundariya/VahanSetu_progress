import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  ShieldCheck, Activity, Zap, IndianRupee, Globe, 
  Terminal, AlertTriangle, Play, Square, RefreshCcw,
  Users, Server, Database, Lock
} from 'lucide-react';
import { api, showToast } from '../api';

export default function AdminPage() {
  const [stats, setStats] = useState({
    total_users: 1242, active_nodes: 48, grid_load: 34,
    network_revenue: 842000, daily_kwh: 4200, system_health: 99.9
  });
  const [logs, setLogs] = useState([
    { time: '15:10:02', msg: 'GRID_SYNC: Frequency stabilized at 50.02Hz', type: 'info' },
    { time: '15:10:05', msg: 'SECURITY: Brute-force attempt blocked on node #42', type: 'warning' },
    { time: '15:10:08', msg: 'OCPP_PULSE: Handshake successful with Nexus-Alpha', type: 'success' }
  ]);
  const [isGridOverride, setIsGridOverride] = useState(false);

  useEffect(() => {
    // Simulated live metrics
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        grid_load: Math.min(100, Math.max(0, prev.grid_load + (Math.random() * 4 - 2))),
        network_revenue: prev.network_revenue + Math.random() * 100
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleOverride = () => {
    setIsGridOverride(!isGridOverride);
    showToast(isGridOverride ? 'Manual Override Disengaged' : 'Grid Intelligence Overridden', 'warning');
  };

  return (
    <div className="app">
      <Navbar />
      
      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: 1600 }}>
          {/* Admin Header */}
          <div className="vs-flex-between" style={{ marginBottom: 40 }}>
            <div>
              <h1 className="vs-page-title vs-icon-text" style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.8px', margin: 0, textTransform: 'uppercase' }}>
                 <ShieldCheck size={38} color="var(--purple)" style={{ filter: 'drop-shadow(0 0 8px rgba(181,109,255,0.4))' }} />
                 <span>Network</span> <span style={{ color: 'var(--purple)' }}>Command</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 4 }}>Surveillance, Grid Override, and Global Infrastructure Oversight.</p>
            </div>
            <div className="vs-badge-live" style={{ background: 'rgba(181,109,255,0.1)', color: 'var(--purple)', padding: '10px 24px' }}>
               <Lock size={14} /> LEVEL 4 ACCESS GRANTED
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
             {[
               { lbl: 'Total Network Users', val: stats.total_users, icon: <Users size={14} />, color: 'var(--cyan)' },
               { lbl: 'Global Revenue', val: `₹${Math.floor(stats.network_revenue).toLocaleString()}`, icon: <IndianRupee size={14} />, color: 'var(--gold)' },
               { lbl: 'Grid Load Factor', val: `${Math.round(stats.grid_load)}%`, icon: <Activity size={14} />, color: stats.grid_load > 70 ? 'var(--red)' : 'var(--green)' },
               { lbl: 'System Uptime', val: `${stats.system_health}%`, icon: <ShieldCheck size={14} />, color: 'var(--cyan)' }
             ].map((k, i) => (
               <div key={i} className="vs-glass" style={{ padding: 24, borderRadius: 20, borderTop: `4px solid ${k.color}` }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>{k.icon} {k.lbl}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: k.color }}>{k.val}</div>
               </div>
             ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
               {/* Grid Control Console */}
               <div className="vs-glass" style={{ padding: 32, borderRadius: 24, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="vs-flex-between" style={{ marginBottom: 28 }}>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Zap size={20} color="var(--gold)" /> Grid Optimization Engine
                     </div>
                     <div style={{ display: 'flex', gap: 12 }}>
                        <button className={`vs-btn vs-btn-sm ${isGridOverride ? 'vs-btn-primary' : 'vs-btn-secondary'}`} onClick={toggleOverride} style={{ borderRadius: 12 }}>
                           {isGridOverride ? <Square size={14} /> : <Play size={14} />} {isGridOverride ? 'Override Active' : 'Manual Override'}
                        </button>
                        <button className="vs-btn vs-btn-sm vs-btn-secondary" style={{ borderRadius: 12 }}><RefreshCcw size={14} /> Recalibrate</button>
                     </div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
                        <div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8 }}>AI OPTIMIZATION</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)' }}>ACTIVE (PATH-4)</div>
                           <div style={{ height: 4, background: 'rgba(0,255,135,0.1)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                              <div style={{ width: '85%', height: '100%', background: 'var(--green)' }}></div>
                           </div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8 }}>V2G DISCHARGE</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>READY (STANDBY)</div>
                           <div style={{ height: 4, background: 'rgba(0,240,255,0.1)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                              <div style={{ width: '40%', height: '100%', background: 'var(--cyan)' }}></div>
                           </div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8 }}>LOAD BALANCING</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--purple)' }}>STABILIZED</div>
                           <div style={{ height: 4, background: 'rgba(181,109,255,0.1)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                              <div style={{ width: '92%', height: '100%', background: 'var(--purple)' }}></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Global Node Map Placeholder/Stat */}
               <div className="vs-glass" style={{ padding: 32, borderRadius: 24, display: 'flex', gap: 32, alignItems: 'center' }}>
                  <div style={{ width: 140, height: 140, borderRadius: '50%', border: '4px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                     <Globe size={60} color="var(--purple)" style={{ opacity: 0.6 }} />
                     <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '2px dashed var(--cyan)', borderRadius: '50%', animation: 'spin 20s linear infinite' }}></div>
                  </div>
                  <div>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Infrastructure Topology</div>
                     <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>48 verified charging hubs across 12 smart grid zones. <br/>All nodes communicating via high-fidelity OCPP 2.0.1.</p>
                     <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <div className="vs-badge-live" style={{ background: 'rgba(0,255,135,0.1)', color: 'var(--green)' }}>● 46 Nodes Online</div>
                        <div className="vs-badge-live" style={{ background: 'rgba(255,214,10,0.1)', color: 'var(--gold)' }}>● 2 Nodes Maintenance</div>
                     </div>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
               {/* Terminal Log */}
               <div className="vs-glass" style={{ padding: 28, borderRadius: 24, background: '#05070a', border: '1px solid rgba(181,109,255,0.2)', flex: 1 }}>
                  <div className="vs-flex-between" style={{ marginBottom: 20 }}>
                     <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Terminal size={16} color="var(--purple)" /> Security & Event Feed
                     </div>
                     <span className="vs-badge-live" style={{ fontSize: '0.5rem', background: 'rgba(0,240,255,0.1)', color: 'var(--cyan)' }}>REALTIME</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {logs.map((log, i) => (
                        <div key={i} style={{ borderLeft: `2px solid ${log.type === 'warning' ? 'var(--red)' : log.type === 'success' ? 'var(--green)' : 'var(--cyan)'}`, paddingLeft: 12 }}>
                           <span style={{ opacity: 0.5 }}>[{log.time}]</span> <span style={{ color: '#fff' }}>{log.msg}</span>
                        </div>
                     ))}
                     <div style={{ opacity: 0.3 }}>$ awaiting telemetry signal...</div>
                  </div>
               </div>

               {/* System Resources */}
               <div className="vs-glass" style={{ padding: 28, borderRadius: 24 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                     <Server size={16} color="var(--cyan)" /> System Resources
                  </div>
                  {[
                    { l: 'API Compute', v: '12.4%', c: 'var(--green)' },
                    { l: 'DB Queries/s', v: '840/s', c: 'var(--green)' },
                    { l: 'Storage Latency', v: '0.8ms', c: 'var(--cyan)' },
                    { l: 'Node Bandwidth', v: '1.2Gbps', c: 'var(--cyan)' }
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
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
