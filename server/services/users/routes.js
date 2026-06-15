const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Public profile — no email, no lat/lng (NFR-04)
router.get('/:id/profile', requireAuth, async (req, res) => {
  const userResult = await pool.query(
    `SELECT id, display_name, neighborhood_area, bio, preferences, photo_url, created_at
     FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

  const reviewsResult = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.display_name AS reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [req.params.id]
  );

  const avgResult = await pool.query(
    `SELECT AVG(rating)::NUMERIC(3,1) AS avg, COUNT(*) AS count
     FROM reviews WHERE reviewee_id = $1`,
    [req.params.id]
  );

  res.json({
    user: userResult.rows[0],
    reviews: reviewsResult.rows,
    averageRating: avgResult.rows[0].avg ? parseFloat(avgResult.rows[0].avg) : null,
    reviewCount: parseInt(avgResult.rows[0].count),
  });
});

// Update own profile (bio, preferences, photo, display_name, neighborhood_area)
router.put('/me', requireAuth, async (req, res) => {
  const { displayName, neighborhoodArea, bio, preferences, photoUrl } = req.body;

  await pool.query(
    `UPDATE users SET
       display_name       = COALESCE($1, display_name),
       neighborhood_area  = COALESCE($2, neighborhood_area),
       bio                = $3,
       preferences        = $4,
       photo_url          = COALESCE($5, photo_url)
     WHERE id = $6`,
    [
      displayName || null,
      neighborhoodArea || null,
      bio ?? null,
      preferences ?? null,
      photoUrl || null,
      req.user.id,
    ]
  );

  res.json({ success: true });
});

module.exports = router;
