const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../db/db');
const { requireAuth, JWT_SECRET } = require('../../middleware/auth');

const router = express.Router();

// FR-01: User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, neighborhoodArea } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'email, password and displayName are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // NFR-05: passwords are always hashed, never stored in plain text
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, neighborhood_area)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, passwordHash, displayName, neighborhoodArea || null]
    );

    const id = result.rows[0].id;
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id, email, display_name: displayName, neighborhood_area: neighborhoodArea || null }
    });
  } catch (err) {
    console.error('POST /auth/register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// FR-01: Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, display_name, neighborhood_area, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // NFR-05: session token expires after 7 days
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        neighborhood_area: user.neighborhood_area
      }
    });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// FR-01: Current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, photo_url, neighborhood_area, bio, preferences FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

module.exports = router;
