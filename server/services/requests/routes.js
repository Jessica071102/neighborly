const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');
const { createNotification } = require('../notifications/routes');

const router = express.Router();

// FR-05: Borrower sends a borrow request to an item owner
router.post('/', requireAuth, async (req, res) => {
  const { itemId, startDate, endDate } = req.body;

  if (!itemId || !startDate || !endDate) {
    return res.status(400).json({ error: 'itemId, startDate and endDate are required' });
  }
  if (endDate < startDate) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }

  const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [itemId]);
  const item = itemResult.rows[0];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.owner_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot request your own item' });
  }
  if (item.status !== 'available') {
    return res.status(400).json({ error: 'This listing is currently paused by the owner' });
  }

  // Check for date-range overlap with existing accepted requests
  const overlapResult = await pool.query(
    `SELECT COUNT(*) AS count FROM borrow_requests
     WHERE item_id = $1 AND status = 'accepted'
       AND start_date <= $2 AND end_date >= $3`,
    [itemId, endDate, startDate]
  );
  if (parseInt(overlapResult.rows[0].count) > 0) {
    return res.status(409).json({ error: 'Item is already booked for those dates. Please choose different dates.' });
  }

  const result = await pool.query(
    `INSERT INTO borrow_requests (item_id, borrower_id, lender_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
    [itemId, req.user.id, item.owner_id, startDate, endDate]
  );
  const requestId = result.rows[0].id;

  // FR-10: notify the lender
  createNotification(item.owner_id, 'new_request', `New borrow request for "${item.name}"`, requestId).catch(console.error);

  res.status(201).json({ id: requestId });
});

// FR-06: List requests where I'm the borrower or the lender (with user names)
router.get('/mine', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT br.*,
       items.name AS item_name, items.price_per_day AS item_price,
       borrower.display_name AS borrower_name,
       lender.display_name  AS lender_name
     FROM borrow_requests br
     JOIN items            ON items.id    = br.item_id
     JOIN users AS borrower ON borrower.id = br.borrower_id
     JOIN users AS lender   ON lender.id   = br.lender_id
     WHERE br.borrower_id = $1 OR br.lender_id = $1
     ORDER BY br.created_at DESC`,
    [req.user.id]
  );
  res.json({ requests: result.rows });
});

// FR-06: Lender accepts/declines, or either party marks as completed
router.put('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body; // 'accepted' | 'declined' | 'completed'

  if (!['accepted', 'declined', 'completed'].includes(status)) {
    return res.status(400).json({ error: "status must be 'accepted', 'declined' or 'completed'" });
  }

  const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [req.params.id]);
  const request = reqResult.rows[0];
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

  await pool.query('UPDATE borrow_requests SET status = $1 WHERE id = $2', [status, req.params.id]);

  const rid = parseInt(req.params.id);

  if (status === 'accepted') {
    // Item stays available -- new requests for different dates are still allowed.
    createNotification(request.borrower_id, 'request_accepted', 'Your borrow request was accepted!', rid).catch(console.error);
  } else if (status === 'declined') {
    createNotification(request.borrower_id, 'request_declined', 'Your borrow request was declined.', rid).catch(console.error);
  } else if (status === 'completed') {
    // Item remains available -- no status change needed.
    createNotification(request.borrower_id, 'review_prompt', 'How was your borrowing experience? Leave a review.', rid).catch(console.error);
    createNotification(request.lender_id, 'review_prompt', 'How was your lending experience? Leave a review.', rid).catch(console.error);
  }

  res.json({ success: true });
});

module.exports = router;
