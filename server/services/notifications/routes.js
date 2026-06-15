const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-10: List notifications for the current user (most recent first)
router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ notifications: result.rows });
});

// FR-10: Mark a notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// Internal helper -- imported directly by other services (requests, messaging).
async function createNotification(userId, type, content) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, content) VALUES ($1, $2, $3)',
    [userId, type, content]
  );
}

module.exports = router;
module.exports.createNotification = createNotification;
