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
  // Pre-fill neighbourhood from the user's profile but let them clear/change it
  const [neighborhood, setNeighborhood] = useState(
    saved.neighborhood !== undefined ? saved.neighborhood : (user?.neighborhood_area || '')
  );
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ query, neighborhood }));
  }, [query, neighborhood]);

  const runSearch = useCallback(async (q, nb) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (nb) params.set('neighborhood', nb);
      const data = await api.get(`/search?${params}`);
      setItems(data.items);
      setSearched(true);
    } catch {
      setItems([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce searches as the user types
  useEffect(() => {
    const t = setTimeout(() => runSearch(query, neighborhood), 350);
    return () => clearTimeout(t);
  }, [query, neighborhood, runSearch]);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find items to borrow</h1>
          <p className="page-subtitle">Search for things your neighbours are sharing</p>
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
            maxLength={60}
          />
        </div>

        <div className="search-input-wrap" style={{ flex: '0 1 220px' }}>
          <MapPinIcon size={16} />
          <input
            className="search-input"
            placeholder="Neighbourhood, e.g. Kreuzberg"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            maxLength={60}
          />
        </div>
      </div>

      {searching && (
        <div className="loading"><div className="spinner" />Searching…</div>
      )}

      {!searching && searched && (
        items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><PackageIcon size={44} /></div>
            <h3>Nothing found</h3>
            <p>Try a different keyword or clear the neighbourhood filter to browse everything.</p>
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
              {items.length} item{items.length !== 1 ? 's' : ''} found
              {neighborhood ? ` in ${neighborhood}` : ''}
            </p>
            <div className="listings-grid">
              {items.map((item) => <ListingCard key={item.id} item={item} />)}
            </div>
          </>
        )
      )}
    </div>
  );
}
