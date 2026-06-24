const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

function assertParticipant(request, userId) {
  return request && (request.borrower_id === userId || request.lender_id === userId);
}

// FR-07: Get full message history for a borrow request's chat thread.
router.get('/:requestId', requireAuth, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('GET /messages/:requestId error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// FR-07: Send a message via REST.
router.post('/:requestId', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [req.params.requestId]);
    if (!assertParticipant(reqResult.rows[0], req.user.id)) {
      return res.status(403).json({ error: 'Not part of this conversation' });
    }

    const insert = await pool.query(
      'INSERT INTO messages (request_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [req.params.requestId, req.user.id, content.trim()]
    );

    res.status(201).json({
      id: insert.rows[0].id,
      request_id: parseInt(req.params.requestId),
      sender_id: req.user.id,
      content: content.trim(),
      created_at: insert.rows[0].created_at,
    });
  } catch (err) {
    console.error('POST /messages/:requestId error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// FR-07: Delete a message (sender only).
router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const msgResult = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });

    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.messageId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /messages/:messageId error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
