import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import StarRating from '../components/StarRating';
import { MapPinIcon, ChevronLeftIcon, UserIcon } from '../components/Icons';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/users/${id}/profile`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;
  if (error) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!data) return null;

  const { user, reviews, averageRating, reviewCount, openDisputeCount } = data;

  const initials = user.display_name
    ? user.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        <ChevronLeftIcon size={16} /> Back
      </button>

      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '32px 24px' }}>
        {user.photo_url ? (
          <img src={user.photo_url} alt={user.display_name}
            className="profile-avatar profile-avatar-img" />
        ) : (
          <div className="profile-avatar">{initials}</div>
        )}
        <div className="profile-name">{user.display_name}</div>

        {user.neighborhood_area && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
            <MapPinIcon size={13} /> {user.neighborhood_area}
          </div>
        )}

        {averageRating != null && reviewCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <StarRating value={Math.round(averageRating)} size={17} />
            <span style={{ fontWeight: 600 }}>{averageRating.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
          </div>
        )}

        {openDisputeCount > 0 && (
          <div className="dispute-badge" style={{ margin: '10px auto 0', display: 'inline-flex' }}>
            ⚠ {openDisputeCount} open dispute{openDisputeCount !== 1 ? 's' : ''}
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: openDisputeCount > 0 ? 8 : 0 }}>
          Member since {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {user.bio && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="sidebar-card-title" style={{ marginBottom: 8 }}>About</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{user.bio}</p>
        </div>
      )}

      {user.preferences && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="sidebar-card-title" style={{ marginBottom: 8 }}>Borrowing preferences</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{user.preferences}</p>
        </div>
      )}

      {reviews.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Reviews ({reviewCount})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.map((r) => (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StarRating value={r.rating} size={15} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.reviewer_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(r.created_at)}</span>
                </div>
                {r.comment && <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length === 0 && (
        <div className="empty-state" style={{ padding: '32px 24px' }}>
          <div className="empty-state-icon"><UserIcon size={36} /></div>
          <h3 style={{ fontSize: 16 }}>No reviews yet</h3>
          <p>This user hasn't completed any transactions yet.</p>
        </div>
      )}
    </div>
  );
}
