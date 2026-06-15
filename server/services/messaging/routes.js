const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Shared helper: confirms the current user is part of this request's chat
function assertParticipant(request, userId) {
  return request && (request.borrower_id === userId || request.lender_id === userId);
}

// FR-07: Get full message history for a borrow request's chat thread.
// NFR-03: this is the source of truth a client reloads from after a
// reconnect, so no message is ever "lost" even if a socket event was missed.
router.get('/:requestId', requireAuth, async (req, res) => {
  const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [req.params.requestId]);
  if (!assertParticipant(reqResult.rows[0], req.user.id)) {
    return res.status(403).json({ error: 'Not part of this conversation' });
  }

  const result = await pool.query(
    `SELECT messages.*, users.display_name AS sender_name
     FROM messages
     JOIN users ON users.id = messages.sender_id
     WHERE request_id = $1
     ORDER BY created_at ASC`,
    [req.params.requestId]
  );

  res.json({ messages: result.rows });
});

// FR-07: Delete a message (sender only).
router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const msgResult = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });

    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.messageId]);
    res.json({ success: true, requestId: msg.request_id });
  } catch (err) {
    console.error('DELETE /messages/:messageId', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// FR-07: Send a message via REST (fallback for clients not using Socket.io).
router.post('/:requestId', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [req.params.requestId]);
  if (!assertParticipant(reqResult.rows[0], req.user.id)) {
    return res.status(403).json({ error: 'Not part of this conversation' });
  }

  const result = await pool.query(
    'INSERT INTO messages (request_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id',
    [req.params.requestId, req.user.id, content.trim()]
  );

  res.status(201).json({ id: result.rows[0].id });
});

module.exports = router;
