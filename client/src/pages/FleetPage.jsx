import { useState, useEffect } from 'react';
import { api, showToast } from '../api';
import Navbar from '../components/Navbar';
import { 
  Truck, ShieldCheck, BatteryCharging, CreditCard, Zap, 
  PlusCircle, Search, RefreshCcw, Car, Calendar, 
  Edit3, Trash2, Bot, ShieldAlert, X, Sparkles, MapPin
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function CountUp({ value, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(end)) return;
    const startTime = performance.now();
    const duration = 2000;
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(update);
      else setDisplay(end);
    };
    requestAnimationFrame(update);
  }, [value]);
  return <span>{prefix}{display.toLocaleString(undefined, { maximumFractionDigits: (value.toString().includes('.') ? 1 : 0) })}{suffix}</span>;
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [incidentLog, setIncidentLog] = useState([
    { time: '12:09:41', msg: 'SYS_INIT: Surveillance Grid Active.', color: 'var(--green)', plate: 'HUB-ALPHA' },
    { time: '12:09:42', msg: 'DATA_LINK: Initializing asset heartbeats...', color: 'var(--text-muted)', plate: 'SYS-LINK' },
    { time: '12:09:43', msg: 'NETWORK: All units within Gandhinagar Geofence.', color: 'var(--cyan)', plate: 'GEO-SYNC' }
  ]);
  const [lookupPlate, setLookupPlate] = useState('');
  const [lookupData, setLookupData] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    fetchData();
    const interval = setInterval(pushRandomIncident, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
     if (window.vsAnimate) window.vsAnimate.refreshTilt();
  }, [vehicles.length]);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/api/fleet');
      setVehicles(data.fleet_vehicles || []);
      setSessions(data.fleet_sessions || []);
    } catch {
      showToast('Registry sync failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pushRandomIncident = () => {
    if (vehicles.length === 0) return;
    const v = vehicles[Math.floor(Math.random() * vehicles.length)];
    const alerts = [
      { m: 'entered Geofence Zone A (Ahmedabad Hub)', c: 'var(--cyan)', t: 'info' },
      { m: 'signal integrity: EXCELLENT', c: 'var(--green)', t: 'success' },
      { m: 'approaching delivery corridor 7', c: 'var(--cyan)', t: 'info' },
      { m: 'SECURITY: Remote maintenance ping received', c: 'var(--purple)', t: 'info' },
      { m: 'exited Geofence (VahanSetu Hub)', c: 'var(--gold)', t: 'warning' }
    ];
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setIncidentLog(prev => [{ time, msg: alert.m, color: alert.c, plate: v.vehicle_number }, ...prev].slice(0, 10));
    if (alert.t === 'warning') showToast(`ALERT: ${v.vehicle_name} ${alert.m}`, 'info');
  };

  const performLookup = async () => {
    if (!lookupPlate) return showToast('Enter plate number', 'error');
    setIsLookingUp(true);
    try {
      const { data } = await api.post('/api/vehicle/lookup', { plate_number: lookupPlate });
      if (data.status === 'success') setLookupData(data.data);
      else showToast(data.message || 'Asset not found', 'error');
    } catch { showToast('Lookup failed', 'error'); }
    finally { setIsLookingUp(false); }
  };

  const confirmRegistration = async () => {
    try {
      const { data } = await api.post('/fleet/add', {
        fleet_id: 1,
        vehicle_name: lookupData.vehicle_name,
        vehicle_number: lookupData.plate
      });
      if (data.success) {
        showToast('Asset integrated successfully', 'success');
        setShowAddModal(false);
        setLookupData(null);
        setLookupPlate('');
        fetchData();
      }
    } catch { showToast('Registration failed', 'error'); }
  };

  const runAIScheduler = async () => {
    setIsAiLoading(true);
    setAiResult('Connecting to Neural Dispatcher...');
    try {
      const { data } = await api.post('/api/fleet/optimize');
      if (data.status === 'success') {
        let text = '⚡ Optimization Generated\n\n';
        data.assignments.forEach(a => { text += `• ${a.vehicle} → ${a.station}\n`; });
        setAiResult(text);
        showToast('Fleet schedule pushed', 'success');
      }
    } catch {
      setAiResult('Grid connection lost.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const sortedAndFiltered = vehicles.filter(v => {
    const matchesQ = v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) || v.vehicle_number?.toLowerCase().includes(search.toLowerCase());
    const matchesS = statusFilter === 'all' || v.status?.toLowerCase() === statusFilter;
    return matchesQ && matchesS;
  }).sort((a, b) => {
    if (sortBy === 'battery-desc') return b.battery_pct - a.battery_pct;
    if (sortBy === 'battery-asc') return a.battery_pct - b.battery_pct;
    if (sortBy === 'name-az') return a.vehicle_name.localeCompare(b.vehicle_name);
    return 0;
  });

  const lowBatteryUnits = vehicles.filter(v => v.battery_pct < 20);

  const batteryData = {
    labels: ['Critical (<20%)', 'Moderate (20-60%)', 'Healthy (>60%)'],
    datasets: [{
      data: [
        vehicles.filter(v => v.battery_pct < 20).length,
        vehicles.filter(v => v.battery_pct >= 20 && v.battery_pct <= 60).length,
        vehicles.filter(v => v.battery_pct > 60).length
      ],
      backgroundColor: ['#ff3d6b', '#ffd60a', '#00ffa3'],
      borderWidth: 0,
    }]
  };

  if (loading) return (
     <div className="vs-loading-wrap">
       <div className="vs-spinner"></div>
       <span>Syncing Fleet Registry...</span>
     </div>
  );

  return (
    <div className="app">
      <Navbar />
      <div className="page-wrapper">
        <div className="page-content">
          <div className="vs-flex-between" style={{ marginBottom: 40 }}>
            <div>
              <h1 className="vs-page-title vs-icon-text" style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.8px', margin: 0, textTransform: 'uppercase' }}>
                <Truck size={42} /> Fleet Operations Portal
              </h1>
              <p className="vs-page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: 4 }}>Real-time telemetry and AI routing for your registered EV assets.</p>
            </div>
            <button className="vs-btn vs-btn-primary vs-icon-text" onClick={() => setShowAddModal(true)} style={{ padding: '16px 32px', fontSize: '1rem' }}>
              <PlusCircle size={20} /> Register Asset
            </button>
          </div>

          {/* Low Battery Alert Banner (Precision Port) */}
          {lowBatteryUnits.length > 0 && (
            <div className="vs-glass" style={{ display: 'block', padding: '16px 24px', borderColor: 'var(--red-border)', background: 'rgba(255, 61, 107, 0.08)', marginBottom: 32, borderRadius: 20 }}>
              <div className="vs-flex-between">
                <div className="vs-icon-text" style={{ color: 'var(--red)', fontWeight: 800, fontSize: '1.05rem' }}>
                  <ShieldAlert size={22} style={{ filter: 'drop-shadow(0 0 8px rgba(255,61,107,0.4))' }} /> 
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical: Low Battery Assets Detected</span>
                </div>
                <div className="vs-badge vs-badge-red" style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: 50, fontWeight: 800 }}>
                   {lowBatteryUnits.length} VEHICLES AT RISK
                </div>
              </div>
            </div>
          )}

          {/* KPI STRIP (Hardened Legacy Parity) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, marginBottom: 40 }}>
            {[
              { label: 'Total Assets', val: vehicles.length, icon: <Truck />, color: 'var(--cyan)', accent: 'linear-gradient(90deg, var(--cyan), var(--purple))', glow: 'rgba(0,240,255,0.06)' },
              { label: 'Health Score', val: 98, suffix: '%', icon: <ShieldCheck />, color: 'var(--green)', accent: 'linear-gradient(90deg, var(--green), var(--cyan))', glow: 'rgba(0,255,163,0.06)' },
              { label: 'Avg. Charge', val: Math.round(vehicles.reduce((a,b)=>a+b.battery_pct,0)/vehicles.length)||0, suffix: '%', icon: <BatteryCharging />, color: 'var(--gold)', accent: 'linear-gradient(90deg, var(--gold), var(--orange))', glow: 'rgba(255,214,10,0.06)' },
              { label: 'Spend', val: 12400, prefix: '₹', icon: <CreditCard />, color: 'var(--cyan)', accent: 'linear-gradient(90deg, var(--cyan), var(--purple))', glow: 'rgba(0,196,212,0.06)' },
              { label: 'Throughput', val: 450, suffix: ' kWh', icon: <Zap />, color: 'var(--purple)', accent: 'linear-gradient(90deg, var(--purple), var(--cyan))', glow: 'rgba(181,109,255,0.06)' }
            ].map((k, i) => (
              <div key={i} className="vs-stat-card vs-tilt" style={{ 
                '--card-accent': k.accent, 
                '--card-glow-color': k.glow,
                padding: 24, borderRadius: 24, border: '1px solid var(--glass-border-2)'
              }}>
                <span className="vs-stat-icon" style={{ fontSize: '1.4rem', color: k.color, marginBottom: 12, display: 'inline-flex' }}>{k.icon}</span>
                <div className="vs-stat-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</div>
                <div className="vs-stat-value" style={{ fontSize: '2.2rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, letterSpacing: '-1.5px' }}>
                  <CountUp value={k.val} prefix={k.prefix} suffix={k.suffix} />
                </div>
                <div className="vs-stat-sub" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Fleet Telemetry Active</div>
              </div>
            ))}
          </div>

          <div className="fleet-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* LEFT COLUMN */}
            <div>
              <div className="vs-flex-between" style={{ marginBottom: 28 }}>
                <div className="vs-page-title vs-icon-text" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                  <Truck size={38} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.4))' }} /> Asset Inventory
                </div>
                <button className="vs-btn vs-btn-primary vs-icon-text vs-btn-sm" onClick={() => setShowAddModal(true)} style={{ padding: '10px 20px', borderRadius: 12 }}>
                  <PlusCircle size={16} /> Add Vehicle
                </button>
              </div>

              {/* Tactical Search & Filter Bar (Precision Port) */}
              <div className="vs-glass" style={{ padding: 14, marginBottom: 24, display: 'flex', gap: 12, borderRadius: 18, border: '1px solid var(--glass-border-2)' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="vs-input" placeholder="Search by name or plate..." style={{ paddingLeft: 40, width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="vs-input" style={{ flex: 1 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">Total Status</option><option value="active">Active/Online</option><option value="charging">Charging</option><option value="idle">Standby/Idle</option>
                </select>
                <select className="vs-input" style={{ flex: 1 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                   <option value="default">Sort: Priority</option>
                   <option value="battery-desc">Battery: High</option>
                   <option value="battery-asc">Battery: Critical</option>
                   <option value="name-az">Identity: A-Z</option>
                </select>
                <button className="vs-btn vs-btn-secondary" onClick={() => { setSearch(''); setStatusFilter('all'); setSortBy('default'); }}><RefreshCcw size={16} /></button>
              </div>

              <div className="vehicle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, marginBottom: 32 }}>
                {sortedAndFiltered.map(v => {
                  const bat = v.battery_pct || 0;
                  const batColor = bat > 50 ? 'linear-gradient(90deg, var(--green), var(--cyan))' : bat > 20 ? 'linear-gradient(90deg, var(--gold), #ff9f0a)' : 'linear-gradient(90deg, var(--red), #ff7a00)';
                  return (
                  <div key={v.id} className="v-card vs-tilt" style={{ 
                    position: 'relative', overflow: 'hidden', background: 'var(--bg-glass)', backdropFilter: 'blur(30px)', 
                    border: '1px solid var(--glass-border-2)', padding: 22, borderRadius: 20, transition: 'all 0.3s ease' 
                  }}>
                    {/* Parity Accents */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: batColor }} />
                    <div style={{ position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,240,255,0.05)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <Car size={32} color="var(--cyan)" style={{ opacity: 0.7 }} />
                      <span className={`vs-badge ${bat > 50 ? 'vs-badge-green' : bat > 20 ? 'vs-badge-gold' : 'vs-badge-red'}`}>
                        {bat}% Bat.
                      </span>
                    </div>
                    
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.02rem', fontWeight: 800, color: '#fff' }}>{v.vehicle_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12 }}>{v.vehicle_number}</div>
                    
                    <div className="v-battery" style={{ height: 8, borderRadius: 50, background: 'rgba(255,255,255,0.06)', margin: '14px 0 6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${bat}%`, background: batColor, borderRadius: 50, transition: 'width 1s ease' }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 14 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Battery Status</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{bat}% · {v.range_km} km range</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: v.status === 'charging' ? 'var(--cyan)' : v.status === 'active' ? 'var(--green)' : 'var(--text-muted)' }}>{v.status || 'Idle'}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Est. Arrival</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{v.status === 'active' ? '14:30' : '--:--'}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Telemetry</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>Live</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Position</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Tactical</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="v-act" style={{ flex: 1, padding: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--glass-border-2)', borderRadius: 9, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}><Calendar size={14} /></button>
                      <button className="v-act" style={{ flex: 1, padding: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--glass-border-2)', borderRadius: 9, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }} onClick={() => window.location.href=`/map?lat=${v.lat}&lng=${v.lng}&asset=true`}><MapPin size={14} /></button>
                      <button className="v-act" style={{ flex: 1, padding: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--glass-border-2)', borderRadius: 9, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}><Edit3 size={14} /></button>
                      <button className="v-act" style={{ flex: 1, padding: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--glass-border-2)', borderRadius: 9, background: 'rgba(255,255,255,0.04)', color: 'var(--red)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )})}
              </div>

              <div className="vs-glass" style={{ padding: 24, borderRadius: 20 }}>
                <div className="vs-section-title vs-icon-text" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, fontFamily: 'Syne, sans-serif' }}><Sparkles size={18} /> Operational Logging</div>
                {/* Table structure matched to legacy list-wrap */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="vs-table">
                    <thead><tr><th>Vehicle</th><th>Station</th><th>Energy</th><th>Cost</th><th>Status</th></tr></thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 800 }}>{s.vehicle_name}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{s.station_name}</td>
                          <td style={{ color: 'var(--cyan)' }}>{s.energy_kwh} kWh</td>
                          <td style={{ color: 'var(--gold)' }}>₹{s.cost}</td>
                          <td><span className={`badge ${s.status === 'completed' ? 'badge-green' : 'badge-cyan'}`}>{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="vs-glass" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, rgba(181,109,255,0.05), transparent)', border: '1px solid rgba(181,109,255,0.2)' }}>
                <div style={{ display: 'inline-flex', padding: '4px 10px', background: 'rgba(181,109,255,0.1)', color: 'var(--purple)', borderRadius: 50, fontSize: '0.65rem', fontWeight: 800, marginBottom: 12 }}>
                  <Bot size={14} style={{ marginRight: 6 }} /> AI AUTO-SCHEDULER
                </div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Smart Fleet Optimizer</div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>Neural engine optimizing battery paths across entire net.</p>
                <button className="vs-btn vs-btn-primary" style={{ width: '100%' }} onClick={runAIScheduler} disabled={isAiLoading}>
                  {isAiLoading ? 'Analyzing Grid...' : <><Zap size={14} /> Auto-Schedule Fleet</>}
                </button>
                {aiResult && <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--cyan)', whiteSpace: 'pre-wrap' }}>{aiResult}</div>}
              </div>

              <div className="vs-glass" style={{ padding: 24, borderRadius: 20 }}>
                <div className="vs-section-title vs-icon-text" style={{ marginBottom: 20 }}><BatteryCharging size={16} /> Asset Distribution</div>
                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pie data={batteryData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-muted)', font: { size: 10 } } } } }} />
                  </div>
                </div>
              </div>

              <div className="vs-glass" style={{ padding: 24, borderRadius: 20, borderLeft: '4px solid var(--purple)' }}>
                <div className="vs-flex-between" style={{ marginBottom: 16 }}>
                  <div className="vs-section-title vs-icon-text" style={{ margin: 0 }}><ShieldAlert size={16} color="var(--purple)" /> Surveillance</div>
                  <span className="badge badge-green">Secure</span>
                </div>
                <div style={{ height: 140, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.68rem', lineHeight: 1.6, color: 'var(--text-muted)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent)' }}>
                  {incidentLog.map((log, i) => (
                    <div key={i} style={{ color: log.color, marginBottom: 4 }}>
                      [{log.time}] <span style={{ color: 'var(--text-primary)' }}>{log.plate}</span>: {log.msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="vs-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 32 }}>
            <div className="vs-flex-between" style={{ marginBottom: 20 }}>
              <h2 className="vs-modal-title" style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 800 }}>{lookupData ? 'Asset Identified' : 'Register Asset'}</h2>
              <button className="vs-btn-icon" onClick={() => { setShowAddModal(false); setLookupData(null); }}><X /></button>
            </div>
            
            {!lookupData ? (
               <div id="lookupStage">
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 24 }}>Enter the asset's license plate to automatically fetch technical specifications.</div>
                 <div className="vs-float-group">
                   <input className="vs-float-input" required placeholder=" " value={lookupPlate} onChange={e => setLookupPlate(e.target.value.toUpperCase())} />
                   <label className="vs-float-label">License Plate (e.g. GJ01EV1234)</label>
                 </div>
                 <button className="vs-btn vs-btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={performLookup} disabled={isLookingUp}>
                   {isLookingUp ? 'Verifying Asset...' : <><Search size={16} /> Lookup Asset Details</>}
                 </button>
               </div>
            ) : (
               <div id="verifiedStage">
                 <div className="vs-glass" style={{ background: 'rgba(0,255,163,0.05)', border: '1px dashed var(--green)', padding: 20, borderRadius: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ background: 'var(--green)', color: '#000', padding: 6, borderRadius: 8 }}><ShieldCheck size={20} /></div>
                      <div style={{ fontWeight: 700, fontSize: 1, color: 'var(--green)' }}>Asset Identified</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.88rem', lineHHeight: 1.6 }}>
                       <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>MODEL</span><br/><strong>{lookupData.vehicle_name}</strong></div>
                       <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>BRAND</span><br/><strong>{lookupData.vehicle_model}</strong></div>
                       <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>PLATE</span><br/><strong>{lookupData.plate}</strong></div>
                       <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>BATTERY</span><br/><strong>{lookupData.battery_capacity} kWh</strong></div>
                    </div>
                 </div>
                 <button className="vs-btn vs-btn-primary" style={{ width: '100%' }} onClick={confirmRegistration}>Confirm & Register</button>
                 <button className="vs-btn" style={{ width: '100%', marginTop: 10, background: 'none' }} onClick={() => setLookupData(null)}>Different Plate</button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
