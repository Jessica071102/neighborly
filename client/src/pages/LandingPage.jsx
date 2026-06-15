import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, PackageIcon, MapPinIcon, StarIcon } from '../components/Icons';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/search', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="landing">

      {/* Nav */}
      <nav className="landing-nav">
        <span className="landing-nav-logo">Neighborly</span>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-badge">Hyperlocal borrowing platform</div>
          <h1 className="landing-hero-title">
            Borrow from your<br />
            <span className="landing-hero-green">neighbours</span>
          </h1>
          <p className="landing-hero-sub">
            Discover items shared by people in your neighbourhood.
            List what you rarely use and borrow what you occasionally need —
            no buying, no waste.
          </p>
          <div className="landing-hero-cta">
            <Link to="/register" className="btn btn-primary btn-lg">Join for free</Link>
            <Link to="/login" className="btn btn-outline btn-lg">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <h2 className="landing-section-title">Everything you need to share locally</h2>
        <p className="landing-section-sub">
          A simple platform built for urban neighbourhoods.
        </p>
        <div className="landing-features-grid">
          <div className="landing-feature">
            <div className="landing-feature-icon"><SearchIcon size={26} /></div>
            <h3>Find what you need</h3>
            <p>Search for tools, electronics, books, sports gear and more — all within walking distance.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><PackageIcon size={26} /></div>
            <h3>Share what you have</h3>
            <p>List items collecting dust. Let neighbours borrow them instead of buying something new.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><MapPinIcon size={26} /></div>
            <h3>Stay local</h3>
            <p>Browse by distance. Everything on Neighborly is nearby — no shipping, no waiting.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><StarIcon size={26} /></div>
            <h3>Build trust</h3>
            <p>Chat with lenders, agree on dates, and leave reviews after every borrow.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section landing-how-bg">
        <h2 className="landing-section-title">How it works</h2>
        <p className="landing-section-sub">Up and running in under a minute.</p>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3>Create an account</h3>
            <p>Sign up for free and set your neighbourhood area.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3>Search or list</h3>
            <p>Browse items near you or share things you own.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3>Borrow and review</h3>
            <p>Arrange the exchange and leave a review after.</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-cta-section">
        <h2>Ready to meet your neighbours?</h2>
        <p>Join Neighborly and start borrowing and sharing today.</p>
        <Link to="/register" className="btn btn-primary btn-lg">Get started — it's free</Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="landing-nav-logo">Neighborly</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          HWR Berlin — Digital Literacy IV: Software Architecture
        </span>
      </footer>

    </div>
  );
}
