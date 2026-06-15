const express = require('express');
const pool = require('../../db/db');

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
//   radiusKm    - search radius in km (default 1, per NFR/charter)
//
// NFR-04: results never include the lender's precise lat/lng -- only the
// computed distanceKm and the lender's neighborhood_area.
router.get('/', async (req, res) => {
  const { lat, lng, q, radiusKm } = req.query;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radius = radiusKm ? parseFloat(radiusKm) : 1;

  if (Number.isNaN(userLat) || Number.isNaN(userLng) || Number.isNaN(radius)) {
    return res.status(400).json({ error: 'lat, lng and radiusKm must be numbers' });
  }

  const result = await pool.query(
    `SELECT
       items.id, items.name, items.category, items.description, items.photo_url,
       items.status, items.price_per_day, items.lat, items.lng,
       users.display_name AS owner_name, users.neighborhood_area AS owner_area
     FROM items
     JOIN users ON users.id = items.owner_id
     WHERE items.status = 'available'`
  );

  let items = result.rows;

  // Keyword filter (FR-03)
  if (q) {
    const keyword = q.toLowerCase();
    items = items.filter((item) =>
      item.name.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword) ||
      (item.description || '').toLowerCase().includes(keyword)
    );
  }

  // Proximity filter + sort by distance, then strip precise coordinates
  items = items
    .map((item) => ({
      ...item,
      distanceKm: Math.round(distanceKm(userLat, userLng, item.lat, item.lng) * 10) / 10
    }))
    .filter((item) => item.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ lat, lng, ...rest }) => rest); // NFR-04: drop precise coordinates from response

  res.json({ items, radiusKm: radius });
});

module.exports = router;
