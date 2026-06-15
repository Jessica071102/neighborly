const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-02: Create an item listing
router.post('/', requireAuth, async (req, res) => {
  const { name, category, description, photoUrl, lat, lng } = req.body;

  if (!name || !category || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, category, lat and lng are required' });
  }

  const result = await pool.query(
    `INSERT INTO items (owner_id, name, category, description, photo_url, status, lat, lng)
     VALUES ($1, $2, $3, $4, $5, 'available', $6, $7) RETURNING id`,
    [req.user.id, name, category, description || null, photoUrl || null, lat, lng]
  );

  res.status(201).json({ id: result.rows[0].id });
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
       items.status, items.created_at,
       users.id AS owner_id, users.display_name AS owner_name,
       users.neighborhood_area AS owner_area
     FROM items
     JOIN users ON users.id = items.owner_id
     WHERE items.id = $1`,
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
  res.json({ item: result.rows[0] });
});

// FR-09: Edit a listing (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  const item = itemResult.rows[0];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

  const { name, category, description, photoUrl, status, lat, lng } = req.body;

  await pool.query(
    `UPDATE items SET
       name        = COALESCE($1, name),
       category    = COALESCE($2, category),
       description = COALESCE($3, description),
       photo_url   = COALESCE($4, photo_url),
       status      = COALESCE($5, status),
       lat         = COALESCE($6, lat),
       lng         = COALESCE($7, lng)
     WHERE id = $8`,
    [name ?? null, category ?? null, description ?? null, photoUrl ?? null,
     status ?? null, lat ?? null, lng ?? null, req.params.id]
  );

  res.json({ success: true });
});

// FR-09: Delete a listing (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  const item = itemResult.rows[0];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

  await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
