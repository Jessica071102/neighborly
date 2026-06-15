import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { MessageCircleIcon, CheckIcon, XIcon, InboxIcon, UserIcon } from '../components/Icons';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / 86400000);
}

function DaysLeftBadge({ endDate }) {
  const days = daysLeft(endDate);
  if (days < 0) return <span className="days-badge days-badge-red">Overdue by {Math.abs(days)}d</span>;
  if (days === 0) return <span className="days-badge days-badge-red">Due today!</span>;
  if (days <= 3) return <span className="days-badge days-badge-orange">{days}d left</span>;
  return <span className="days-badge days-badge-green">{days}d left</span>;
}

function statusBadge(s) {
  const map = {
    pending:   ['badge-yellow', 'Pending'],
    accepted:  ['badge-green',  'Active'],
    declined:  ['badge-red',    'Declined'],
    completed: ['badge-gray',   'Completed'],
  };
  const [cls, label] = map[s] || ['badge-gray', s];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function PriceTag({ pricePerDay, startDate, endDate }) {
  if (!pricePerDay || pricePerDay === 0) return null;
  const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  const total = (pricePerDay * days).toFixed(2);
  return (
    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
      €{pricePerDay}/day · {days} day{days !== 1 ? 's' : ''} = <strong>€{total}</strong>
    </span>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'active';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForms, setReviewForms] = useState({});
  const [submittedReviews, setSubmittedReviews] = useState(new Set());

  async function load() {
    try {
      const data = await api.get('/requests/mine');
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      await api.put(`/requests/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch (err) {
      setError(err.message);
    }
  }

  function setReviewField(requestId, field, value) {
    setReviewForms((prev) => ({ ...prev, [requestId]: { ...prev[requestId], [field]: value } }));
  }

  function openReview(requestId) {
    setReviewForms((prev) => ({ ...prev, [requestId]: { rating: 0, comment: '', loading: false, error: '' } }));
  }

  async function submitReview(r) {
    const form = reviewForms[r.id];
    if (!form?.rating) { setReviewField(r.id, 'error', 'Please select a rating'); return; }
    const revieweeId = r.borrower_id === user?.id ? r.lender_id : r.borrower_id;
    setReviewField(r.id, 'loading', true);
    try {
      await api.post('/reviews', { requestId: r.id, revieweeId, rating: form.rating, comment: form.comment });
      setSubmittedReviews((prev) => new Set([...prev, r.id]));
      setReviewForms((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
    } catch (err) {
      setReviewField(r.id, 'error', err.message);
      setReviewField(r.id, 'loading', false);
    }
  }

  const active   = requests.filter((r) => r.status === 'accepted');
  const pending  = requests.filter((r) => r.status === 'pending');
  const history  = requests.filter((r) => r.status === 'completed' || r.status === 'declined');

  const tabs = [
    { key: 'active',  label: 'Active',  count: active.length },
    { key: 'pending', label: 'Pending', count: pending.length },
    { key: 'history', label: 'History', count: history.length },
  ];

  function shown() {
    if (tab === 'active')  return active;
    if (tab === 'pending') return pending;
    return history;
  }

  function otherName(r) {
    return r.borrower_id === user?.id ? r.lender_name : r.borrower_name;
  }
  function otherId(r) {
    return r.borrower_id === user?.id ? r.lender_id : r.borrower_id;
  }
  function myRole(r) {
    return r.borrower_id === user?.id ? 'borrowing' : 'lending';
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requests</h1>
          <p className="page-subtitle">Manage your borrows and lendings</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="tabs">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            className={`tab-btn${tab === key ? ' active' : ''}`}
            onClick={() => setSearchParams({ tab: key })}
          >
            {label}
            {count > 0 && <span className="tab-count">{count}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading…</div>}

      {!loading && shown().length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><InboxIcon size={44} /></div>
          <h3>Nothing here yet</h3>
          <p>
            {tab === 'active'  && 'Accepted requests will appear here once a lender approves.'}
            {tab === 'pending' && 'Incoming and outgoing requests waiting for a decision.'}
            {tab === 'history' && 'Completed and declined requests will appear here.'}
          </p>
        </div>
      )}

      {/* ── ACTIVE TAB ── */}
      {!loading && tab === 'active' && active.map((r) => (
        <div key={r.id} className="request-card">
          <div className="request-card-header">
            <span className="request-card-title">{r.item_name}</span>
            <span className={`role-tag role-tag-${myRole(r)}`}>
              {myRole(r) === 'borrowing' ? 'Borrowing' : 'Lending'}
            </span>
          </div>

          <div className="request-card-person">
            <UserIcon size={13} />
            <Link to={`/users/${otherId(r)}`} className="request-person-link">
              {otherName(r)}
            </Link>
          </div>

          <div className="request-card-dates">
            {formatDate(r.start_date)} → {formatDate(r.end_date)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0' }}>
            <DaysLeftBadge endDate={r.end_date} />
            <PriceTag pricePerDay={r.item_price} startDate={r.start_date} endDate={r.end_date} />
          </div>

          <div className="request-card-actions">
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
              <MessageCircleIcon size={14} /> Open chat
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(r.id, 'completed')}>
              <CheckIcon size={14} /> Mark completed
            </button>
          </div>
        </div>
      ))}

      {/* ── PENDING TAB ── */}
      {!loading && tab === 'pending' && pending.map((r) => {
        const isIncoming = r.lender_id === user?.id;
        return (
          <div key={r.id} className="request-card">
            <div className="request-card-header">
              <span className="request-card-title">{r.item_name}</span>
              {statusBadge(r.status)}
            </div>

            <div className="request-card-person">
              <UserIcon size={13} />
              {isIncoming ? (
                <>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Request from</span>
                  <Link to={`/users/${r.borrower_id}`} className="request-person-link">
                    {r.borrower_name}
                  </Link>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your request to</span>
                  <Link to={`/users/${r.lender_id}`} className="request-person-link">
                    {r.lender_name}
                  </Link>
                </>
              )}
            </div>

            <div className="request-card-dates">
              {formatDate(r.start_date)} → {formatDate(r.end_date)}
            </div>
            <PriceTag pricePerDay={r.item_price} startDate={r.start_date} endDate={r.end_date} />

            <div className="request-card-actions">
              {isIncoming ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(r.id, 'accepted')}>
                    <CheckIcon size={14} /> Accept
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'declined')}>
                    <XIcon size={14} /> Decline
                  </button>
                </>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(r.id, 'declined')}>
                  <XIcon size={14} /> Withdraw request
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ── HISTORY TAB ── */}
      {!loading && tab === 'history' && history.map((r) => (
        <div key={r.id} className="request-card">
          <div className="request-card-header">
            <span className="request-card-title">{r.item_name}</span>
            {statusBadge(r.status)}
          </div>

          <div className="request-card-person">
            <UserIcon size={13} />
            <Link to={`/users/${otherId(r)}`} className="request-person-link">
              {otherName(r)}
            </Link>
          </div>

          <div className="request-card-dates">
            {formatDate(r.start_date)} → {formatDate(r.end_date)}
          </div>

          {r.status === 'completed' && (
            <div className="request-card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
                <MessageCircleIcon size={14} /> View chat
              </button>
              {!submittedReviews.has(r.id) && !reviewForms[r.id] && (
                <button className="btn btn-ghost btn-sm" onClick={() => openReview(r.id)}>
                  Leave review
                </button>
              )}
              {submittedReviews.has(r.id) && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>✓ Review submitted</span>
              )}
            </div>
          )}

          {reviewForms[r.id] && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Leave a review for {otherName(r)}
              </div>
              {reviewForms[r.id].error && (
                <div className="error-box" style={{ marginBottom: 8 }}>{reviewForms[r.id].error}</div>
              )}
              <div style={{ marginBottom: 8 }}>
                <StarRating value={reviewForms[r.id].rating} onChange={(v) => setReviewField(r.id, 'rating', v)} size={24} />
              </div>
              <textarea
                className="form-input form-textarea"
                placeholder="Optional comment…"
                style={{ minHeight: 60, marginBottom: 8 }}
                value={reviewForms[r.id].comment}
                onChange={(e) => setReviewField(r.id, 'comment', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => submitReview(r)} disabled={reviewForms[r.id].loading}>
                  {reviewForms[r.id].loading ? 'Submitting…' : 'Submit review'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setReviewForms((prev) => { const n = { ...prev }; delete n[r.id]; return n; })}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
