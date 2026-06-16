import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StarRating from '../components/StarRating';
import { MapPinIcon, LogOutIcon, ListIcon, EditIcon, UserIcon } from '../components/Icons';

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
          target="_blank" rel="noopener noreferrer"
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
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '28px 24px' }}>
        {user?.photo_url ? (
          <img src={user.photo_url} alt={user.display_name}
            className="profile-avatar profile-avatar-img" />
        ) : (
          <div className="profile-avatar">{initials}</div>
        )}
        <div className="profile-name">{user?.display_name}</div>

        <div className="profile-area">
          {user?.neighborhood_area && (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              <MapPinIcon size={13} /> {user.neighborhood_area}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</span>
        </div>

        {user?.bio && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6, maxWidth: 380, margin: '12px auto 0' }}>
            {user.bio}
          </p>
        )}

        {user?.preferences && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {user.preferences}
          </div>
        )}

        {avgRating != null && reviews.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <StarRating value={Math.round(avgRating)} size={17} />
            <span style={{ fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
          </div>
        )}

        {!user?.bio && !user?.preferences && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--green-light)', borderRadius: 8, fontSize: 13 }}>
            Add a bio and preferences so neighbours know who you are.{' '}
            <Link to="/profile/edit" style={{ color: 'var(--green)', fontWeight: 600 }}>Complete profile →</Link>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-outline btn-full" onClick={() => navigate('/profile/edit')}
          style={{ justifyContent: 'flex-start' }}>
          <EditIcon size={16} /> Edit profile
        </button>
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
