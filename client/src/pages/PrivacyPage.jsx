import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="static-page">
      <nav className="static-page-nav">
        <Link to="/" className="static-page-logo">Neighborly</Link>
      </nav>

      <h1>Privacy Policy</h1>
      <p className="static-page-date">Last updated: June 2025</p>

      <p>
        Neighborly ("we", "our", or "us") is committed to protecting your privacy.
        This policy explains what data we collect, how we use it, and your rights.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account information:</strong> your name, email address, and a hashed password when you register.</li>
        <li><strong>Location data:</strong> your approximate neighbourhood area and, temporarily in your browser session, your precise GPS coordinates to power search. Precise coordinates are never stored on our servers or shared with other users.</li>
        <li><strong>Content you create:</strong> item listings, borrow requests, chat messages, and reviews.</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To operate the platform — matching borrowers with lenders nearby.</li>
        <li>To send in-app notifications about your requests and messages.</li>
        <li>To display your public profile (name, neighbourhood area, and ratings) to other users.</li>
      </ul>

      <h2>What we never share</h2>
      <ul>
        <li>Your precise GPS coordinates — other users only see your neighbourhood area name and an approximate distance.</li>
        <li>Your email address — it is only used for authentication and is not visible to other users.</li>
        <li>Your password — it is stored as a one-way bcrypt hash and is never readable, even by us.</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Your data is stored for as long as your account is active. You may request deletion
        of your account and all associated data by contacting us.
      </p>

      <h2>Third-party services</h2>
      <p>
        Map tiles are loaded from OpenStreetMap contributors. No personal data is sent to
        OpenStreetMap as part of this request. The platform is hosted on Railway (backend)
        and Vercel (frontend). Please refer to their respective privacy policies for
        infrastructure-level data handling.
      </p>

      <h2>Contact</h2>
      <p>
        This is a student project at HWR Berlin (Digital Literacy IV: Software Architecture).
        For questions, reach out via the project repository.
      </p>

      <p style={{ marginTop: 40 }}>
        <Link to="/" style={{ color: 'var(--green)' }}>← Back to Neighborly</Link>
      </p>
    </div>
  );
}
