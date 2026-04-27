import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, showToast } from '../api';
import Navbar from '../components/Navbar';
import { 
  Search, Mic, MapPin, Layers, Flag, Sidebar as SidebarIcon, 
  Cpu, Filter, Zap, CheckCircle, Navigation2, X, Star, RotateCcw, 
  Flame, CheckSquare, Info, Bell, AlertTriangle, ArrowUpLeft, ArrowUpRight
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

    if (geometry.coordinates.length > 0) {
      const bounds = L.geoJSON(geometry).getBounds();
      map.fitBounds(bounds.pad(0.2));
    }

    return () => layersRef.current.forEach(l => map.removeLayer(l));
  }, [map, geometry]);

  return null;
}

export default function MapPage() {
  // Track stations with guaranteed unique keys
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

  const loc = useLocation();
  const mapRef = useRef();
  const simTimeout = useRef();

  // Optimized Tile Layer Logic
  const layerConfigs = [
    { id: 'satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', icon: Layers, title: 'Satellite' },
    { id: 'midnight', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', icon: Cpu, title: 'Midnight Navy' },
    { id: 'daylight', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', icon: Zap, title: 'Daylight' }
  ];
  const [layerIdx, setLayerIdx] = useState(0); // Default to Satellite

  useEffect(() => {
    // Priority 1: High-fidelity auto-locate
    const startLocating = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((p) => {
          const coords = [p.coords.latitude, p.coords.longitude];
          setUserPos(coords);
          if (mapRef.current) {
            mapRef.current.setView(coords, 14);
          }
          fetchStations(coords[0], coords[1]);
          showToast('Tactical GPS Handshake Complete', 'success');
        }, () => {
          console.warn('GPS Signal Search Timed Out - Defaulting to Ahmedabad baseline');
          fetchStations(23.0225, 72.5714); // Ahmedabad
        }, { timeout: 10000, enableHighAccuracy: true });
      } else {
        fetchStations(23.0225, 72.5714);
      }
    };

    startLocating();
    
    // Check for URL-driven refocusing
    const params = new URLSearchParams(loc.search);
    if (params.get('lat') && params.get('lng')) {
      const pos = [parseFloat(params.get('lat')), parseFloat(params.get('lng'))];
      setTimeout(() => mapRef.current?.flyTo(pos, 16), 500);
    }
  }, [loc.search]);
  

  const handleAutoLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const coords = [p.coords.latitude, p.coords.longitude];
        setUserPos(coords);
        mapRef.current?.flyTo(coords, 14);
      }, () => console.warn('GPS Signal Search Timed Out'));
    }
  };

  const fetchStations = async (lat, lng) => {
    try {
      const params = { ...filter };
      // Default to Ahmedabad (23.02, 72.57) if no GPS
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

  const getHeading = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const dy = p2[1] - p1[1];
    const dx = p2[0] - p1[0];
    return Math.atan2(dx, dy) * (180 / Math.PI);
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
      const nextP = points[i+1] || p;
      const latlng = [p[1], p[0]];
      setCarPos(latlng);
      
      const heading = getHeading(p, nextP);
      setCarHeading(heading);
      
      mapRef.current?.setView(latlng, 17, { animate: true });
      
      if (instructions.length > 0) {
        const stepIdx = Math.min(instructions.length - 1, Math.floor((i / points.length) * instructions.length));
        setNavStep(stepIdx);
      }
      i++;
      simTimeout.current = setTimeout(animate, 350);
    };
    animate();
  };

  const planTrip = async () => {
    if (!trip.end) return showToast('Destination required', 'error');
    setIsPlanning(true);
    showToast('AI: Constructing Optimal Corridor...', 'info');
    try {
      const params = { ...trip };
      if (userPos && (!trip.start || trip.start.toLowerCase() === 'my location')) {
        params.lat = userPos[0]; params.lng = userPos[1];
      }
      const { data } = await api.get('/api/trip_plan', { params });
      if (data.geometry) {
        setGeometry(data.geometry);
        setStops(data.stops || []);
        setManeuvers(data.instructions || []);
        setTripStats({ distance: data.total_km, time: data.total_time });
        showToast('Neural route path finalized', 'success');
      }
    } catch (err) { 
      const msg = err.response?.data?.error || 'Route engine timeout';
      showToast(msg, 'error'); 
    } finally { setIsPlanning(false); }
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
        showToast(`Refocusing on ${search}`, 'success');
        fetchStations(pos[0], pos[1]); // Fetch stations for the NEW searched position
      } else { showToast('Locality discovery failed', 'error'); }
    } catch { showToast('Geospatial Service Unavailable', 'error'); }
  };

  const [isPlanning, setIsPlanning] = useState(false);

  const curLayer = layerConfigs[layerIdx];
  const nextLayer = layerConfigs[(layerIdx + 1) % layerConfigs.length];
  const NextLayerIcon = nextLayer.icon;

  const handleVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('Voice AI not supported in this browser', 'info');
    const r = new SR(); r.lang = 'en-IN';
    r.onresult = e => {
      const q = e.results[0][0].transcript;
      setSearch(q);
      handleSearch(q);
    };
    r.start();
    showToast('AI: Listening for locality...', 'info');
  };

  const MapSetter = ({ setMap }) => {
    const map = useMap();
    useEffect(() => {
      if (map) {
        setMap(map);
        // Force recalculate size to fix black/gray map area
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
      }
    }, [map, setMap]);
    return null;
  };

  return (
    <div className="app map-mode" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
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
            <TileLayer url={curLayer.url} className={`leaflet-layer-${curLayer.id}`} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>CAPACITY</div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>{s.power_kw}kW</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>DISTANCE</div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>{s.distance_km}km</div>
                    </div>
                  </div>
                </div></Popup>
              </Marker>
            ))}
            {/* Only show standard markers if NOT navigating or planning a corridor trip */}
            {!geometry && stations.map((s, idx) => (
              <Marker key={`marker-st-${idx}`} position={[s.lat, s.lng]} icon={StationIcon(s.available_bays, s.total_bays)}
                eventHandlers={{ click: () => { setHighlightedId(s.id); document.getElementById(`card-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }}>
                <Popup className="leaflet-popup-content-wrapper"><div className="vs-popup">
                  <div className="vs-popup-name" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cyan)', marginBottom: '4px' }}>{s.name}</div>
                  <div className="vs-popup-addr" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {s.address}</div>
                  <div className="vs-popup-stats" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                    <div className="vps-item">
                      <span className="vps-val" style={{ color: (s.available_bays || 0) > 0 ? 'var(--green)' : 'var(--red)', fontSize: '0.95rem', fontWeight: 800 }}>{s.available_bays || 0}/{s.total_bays || 0}</span>
                      <span className="vps-lab" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Slots</span>
                    </div>
                    <div className="vps-item">
                      <span className="vps-val" style={{ fontSize: '0.95rem', fontWeight: 800 }}>{s.power_kw}kW</span>
                      <span className="vps-lab" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Power</span>
                    </div>
                    <div className="vps-item">
                      <span className="vps-val" style={{ fontSize: '0.95rem', fontWeight: 800 }}>₹{s.price_per_kwh || '18'}</span>
                      <span className="vps-lab" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate</span>
                    </div>
                  </div>
                  <div className="vs-popup-actions" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="vpa-btn vpa-primary" style={{ padding: '10px', borderRadius: '12px', fontWeight: 700 }} onClick={() => { setTrip({ start: 'My Location', end: s.address }); planTrip(); }}><Navigation2 size={12}/> Maps</button>
                    <button className="vpa-btn vpa-secondary" style={{ padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => api.post(`/api/favorite/${s.id}`)}><Star size={12}/> Save</button>
                    <button className="vpa-btn vpa-secondary" onClick={() => api.post(`/api/queue/${s.id}`)}><Bell size={12}/> Queue</button>
                    <button className="vpa-btn vpa-secondary" onClick={() => api.post(`/api/report/${s.id}`)}><AlertTriangle size={12}/> Report</button>
                  </div>
                </div></Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* HUD Layer (Top Center) */}
          {isNavigating && maneuvers[navStep] && (
            <div id="navHUD" className="active" style={{ background: '#017c5b', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.25)', padding: '24px' }}>
              <div className="nav-hud-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}><Navigation2 size={32} /></div>
              <div className="nav-hud-text">
                <div style={{ color: 'var(--cyan)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>NAVIGATING TO: {trip.end.toUpperCase()}</div>
                <div className="nav-hud-instr" style={{ fontSize: '1.25rem', fontWeight: 850, color: '#fff' }}>{maneuvers[navStep].text}</div>
                <div className="nav-hud-dist" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{formatDist(maneuvers[navStep].dist).toUpperCase()} TO NEXT TURN</div>
              </div>
              <button className="map-ctrl-btn" onClick={stopNavigation} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: 32, height: 32 }}><X size={16} color="#fff" /></button>
            </div>
          )}

          {/* Guidance Panel (Right Road Sheet) */}
          {isNavigating && (
            <div id="guidancePanel" className="active" style={{ background: 'rgba(4, 10, 20, 0.9)', backdropFilter: 'blur(30px)', border: '1px solid rgba(0, 240, 255, 0.4)', borderRadius: '24px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--cyan)', fontWeight: 800, marginBottom: 15, display: 'flex', justifyContent: 'space-between' }}>
                <span>Road Manoeuvres</span><MapPin size={14} />
              </div>
              <div id="guideList">
                {maneuvers.map((m, i) => (
                  <div key={`guide-${i}`} className={`guide-step ${i === navStep ? 'active' : ''}`} id={`step-${i}`}>
                    <div style={{ fontWeight: 900, color: 'var(--cyan)', minWidth: 28 }}>{i+1}.</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{m.text}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>In {formatDist(m.dist)}</div>
                    </div>
                  </div>
                ))}
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

          <div className="loc-status-chip manual" style={{ top: 80 }}>
            <span className="vs-pulse-dot" style={{ width: 6, height: 6 }}></span>
            <span>{userPos ? 'Live Positioning Active' : 'Locating Pulse...'}</span>
            <button onClick={handleLocate} style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Sync</button>
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
          <div className="sb-section">
            <div className="sb-title"><div className="sb-title-icon"><Cpu size={14}/></div> Intelligent Trip Planner</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="vs-input" placeholder="Start city" value={trip.start} onChange={e => setTrip({...trip, start: e.target.value})} />
              <input className="vs-input" placeholder="End city" value={trip.end} onChange={e => setTrip({...trip, end: e.target.value})} />
              <button className={`vs-btn vs-btn-primary ${isPlanning ? 'loading' : ''}`} onClick={planTrip} disabled={isPlanning}>
                {isPlanning ? <RotateCcw className="vs-spin" size={16}/> : <Zap size={16} />} 
                {isPlanning ? 'Analyzing Corridor...' : 'Optimize EV Route'}
              </button>
              {tripStats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                   <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Distance</div><strong>{tripStats.distance} km</strong>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Est. Time</div><strong>{tripStats.time}</strong>
                   </div>
                </div>
              )}
              {geometry && (
                <><button className="vs-nav-btn" onClick={() => startNavSim(geometry.coordinates, maneuvers)}><Navigation2 size={16}/> Start Navigation</button>
                <button className="vs-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { setGeometry(null); setTripStats(null); }}><RotateCcw size={12}/> Clear Trip</button></>
              )}
            </div>
          </div>

          <div className="sb-section">
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
              <div>
                <div className="vs-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Min Power (kW)</div>
                <input type="number" className="vs-input" placeholder="Any" value={filter.power} onChange={e => setFilter({...filter, power: e.target.value})} style={{ padding: '8px 10px', fontSize: '0.8rem' }} />
              </div>
            </div>
            <button className="vs-btn vs-btn-primary" style={{ width: '100%', padding: '9px', borderRadius: '10px' }} onClick={() => fetchStations()}>
              <CheckCircle size={14}/> Update Results
            </button>
          </div>

          <div className="sidebar-scroll">
            <div style={{ padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{geometry ? stops.length : stations.length} Hubs {geometry ? 'Along Route' : 'Secure'}</span>
              <span className="vs-badge-live" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--green)', padding: '5px 12px', borderRadius: 20, fontSize: '0.65rem' }}>{geometry ? 'CORRIDOR ACTIVE' : 'LIVE NETWORK'}</span>
            </div>
            {stops.map((s, idx) => (
              <div key={`stop-list-${idx}`} className="s-card" style={{ margin: '0 10px 12px' }} onClick={() => mapRef.current?.flyTo([s.lat, s.lng], 16)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><div className="s-card-name" style={{ fontSize: '0.85rem' }}>{s.name}</div><div style={{ color: 'var(--cyan)', fontSize: '0.65rem', fontWeight: 800 }}>HUB #{idx+1}</div></div>
                <div className="s-card-addr" style={{ fontSize: '0.7rem' }}>{s.address}</div>
                <div style={{ color: 'var(--green)', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={10}/> RECOMMENDED STOP</div>
              </div>
            ))}

            {geometry && maneuvers.length > 0 && (
              <div className="sb-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 10 }}>
                <div className="sb-title" style={{ marginBottom: 15 }}><div className="sb-title-icon"><Navigation2 size={12}/></div> Trip Guidance</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {maneuvers.map((m, idx) => (
                    <div key={`side-step-${idx}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)' }}>{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>{m.text}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>IN {formatDist(m.dist)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div id="stationList">
              {/* Only show sidebar standard list if NO trip is active AND not planning */}
              {!geometry && !isPlanning && stations.map((s, idx) => (
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
                      <div className={`s-dot ${(s.available_bays || 0) > 0 ? 'green' : 'red'}`} />
                      <strong style={{ fontSize: '0.85rem' }}>{s.available_bays || 0}/{s.total_bays || 0} Bays</strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)', border: '1px solid var(--cyan-border)', padding: '3px 10px', borderRadius: '20px' }}>
                      {s.distance_km ? `${s.distance_km.toFixed(2)} km away` : 'Nearby'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 15 }}>
                    <button className="s-action" onClick={(e) => { e.stopPropagation(); setTrip({start:'My Location', end:s.address}); planTrip(); }}><Navigation2 size={16} color="var(--cyan)" /> <span style={{fontSize:'0.55rem'}}>Maps</span></button>
                    <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/favorite/${s.id}`); }}><Star size={16} color="var(--gold)" /> <span style={{fontSize:'0.55rem'}}>Save</span></button>
                    <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/queue/${s.id}`); }}><Bell size={16} color="#fff" /> <span style={{fontSize:'0.55rem'}}>Queue</span></button>
                    <button className="s-action" onClick={(e) => { e.stopPropagation(); api.post(`/api/report/${s.id}`); }}><AlertTriangle size={16} color="var(--red)" /> <span style={{fontSize:'0.55rem'}}>Alert</span></button>
                  </div>
                </div>
              ))}
              {isPlanning && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="vs-spin" style={{ width: 40, height: 40, border: '3px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                  <div style={{ fontWeight: 800, color: '#fff' }}>Constructing Intelligent Corridor</div>
                  <div style={{ fontSize: '0.7rem', marginTop: 8 }}>Discovering real-world charging hubs near your route path...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
