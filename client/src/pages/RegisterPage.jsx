import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', displayName: '',
    neighborhoodArea: '', neighborhoodId: '',
  });
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/neighborhoods')
      .then((d) => setNeighborhoods(d.neighborhoods))
      .catch(() => {}); // non-fatal — dropdown just stays empty
  }, []);

  function handleNeighborhoodChange(e) {
    const id = e.target.value;
    const selected = neighborhoods.find((n) => String(n.id) === id);
    setForm((f) => ({
      ...f,
      neighborhoodId: id,
      neighborhoodArea: selected ? selected.name : '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) {
      setError('Email, password and display name are required'); return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        neighborhoodArea: form.neighborhoodArea || undefined,
        neighborhoodId: form.neighborhoodId ? Number(form.neighborhoodId) : undefined,
      });
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
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required maxLength={254} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={8} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label">Neighbourhood (optional)</label>
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
            <p className="form-hint">Helps neighbours find your listings. You can change this later.</p>
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
