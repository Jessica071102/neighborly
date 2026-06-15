const express = require('express');
const db = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');
const { createNotification } = require('../notifications/routes');

const router = express.Router();

// FR-05: Borrower sends a borrow request to an item owner
router.post('/', requireAuth, (req, res) => {
  const { itemId, startDate, endDate } = req.body;

  if (!itemId || !startDate || !endDate) {
    return res.status(400).json({ error: 'itemId, startDate and endDate are required' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot request your own item' });
  }
  if (item.status !== 'available') {
    return res.status(400).json({ error: 'Item is not currently available' });
  }

  const result = db.prepare(`
    INSERT INTO borrow_requests (item_id, borrower_id, lender_id, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(itemId, req.user.id, item.owner_id, startDate, endDate);

  // FR-10: notify the lender of the new request
  createNotification(item.owner_id, 'new_request',
    `New borrow request for "${item.name}"`);

  // FR-07: the chat thread for this request is implicitly available at
  // GET/POST /api/messages/:requestId using this request's id -- no
  // separate "create chat" step is needed.
  res.status(201).json({ id: result.lastInsertRowid });
});

// FR-06: List requests where I'm the borrower or the lender
router.get('/mine', requireAuth, (req, res) => {
  const requests = db.prepare(`
    SELECT br.*, items.name AS item_name
    FROM borrow_requests br
    JOIN items ON items.id = br.item_id
    WHERE br.borrower_id = ? OR br.lender_id = ?
    ORDER BY br.created_at DESC
  `).all(req.user.id, req.user.id);

  res.json({ requests });
});

// FR-06: Lender accepts/declines, or either party marks as completed
router.put('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body; // 'accepted' | 'declined' | 'completed'

  if (!['accepted', 'declined', 'completed'].includes(status)) {
    return res.status(400).json({ error: "status must be 'accepted', 'declined' or 'completed'" });
  }

  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  if (status === 'accepted' || status === 'declined') {
    if (request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the item owner can accept or decline' });
    }
  } else if (status === 'completed') {
    if (request.borrower_id !== req.user.id && request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this request' });
    }
  }

  db.prepare('UPDATE borrow_requests SET status = ? WHERE id = ?').run(status, req.params.id);

  if (status === 'accepted') {
    // FR-06: accepted requests mark the item unavailable
    db.prepare("UPDATE items SET status = 'unavailable' WHERE id = ?").run(request.item_id);
    createNotification(request.borrower_id, 'request_accepted',
      'Your borrow request was accepted!');
  } else if (status === 'declined') {
    createNotification(request.borrower_id, 'request_declined',
      'Your borrow request was declined.');
  } else if (status === 'completed') {
    // FR-09: item becomes available again once the borrow is completed
    db.prepare("UPDATE items SET status = 'available' WHERE id = ?").run(request.item_id);
    // FR-10: prompt both parties to leave a review (FR-08)
    createNotification(request.borrower_id, 'review_prompt', 'Please leave a review for this borrow.');
    createNotification(request.lender_id, 'review_prompt', 'Please leave a review for this borrow.');
  }

  res.json({ success: true });
});

module.exports = router;
