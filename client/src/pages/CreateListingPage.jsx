import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import PhotoInput from '../components/PhotoInput';

const CATEGORY_SUGGESTIONS = [
  'Tools', 'Electronics', 'Sports & Outdoor', 'Kitchen', 'Books',
  'Bikes & Scooters', 'Games', 'Camping', 'Cleaning', 'Other',
];

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', category: '', description: '', photoUrl: '', pricePerDay: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.category) { setError('Name and category are required'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/items', {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        photoUrl: form.photoUrl || undefined,
        pricePerDay: parseFloat(form.pricePerDay) || 0,
      });
      navigate('/my-listings');
    } catch (err) {
      // Backend returns 400 when the user hasn't set a home location yet
      if (err.message.includes('home location')) {
        setError('Please set your home location in your profile first. Your listing location is taken from there.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h1 className="page-title" style={{ marginBottom: 6 }}>List an item</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
        Share something you rarely use with your neighbours.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="form-label">Item name *</label>
          <input className="form-input" placeholder="e.g. Cordless drill"
            value={form.name} onChange={set('name')} required />
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <input className="form-input" list="cats" placeholder="Select or type a category"
            value={form.category} onChange={set('category')} required />
          <datalist id="cats">
            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea"
            placeholder="Condition, included accessories, usage instructions…"
            value={form.description} onChange={set('description')} />
        </div>

        <div className="form-group">
          <label className="form-label">Photo</label>
          <PhotoInput value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })} />
        </div>

        <div className="form-group">
          <label className="form-label">Borrowing price</label>
          <div className="price-input-wrap">
            <span className="price-input-prefix">€</span>
            <input
              type="number" min="0" step="0.50" className="form-input price-input"
              placeholder="0"
              value={form.pricePerDay}
              onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
            />
            <span className="price-input-suffix">/ day</span>
          </div>
          <p className="form-hint">Set to 0 for free lending. Agree on payment via chat.</p>
        </div>

        <p className="form-hint" style={{ marginBottom: 16 }}>
          Your listing location is taken from your{' '}
          <Link to="/profile/edit" style={{ color: 'var(--green)', fontWeight: 600 }}>profile home location</Link>.
          Neighbours will see your neighbourhood, not your exact address.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create listing'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/my-listings')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
