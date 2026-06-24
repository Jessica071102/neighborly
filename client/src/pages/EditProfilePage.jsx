import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PhotoInput from '../components/PhotoInput';

const PREFERENCE_SUGGESTIONS = [
  'Pick up only', 'Can deliver nearby', 'Cash payment preferred',
  'Bank transfer only', 'Free to borrow', 'Weekends only', 'Weekdays only',
];

function ProfileForm({ form, setForm, neighborhoods, error, loading, onSubmit, isSetup }) {
  const navigate = useNavigate();

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleNeighborhoodChange(e) {
    const id = e.target.value;
    const selected = neighborhoods.find((n) => String(n.id) === id);
    setForm((f) => ({
      ...f,
      neighborhoodId: id,
      neighborhoodArea: selected ? selected.name : f.neighborhoodArea,
    }));
  }

  function addPreference(pref) {
    const current = form.preferences.trim();
    if (current.includes(pref)) return;
    const next = current ? `${current} · ${pref}` : pref;
    setForm((f) => ({ ...f, preferences: next }));
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="form-group">
        <label className="form-label">Profile photo</label>
        <PhotoInput round value={form.photoUrl} onChange={(v) => setForm((f) => ({ ...f, photoUrl: v }))} />
      </div>

      <div className="form-group">
        <label className="form-label">Display name</label>
        <input className="form-input" placeholder="How neighbours see you"
          value={form.displayName} onChange={set('displayName')} maxLength={30} />
      </div>

      <div className="form-group">
        <label className="form-label">Neighbourhood</label>
        <select
          className="form-input"
          value={form.neighborhoodId}
          onChange={handleNeighborhoodChange}
        >
          <option value="">Select neighbourhood…</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <p className="form-hint">Used to show your listings to nearby neighbours. Your exact address is never shared.</p>
      </div>

      <div className="form-group">
        <label className="form-label">About you</label>
        <textarea
          className="form-input form-textarea"
          placeholder="A short bio — what do you do, what are you happy to lend?"
          value={form.bio} onChange={set('bio')} rows={3} maxLength={250}
        />
        <span className="char-count">{form.bio.length}/250</span>
      </div>

      <div className="form-group">
        <label className="form-label">Borrowing preferences</label>
        <textarea
          className="form-input form-textarea"
          placeholder="e.g. Pick up only · Cash preferred · Weekends only"
          value={form.preferences} onChange={set('preferences')} rows={2} maxLength={120}
        />
        <span className="char-count">{form.preferences.length}/120</span>
        <div className="pref-chips">
          {PREFERENCE_SUGGESTIONS.map((p) => (
            <button key={p} type="button" className="pref-chip" onClick={() => addPreference(p)}>
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
          type="button" className="btn btn-ghost"
          onClick={() => navigate(isSetup ? '/search' : '/profile')}
        >
          {isSetup ? 'Skip for now' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}

export default function EditProfilePage({ isSetup = false }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [form, setForm] = useState({
    displayName: user?.display_name || '',
    neighborhoodArea: user?.neighborhood_area || '',
    neighborhoodId: user?.neighborhood_id ? String(user.neighborhood_id) : '',
    bio: user?.bio || '',
    preferences: user?.preferences || '',
    photoUrl: user?.photo_url || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/neighborhoods')
      .then((d) => setNeighborhoods(d.neighborhoods))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put('/users/me', {
        displayName: form.displayName || undefined,
        neighborhoodArea: form.neighborhoodArea || undefined,
        neighborhoodId: form.neighborhoodId ? Number(form.neighborhoodId) : undefined,
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

  if (isSetup) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 480, width: '100%' }}>
          <div className="auth-logo">Neighborly</div>
          <h1 className="auth-title">Tell us about yourself</h1>
          <p className="auth-subtitle" style={{ marginBottom: 24 }}>
            Help your neighbours know who they're lending to. You can update this anytime.
          </p>
          <ProfileForm
            form={form} setForm={setForm}
            neighborhoods={neighborhoods}
            error={error} loading={loading}
            onSubmit={handleSubmit} isSetup
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Edit profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Update your public profile and borrowing preferences.
        </p>
      </div>
      <div className="card">
        <ProfileForm
          form={form} setForm={setForm}
          neighborhoods={neighborhoods}
          error={error} loading={loading}
          onSubmit={handleSubmit} isSetup={false}
        />
      </div>
    </div>
  );
}
