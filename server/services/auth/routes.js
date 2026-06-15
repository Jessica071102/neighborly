const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db/db');
const { requireAuth, JWT_SECRET } = require('../../middleware/auth');

const router = express.Router();

// FR-01: User registration
router.post('/register', (req, res) => {
  const { email, password, displayName, neighborhoodArea, lat, lng } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'email, password and displayName are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // NFR-05: passwords are always hashed, never stored in plain text
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, display_name, neighborhood_area, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, passwordHash, displayName, neighborhoodArea || null, lat ?? null, lng ?? null);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, email, displayName, neighborhoodArea: neighborhoodArea || null }
  });
});

// FR-01: Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // NFR-05: session token expires after 7 days of inactivity
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      neighborhoodArea: user.neighborhood_area
    }
  });
});

// FR-01: Current user profile
// NFR-04: returns the user's OWN coordinates only (needed for search radius
// queries) -- this endpoint must never be used to look up other users.
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, display_name, photo_url, neighborhood_area, lat, lng
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
