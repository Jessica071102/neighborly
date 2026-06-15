const express = require('express');
const db = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-02: Create an item listing
router.post('/', requireAuth, (req, res) => {
  const { name, category, description, photoUrl, lat, lng } = req.body;

  if (!name || !category || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, category, lat and lng are required' });
  }

  const result = db.prepare(`
    INSERT INTO items (owner_id, name, category, description, photo_url, status, lat, lng)
    VALUES (?, ?, ?, ?, ?, 'available', ?, ?)
  `).run(req.user.id, name, category, description || null, photoUrl || null, lat, lng);

  res.status(201).json({ id: result.lastInsertRowid });
});

// FR-09: My listings (owner-only fields, including precise coordinates)
router.get('/mine', requireAuth, (req, res) => {
  const items = db.prepare(`
    SELECT * FROM items WHERE owner_id = ? ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({ items });
});

// FR-04: Item detail view
// NFR-04: do not expose the owner's precise lat/lng to the viewer -- only
// the neighborhood_area name. The owner can still see it via /mine.
router.get('/:id', (req, res) => {
  const item = db.prepare(`
    SELECT
      items.id, items.name, items.category, items.description, items.photo_url,
      items.status, items.created_at,
      users.id AS owner_id, users.display_name AS owner_name,
      users.neighborhood_area AS owner_area
    FROM items
    JOIN users ON users.id = items.owner_id
    WHERE items.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ item });
});

// FR-09: Edit a listing (owner only)
router.put('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

  const { name, category, description, photoUrl, status, lat, lng } = req.body;

  db.prepare(`
    UPDATE items SET
      name        = COALESCE(?, name),
      category    = COALESCE(?, category),
      description = COALESCE(?, description),
      photo_url   = COALESCE(?, photo_url),
      status      = COALESCE(?, status),
      lat         = COALESCE(?, lat),
      lng         = COALESCE(?, lng)
    WHERE id = ?
  `).run(
    name ?? null, category ?? null, description ?? null, photoUrl ?? null,
    status ?? null, lat ?? null, lng ?? null, req.params.id
  );

  res.json({ success: true });
});

// FR-09: Delete a listing (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
