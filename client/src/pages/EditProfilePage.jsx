import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function PhotoInput({ value, onChange }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  }

  const initials = '?';

  return (
    <div className="photo-input-wrap">
      {value ? (
        <img src={value} alt="Profile" className="photo-input-preview photo-input-preview-round" />
      ) : (
        <div className="photo-input-placeholder photo-input-placeholder-round">{initials}</div>
      )}
      <div className="photo-input-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>
          Upload photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <input
          type="url" className="form-input" placeholder="…or paste image URL"
          value={value?.startsWith('data:') ? '' : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <p className="form-hint">Upload a file (max 5 MB) or paste an image URL.</p>
    </div>
  );
}

const PREFERENCE_SUGGESTIONS = [
  'Pick up only', 'Can deliver nearby', 'Cash payment preferred',
  'Bank transfer only', 'Free to borrow', 'Weekends only', 'Weekdays only',
];

export default function EditProfilePage({ isSetup = false }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: user?.display_name || '',
    neighborhoodArea: user?.neighborhood_area || '',
    bio: user?.bio || '',
    preferences: user?.preferences || '',
    photoUrl: user?.photo_url || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function addPreference(pref) {
    const current = form.preferences.trim();
    if (current.includes(pref)) return;
    const next = current ? `${current} · ${pref}` : pref;
    setForm({ ...form, preferences: next });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put('/users/me', {
        displayName: form.displayName || undefined,
        neighborhoodArea: form.neighborhoodArea || undefined,
        bio: form.bio || null,
        preferences: form.preferences || null,
        photoUrl: form.photoUrl || undefined,
      });
      await refreshUser();
      navigate(isSetup ? '/search' : '/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      {isSetup ? (
        <div className="profile-setup-header">
          <div className="auth-logo" style={{ fontSize: 22 }}>Neighborly</div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Welcome! Tell us about yourself</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
            This helps your neighbours know who they're lending to. You can update it anytime.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Edit profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Update your public profile and borrowing preferences.
          </p>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="form-label">Profile photo</label>
          <PhotoInput value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })} />
        </div>

        <div className="form-group">
          <label className="form-label">Display name</label>
          <input className="form-input" placeholder="How neighbours see you"
            value={form.displayName} onChange={set('displayName')} />
        </div>

        <div className="form-group">
          <label className="form-label">Neighbourhood</label>
          <input className="form-input" placeholder="e.g. Prenzlauer Berg"
            value={form.neighborhoodArea} onChange={set('neighborhoodArea')} />
        </div>

        <div className="form-group">
          <label className="form-label">About you</label>
          <textarea
            className="form-input form-textarea"
            placeholder="A short bio — what do you do, what are you happy to lend?"
            value={form.bio}
            onChange={set('bio')}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Borrowing preferences</label>
          <textarea
            className="form-input form-textarea"
            placeholder="e.g. Pick up only · Cash preferred · Weekends only"
            value={form.preferences}
            onChange={set('preferences')}
            rows={2}
          />
          <div className="pref-chips">
            {PREFERENCE_SUGGESTIONS.map((p) => (
              <button
                key={p} type="button"
                className="pref-chip"
                onClick={() => addPreference(p)}
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isSetup ? 'Save and continue' : 'Save changes'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(isSetup ? '/search' : '/profile')}
          >
            {isSetup ? 'Skip for now' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}
