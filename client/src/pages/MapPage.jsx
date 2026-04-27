import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, showToast } from '../api';
import Navbar from '../components/Navbar';
import { 
  Search, Mic, MapPin, Layers, Flag, Sidebar as SidebarIcon, 
  Cpu, Filter, Zap, CheckCircle, Navigation2, X, Star, RotateCcw, 
  Flame, CheckSquare, Info, Bell, AlertTriangle, ArrowUpLeft, ArrowUpRight, AlertCircle
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COLORS = { green:'#00ffa3', red:'#ff3d6b', amber:'#ffd60a', cyan:'#00f0ff' };

const formatDist = (m) => {
  if (m === undefined || m === null) return '0.00 km';
  return `${(m / 1000).toFixed(2)} km`;
};

const StationIcon = (avail, total) => {
  const pct = avail / Math.max(total, 1);
  const color = pct > 0.5 ? COLORS.green : pct > 0 ? COLORS.amber : COLORS.red;
  return L.divIcon({
    className: '',
    html: `
      <div class="vs-marker-container" style="--m-color: ${color}">
        <div class="vs-marker-pulse"></div>
        <div class="vs-marker-core">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"></path>
          </svg>
        </div>
      </div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -12]
  });
};

const UserIcon = () => L.divIcon({
  className: '',
  html: `<div class="vs-marker-user"><div class="vu-pulse"></div><div class="vu-core"></div></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12]
});

const CarIcon = () => L.divIcon({
  className: 'vs-car-sim',
  html: '<div class="vs-car-sim-body" id="vID"></div>',
  iconSize: [44, 44], iconAnchor: [22, 22]
});

const StopIcon = (idx) => L.divIcon({
  html: `
    <div style="position:relative; width:44px; height:44px;">
      <div class="vs-marker-pulse" style="background:var(--green); opacity:0.6; scale:1.2;"></div>
      <div style="width:28px; height:28px; background:var(--green); border:2.5px solid #fff; border-radius:50%; position:absolute; top:8px; left:8px; box-shadow:0 0 15px var(--green); display:flex; align-items:center; justify-content:center; color:#04060f; font-weight:900; font-size:14px; font-family:'Syne';">
        ${idx}
      </div>
    </div>
  `,
  className: '', iconSize:[44, 44], iconAnchor:[22, 44]
});

function RouteRenderer({ geometry, stops }) {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    if (!map || !geometry) return;
    
    // Clear old route
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    // Multi-layer Glowing Route
    const glowLayer = L.geoJSON(geometry, {
      style: { color: COLORS.cyan, weight: 12, opacity: 0.15, lineCap: 'round' }
    }).addTo(map);

    const routeLayer = L.geoJSON(geometry, {
      style: { color: COLORS.cyan, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }
    }).addTo(map);
    
    const innerLayer = L.geoJSON(geometry, {
      style: { color: '#fff', weight: 2, opacity: 0.4, lineCap: 'round' }
    }).addTo(map);

    layersRef.current = [glowLayer, routeLayer, innerLayer];

    try {
      if (geometry.type === 'LineString' && geometry.coordinates && geometry.coordinates.length > 0) {
        const bounds = L.geoJSON(geometry).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2));
        }
      }
    } catch (err) {
      console.error("MAP_FIT_ERROR:", err);
    }

    return () => layersRef.current.forEach(l => map.removeLayer(l));
  }, [map, geometry]);

  return null;
}

