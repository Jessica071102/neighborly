const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

function normalizeCategory(cat) {
  if (!cat) return null;
  return cat.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

// FR-02: Create an item listing — location is taken from the owner's profile
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, category, description, photoUrl, pricePerDay } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    // Pull the owner's home location from their profile (NFR-04)
    const userResult = await pool.query('SELECT lat, lng FROM users WHERE id = $1', [req.user.id]);
    const owner = userResult.rows[0];
    if (!owner || owner.lat == null || owner.lng == null) {
      return res.status(400).json({ error: 'Please set your home location in your profile before creating a listing.' });
    }

    const result = await pool.query(
      `INSERT INTO items (owner_id, name, category, description, photo_url, price_per_day, status, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, 'available', $7, $8) RETURNING id`,
      [req.user.id, name, normalizeCategory(category), description || null, photoUrl || null, pricePerDay || 0, owner.lat, owner.lng]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /items error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// FR-09: My listings (owner-only fields, including precise coordinates)
router.get('/mine', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM items WHERE owner_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ items: result.rows });
});

// FR-04: Item detail view
// NFR-04: do not expose the owner's precise lat/lng to the viewer -- only
// the neighborhood_area name. The owner can still see it via /mine.
router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT
       items.id, items.name, items.category, items.description, items.photo_url,
       items.status, items.price_per_day, items.created_at,
       users.id AS owner_id, users.display_name AS owner_name,
       users.neighborhood_area AS owner_area
     FROM items
     JOIN users ON users.id = items.owner_id
     WHERE items.id = $1`,
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });

  // Booked date ranges (accepted, not yet past) for availability display
  const bookedResult = await pool.query(
    `SELECT start_date, end_date FROM borrow_requests
     WHERE item_id = $1 AND status = 'accepted' AND end_date >= CURRENT_DATE::TEXT
     ORDER BY start_date`,
    [req.params.id]
  );

  res.json({ item: result.rows[0], bookedRanges: bookedResult.rows });
});

// FR-09: Edit a listing (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    const { name, category, description, photoUrl, pricePerDay, status, lat, lng } = req.body;

    await pool.query(
      `UPDATE items SET
         name          = COALESCE($1, name),
         category      = COALESCE($2::TEXT, category),
         description   = COALESCE($3, description),
         photo_url     = COALESCE($4, photo_url),
         price_per_day = COALESCE($5, price_per_day),
         status        = COALESCE($6, status),
         lat           = COALESCE($7, lat),
         lng           = COALESCE($8, lng)
       WHERE id = $9`,
      [name ?? null, normalizeCategory(category), description ?? null, photoUrl ?? null,
       pricePerDay ?? null, status ?? null, lat ?? null, lng ?? null, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /items/:id error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// FR-09: Delete a listing (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    const activeResult = await pool.query(
      "SELECT COUNT(*) AS count FROM borrow_requests WHERE item_id = $1 AND status IN ('accepted', 'pending')",
      [req.params.id]
    );
    if (parseInt(activeResult.rows[0].count) > 0) {
      return res.status(409).json({ error: 'This listing has active or pending requests. Resolve them first.' });
    }

    await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /items/:id error:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
