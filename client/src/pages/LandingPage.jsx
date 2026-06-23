import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { SearchIcon, PackageIcon, MapPinIcon, CheckIcon, UserIcon, MessageCircleIcon } from '../components/Icons';

const PREVIEW_ITEMS = [
  { name: 'Power Drill', area: 'Kreuzberg', dist: '0.3 km', cat: 'Tools', color: '#EBF5EE' },
  { name: 'DSLR Camera', area: 'Mitte', dist: '0.8 km', cat: 'Electronics', color: '#EFF6FF' },
  { name: 'Camping Tent', area: 'Prenzlauer Berg', dist: '1.2 km', cat: 'Outdoors', color: '#FEF3C7' },
  { name: 'Road Bike', area: 'Friedrichshain', dist: '0.5 km', cat: 'Sport', color: '#FEE2E2' },
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
    body: 'Every user has a verified profile, star ratings, and a review history. Know who you\'re dealing with before you commit.'
  },
  {
    Icon: MessageCircleIcon,
    title: 'Chat before you commit',
    body: 'Message the owner directly, agree on a time, ask questions — all inside the app before anything is handed over.'
  },
  {
    Icon: CheckIcon,
    title: 'Good for the planet',
    body: 'Shared items mean less production, less waste, and a lighter footprint — without giving anything up.'
  },
  {
    Icon: SearchIcon,
    title: 'Smart local search',
    body: 'Search by keyword and set a radius — from 1 km to 10 km. Results are sorted by distance so the closest items come first.'
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
  const [stats, setStats] = useState(null);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    if (!loading && user) navigate('/search', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    api.get('/stats').then((data) => {
      setStats(data);
      setTestimonials(data.testimonials || []);
    }).catch(() => {});
  }, []);

  if (loading) return null;

  return (
    <div className="landing">

      <nav className="landing-nav">
        <span className="landing-nav-logo">Neighborly</span>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get started free</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
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
              Free to join · No fees ever · Real neighbours only
            </p>
          </div>

          <div className="landing-hero-visual">
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

      {stats && (
        <div className="landing-stats">
          <div className="landing-stats-inner">
            <div className="landing-stat">
              <div className="landing-stat-value">{stats.itemCount}</div>
              <div className="landing-stat-label">Items shared</div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-value">{stats.neighbourhoodCount}</div>
              <div className="landing-stat-label">Neighbourhoods</div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-value">{stats.userCount}</div>
              <div className="landing-stat-label">Neighbours</div>
            </div>
            {stats.averageRating && (
              <div className="landing-stat">
                <div className="landing-stat-value">{stats.averageRating}</div>
                <div className="landing-stat-label">Avg. rating</div>
              </div>
            )}
          </div>
        </div>
      )}

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
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <h3>Browse or list items</h3>
              <p>Search for things nearby or share items you rarely use.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <h3>Borrow and connect</h3>
              <p>Chat, agree on a time, hand it over. Leave a review after.</p>
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="landing-testimonials-section">
          <div className="landing-section-header" style={{ maxWidth: 1060, margin: '0 auto 48px' }}>
            <h2 className="landing-section-title">Neighbours love it</h2>
            <p className="landing-section-sub">Real reviews from real people in real neighbourhoods.</p>
          </div>
          <div className="landing-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="landing-testimonial">
                <div className="landing-quote-mark">"</div>
                <p className="landing-testimonial-text">{t.comment}</p>
                <Stars count={t.rating} />
                <div className="landing-testimonial-footer">
                  <div className="landing-testimonial-avatar">
                    {t.display_name ? t.display_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="landing-testimonial-author">{t.display_name}</div>
                    <div className="landing-testimonial-area">{t.neighborhood_area}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="landing-faq-section">
        <div className="landing-section-header" style={{ maxWidth: 760, margin: '0 auto 48px' }}>
          <h2 className="landing-section-title">Common questions</h2>
          <p className="landing-section-sub">Everything you need to know before you join.</p>
        </div>
        <div className="landing-faq">
          <details>
            <summary>
              Is Neighborly free to use?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              Yes — completely free, forever. There are no subscription fees, no transaction
              fees, and no premium tiers. Neighbourly is built on the idea that sharing
              should cost nothing.
            </div>
          </details>
          <details>
            <summary>
              What if something gets damaged or lost?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              We encourage lenders and borrowers to agree on the condition of an item before
              the handover — a quick photo works well. All messages are stored in the app, so
              there's a written record of what was agreed. Disputes are resolved directly
              between neighbours; Neighborly does not act as an insurer or mediator.
            </div>
          </details>
          <details>
            <summary>
              How do I know I can trust someone?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              Every user has a public profile showing their star rating and written reviews
              from previous transactions. You can read a person's history before accepting or
              sending a request. You can also chat with them inside the app before anything
              changes hands.
            </div>
          </details>
          <details>
            <summary>
              Will others see my home address?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              No. Other users only see your neighbourhood area name (e.g. "Kreuzberg") and
              an approximate distance in kilometres. Your precise GPS coordinates are never
              stored on our servers or shared with anyone.
            </div>
          </details>
          <details>
            <summary>
              Can I list any item?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              Almost anything goes — tools, electronics, sports gear, camping equipment,
              kitchen appliances, and more. We ask that all items are legal, safe, and yours
              to share. Items that are illegal, weapons, or perishable food may not be listed.
            </div>
          </details>
          <details>
            <summary>
              What if nothing is listed near me yet?
              <span className="landing-faq-plus">+</span>
            </summary>
            <div className="landing-faq-answer">
              Be the first! List a few things you rarely use and share the link with your
              neighbours. Neighborhood apps grow fastest when one person takes the first step.
              The app includes a built-in invite link you can send over WhatsApp.
            </div>
          </details>
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2>Your neighbourhood is waiting.</h2>
          <p>
            Items are sitting unused a few streets from you.
            Join Neighborly and start sharing today.
          </p>
          <Link to="/register" className="landing-cta-btn">
            Join for free
          </Link>
          <p className="landing-cta-note">Already have an account? <Link to="/login">Sign in →</Link></p>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-nav-logo">Neighborly</span>
        <div className="landing-footer-links">
          <Link to="/privacy" className="landing-footer-link">Privacy</Link>
          <Link to="/terms" className="landing-footer-link">Terms</Link>
          <span className="landing-footer-note">HWR Berlin · Digital Literacy IV: Software Architecture</span>
        </div>
      </footer>

    </div>
  );
}
