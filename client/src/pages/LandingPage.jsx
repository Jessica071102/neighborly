import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, PackageIcon, MapPinIcon, CheckIcon, UserIcon, StarIcon } from '../components/Icons';

const PREVIEW_ITEMS = [
  { name: 'Power Drill', area: 'Kreuzberg', dist: '0.3 km', cat: 'Tools', color: '#EBF5EE' },
  { name: 'DSLR Camera', area: 'Mitte', dist: '0.8 km', cat: 'Electronics', color: '#EFF6FF' },
  { name: 'Camping Tent', area: 'Prenzlauer Berg', dist: '1.2 km', cat: 'Outdoors', color: '#FEF3C7' },
  { name: 'Road Bike', area: 'Friedrichshain', dist: '0.5 km', cat: 'Sport', color: '#FEE2E2' },
];

const STATS = [
  { value: '500+', label: 'Items shared' },
  { value: '12', label: 'Neighbourhoods' },
  { value: '200+', label: 'Active users' },
  { value: '4.9', label: 'Avg. rating' },
];

const FEATURES = [
  {
    Icon: PackageIcon,
    title: 'Borrow, don\'t buy',
    body: 'Why spend €200 on something you\'ll use once? Borrow a drill, a tent, a camera — from someone a few streets away.'
  },
  {
    Icon: MapPinIcon,
    title: 'Hyperlocal by design',
    body: 'Everything on Neighborly is within walking distance. No shipping, no waiting — just your actual neighbourhood.'
  },
  {
    Icon: UserIcon,
    title: 'Real neighbours, real trust',
    body: 'Chat before you borrow, leave reviews after. Every interaction builds a stronger, more connected community.'
  },
  {
    Icon: CheckIcon,
    title: 'Good for the planet',
    body: 'Shared items mean less production, less waste, and a lighter footprint — without giving anything up.'
  },
];

const TESTIMONIALS = [
  {
    text: "I borrowed a drill to hang shelves and ended up having coffee with my neighbour. Neighborly builds real connections.",
    name: "Lisa M.",
    area: "Kreuzberg, Berlin",
    rating: 5,
  },
  {
    text: "I listed 8 items collecting dust at home. They've been borrowed over 20 times. Knowing my stuff is being used feels amazing.",
    name: "Max S.",
    area: "Prenzlauer Berg, Berlin",
    rating: 5,
  },
  {
    text: "As a student I can't afford everything. I borrowed a tent for a weekend trip without spending €200. This app is a game changer.",
    name: "Anna K.",
    area: "Mitte, Berlin",
    rating: 5,
  },
];

function Stars({ count = 5 }) {
  return (
    <div className="landing-stars">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/search', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="landing">

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-nav-logo">Neighborly</span>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">
              <span className="landing-badge-dot" /> Hyperlocal · Community · Sustainable
            </div>
            <h1 className="landing-hero-title">
              Why buy when your<br />
              <span className="landing-hero-green">neighbour has one?</span>
            </h1>
            <p className="landing-hero-sub">
              Neighborly connects urban residents who want to share what they have
              and borrow what they need — for free, within walking distance.
            </p>
            <div className="landing-hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg">Join your neighbourhood</Link>
              <Link to="/login" className="btn btn-outline btn-lg">Sign in</Link>
            </div>
            <p className="landing-hero-trust">
              <CheckIcon size={13} /> Free to join &nbsp;·&nbsp;
              <CheckIcon size={13} /> No fees ever &nbsp;·&nbsp;
              <CheckIcon size={13} /> Real neighbours only
            </p>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-blob" />
            {PREVIEW_ITEMS.map((item, i) => (
              <div
                key={item.name}
                className="landing-preview-card"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <div className="landing-preview-icon" style={{ background: item.color }}>
                  <PackageIcon size={18} />
                </div>
                <div className="landing-preview-info">
                  <div className="landing-preview-name">{item.name}</div>
                  <div className="landing-preview-meta">
                    <MapPinIcon size={11} /> {item.area} · {item.dist}
                  </div>
                </div>
                <span className="badge badge-green">Free</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="landing-stats">
        <div className="landing-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stat">
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Built for city living</h2>
          <p className="landing-section-sub">
            Everything you need to share and borrow in your neighbourhood — nothing you don't.
          </p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="landing-feature">
              <div className="landing-feature-icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-how-section">
        <div className="landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Up and running in 60 seconds</h2>
            <p className="landing-section-sub">No complicated setup. No fees. No strangers.</p>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <h3>Create a free account</h3>
              <p>Sign up and set your neighbourhood. It takes under a minute.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <h3>Browse or list items</h3>
              <p>Search for things nearby or share items you rarely use.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <h3>Borrow and connect</h3>
              <p>Chat, agree on a time, hand it over. Leave a review after.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Neighbours love it</h2>
          <p className="landing-section-sub">Real stories from real people in real neighbourhoods.</p>
        </div>
        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="landing-testimonial">
              <div className="landing-quote-mark">"</div>
              <p className="landing-testimonial-text">{t.text}</p>
              <Stars count={t.rating} />
              <div style={{ marginTop: 12 }}>
                <div className="landing-testimonial-author">{t.name}</div>
                <div className="landing-testimonial-area">{t.area}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2>Your neighbourhood is waiting.</h2>
          <p>
            Thousands of items are sitting unused a few streets from you.
            Join Neighborly and start sharing today.
          </p>
          <Link to="/register" className="landing-cta-btn">
            Join for free — no credit card needed
          </Link>
          <p className="landing-cta-note">Already have an account? <Link to="/login">Sign in →</Link></p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span className="landing-nav-logo">Neighborly</span>
        <span className="landing-footer-note">
          HWR Berlin · Digital Literacy IV: Software Architecture
        </span>
      </footer>

    </div>
  );
}
