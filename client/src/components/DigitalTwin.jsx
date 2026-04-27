import { useState, useEffect } from 'react';
import { api } from '../api';
import { Zap, Thermometer, Battery, Activity, Cpu, X, Globe } from 'lucide-react';

export default function DigitalTwin({ vehicleId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await api.get(`/api/telemetry/twin/${vehicleId}`);
        setData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Telemetry Error:", err);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [vehicleId]);

  if (loading) return null;

  return (
    <div className="vs-modal-overlay" style={{ zIndex: 5000 }}>
      <div className="vs-glass" style={{ width: '900px', padding: '30px', borderRadius: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Background Animation */}
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '400px', height: '400px', background: 'var(--cyan)', filter: 'blur(100px)', opacity: 0.1, pointerEvents: 'none' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Hardware Handshake: Connected</div>
            <h2 style={{ fontFamily: 'Syne', fontSize: '2rem', margin: 0 }}>{data.metadata.model} <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>[{data.metadata.vin}]</span></h2>
          </div>
          <button className="vs-btn-icon" onClick={onClose} style={{ width: 48, height: 48, borderRadius: 16 }}><X /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
          {/* Left: Critical Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="vs-glass" style={{ padding: '20px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                   <Battery size={20} color="var(--green)" />
                   <span style={{ fontWeight: 800 }}>Battery Pack</span>
                 </div>
                 <span style={{ color: 'var(--green)', fontWeight: 800 }}>{data.battery.health}% Health</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '10px', textAlign: 'center' }}>{data.battery.pct}%</div>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                 <div style={{ height: '100%', width: `${data.battery.pct}%`, background: 'var(--green)', boxShadow: '0 0 20px var(--green)' }}></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
               <div className="vs-glass" style={{ padding: '15px', borderRadius: '20px' }}>
                  <Thermometer size={16} color="var(--red)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data.battery.temp}°C</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CORE TEMP</div>
               </div>
               <div className="vs-glass" style={{ padding: '15px', borderRadius: '20px' }}>
                  <Zap size={16} color="var(--cyan)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data.grid.throughput_kw}kW</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>LOAD INPUT</div>
               </div>
            </div>

            <div className="vs-glass" style={{ padding: '20px', borderRadius: '24px', background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                  <Activity size={18} color="var(--cyan)" />
                  <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>LIVE HARMONICS</span>
               </div>
               <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  {[...Array(15)].map((_, i) => (
                    <div key={i} style={{ flex: 1, background: 'var(--cyan)', height: `${40 + Math.sin(Date.now()/500 + i)*30}%`, opacity: 0.6, borderRadius: 2 }}></div>
                  ))}
               </div>
            </div>
          </div>

          {/* Right: Cell-Level Visualizer */}
          <div className="vs-glass" style={{ padding: '25px', borderRadius: '28px', background: 'rgba(0,0,0,0.2)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem' }}>INTERNAL CELL VOLTAGE ARRAY</div>
                <div style={{ fontSize: '0.65rem', padding: '4px 10px', background: 'rgba(0,255,163,0.1)', color: 'var(--green)', borderRadius: 20 }}>BALANCED</div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                {data.battery.cells.map((v, i) => (
                  <div key={i} className="cell-node" style={{ 
                    padding: '15px', 
                    borderRadius: '16px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>C{i+1}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: v > 3.7 ? 'var(--cyan)' : '#fff' }}>{v}v</div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                       <div style={{ height: '100%', width: `${(v/4.2)*100}%`, background: 'var(--cyan)' }}></div>
                    </div>
                  </div>
                ))}
             </div>

             <div style={{ marginTop: '30px', padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(181,109,255,0.1), transparent)', border: '1px solid rgba(181,109,255,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                   <Globe size={18} color="var(--purple)" />
                   <span style={{ fontWeight: 800 }}>Grid Synergy (V2G Ready)</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Current battery stabilization allows for vehicle-to-grid energy discharge. Predicted revenue yield at peak: <strong style={{ color: '#fff' }}>₹4.2/kWh</strong>.
                </p>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .vs-modal-overlay {
          position: fixed; inset: 0; background: rgba(4,6,15,0.85);
          backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
        }
        .cell-node:hover {
          border-color: var(--cyan);
          background: rgba(0,240,255,0.05);
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
