const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-03: Neighbourhood-based search with optional keyword filter.
//
// Query params:
//   q            - keyword, matched against name / category / description (optional)
//   neighborhood - filter by owner's neighbourhood area via ILIKE (optional)
//
// Results are ordered by created_at DESC (newest first).
// No coordinates are collected or exposed anywhere (NFR-04).
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, neighborhood } = req.query;

    const result = await pool.query(
      `SELECT
         items.id, items.name, items.category, items.description, items.photo_url,
         items.status, items.price_per_day,
         users.display_name AS owner_name, users.neighborhood_area AS owner_area
       FROM items
       JOIN users ON users.id = items.owner_id
       WHERE items.status = 'available'
         AND ($1::TEXT IS NULL
              OR items.name        ILIKE '%' || $1 || '%'
              OR items.category    ILIKE '%' || $1 || '%'
              OR items.description ILIKE '%' || $1 || '%')
         AND ($2::TEXT IS NULL
              OR users.neighborhood_area ILIKE '%' || $2 || '%')
       ORDER BY items.created_at DESC`,
      [q || null, neighborhood || null]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
