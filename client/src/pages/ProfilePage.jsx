import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StarRating from '../components/StarRating';
import { MapPinIcon, LogOutIcon, ListIcon } from '../components/Icons';

function InviteCard() {
  const [copied, setCopied] = useState(false);
  const url = window.location.origin;
  const waText = encodeURIComponent(`Hey! I'm using Neighborly to share and borrow items in our neighbourhood — for free. Join here: ${url}`);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="invite-card">
      <h3>Invite a neighbour</h3>
      <p>The more people join in your area, the more useful Neighborly becomes for everyone.</p>
      <div className="invite-card-btns">
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          Share on WhatsApp
        </a>
        <button className="btn btn-outline btn-sm" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/reviews/user/${user.id}`)
      .then((d) => { setReviews(d.reviews); setAvgRating(d.averageRating); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const initials = user?.display_name
    ? user.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="profile-avatar">{initials}</div>
        <div className="profile-name">{user?.display_name}</div>
        <div className="profile-area">
          {user?.neighborhood_area && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <MapPinIcon size={13} /> {user.neighborhood_area}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</span>
        </div>

        {avgRating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <StarRating value={Math.round(avgRating)} size={17} />
            <span style={{ fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-outline btn-full" onClick={() => navigate('/my-listings')}
          style={{ justifyContent: 'flex-start' }}>
          <ListIcon size={16} /> My listings
        </button>
        <button className="btn btn-danger btn-full" onClick={logout}
          style={{ justifyContent: 'flex-start' }}>
          <LogOutIcon size={16} /> Sign out
        </button>
      </div>

      <InviteCard />

      {!loading && reviews.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Reviews received</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.map((r) => (
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
  );
}
