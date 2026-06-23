import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import { SearchIcon, MapPinIcon, PackageIcon } from '../components/Icons';

const SESSION_KEY = 'neighborly_search';

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; }
}

export default function SearchPage() {
  const { user } = useAuth();
  const saved = loadSession();
  const [query, setQuery] = useState(saved.query ?? '');
  const [radius, setRadius] = useState(saved.radius ?? 2);
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const hasHomeLocation = user?.lat && user?.lng;

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ query, radius }));
  }, [query, radius]);

  const runSearch = useCallback(async (lat, lng, q, r) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ lat, lng, radiusKm: r });
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
    if (!hasHomeLocation) return;
    const t = setTimeout(() => runSearch(user.lat, user.lng, query, radius), 400);
    return () => clearTimeout(t);
  }, [user?.lat, user?.lng, query, radius, runSearch, hasHomeLocation]);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find items to borrow</h1>
          <p className="page-subtitle">Search for things your neighbours are sharing</p>
        </div>
      </div>

      {!hasHomeLocation ? (
        <div className="search-onboarding">
          <h3>Set your home location first</h3>
          <p>Your home location is used to find items nearby. Add it to your profile to start browsing.</p>
          <div className="search-onboarding-steps">
            <div className="search-onboarding-step">
              <span className="search-onboarding-step-num">1</span>
              Set your home location in your profile
            </div>
            <div className="search-onboarding-step">
              <span className="search-onboarding-step-num">2</span>
              Search or browse items
            </div>
            <div className="search-onboarding-step">
              <span className="search-onboarding-step-num">3</span>
              Send a borrow request
            </div>
          </div>
          <Link to="/profile/edit" className="btn btn-primary">
            <MapPinIcon size={15} />
            Set home location
          </Link>
        </div>
      ) : (
        <>
          <div className="search-controls">
            <div className="search-input-wrap">
              <SearchIcon size={18} />
              <input
                className="search-input"
                placeholder="Search for drills, cameras, bikes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={60}
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
          </div>

          {searching && (
            <div className="loading"><div className="spinner" />Looking nearby…</div>
          )}

          {!searching && searched && (
            items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><PackageIcon size={44} /></div>
                <h3>Nothing found nearby yet</h3>
                <p>Be the first to share something in your area — or invite your neighbours to join.</p>
                <div className="empty-state-actions">
                  <Link to="/items/create" className="btn btn-primary">List an item</Link>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hey! I'm using Neighborly to share and borrow items in our neighbourhood. Join for free: ${window.location.origin}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    Invite neighbours
                  </a>
                </div>
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
        </>
      )}
    </div>
  );
}
