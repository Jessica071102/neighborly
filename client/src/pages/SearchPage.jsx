import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ListingCard from '../components/ListingCard';
import { SearchIcon, LocateIcon, MapIcon, GridIcon, MapPinIcon, PackageIcon } from '../components/Icons';

// Fix default Leaflet marker icons broken by bundlers
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#3D8B5F;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(2);
  const [userPos, setUserPos] = useState(null);
  const [locError, setLocError] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (pos, q, r) => {
    if (!pos) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ lat: pos.lat, lng: pos.lng, radiusKm: r });
      if (q) params.set('q', q);
      const data = await api.get(`/search?${params}`);
      setItems(data.items);
      setSearched(true);
    } catch {
      setItems([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!userPos) return;
    const t = setTimeout(() => runSearch(userPos, query, radius), 400);
    return () => clearTimeout(t);
  }, [userPos, query, radius, runSearch]);

  function requestLocation() {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return; }
    setLocLoading(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => { setLocError('Could not get location. Please allow location access.'); setLocLoading(false); }
    );
  }

  return (
    <div className="container-wide">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find items to borrow</h1>
          <p className="page-subtitle">Search for things your neighbors are sharing</p>
        </div>
      </div>

      <div className="search-controls">
        <div className="search-input-wrap">
          <SearchIcon size={18} />
          <input
            className="search-input"
            placeholder="Search for drills, cameras, bikes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="radius-control">
          <MapPinIcon size={14} />
          <input
            type="range" min={1} max={10} step={0.5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
          <span style={{ minWidth: 36 }}>{radius} km</span>
        </div>

        <button
          className={`location-pill${userPos ? ' active' : ''}`}
          onClick={requestLocation}
          disabled={locLoading}
        >
          <LocateIcon size={14} />
          {locLoading ? 'Detecting…' : userPos ? 'Location set' : 'Use my location'}
        </button>

        {searched && (
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${view === 'list' ? ' active' : ''}`}
              onClick={() => setView('list')} title="List view"
            >
              <GridIcon size={17} />
            </button>
            <button
              className={`view-toggle-btn${view === 'map' ? ' active' : ''}`}
              onClick={() => setView('map')} title="Map view"
            >
              <MapIcon size={17} />
            </button>
          </div>
        )}
      </div>

      {locError && <div className="error-box">{locError}</div>}

      {!userPos && !locError && (
        <div className="empty-state">
          <div className="empty-state-icon"><MapPinIcon size={44} /></div>
          <h3>Share your location to search</h3>
          <p>Click "Use my location" above to find items near you.</p>
        </div>
      )}

      {searching && (
        <div className="loading"><div className="spinner" />Looking nearby…</div>
      )}

      {!searching && searched && view === 'list' && (
        items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><PackageIcon size={44} /></div>
            <h3>Nothing found nearby</h3>
            <p>Try a wider radius or a different search term.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {items.length} item{items.length !== 1 ? 's' : ''} within {radius} km
            </p>
            <div className="listings-grid">
              {items.map((item) => <ListingCard key={item.id} item={item} />)}
            </div>
          </>
        )
      )}

      {!searching && searched && view === 'map' && userPos && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {items.length} item{items.length !== 1 ? 's' : ''} within {radius} km
          </p>
          <div className="map-wrap" style={{ height: 480 }}>
            <MapContainer
              center={[userPos.lat, userPos.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={radius * 1000}
                pathOptions={{ color: '#3D8B5F', fillColor: '#3D8B5F', fillOpacity: 0.05, weight: 1.5 }}
              />
              {/* Item coordinates are not exposed by the API (privacy, NFR-04).
                  The map shows the search radius; results appear in the list below. */}
            </MapContainer>
          </div>
          <div className="listings-grid" style={{ marginTop: 16 }}>
            {items.map((item) => <ListingCard key={item.id} item={item} />)}
          </div>
        </>
      )}
    </div>
  );
}
