import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="static-page">
      <nav className="static-page-nav">
        <Link to="/" className="static-page-logo">Neighborly</Link>
      </nav>

      <h1>Terms of Service</h1>
      <p className="static-page-date">Last updated: June 2025</p>

      <p>
        By using Neighborly you agree to these terms. Please read them carefully.
      </p>

      <h2>What Neighborly is</h2>
      <p>
        Neighborly is a peer-to-peer platform that lets neighbours list, request, and
        borrow everyday items from each other. We are a marketplace — we are not a party
        to any borrowing transaction between users.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You must be at least 18 years old to use Neighborly.</li>
        <li>The information you provide (name, neighbourhood, listings) must be accurate.</li>
        <li>You may only list items you own or have the right to lend.</li>
        <li>You are responsible for agreeing on condition, duration, and return with the other party before a transaction.</li>
        <li>Treat other users with respect. Harassment or fraudulent behaviour will result in account removal.</li>
      </ul>

      <h2>Prohibited items</h2>
      <p>You may not list or request items that are:</p>
      <ul>
        <li>Illegal, controlled, or require a licence to possess or lend.</li>
        <li>Weapons or items primarily intended to cause harm.</li>
        <li>Perishable food or medicine.</li>
      </ul>

      <h2>Damage and liability</h2>
      <p>
        Neighborly does not provide insurance or mediation. Lenders and borrowers are
        encouraged to agree on the condition of an item before handover (photos are helpful)
        and to resolve any disputes directly. Neighborly is not liable for damage, loss, or
        disputes arising from transactions on the platform.
      </p>

      <h2>Account termination</h2>
      <p>
        We reserve the right to suspend or delete accounts that violate these terms or that
        are used for fraudulent, abusive, or illegal activity.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the platform after
        a change constitutes acceptance of the updated terms.
      </p>

      <h2>Note</h2>
      <p>
        Neighborly is a student project at HWR Berlin (Digital Literacy IV: Software
        Architecture) and is operated on a non-commercial basis for educational purposes.
      </p>

      <p style={{ marginTop: 40 }}>
        <Link to="/" style={{ color: 'var(--green)' }}>← Back to Neighborly</Link>
      </p>
    </div>
  );
}
