import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { PlusIcon, PackageIcon, EditIcon, TrashIcon } from '../components/Icons';

function statusBadge(s) {
  return s === 'available'
    ? <span className="badge badge-green">Available</span>
    : <span className="badge badge-gray">Unavailable</span>;
}

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.get('/items/mine');
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(item) {
    const newStatus = item.status === 'available' ? 'unavailable' : 'available';
    try {
      await api.put(`/items/${item.id}`, { status: newStatus });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await api.delete(`/items/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Listings</h1>
          <p className="page-subtitle">Items you're sharing with neighbors</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/items/create')}>
          <PlusIcon size={16} /> Add listing
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && <div className="loading"><div className="spinner" />Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><PackageIcon size={48} /></div>
          <h3>No listings yet</h3>
          <p style={{ marginBottom: 20 }}>Share something you rarely use with your neighbors.</p>
          <button className="btn btn-primary" onClick={() => navigate('/items/create')}>
            <PlusIcon size={16} /> Add your first listing
          </button>
        </div>
      )}

      {!loading && items.map((item) => (
        <div key={item.id} className="my-listing-row">
          {item.photo_url ? (
            <img
              src={item.photo_url} alt={item.name}
              style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 8, background: 'var(--green-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: 'var(--green-muted)'
            }}>
              <PackageIcon size={22} />
            </div>
          )}

          <div className="my-listing-row-info">
            <div className="my-listing-row-name">
              <Link to={`/items/${item.id}`} style={{ color: 'inherit' }}>{item.name}</Link>
            </div>
            <div className="my-listing-row-cat">{item.category}</div>
          </div>

          {statusBadge(item.status)}

          <div className="my-listing-row-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/items/${item.id}/edit`)}
              title="Edit listing"
            >
              <EditIcon size={14} /> Edit
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toggleStatus(item)}
              title={item.status === 'available' ? 'Pause listing' : 'Activate listing'}
            >
              {item.status === 'available' ? 'Pause' : 'Activate'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)} title="Delete">
              <TrashIcon size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
