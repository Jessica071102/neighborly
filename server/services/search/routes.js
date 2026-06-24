const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { searchListings } = require('./service');

const router = express.Router();

// FR-03: Neighbourhood keyword search with approximate distance sort.
// Distance is neighbourhood-centroid to neighbourhood-centroid (NFR-04: no GPS).
// All business logic (DB queries, Haversine math, sorting) lives in service.js.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, neighborhood, maxDistance } = req.query;
    const items = await searchListings(req.user.id, {
      q,
      neighborhood,
      maxDistance: maxDistance ? Number(maxDistance) : null,
    });
    res.json({ items });
  } catch (err) {
    console.error('GET /search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
