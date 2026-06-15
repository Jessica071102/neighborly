import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { LocateIcon } from '../components/Icons';

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', displayName: '', neighborhoodArea: '',
  });
  const [location, setLocation] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function getLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported in this browser'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocLoading(false);
      },
      () => { setError('Could not get location. You can continue without it.'); setLocLoading(false); }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) {
      setError('Email, password and display name are required'); return;
    }
    setError('');
    setLoading(true);
    try {
      const body = { ...form, ...(location || {}) };
      const data = await api.post('/auth/register', body);
      login(data.token, data.user, '/profile/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Neighborly</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join your local borrowing community</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Display name</label>
            <input className="form-input" placeholder="How neighbors see you"
              value={form.displayName} onChange={set('displayName')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="At least 8 characters"
              value={form.password} onChange={set('password')} required minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Neighborhood (optional)</label>
            <input className="form-input" placeholder="e.g. Prenzlauer Berg"
              value={form.neighborhoodArea} onChange={set('neighborhoodArea')} />
          </div>
          <div className="form-group">
            <label className="form-label">Your location (optional)</label>
            <button
              type="button"
              className={`location-pill${location ? ' active' : ''}`}
              onClick={getLocation}
              disabled={locLoading}
            >
              <LocateIcon size={14} />
              {locLoading ? 'Detecting…' : location ? locLabel : 'Use my location'}
            </button>
            <p className="form-hint">Enables distance-based search results for others.</p>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
