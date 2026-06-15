const express = require('express');
const db = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-10: List notifications for the current user (most recent first)
router.get('/', requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({ notifications });
});

// FR-10: Mark a notification as read
router.put('/:id/read', requireAuth, (req, res) => {
  db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({ success: true });
});

// Internal helper -- imported directly by other services (requests,
// messaging) to create notifications. Not an HTTP route.
function createNotification(userId, type, content) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)
  `).run(userId, type, content);
}

module.exports = router;
module.exports.createNotification = createNotification;
