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

// FR-10: Mark all notifications as read
router.put('/read-all', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ success: true });
});

// Internal helper -- imported directly by other services.
// requestId is stored so the frontend can deep-link to the right page.
async function createNotification(userId, type, content, requestId = null) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, content, request_id) VALUES ($1, $2, $3, $4)',
    [userId, type, content, requestId ?? null]
  );
}

module.exports = router;
module.exports.createNotification = createNotification;
