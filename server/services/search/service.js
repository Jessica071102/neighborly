// FR-03: Search service — business logic layer.
// Queries listings + owner neighbourhood centroids, then attaches Haversine
// distances. A route should never do arithmetic; SQL should never encode
// domain formulas — both concerns belong here.

const pool = require('../../db/db');
const { distanceKm } = require('./haversine');

async function searchListings(userId, { q, neighborhood }) {
  // Resolve the requesting user's neighbourhood centroid for distance sorting
  const userRow = (await pool.query(
    `SELECT n.lat, n.lng
     FROM users u
     LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     WHERE u.id = $1`,
    [userId]
  )).rows[0];
  const userLat = userRow?.lat ?? null;
  const userLng = userRow?.lng ?? null;

  // Fetch matching listings with each owner's neighbourhood centroid
  const rows = (await pool.query(
    `SELECT
       items.id, items.name, items.category, items.description, items.photo_url,
       items.status, items.price_per_day,
       users.display_name AS owner_name, users.neighborhood_area AS owner_area,
       n.lat AS item_lat, n.lng AS item_lng
     FROM items
     JOIN users ON users.id = items.owner_id
     LEFT JOIN neighborhoods n ON n.id = users.neighborhood_id
     WHERE items.status = 'available'
       AND ($1::TEXT IS NULL
            OR items.name        ILIKE '%' || $1 || '%'
            OR items.category    ILIKE '%' || $1 || '%'
            OR items.description ILIKE '%' || $1 || '%')
       AND ($2::TEXT IS NULL
            OR users.neighborhood_area ILIKE '%' || $2 || '%')`,
    [q || null, neighborhood || null]
  )).rows;

  // Attach Haversine distance — centroid to centroid, never raw GPS (NFR-04)
  const items = rows.map(({ item_lat, item_lng, ...item }) => ({
    ...item,
    distance_km:
      userLat != null && item_lat != null
        ? distanceKm(userLat, userLng, item_lat, item_lng)
        : null,
  }));

  // Sort: nearest first; items without a known centroid fall to the end
  items.sort((a, b) => {
    if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
    if (a.distance_km != null) return -1;
    if (b.distance_km != null) return 1;
    return 0;
  });

  return items;
}

module.exports = { searchListings };
