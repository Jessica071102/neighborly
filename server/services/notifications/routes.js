const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-10: List notifications for the current user (most recent first)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Could not fetch notifications' });
  }
});

// FR-10: Mark a notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /notifications/:id/read error:', err);
    res.status(500).json({ error: 'Could not mark notification as read' });
  }
});

// FR-10: Mark all notifications as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /notifications/read-all error:', err);
    res.status(500).json({ error: 'Could not mark notifications as read' });
  }
});

// FR-10: Mark all notifications for a specific request as read (called when opening a chat)
router.put('/read-by-request/:requestId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND request_id = $2',
      [req.user.id, req.params.requestId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /notifications/read-by-request error:', err);
    res.status(500).json({ error: 'Could not mark notifications as read' });
  }
});

// FR-10: Delete a single notification (only owner can delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err);
    res.status(500).json({ error: 'Could not delete notification' });
  }
});

// FR-10: Delete all notifications for the current user
router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications error:', err);
    res.status(500).json({ error: 'Could not delete notifications' });
  }
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
