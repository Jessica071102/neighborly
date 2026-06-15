import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { ChevronLeftIcon, MapPinIcon, PackageIcon, UserIcon } from '../components/Icons';

function statusBadge(status) {
  return status === 'available'
    ? <span className="badge badge-green">Available</span>
    : <span className="badge badge-gray">Paused</span>;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function BookedRanges({ ranges }) {
  if (!ranges || ranges.length === 0) return null;
  return (
    <div className="booked-ranges">
      <div className="booked-ranges-label">Dates already booked:</div>
      {ranges.map((r, i) => (
        <span key={i} className="booked-range-chip">
          {formatDate(r.start_date)} – {formatDate(r.end_date)}
        </span>
      ))}
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [bookedRanges, setBookedRanges] = useState([]);
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
    api.get(`/items/${id}`)
      .then(({ item: itemData, bookedRanges: ranges }) => {
        setItem(itemData);
        setBookedRanges(ranges || []);
        return api.get(`/reviews/user/${itemData.owner_id}`);
      })
      .then((revData) => {
        setReviews(revData.reviews);
        setAvgRating(revData.averageRating);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : null;
  const totalCost = days && item?.price_per_day ? (item.price_per_day * days).toFixed(2) : null;

  async function submitRequest() {
    if (!startDate || !endDate) { setReqError('Please select both dates'); return; }
    if (endDate < startDate) { setReqError('End date must be after start date'); return; }
    setReqError('');
    setReqLoading(true);
    try {
      await api.post('/requests', { itemId: Number(id), startDate, endDate });
      navigate('/requests?tab=pending');
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
            <div className="item-detail-img-placeholder"><PackageIcon size={64} /></div>
          )}

          <h1 className="item-detail-title" style={{ marginTop: 20 }}>{item.name}</h1>
          <div className="item-detail-meta">
            <span className="badge badge-gray">{item.category}</span>
            {statusBadge(item.status)}
            {item.price_per_day > 0 ? (
              <span className="badge badge-price">€{item.price_per_day}/day</span>
            ) : (
              <span className="badge badge-green">Free</span>
            )}
            {item.owner_area && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                <MapPinIcon size={13} /> {item.owner_area}
              </span>
            )}
          </div>

          {item.description && <p className="item-detail-desc">{item.description}</p>}

          {bookedRanges.length > 0 && <BookedRanges ranges={bookedRanges} />}

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
            <Link to={`/users/${item.owner_id}`} className="owner-profile-link">
              <div className="owner-profile-avatar">
                {item.owner_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{item.owner_name}</div>
                {item.owner_area && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPinIcon size={12} /> {item.owner_area}
                  </div>
                )}
                {avgRating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <StarRating value={Math.round(avgRating)} size={13} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{parseFloat(avgRating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </Link>
            <Link to={`/users/${item.owner_id}`} className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10 }}>
              <UserIcon size={13} /> View full profile
            </Link>
          </div>

          {!isOwner && user && item.status === 'available' && (
            <div className="sidebar-card">
              <div className="sidebar-card-title">Borrow this item</div>

              {item.price_per_day > 0 && (
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 12 }}>
                  €{item.price_per_day} / day
                </div>
              )}

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

                  {totalCost && (
                    <div className="cost-summary">
                      <span>{days} day{days !== 1 ? 's' : ''} × €{item.price_per_day}</span>
                      <strong>= €{totalCost}</strong>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Agree on payment method via chat after request is accepted.
                      </p>
                    </div>
                  )}

                  {bookedRanges.length > 0 && (
                    <BookedRanges ranges={bookedRanges} />
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
              <Link to={`/items/${id}/edit`} className="btn btn-outline btn-full" style={{ marginBottom: 8 }}>
                Edit listing
              </Link>
              <Link to="/my-listings" className="btn btn-ghost btn-full">
                All my listings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
