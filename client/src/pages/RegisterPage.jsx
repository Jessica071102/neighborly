import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', displayName: '', neighborhoodArea: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) {
      setError('Email, password and display name are required'); return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/register', form);
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
              value={form.displayName} onChange={set('displayName')} required maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={set('email')} required maxLength={254} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="At least 8 characters"
              value={form.password} onChange={set('password')} required minLength={8} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label">Neighbourhood (optional)</label>
            <input className="form-input" placeholder="e.g. Prenzlauer Berg"
              value={form.neighborhoodArea} onChange={set('neighborhoodArea')} maxLength={60} />
            <p className="form-hint">Helps neighbours find your listings. You can add or change this later.</p>
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
