import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  BarChart3, Activity, Zap, IndianRupee, Crown, 
  Download, RefreshCcw, TrendingUp, Clock, PieChart, Layers, X
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { api, showToast } from '../api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState({ region: 'ALL', cycle: '30D', asset: 'ALL' });
  const [loading, setLoading] = useState(true);
  const [syncTime, setSyncTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto-sync
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/api/analytics_data', { params: filter });
      setData(data);
      setSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Analytics sync failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, val) => {
    const newFilter = { ...filter, [key]: val };
    setFilter(newFilter);
    setLoading(true);
    api.get('/api/analytics_data', { params: newFilter }).then(r => {
      setData(r.data);
      setSyncTime(new Date().toLocaleTimeString());
      setLoading(false);
      showToast('Intelligence Feed Updated', 'success');
    });
  };

  if (loading && !data) return (
    <div className="vs-loading-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
      <div className="vs-spinner"></div>
      <span style={{ marginLeft: 16, color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Initializing Intelligence Hub...</span>
    </div>
  );

  const analytics = data?.analytics || { total_kwh: 0, energy_trend: '0%', total_sessions: 0, total_revenue: 0, revenue_trend: '0%', top_station: 'N/A' };
  const topStations = data?.top_stations || [];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.35)' } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false }, ticks: { color: 'rgba(255,255,255,0.35)' } }
    }
  };

  const energyChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [420, 510, 480, 620, 580, 710, 680],
      borderColor: '#00f0ff',
      backgroundColor: 'rgba(0,240,255,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const revenueChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [6200, 11500, 8500, 13800, 9200, 15400, 11000],
      borderColor: '#b56dff',
      backgroundColor: 'rgba(181,109,255,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const peakChartData = {
    labels: ['12am','2am','4am','6am','8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'],
    datasets: [{
      data: [8, 4, 3, 15, 42, 58, 52, 48, 62, 78, 65, 32],
      backgroundColor: (ctx) => {
        const val = ctx.raw;
        return val > 65 ? '#ff3d6b' : val > 40 ? '#00f0ff' : 'rgba(255,255,255,0.1)';
      },
      borderRadius: 4,
      barThickness: 16
    }]
  };

  const donutData = {
    labels: ['South', 'West', 'North', 'Other'],
    datasets: [{
      data: [38.2, 32.5, 25.3, 4.0],
      backgroundColor: ['#b56dff', '#00f0ff', '#00ffa3', 'rgba(255,255,255,0.05)'],
      borderWidth: 0,
      cutout: '80%',
      borderRadius: 8,
      spacing: 4
    }]
  };

  const carbonChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'CO2 Offset (kg)',
      data: [1200, 1900, 3100, 4800, 7200, 9500],
      borderColor: '#00ffa3',
      backgroundColor: 'rgba(0,255,163,0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div className="app">
      <Navbar />

      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: 1680 }}>
          {/* Header */}
          <div className="vs-flex-between" style={{ marginBottom: 36 }}>
            <div>
              <h1 className="vs-page-title vs-icon-text" style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-1.8px', margin: 0, textTransform: 'uppercase' }}>
                <BarChart3 size={38} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' }} />
                <span>Network</span> <span style={{ color: 'var(--cyan)' }}>Intelligence Hub</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 4 }}>Unified telemetry, financial oversight, and grid performance analytics.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="vs-btn vs-btn-secondary vs-icon-text" style={{ padding: '12px 24px' }}>
                <Download size={15} /> Report
              </button>
              <button className="vs-btn vs-btn-primary vs-icon-text" onClick={fetchData} style={{ padding: '12px 24px' }}>
                <RefreshCcw size={15} /> Sync
              </button>
            </div>
          </div>

          {/* Filter Bar (Precision HTML Port) */}
          <div className="vs-glass" style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '16px 28px', marginBottom: 36, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Region</span>
              <select className="vs-input" style={{ background: 'none', border: 'none', fontWeight: 700, padding: 0, fontSize: '0.85rem' }} value={filter.region} onChange={e => handleFilterChange('region', e.target.value)}>
                <option value="ALL">Pan-India (All)</option><option value="WEST">West Grid</option><option value="NORTH">North Grid</option><option value="SOUTH">South Grid</option>
              </select>
            </div>
            <div style={{ width: 1, height: 22, background: 'var(--glass-border-2)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Asset Type</span>
              <select className="vs-input" style={{ background: 'none', border: 'none', fontWeight: 700, padding: 0, fontSize: '0.85rem' }} value={filter.asset} onChange={e => handleFilterChange('asset', e.target.value)}>
                <option value="ALL">All Types</option><option value="DC">DC Fast (120kW+)</option><option value="AC">AC Standard</option>
              </select>
            </div>
            <div style={{ width: 1, height: 22, background: 'var(--glass-border-2)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Period</span>
              <select className="vs-input" style={{ background: 'none', border: 'none', fontWeight: 700, padding: 0, fontSize: '0.85rem' }} value={filter.cycle} onChange={e => handleFilterChange('cycle', e.target.value)}>
                <option value="30D">Last 30 Days</option><option value="24H">Last 24 Hours</option><option value="90D">Last Quarter</option>
              </select>
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
             {[
               { id: 1, lbl: 'Energy Delivered', val: analytics.total_kwh, icon: <Zap size={13} />, color: 'var(--cyan)', trend: analytics.energy_trend, sub: 'Cumulative network throughput', suffix: ' kWh' },
               { id: 2, lbl: 'Sessions', val: analytics.total_sessions, icon: <Activity size={13} />, color: 'var(--green)', trend: '+8%', sub: 'Total charging transactions' },
               { id: 3, lbl: 'Revenue', val: analytics.total_revenue, icon: <IndianRupee size={13} />, color: 'var(--purple)', trend: analytics.revenue_trend, sub: 'Gross network billings', prefix: '₹' },
               { id: 4, lbl: 'Top Station', val: analytics.top_station, icon: <Crown size={13} />, color: 'var(--gold)', sub: 'Highest revenue generator', isStation: true }
             ].map(k => (
               <div key={k.id} className="vs-glass vs-tilt" style={{ padding: 28, borderRadius: 20, borderTop: `3px solid ${k.color}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>{k.icon} {k.lbl}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: k.isStation ? '1.3rem' : '2rem', fontWeight: 800, color: k.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {k.prefix}{typeof k.val === 'number' ? k.val.toLocaleString() : k.val}{k.suffix}
                    {k.trend && <span style={{ fontSize: '0.68rem', background: 'rgba(0,255,135,0.1)', color: 'var(--green)', padding: '3px 8px', borderRadius: 6, marginLeft: 8 }}><TrendingUp size={11} inline /> {k.trend}</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>{k.sub}</div>
               </div>
             ))}
          </div>

          {/* Main Content: Dual Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div className="vs-glass" style={{ padding: 32, borderRadius: 20, borderTop: '4px solid var(--green)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} color="var(--cyan)" /> Energy Flow</div>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--cyan)', padding: '4px 10px', border: '1px solid var(--cyan-dim)', borderRadius: 6, textTransform: 'uppercase' }}>kWh / Day</span>
              </div>
              <div style={{ height: 300 }}><Line data={energyChartData} options={chartOptions} /></div>
            </div>
            <div className="vs-glass" style={{ padding: 32, borderRadius: 20, borderTop: '4px solid var(--purple)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}><IndianRupee size={18} color="var(--purple)" /> Revenue Flow</div>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--purple)', padding: '4px 10px', border: '1px solid var(--purple-dim)', borderRadius: 6, textTransform: 'uppercase' }}>₹ / Day</span>
              </div>
              <div style={{ height: 300 }}><Line data={revenueChartData} options={chartOptions} /></div>
            </div>
          </div>

          {/* NEXT-LEVEL: CARBON & GRID INTELLIGENCE */}
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, marginBottom: 32 }}>
            <div className="credits-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="vs-badge-live" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--green)' }}>
                     <ShieldCheck size={12} /> Carbon Ledger Active
                  </div>
               </div>
               <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>VahanCredits<br/><span style={{ color: 'var(--green)' }}>Economy</span></h2>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="impact-metric">
                     <span className="impact-val">42.5k</span>
                     <span className="impact-label">Total Credits</span>
                  </div>
                  <div className="impact-metric">
                     <span className="impact-val">840+</span>
                     <span className="impact-label">Trees Saved</span>
                  </div>
               </div>
            </div>
            <div className="vs-glass" style={{ padding: 32, borderRadius: 20, borderTop: '4px solid var(--green)' }}>
               <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrendingUp size={18} color="var(--green)" /> Cumulative CO2 Offset Path (Net Zero Pulse)
               </div>
               <div style={{ height: 200 }}><Line data={carbonChartData} options={chartOptions} /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, marginBottom: 32 }}>
            {/* Peak Usage */}
            <div className="vs-glass" style={{ padding: 32, borderRadius: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}><Clock size={18} /> Peak Usage Hours</div>
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', padding: '4px 10px', border: '1px solid var(--glass-border)', borderRadius: 6, textTransform: 'uppercase' }}>Sessions / Hour</span>
               </div>
               <div style={{ height: 260 }}><Bar data={peakChartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, display: false } } }} /></div>
            </div>
            {/* Regional Distribution */}
            <div className="vs-glass" style={{ padding: 32, borderRadius: 20 }}>
               <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><PieChart size={18} /> Revenue by Region</div>
               <div style={{ display: 'flex', alignItems: 'center', height: 240 }}>
                 <div style={{ flex: 1.2, height: '100%', position: 'relative' }}>
                    <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                       <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--purple)' }}>38%</div>
                       <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>South Grid</div>
                    </div>
                 </div>
                 <div style={{ flex: 0.8, paddingLeft: 28, borderLeft: '1px solid var(--glass-border-2)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {[
                      { l: 'South', v: '38.2%', c: 'var(--purple)' },
                      { l: 'West', v: '32.5%', c: 'var(--cyan)' },
                      { l: 'North', v: '25.3%', c: 'var(--green)' },
                      { l: 'Other', v: '4.0%', c: 'var(--text-muted)' }
                    ].map(d => (
                      <div key={d.l}>
                         <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{d.l}</div>
                         <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 800, color: d.c }}>{d.v}</div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>

          <div className="vs-glass" style={{ padding: 36, borderRadius: 24 }}>
            <div className="vs-flex-between" style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                 <Layers size={20} color="var(--cyan)" /> Station Performance Index
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Synced: <span style={{ color: '#fff' }}>{syncTime}</span></div>
            </div>
            <table className="vs-table">
              <thead>
                <tr>
                  <th style={{ width: '28%', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Station</th>
                  <th style={{ width: '22%', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Utilization</th>
                  <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Sessions</th>
                  <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Energy</th>
                  <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Revenue</th>
                  <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: 16 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {topStations.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{s.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.connector} · {s.power || 120}kW</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${s.utilization}%`, height: '100%', background: 'linear-gradient(90deg, var(--cyan), var(--purple))' }}></div>
                        </div>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', fontWeight: 800, color: 'var(--cyan)', minWidth: 36 }}>{s.utilization}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.sessions}</td>
                    <td><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.energy.toLocaleString()}</span> <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>kWh</span></td>
                    <td><span style={{ color: 'var(--gold)', fontWeight: 800 }}>₹{s.revenue.toLocaleString()}</span></td>
                    <td>
                       <span style={{ 
                         fontSize: '0.6rem', fontWeight: 800, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase',
                         background: s.status === 'optimal' ? 'rgba(0,255,135,0.1)' : 'rgba(181,109,255,0.1)',
                         color: s.status === 'optimal' ? 'var(--green)' : 'var(--purple)'
                       }}>
                         {s.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
