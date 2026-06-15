import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import DateRangePicker from '../components/DateRangePicker';
import { ChevronLeftIcon, MapPinIcon, PackageIcon, UserIcon } from '../components/Icons';

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSent, setReqSent] = useState(false);

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

  const days = start && end
    ? Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1)
    : null;
  const totalCost = days && item?.price_per_day ? (item.price_per_day * days).toFixed(2) : null;

  async function submitRequest() {
    if (!start || !end) { setReqError('Please select a start and end date on the calendar'); return; }
    setReqError('');
    setReqLoading(true);
    try {
      await api.post('/requests', { itemId: Number(id), startDate: start, endDate: end });
      setReqSent(true);
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
  const canBorrow = !isOwner && !!user && item.status === 'available';

  return (
    <div className="container">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        <ChevronLeftIcon size={16} /> Back
      </button>

      <div className="item-detail-layout">
        {/* ── Left column ── */}
        <div>
          {item.photo_url ? (
            <img className="item-detail-img" src={item.photo_url} alt={item.name} />
          ) : (
            <div className="item-detail-img-placeholder"><PackageIcon size={64} /></div>
          )}

          <h1 className="item-detail-title" style={{ marginTop: 20 }}>{item.name}</h1>
          <div className="item-detail-meta">
            <span className="badge badge-gray">{item.category}</span>
            {item.status === 'available'
              ? <span className="badge badge-green">Available</span>
              : <span className="badge badge-gray">Paused</span>}
            {item.price_per_day > 0
              ? <span className="badge badge-price">€{item.price_per_day}/day</span>
              : <span className="badge badge-green">Free</span>}
            {item.owner_area && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                <MapPinIcon size={13} /> {item.owner_area}
              </span>
            )}
          </div>

          {item.description && <p className="item-detail-desc">{item.description}</p>}

          {/* ── Availability calendar ── */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Availability</h3>

            {canBorrow ? (
              <>
                {!reqSent ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                      {!start ? 'Select your start date' : !end ? 'Now select your end date' : `${formatDate(start)} – ${formatDate(end)} · ${days} day${days !== 1 ? 's' : ''}`}
                    </p>
                    <DateRangePicker
                      bookedRanges={bookedRanges}
                      start={start}
                      end={end}
                      onChange={(s, e) => { setStart(s); setEnd(e || ''); setReqError(''); }}
                    />

                    {start && end && (
                      <div className="cost-summary" style={{ marginTop: 12 }}>
                        {totalCost ? (
                          <>
                            <span>{days} day{days !== 1 ? 's' : ''} × €{item.price_per_day}/day</span>
                            <strong>= €{totalCost}</strong>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              Agree on payment method via chat after the owner accepts.
                            </p>
                          </>
                        ) : (
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>Free to borrow</span>
                        )}
                      </div>
                    )}

                    {reqError && <div className="error-box" style={{ marginTop: 8 }}>{reqError}</div>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        className="btn btn-primary"
                        onClick={submitRequest}
                        disabled={!start || !end || reqLoading}
                      >
                        {reqLoading ? 'Sending…' : 'Send borrow request'}
                      </button>
                      {(start || end) && (
                        <button className="btn btn-ghost" onClick={() => { setStart(''); setEnd(''); setReqError(''); }}>
                          Clear
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Request sent!</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                      {formatDate(start)} – {formatDate(end)} · waiting for the owner to respond.
                    </p>
                    <Link to="/requests?tab=pending" className="btn btn-outline btn-sm">View my requests</Link>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Read-only calendar for owners / logged-out users */}
                <DateRangePicker
                  bookedRanges={bookedRanges}
                  start=""
                  end=""
                  onChange={() => {}}
                />
                {!user && (
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600 }}>Sign in</Link> to send a borrow request.
                  </p>
                )}
                {isOwner && (
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    This is your listing. You can see booked periods above.
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Reviews ── */}
          {reviews.length > 0 && (
            <>
              <hr className="divider" style={{ marginTop: 28 }} />
              <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Reviews for {item.owner_name}</h3>
              {avgRating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <StarRating value={Math.round(avgRating)} size={18} />
                  <span style={{ fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
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

        {/* ── Sidebar ── */}
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

          {item.price_per_day > 0 && (
            <div className="sidebar-card">
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>
                €{item.price_per_day}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/day</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
