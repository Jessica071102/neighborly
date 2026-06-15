import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { ChevronLeftIcon, MapPinIcon, PackageIcon } from '../components/Icons';

function statusBadge(status) {
  return status === 'available'
    ? <span className="badge badge-green">Available</span>
    : <span className="badge badge-gray">Unavailable</span>;
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showRequest, setShowRequest] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      api.get(`/items/${id}`),
    ]).then(([itemData]) => {
      setItem(itemData.item);
      return api.get(`/reviews/user/${itemData.item.owner_id}`);
    }).then((revData) => {
      setReviews(revData.reviews);
      setAvgRating(revData.averageRating);
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function submitRequest() {
    if (!startDate || !endDate) { setReqError('Please select both dates'); return; }
    if (endDate < startDate) { setReqError('End date must be after start date'); return; }
    setReqError('');
    setReqLoading(true);
    try {
      await api.post('/requests', { itemId: Number(id), startDate, endDate });
      navigate('/requests');
    } catch (err) {
      setReqError(err.message);
    } finally {
      setReqLoading(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;
  if (error) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!item) return null;

  const isOwner = user && item.owner_id === user.id;

  return (
    <div className="container">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        <ChevronLeftIcon size={16} /> Back
      </button>

      <div className="item-detail-layout">
        <div>
          {item.photo_url ? (
            <img className="item-detail-img" src={item.photo_url} alt={item.name} />
          ) : (
            <div className="item-detail-img-placeholder">
              <PackageIcon size={64} />
            </div>
          )}

          <h1 className="item-detail-title" style={{ marginTop: 20 }}>{item.name}</h1>
          <div className="item-detail-meta">
            <span className="badge badge-gray">{item.category}</span>
            {statusBadge(item.status)}
            {item.owner_area && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                <MapPinIcon size={13} /> {item.owner_area}
              </span>
            )}
          </div>

          {item.description && (
            <p className="item-detail-desc">{item.description}</p>
          )}

          {reviews.length > 0 && (
            <>
              <hr className="divider" />
              <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Reviews for {item.owner_name}</h3>
              {avgRating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <StarRating value={Math.round(avgRating)} size={18} />
                  <span style={{ fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <StarRating value={r.rating} size={15} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.reviewer_name}</span>
                    </div>
                    {r.comment && <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="item-detail-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card-title">Owner</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.owner_name}</div>
            {item.owner_area && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPinIcon size={12} /> {item.owner_area}
              </div>
            )}
          </div>

          {!isOwner && user && item.status === 'available' && (
            <div className="sidebar-card">
              <div className="sidebar-card-title">Borrow this item</div>
              {!showRequest ? (
                <button className="btn btn-primary btn-full" onClick={() => setShowRequest(true)}>
                  Request to Borrow
                </button>
              ) : (
                <>
                  {reqError && <div className="error-box">{reqError}</div>}
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <input type="date" className="form-input" min={today}
                      value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Until</label>
                    <input type="date" className="form-input" min={startDate || today}
                      value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }}
                      onClick={submitRequest} disabled={reqLoading}>
                      {reqLoading ? 'Sending…' : 'Send request'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setShowRequest(false); setReqError(''); }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!user && (
            <div className="sidebar-card" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)' }}>
                Sign in to request this item
              </p>
              <Link to="/login" className="btn btn-primary btn-full">Sign in</Link>
            </div>
          )}

          {isOwner && (
            <div className="sidebar-card">
              <div className="sidebar-card-title">Your listing</div>
              <Link to="/my-listings" className="btn btn-outline btn-full">
                Manage my listings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