export default function MapPage() {
  const [stations, setStations] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [stops, setStops] = useState([]);
  const [maneuvers, setManeuvers] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [carPos, setCarPos] = useState(null);
  const [carHeading, setCarHeading] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ connector: '', power: '', rating: '' });
  const [trip, setTrip] = useState({ start: '', end: '' });
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [hint, setHint] = useState(null);
  const [tripStats, setTripStats] = useState(null);
  const [gridPricing, setGridPricing] = useState({ current_price: 18.5, grid_status: 'Optimized' });
  const [credits, setCredits] = useState({ total_balance: 0 });
  const [activeTab, setActiveTab] = useState('search');
  const [isPlanning, setIsPlanning] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const loc = useLocation();
  const mapRef = useRef();
  const simTimeout = useRef();

  const layerConfigs = [
    { id: 'satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', icon: Layers, title: 'Satellite' },
    { id: 'midnight', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', icon: Cpu, title: 'Midnight Navy' },
    { id: 'daylight', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', icon: Zap, title: 'Daylight' }
  ];
  const [layerIdx, setLayerIdx] = useState(0);
  const nextLayer = layerConfigs[(layerIdx + 1) % layerConfigs.length];
  const NextLayerIcon = nextLayer.icon;
  const curLayer = layerConfigs[layerIdx];

  useEffect(() => {
    const startLocating = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((p) => {
          const coords = [p.coords.latitude, p.coords.longitude];
          setUserPos(coords);
          if (mapRef.current) mapRef.current.setView(coords, 14);
          fetchStations(coords[0], coords[1]);
        }, () => fetchStations(23.0225, 72.5714), { timeout: 10000, enableHighAccuracy: true });
      } else {
        fetchStations(23.0225, 72.5714);
      }
    };
    startLocating();
    fetchGridIntel();
    fetchCredits();
    const pulse = setInterval(() => {
      fetchStations();
      fetchGridIntel();
    }, 30000);
    return () => clearInterval(pulse);
  }, [loc.search]);

  const fetchGridIntel = async () => {
    try {
      const { data } = await api.get('/api/grid/pricing');
      setGridPricing(data);
    } catch {}
  };

  const fetchCredits = async () => {
    try {
      const { data } = await api.get('/api/credits/ledger');
      setCredits(data);
    } catch {}
  };

  const planTrip = async () => {
    if (!trip.start || !trip.end) return showToast('Enter start and end points', 'error');
    setIsPlanning(true);
    try {
      const params = { ...trip };
      if (userPos && (!trip.start || trip.start.toLowerCase() === 'my location')) {
        params.lat = userPos[0]; params.lng = userPos[1];
      }
      const { data } = await api.get('/api/trip_plan', { params });
      if (data.geometry && data.geometry.coordinates && data.geometry.coordinates.length > 0) {
        setGeometry(data.geometry);
        setStops((data.stops || []).filter(s => s && s.lat && s.lng));
        setManeuvers(data.instructions || []);
        setTripStats({ distance: data.total_km, time: data.total_time });
        setRecommendation(data.recommendation);
        showToast('Neural route path finalized', 'success');
      } else {
        showToast('No route found between these locations', 'error');
      }
    } catch (err) { 
      showToast(err.response?.data?.error || 'Route engine timeout', 'error'); 
    } finally { setIsPlanning(false); }
  };

  const fetchStations = async (lat, lng) => {
    try {
      const params = { ...filter };
      const centerLat = lat !== undefined ? lat : (userPos ? userPos[0] : 23.0225);
      const centerLng = lng !== undefined ? lng : (userPos ? userPos[1] : 72.5714);
      params.lat = centerLat; params.lng = centerLng;
      const res = await api.get('/api/stations', { params: { ...params, _t: Date.now() } });
      setStations(res.data);
    } catch { showToast('Network: Stations unreachable', 'error'); }
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const coords = [p.coords.latitude, p.coords.longitude];
        setUserPos(coords);
        mapRef.current?.flyTo(coords, 17);
        showToast('Tactical GPS Handshake Complete', 'success');
      }, () => showToast('GPS Access Denied', 'error'));
    }
  };

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setCarPos(null);
    setGeometry(null);
    setManeuvers([]);
    setStops([]);
    setTripStats(null);
    if (simTimeout.current) clearTimeout(simTimeout.current);
    mapRef.current?.setZoom(13);
  }, []);

  const startNavSim = (points, instructions) => {
    if (!points?.length) return;
    setIsNavigating(true);
    setSidebarOpen(false);
    let i = 0;
    const animate = () => {
      if (i >= points.length) {
        showToast('Tactical Arrival Confirmed', 'success');
        stopNavigation();
        return;
      }
      const p = points[i];
      const latlng = [p[1], p[0]];
      setCarPos(latlng);
      mapRef.current?.setView(latlng, 17, { animate: true });
      if (instructions.length > 0) {
        setNavStep(Math.min(instructions.length - 1, Math.floor((i / points.length) * instructions.length)));
      }
      i++;
      simTimeout.current = setTimeout(animate, 350);
    };
    animate();
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    showToast(`AI: Searching Geodata for ${search}...`, 'info');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'VahanSetu-App-2026-v2' }
      });
      const data = await res.json();
      if (data?.[0]) {
        const pos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        mapRef.current?.flyTo(pos, 13);
        fetchStations(pos[0], pos[1]);
      } else { showToast('Locality discovery failed', 'error'); }
    } catch { showToast('Geospatial Service Unavailable', 'error'); }
  };

  const handleVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('Voice AI not supported', 'info');
    const r = new SR(); r.lang = 'en-IN';
    r.onresult = e => { setSearch(e.results[0][0].transcript); handleSearch(); };
    r.start();
  };

  const MapSetter = ({ setMap }) => {
    const map = useMap();
    useEffect(() => {
      if (map) {
        setMap(map);
        setTimeout(() => map.invalidateSize(), 500);
      }
    }, [map, setMap]);
    return null;
  };

  return (
    <div className="app map-mode" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="vs-grid-hud" style={{ background: gridPricing.grid_status === 'Peak Load' ? 'rgba(255,61,107,0.1)' : 'rgba(4,6,15,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="vs-pulse-dot" style={{ background: gridPricing.grid_status === 'Peak Load' ? 'var(--red)' : 'var(--cyan)' }}></div>
          <span style={{ fontWeight: 800, color: gridPricing.grid_status === 'Peak Load' ? 'var(--red)' : 'var(--cyan)' }}>GRID: {gridPricing.grid_status}</span>
          <span style={{ color: 'var(--text-muted)' }}>| Current Rate: <strong style={{ color: '#fff' }}>₹{gridPricing.current_price}/{gridPricing.unit}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,163,0.1)', padding: '4px 10px', borderRadius: 20 }}>
            <Zap size={12} color="var(--green)"/>
            <span style={{ color: 'var(--green)', fontWeight: 800 }}>{credits.total_balance} VahanCredits</span>
          </div>
        </div>
      </div>

      <div className="app-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="map-wrap">
          <MapContainer center={[23.0225, 72.5714]} zoom={12} zoomControl={false} style={{ width: '100%', height: '100%' }}
            onClick={(e) => {
              if (isSettingStart) {
                setUserPos([e.latlng.lat, e.latlng.lng]);
                setIsSettingStart(false);
                setHint(null);
                showToast('Start Point Re-indexed', 'success');
              }
            }}>
            <TileLayer url={curLayer.url} />
            <MapSetter setMap={m => { mapRef.current = m; }} />
            {geometry && <RouteRenderer geometry={geometry} stops={stops} />}
            {userPos && <Marker position={userPos} icon={UserIcon()} />}
            {carPos && <Marker position={carPos} icon={CarIcon()} />}
            {stops.map((s, idx) => (
              <Marker key={`stop-marker-${idx}`} position={[s.lat, s.lng]} icon={StopIcon(idx + 1)}>
                <Popup><div className="vs-popup">
                  <div style={{ color: 'var(--green)', fontSize: '0.65rem', fontWeight: 900, marginBottom: 5 }}>HUB RECOMMENDATION #{idx+1}</div>
                  <div className="vs-popup-name">{s.name}</div>
                  <div className="vs-popup-addr">{s.address}</div>
                </div></Popup>
              </Marker>
            ))}
            {!geometry && stations.map((s, idx) => (
              <Marker key={`marker-st-${idx}`} position={[s.lat, s.lng]} icon={StationIcon(s.available_bays, s.total_bays)}
                eventHandlers={{ click: () => setHighlightedId(s.id) }}>
                <Popup><div className="vs-popup">
                  <div className="vs-popup-name">{s.name}</div>
                  <div className="vs-popup-addr">{s.address}</div>
                </div></Popup>
              </Marker>
            ))}
          </MapContainer>

          {isNavigating && maneuvers[navStep] && (
            <div id="navHUD" className="active" style={{ width: '420px', left: '50%', transform: 'translateX(-50%)', bottom: '40px', top: 'auto', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0,240,255,0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: 'linear-gradient(180deg, rgba(8,13,28,0.95), rgba(4,6,15,0.98))' }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                  <Navigation2 size={32} style={{ transform: 'rotate(45deg)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Upcoming Maneuver</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{maneuvers[navStep].text}</div>
                </div>
                <button className="vs-btn-icon" onClick={stopNavigation} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><X size={18} /></button>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                  <span>TRIP PROGRESS</span>
                  <span>{maneuvers.length > 0 ? Math.round((navStep / maneuvers.length) * 100) : 0}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${maneuvers.length > 0 ? (navStep / maneuvers.length) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', boxShadow: '0 0 10px var(--cyan)' }}></div>
                </div>
              </div>
            </div>
          )}

          {hint && <div className="map-hint" style={{ display: 'block' }}>{hint}</div>}

          <div className="map-search-wrap">
            <div className="vs-search-bar" style={{ width: '100%', borderRadius: 14 }}>
              <Search size={16} color="var(--text-muted)" />
              <input type="text" placeholder="Search station or place..." value={search} onChange={e => setSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} />
              <button className="vs-btn vs-btn-icon" style={{ background: 'none' }} onClick={handleVoiceSearch}><Mic size={16} color="var(--cyan)" /></button>
            </div>
          </div>

          <div className="map-controls">
            <button className="map-ctrl-btn" onClick={() => mapRef.current?.flyTo(userPos || [12.97, 77.59], 16)} title="Recenter"><Navigation2 size={18} /></button>
            <button className="map-ctrl-btn" onClick={handleLocate} title="My Location"><MapPin size={18} /></button>
            <button className="map-ctrl-btn" onClick={() => setLayerIdx(i => (i + 1) % layerConfigs.length)} title={`Switch style`}><NextLayerIcon size={18} /></button>
            <button className={`map-ctrl-btn ${isSettingStart ? 'active' : ''}`} onClick={() => { setIsSettingStart(!isSettingStart); setHint(isSettingStart ? null : '📍 Click on the map to set your start point'); }} title="Set Start"><Flag size={18} /></button>
          </div>

          <button className="map-sidebar-toggle" style={{ display: 'flex' }} onClick={() => setSidebarOpen(!sidebarOpen)}><SidebarIcon size={18} /></button>
        </div>

        <div id="sidebar" className={sidebarOpen ? 'open' : ''}>
          <div className="vs-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <button className={`vs-tab ${activeTab === 'search' ? 'active' : ''}`} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === 'search' ? 'var(--cyan)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', borderBottom: activeTab === 'search' ? '2px solid var(--cyan)' : 'none' }} onClick={() => setActiveTab('search')}>Stations</button>
            <button className={`vs-tab ${activeTab === 'trip' ? 'active' : ''}`} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === 'trip' ? 'var(--cyan)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', borderBottom: activeTab === 'trip' ? '2px solid var(--cyan)' : 'none' }} onClick={() => setActiveTab('trip')}>Route Plan</button>
            <button className={`vs-tab ${activeTab === 'filters' ? 'active' : ''}`} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === 'filters' ? 'var(--cyan)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', borderBottom: activeTab === 'filters' ? '2px solid var(--cyan)' : 'none' }} onClick={() => setActiveTab('filters')}>Filters</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'trip' && (
              <div className="sb-section" style={{ padding: 20 }}>
                <div className="sb-title"><div className="sb-title-icon"><Cpu size={14}/></div> Intelligent Trip Planner</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="vs-input" placeholder="Start city" value={trip.start} onChange={e => setTrip({...trip, start: e.target.value})} />
                  <input className="vs-input" placeholder="End city" value={trip.end} onChange={e => setTrip({...trip, end: e.target.value})} />
                  <button className={`vs-btn vs-btn-primary ${isPlanning ? 'loading' : ''}`} onClick={planTrip} disabled={isPlanning}>
                    {isPlanning ? <RotateCcw className="vs-spin" size={16}/> : <Zap size={16} />} 
                    {isPlanning ? 'Analyzing Corridor...' : 'Optimize EV Route'}
                  </button>
                  {tripStats && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 15 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                         <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 15px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Distance</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{tripStats.distance} <span style={{fontSize:'0.7rem', opacity:0.6}}>km</span></div>
                         </div>
                         <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 15px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Est. Arrival</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{tripStats.time}</div>
                         </div>
                      </div>

                      {/* AI SUGGESTION ENGINE */}
                      {recommendation && (
                        <div className="vs-glass" style={{ padding: 22, borderRadius: 24, background: 'linear-gradient(135deg, rgba(0,240,255,0.06), transparent)', border: '1px solid rgba(0,240,255,0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                             <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                               <Cpu size={14} /> Quantum Recommendation
                             </div>
                             {gridPricing.grid_status === 'Peak Load' && (
                               <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--red)', background: 'rgba(255,61,107,0.1)', padding: '3px 8px', borderRadius: 4 }}>PEAK LOAD WARNING</span>
                             )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', flexShrink: 0 }}>
                               <Zap size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                               <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>{recommendation.station}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{recommendation.reason} Recommended for maximum charging velocity and network stability.</div>
                            </div>
                          </div>

                          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                             <div style={{ background: 'rgba(0,255,135,0.05)', padding: '10px', borderRadius: 14, border: '1px solid rgba(0,255,135,0.1)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--green)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Eco Impact</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>🍃 {recommendation.co2_saved}kg</div>
                             </div>
                             <div style={{ background: 'rgba(255,214,10,0.05)', padding: '10px', borderRadius: 14, border: '1px solid rgba(255,214,10,0.1)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Reward Yield</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>💎 +{recommendation.credits}</div>
                             </div>
                          </div>

                          <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                             <AlertCircle size={12} color="var(--purple)" /> 
                             <span>Alternative: <strong>Nexus Gandhinagar</strong> (+12 mins offset)</span>
                          </div>
                        </div>
                      )}

                      {/* ROUTE HEALTH */}
                      <div style={{ padding: '0 5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 6, fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-muted)' }}>NETWORK RELIABILITY</span>
                          <span style={{ color: 'var(--green)' }}>98% HEALTH</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '98%', background: 'linear-gradient(90deg, var(--cyan), var(--green))' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {geometry && (
                    <><button className="vs-nav-btn" onClick={() => startNavSim(geometry.coordinates, maneuvers)} style={{ marginTop: 12, width: '100%', padding: 12, background: 'var(--green)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, cursor: 'pointer' }}><Navigation2 size={16}/> Start Navigation</button>
                    <button className="vs-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { setGeometry(null); setTripStats(null); }}><RotateCcw size={12}/> Clear Trip</button></>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="sb-section" style={{ padding: 20 }}>
                <div className="sb-title"><div className="sb-title-icon"><Filter size={14}/></div> Network Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="vs-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Connector</div>
                    <select className="vs-input" value={filter.connector} onChange={e => setFilter({...filter, connector: e.target.value})} style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
                      <option value="">All Types</option>
                      <option value="CCS2">CCS2</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                      <option value="Type2">Type 2</option>
                    </select>
                  </div>
                </div>
                <button className="vs-btn vs-btn-primary" style={{ width: '100%', padding: '9px', borderRadius: '10px' }} onClick={() => fetchStations()}>
                  <CheckCircle size={14}/> Update Results
                </button>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="sidebar-scroll">
                <div style={{ padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{geometry ? stops.length : stations.length} Hubs {geometry ? 'Along Route' : 'Secure'}</span>
                  <span className="vs-badge-live" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--green)', padding: '5px 12px', borderRadius: 20, fontSize: '0.65rem' }}>{geometry ? 'CORRIDOR ACTIVE' : 'LIVE NETWORK'}</span>
                </div>
                {geometry ? (
                  stops.map((s, idx) => (
                    <div key={`stop-list-${idx}`} className="s-card" style={{ margin: '0 10px 12px' }} onClick={() => mapRef.current?.flyTo([s.lat, s.lng], 16)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div className="s-card-name" style={{ fontSize: '0.85rem' }}>{s.name}</div>
                        <div style={{ color: 'var(--cyan)', fontSize: '0.65rem', fontWeight: 800 }}>HUB #{idx+1}</div>
                      </div>
                      <div className="s-card-addr" style={{ fontSize: '0.7rem' }}>{s.address}</div>
                      <div style={{ color: 'var(--green)', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={10}/> RECOMMENDED STOP</div>
                    </div>
                  ))
                ) : (
                  stations.map((s, idx) => (
                    <div key={`st-card-${idx}`} id={`card-${s.id}`} className={`s-card ${highlightedId === s.id ? 'highlighted' : ''}`} onClick={() => { setHighlightedId(s.id); mapRef.current?.flyTo([s.lat, s.lng], 16); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="s-card-name" style={{ color: highlightedId === s.id ? 'var(--cyan)' : '#fff' }}>{s.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(0,240,255,0.1)', border: '0.5px solid rgba(0,240,255,0.2)', borderRadius: '20px', fontSize: '0.6rem', color: 'var(--cyan)', fontWeight: 800 }}>
                          <CheckSquare size={10}/> {s.price_per_kwh > 20 ? '🔥 Surge' : '✅ Good Rate'}
                        </div>
                      </div>
                      <div className="s-card-addr">{s.address}</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div className="s-card-avail" style={{ margin: 0 }}>
                          <div className={`vs-pulse-dot ${(s.available_bays || 0) > 0 ? 'green' : 'red'}`} style={{ width: 8, height: 8 }} />
                          <strong style={{ fontSize: '0.85rem' }}>{s.available_bays || 0}/{s.total_bays || 0} Bays</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: gridPricing.grid_status === 'Peak Load' ? 'var(--red)' : 'var(--green)' }}>₹{s.price_per_kwh || gridPricing.current_price}</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--cyan)', fontWeight: 800 }}>{s.predicted_occupancy || 'PREDICTING...'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 15 }}>
                        <button className="s-action" onClick={(e) => { e.stopPropagation(); setTrip({start:'My Location', end:s.address}); planTrip(); }}><Navigation2 size={16} color="var(--cyan)" /> <span style={{fontSize:'0.55rem'}}>Maps</span></button>
                        <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/favorite/${s.id}`); }}><Star size={16} color="var(--gold)" /> <span style={{fontSize:'0.55rem'}}>Save</span></button>
                        <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/queue/${s.id}`); }}><Bell size={16} color="#fff" /> <span style={{fontSize:'0.55rem'}}>Queue</span></button>
                        <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/report/${s.id}`); }}><AlertTriangle size={16} color="var(--red)" /> <span style={{fontSize:'0.55rem'}}>Alert</span></button>
                      </div>
                    </div>
                  ))
                )}
                {isPlanning && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="vs-spin" style={{ width: 40, height: 40, border: '3px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                    <div style={{ fontWeight: 800, color: '#fff' }}>Constructing Intelligent Corridor</div>
                    <div style={{ fontSize: '0.7rem', marginTop: 8 }}>Discovering real-world charging hubs near your route path...</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .avatar-ring-animated {
          position: absolute; inset: -8px; border-radius: 50%;
          background: conic-gradient(var(--cyan) 0%, var(--green) 40%, var(--purple) 70%, var(--cyan) 100%);
          animation: avatar-spin-fast 6s linear infinite;
          filter: blur(4px);
        }
        @keyframes avatar-spin-fast { to { transform: rotate(360deg); } }
        
        #navHUD {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(20px);
        }
        
        .s-card {
          transition: transform 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .s-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0,240,255,0.3);
        }
      `}</style>
    </div>
  );
}
