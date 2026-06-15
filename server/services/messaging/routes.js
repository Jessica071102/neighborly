const express = require('express');
const db = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Shared helper: confirms the current user is part of this request's chat
function assertParticipant(request, userId) {
  return request && (request.borrower_id === userId || request.lender_id === userId);
}

// FR-07: Get full message history for a borrow request's chat thread.
// NFR-03: this is the source of truth a client reloads from after a
// reconnect, so no message is ever "lost" even if a socket event was missed.
router.get('/:requestId', requireAuth, (req, res) => {
  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(req.params.requestId);
  if (!assertParticipant(request, req.user.id)) {
    return res.status(403).json({ error: 'Not part of this conversation' });
  }

  const messages = db.prepare(`
    SELECT messages.*, users.display_name AS sender_name
    FROM messages
    JOIN users ON users.id = messages.sender_id
    WHERE request_id = ?
    ORDER BY created_at ASC
  `).all(req.params.requestId);

  res.json({ messages });
});

// FR-07: Send a message via REST (fallback for clients not using Socket.io).
// Real-time delivery normally happens via the 'message' socket event in
// socket.js, which also persists to the DB.
router.post('/:requestId', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(req.params.requestId);
  if (!assertParticipant(request, req.user.id)) {
    return res.status(403).json({ error: 'Not part of this conversation' });
  }

  const result = db.prepare(`
    INSERT INTO messages (request_id, sender_id, content) VALUES (?, ?, ?)
  `).run(req.params.requestId, req.user.id, content.trim());

  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
