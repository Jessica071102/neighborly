import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { useToast, Toast } from '../components/Toast';
import { MessageCircleIcon, CheckIcon, XIcon, InboxIcon, UserIcon, CameraIcon, AlertTriangleIcon } from '../components/Icons';

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
    pending:         ['badge-yellow',  'Pending'],
    accepted:        ['badge-green',   'Active'],
    declined:        ['badge-red',     'Declined'],
    completed:       ['badge-gray',    'Completed'],
    return_reported: ['badge-blue',    'Return Reported'],
    disputed:        ['badge-orange',  'Disputed'],
    resolved:        ['badge-gray',    'Resolved'],
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

// FR-12: inline photo upload button (renders as a styled label wrapping a hidden file input)
function PhotoUploadButton({ requestId, type, onUploaded, label }) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post(`/requests/${requestId}/photos`, { photoUrl: reader.result, type });
        if (inputRef.current) inputRef.current.value = '';
        onUploaded();
      } catch (err) {
        alert(err.message || 'Failed to upload photo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
      <CameraIcon size={14} /> {loading ? 'Uploading…' : label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
        disabled={loading}
      />
    </label>
  );
}

// FR-12: photo grid split by handover vs return
function PhotosSection({ requestId, refreshKey }) {
  const [photos, setPhotos] = useState(null);

  useEffect(() => {
    api.get(`/requests/${requestId}/photos`)
      .then((d) => setPhotos(d.photos))
      .catch(() => setPhotos([]));
  }, [requestId, refreshKey]);

  if (!photos) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading photos…</div>;
  if (photos.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No photos uploaded yet.</div>;

  const handover = photos.filter((p) => p.type === 'handover');
  const ret = photos.filter((p) => p.type === 'return');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {handover.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Handover condition
          </div>
          <div className="photo-grid">
            {handover.map((p) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                <img src={p.photo_url} alt="Handover" className="photo-thumb" />
              </a>
            ))}
          </div>
        </div>
      )}
      {ret.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Return condition
          </div>
          <div className="photo-grid">
            {ret.map((p) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                <img src={p.photo_url} alt="Return" className="photo-thumb" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [photoRefresh, setPhotoRefresh] = useState({});
  const [showPhotos, setShowPhotos] = useState(new Set());
  const { toast, showToast } = useToast();

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

  function refreshPhotos(requestId) {
    setPhotoRefresh((prev) => ({ ...prev, [requestId]: (prev[requestId] || 0) + 1 }));
    setShowPhotos((prev) => new Set([...prev, requestId]));
  }

  function togglePhotos(requestId) {
    setShowPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId); else next.add(requestId);
      return next;
    });
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/requests/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      const messages = { accepted: 'Request accepted', declined: 'Request declined' };
      showToast(messages[status] || 'Updated');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function reportReturn(id) {
    try {
      await api.post(`/requests/${id}/report-return`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'return_reported' } : r));
      showToast('Return reported — waiting for lender confirmation');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function confirmReturn(id) {
    try {
      await api.post(`/requests/${id}/confirm-return`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'completed' } : r));
      showToast('Return confirmed — transaction complete!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function disputeReturn(id) {
    if (!window.confirm('Are you sure you want to raise a dispute? The borrower will be notified and the transaction will be marked as disputed.')) return;
    try {
      await api.post(`/requests/${id}/dispute`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'disputed' } : r));
      showToast('Dispute raised — the borrower has been notified');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function resolveDispute(id) {
    try {
      const res = await api.post(`/requests/${id}/resolve`);
      if (res.fullyResolved) {
        setRequests((prev) => prev.map((r) => r.id === id
          ? { ...r, status: 'resolved', dispute_resolved_borrower: true, dispute_resolved_lender: true }
          : r));
        showToast('Dispute fully resolved by both parties');
      } else {
        setRequests((prev) => prev.map((r) => {
          if (r.id !== id) return r;
          return r.borrower_id === user?.id
            ? { ...r, dispute_resolved_borrower: true }
            : { ...r, dispute_resolved_lender: true };
        }));
        showToast('Marked as resolved on your side — waiting for the other party');
      }
    } catch (err) {
      showToast(err.message, 'error');
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
      showToast('Review submitted!');
    } catch (err) {
      if (err.message?.includes('already reviewed')) {
        setSubmittedReviews((prev) => new Set([...prev, r.id]));
        setReviewForms((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
        showToast('You already reviewed this transaction');
      } else {
        setReviewField(r.id, 'error', err.message);
        setReviewField(r.id, 'loading', false);
      }
    }
  }

  const active  = requests.filter((r) => ['accepted', 'return_reported', 'disputed'].includes(r.status));
  const pending = requests.filter((r) => r.status === 'pending');
  const history = requests.filter((r) => ['completed', 'declined', 'resolved'].includes(r.status));

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

  function otherName(r) { return r.borrower_id === user?.id ? r.lender_name : r.borrower_name; }
  function otherId(r)   { return r.borrower_id === user?.id ? r.lender_id   : r.borrower_id;   }
  function myRole(r)    { return r.borrower_id === user?.id ? 'borrowing'   : 'lending';        }

  function hasIResolvedDispute(r) {
    if (r.borrower_id === user?.id) return r.dispute_resolved_borrower;
    if (r.lender_id   === user?.id) return r.dispute_resolved_lender;
    return false;
  }

  return (
    <div className="container">
      <Toast toast={toast} />
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
            {tab === 'active'  && 'Active and in-progress requests will appear here.'}
            {tab === 'pending' && 'Incoming and outgoing requests waiting for a decision.'}
            {tab === 'history' && 'Completed, declined, and resolved requests will appear here.'}
          </p>
        </div>
      )}

      {/* ACTIVE TAB */}
      {!loading && tab === 'active' && active.map((r) => {
        const isBorrower  = r.borrower_id === user?.id;
        const isLender    = r.lender_id   === user?.id;
        const photosVisible = showPhotos.has(r.id);
        const photoKey    = photoRefresh[r.id] || 0;

        return (
          <div key={r.id} className="request-card">
            <div className="request-card-header">
              <span className="request-card-title">{r.item_name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`role-tag role-tag-${myRole(r)}`}>
                  {isBorrower ? 'Borrowing' : 'Lending'}
                </span>
                {statusBadge(r.status)}
              </div>
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

            {r.status === 'accepted' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0' }}>
                <DaysLeftBadge endDate={r.end_date} />
                <PriceTag pricePerDay={r.item_price} startDate={r.start_date} endDate={r.end_date} />
              </div>
            )}

            {r.status === 'disputed' && (
              <div className="dispute-notice">
                A dispute has been raised. Please discuss in chat and both mark as resolved once you agree.
              </div>
            )}

            {r.status === 'return_reported' && isBorrower && (
              <div className="info-box" style={{ margin: '8px 0' }}>
                Return reported — waiting for {r.lender_name} to review the photos and confirm.
              </div>
            )}

            {/* Photos — always shown for return_reported / disputed; toggled for accepted */}
            {(r.status === 'return_reported' || r.status === 'disputed') && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <PhotosSection requestId={r.id} refreshKey={photoKey} />
              </div>
            )}
            {r.status === 'accepted' && photosVisible && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <PhotosSection requestId={r.id} refreshKey={photoKey} />
              </div>
            )}

            <div className="request-card-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
                <MessageCircleIcon size={14} /> Open chat
              </button>

              {/* ACCEPTED — lender uploads handover photo */}
              {r.status === 'accepted' && isLender && (
                <>
                  <PhotoUploadButton requestId={r.id} type="handover" label="Add handover photo" onUploaded={() => refreshPhotos(r.id)} />
                  {!photosVisible && (
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePhotos(r.id)}>View photos</button>
                  )}
                </>
              )}

              {/* ACCEPTED — borrower uploads return photo + reports return */}
              {r.status === 'accepted' && isBorrower && (
                <>
                  <PhotoUploadButton requestId={r.id} type="return" label="Add return photo" onUploaded={() => refreshPhotos(r.id)} />
                  {!photosVisible && (
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePhotos(r.id)}>View photos</button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => reportReturn(r.id)}>
                    <CheckIcon size={14} /> Report return
                  </button>
                </>
              )}

              {/* RETURN REPORTED — lender confirms or disputes */}
              {r.status === 'return_reported' && isLender && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => confirmReturn(r.id)}>
                    <CheckIcon size={14} /> Confirm — all good
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => disputeReturn(r.id)}>
                    <AlertTriangleIcon size={14} /> Report problem
                  </button>
                </>
              )}

              {/* DISPUTED — mutual resolution */}
              {r.status === 'disputed' && !hasIResolvedDispute(r) && (
                <button className="btn btn-outline btn-sm" onClick={() => resolveDispute(r.id)}>
                  <CheckIcon size={14} /> Mark as resolved
                </button>
              )}
              {r.status === 'disputed' && hasIResolvedDispute(r) && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ✓ You marked this resolved — waiting for the other party
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* PENDING TAB */}
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
                  <Link to={`/users/${r.borrower_id}`} className="request-person-link">{r.borrower_name}</Link>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your request to</span>
                  <Link to={`/users/${r.lender_id}`} className="request-person-link">{r.lender_name}</Link>
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

      {/* HISTORY TAB */}
      {!loading && tab === 'history' && history.map((r) => (
        <div key={r.id} className="request-card">
          <div className="request-card-header">
            <span className="request-card-title">{r.item_name}</span>
            {statusBadge(r.status)}
          </div>

          <div className="request-card-person">
            <UserIcon size={13} />
            <Link to={`/users/${otherId(r)}`} className="request-person-link">{otherName(r)}</Link>
          </div>

          <div className="request-card-dates">
            {formatDate(r.start_date)} → {formatDate(r.end_date)}
          </div>

          {(r.status === 'completed' || r.status === 'resolved') && (
            <div className="request-card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${r.id}`)}>
                <MessageCircleIcon size={14} /> View chat
              </button>
              {r.status === 'completed' && !r.has_review && !submittedReviews.has(r.id) && !reviewForms[r.id] && (
                <button className="btn btn-ghost btn-sm" onClick={() => openReview(r.id)}>
                  Leave review
                </button>
              )}
              {r.status === 'completed' && (r.has_review || submittedReviews.has(r.id)) && (
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
                style={{ minHeight: 60, marginBottom: 4 }}
                value={reviewForms[r.id].comment}
                onChange={(e) => setReviewField(r.id, 'comment', e.target.value)}
                maxLength={300}
              />
              <span className="char-count" style={{ marginBottom: 8 }}>{reviewForms[r.id].comment.length}/300</span>
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
