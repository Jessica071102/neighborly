import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { MessageCircleIcon, CheckIcon, XIcon, InboxIcon } from '../components/Icons';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(s) {
  const map = {
    pending: ['badge-yellow', 'Pending'],
    accepted: ['badge-green', 'Accepted'],
    declined: ['badge-red', 'Declined'],
    completed: ['badge-gray', 'Completed'],
  };
  const [cls, label] = map[s] || ['badge-gray', s];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('outgoing');

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

  const [reviewForms, setReviewForms] = useState({});
  const [submittedReviews, setSubmittedReviews] = useState(new Set());

  function openReview(requestId) {
    setReviewForms((prev) => ({ ...prev, [requestId]: { rating: 0, comment: '', loading: false, error: '' } }));
  }
  function setReviewField(requestId, field, value) {
    setReviewForms((prev) => ({ ...prev, [requestId]: { ...prev[requestId], [field]: value } }));
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

  const outgoing = requests.filter((r) => r.borrower_id === user?.id);
  const incoming = requests.filter((r) => r.lender_id === user?.id);
  const shown = tab === 'outgoing' ? outgoing : incoming;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requests</h1>
          <p className="page-subtitle">Manage your borrow requests</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="tabs">
        <button
          className={`tab-btn${tab === 'outgoing' ? ' active' : ''}`}
          onClick={() => setTab('outgoing')}
        >
          Outgoing <span className="tab-count">{outgoing.length}</span>
        </button>
        <button
          className={`tab-btn${tab === 'incoming' ? ' active' : ''}`}
          onClick={() => setTab('incoming')}
        >
          Incoming <span className="tab-count">{incoming.length}</span>
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading…</div>}

      {!loading && shown.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><InboxIcon size={44} /></div>
          <h3>No {tab} requests</h3>
          <p>
            {tab === 'outgoing'
              ? 'Search for items and send borrow requests to get started.'
              : 'When someone requests an item you listed, it will appear here.'}
          </p>
        </div>
      )}

      {!loading && shown.map((r) => (
        <div key={r.id} className="request-card">
          <div className="request-card-header">
            <span className="request-card-title">{r.item_name}</span>
            {statusBadge(r.status)}
          </div>
          <div className="request-card-dates">
            {formatDate(r.start_date)} → {formatDate(r.end_date)}
          </div>
          <div className="request-card-actions">
            {tab === 'incoming' && r.status === 'pending' && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => updateStatus(r.id, 'accepted')}>
                  <CheckIcon size={14} /> Accept
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'declined')}>
                  <XIcon size={14} /> Decline
                </button>
              </>
            )}
            {r.status === 'accepted' && (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
                  <MessageCircleIcon size={14} /> Open chat
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(r.id, 'completed')}>
                  <CheckIcon size={14} /> Mark completed
                </button>
              </>
            )}
            {r.status === 'completed' && (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
                  <MessageCircleIcon size={14} /> View chat
                </button>
                {!submittedReviews.has(r.id) && !reviewForms[r.id] && (
                  <button className="btn btn-ghost btn-sm" onClick={() => openReview(r.id)}>
                    Leave review
                  </button>
                )}
                {submittedReviews.has(r.id) && (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Review submitted</span>
                )}
              </>
            )}
          </div>
          {reviewForms[r.id] && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Leave a review</div>
              {reviewForms[r.id].error && <div className="error-box" style={{ marginBottom: 8 }}>{reviewForms[r.id].error}</div>}
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
