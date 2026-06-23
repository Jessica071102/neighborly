const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Haversine formula: great-circle distance between two lat/lng points, in km.
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// FR-03: Geolocation-based search with keyword filter.
//
// Query params:
//   lat, lng    - the searching user's current coordinates (required)
//   q           - keyword, matched against name/category/description (optional)
//   radiusKm    - search radius in km (default 2)
//
// NFR-01 (Performance): a SQL-level bounding-box pre-filter limits the result
// set before the exact Haversine calculation runs in JS, so the query stays
// fast as the item count grows.
//
// NFR-04: results never include the lender's precise lat/lng -- only the
// computed distanceKm and the lender's neighborhood_area.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lat, lng, q, radiusKm } = req.query;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius = radiusKm ? parseFloat(radiusKm) : 2;

    if (Number.isNaN(userLat) || Number.isNaN(userLng) || Number.isNaN(radius)) {
      return res.status(400).json({ error: 'lat, lng and radiusKm must be numbers' });
    }

    // Bounding-box pre-filter in SQL (NFR-01): 1° lat ≈ 111 km; 1° lng ≈ 111·cos(lat) km.
    // This excludes items clearly outside the radius before the exact Haversine check.
    const latDelta = radius / 111.0;
    const lngDelta = radius / (111.0 * Math.cos((userLat * Math.PI) / 180));

    const result = await pool.query(
      `SELECT
         items.id, items.name, items.category, items.description, items.photo_url,
         items.status, items.price_per_day, items.lat, items.lng,
         users.display_name AS owner_name, users.neighborhood_area AS owner_area
       FROM items
       JOIN users ON users.id = items.owner_id
       WHERE items.status = 'available'
         AND items.lat BETWEEN $1 AND $2
         AND items.lng BETWEEN $3 AND $4
         AND ($5::TEXT IS NULL
              OR items.name        ILIKE '%' || $5 || '%'
              OR items.category    ILIKE '%' || $5 || '%'
              OR items.description ILIKE '%' || $5 || '%')`,
      [userLat - latDelta, userLat + latDelta, userLng - lngDelta, userLng + lngDelta, q || null]
    );

    // Exact Haversine radius filter + sort + strip precise coordinates (NFR-04)
    const items = result.rows
      .map((item) => ({
        ...item,
        distanceKm: Math.round(distanceKm(userLat, userLng, item.lat, item.lng) * 10) / 10
      }))
      .filter((item) => item.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ lat, lng, ...rest }) => rest); // NFR-04: drop precise coordinates from response

    res.json({ items, radiusKm: radius });
  } catch (err) {
    console.error('GET /search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
