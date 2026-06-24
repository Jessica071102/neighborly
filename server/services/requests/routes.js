const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');
const { createNotification } = require('../notifications/routes');

const router = express.Router();

// Helper: fetch request with item name and user display names in one query
async function fetchRequest(id) {
  const result = await pool.query(
    `SELECT br.*,
       i.name AS item_name,
       borrower.display_name AS borrower_name,
       lender.display_name  AS lender_name
     FROM borrow_requests br
     JOIN items i           ON i.id        = br.item_id
     JOIN users AS borrower ON borrower.id = br.borrower_id
     JOIN users AS lender   ON lender.id   = br.lender_id
     WHERE br.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// FR-05: Borrower sends a borrow request to an item owner
router.post('/', requireAuth, async (req, res) => {
  try {
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

    // Check for date-range overlap with existing in-progress requests
    const overlapResult = await pool.query(
      `SELECT COUNT(*) AS count FROM borrow_requests
       WHERE item_id = $1
         AND status IN ('accepted', 'return_reported', 'disputed')
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
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// FR-06: List requests where I'm the borrower or the lender (with user names)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.*,
         items.name AS item_name, items.price_per_day AS item_price,
         borrower.display_name AS borrower_name,
         lender.display_name  AS lender_name,
         EXISTS(SELECT 1 FROM reviews WHERE request_id = br.id AND reviewer_id = $1) AS has_review
       FROM borrow_requests br
       JOIN items            ON items.id    = br.item_id
       JOIN users AS borrower ON borrower.id = br.borrower_id
       JOIN users AS lender   ON lender.id   = br.lender_id
       WHERE br.borrower_id = $1 OR br.lender_id = $1
       ORDER BY br.created_at DESC`,
      [req.user.id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error('GET /requests/mine error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// FR-06: Lender accepts/declines a pending request; borrower can withdraw
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' | 'declined'

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
    }

    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (status === 'accepted' || status === 'declined') {
      // Lender can accept/decline; borrower can only decline (withdraw) their own pending request
      const isLender = request.lender_id === req.user.id;
      const isBorrowerWithdrawing = request.borrower_id === req.user.id && status === 'declined';
      if (!isLender && !isBorrowerWithdrawing) {
        return res.status(403).json({ error: 'Only the item owner can accept or decline' });
      }
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be accepted or declined' });
    }

    await pool.query('UPDATE borrow_requests SET status = $1 WHERE id = $2', [status, req.params.id]);

    const rid = parseInt(req.params.id);
    if (status === 'accepted') {
      createNotification(request.borrower_id, 'request_accepted', `Your borrow request for "${request.item_name}" was accepted!`, rid).catch(console.error);
    } else if (request.lender_id === req.user.id) {
      createNotification(request.borrower_id, 'request_declined', `Your borrow request for "${request.item_name}" was declined.`, rid).catch(console.error);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /requests/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

// FR-12: Upload a condition photo — lender uploads 'handover', borrower uploads 'return'
router.post('/:id/photos', requireAuth, async (req, res) => {
  try {
    const { photoUrl, type } = req.body;
    if (!photoUrl || !['handover', 'return'].includes(type)) {
      return res.status(400).json({ error: "photoUrl and type ('handover' or 'return') are required" });
    }

    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.borrower_id !== req.user.id && request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this request' });
    }
    if (type === 'handover' && request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the lender can upload handover photos' });
    }
    if (type === 'return' && request.borrower_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the borrower can upload return photos' });
    }

    await pool.query(
      'INSERT INTO request_photos (request_id, uploader_id, photo_url, type) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, photoUrl, type]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('POST /requests/:id/photos error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// FR-12: Get condition photos for a request
router.get('/:id/photos', requireAuth, async (req, res) => {
  try {
    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.borrower_id !== req.user.id && request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this request' });
    }

    const result = await pool.query(
      `SELECT rp.id, rp.type, rp.photo_url, rp.created_at, u.display_name AS uploader_name
       FROM request_photos rp
       JOIN users u ON u.id = rp.uploader_id
       WHERE rp.request_id = $1
       ORDER BY rp.created_at ASC`,
      [req.params.id]
    );
    res.json({ photos: result.rows });
  } catch (err) {
    console.error('GET /requests/:id/photos error:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// FR-11: Borrower reports they returned the item (accepted → return_reported)
// FR-12: Requires at least one return photo before reporting
router.post('/:id/report-return', requireAuth, async (req, res) => {
  try {
    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.borrower_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the borrower can report a return' });
    }
    if (request.status !== 'accepted') {
      return res.status(400).json({ error: 'Request must be active before reporting a return' });
    }

    // FR-12: at least one return photo is required before the borrower can report
    const photoCheck = await pool.query(
      "SELECT COUNT(*) FROM request_photos WHERE request_id = $1 AND type = 'return'",
      [req.params.id]
    );
    if (parseInt(photoCheck.rows[0].count) === 0) {
      return res.status(400).json({ error: 'Please upload at least one return condition photo before reporting the return.' });
    }

    await pool.query("UPDATE borrow_requests SET status = 'return_reported' WHERE id = $1", [req.params.id]);

    const rid = parseInt(req.params.id);
    createNotification(
      request.lender_id, 'return_reported',
      `${request.borrower_name} reported returning "${request.item_name}". Please review the photos and confirm.`,
      rid
    ).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    console.error('POST /requests/:id/report-return error:', err);
    res.status(500).json({ error: 'Failed to report return' });
  }
});

// FR-11: Lender confirms item returned in good condition (return_reported → completed)
router.post('/:id/confirm-return', requireAuth, async (req, res) => {
  try {
    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the lender can confirm a return' });
    }
    if (request.status !== 'return_reported') {
      return res.status(400).json({ error: 'Return has not been reported yet' });
    }

    await pool.query("UPDATE borrow_requests SET status = 'completed' WHERE id = $1", [req.params.id]);

    const rid = parseInt(req.params.id);
    createNotification(request.borrower_id, 'review_prompt', `"${request.item_name}" return confirmed! Leave a review for ${request.lender_name}.`, rid).catch(console.error);
    createNotification(request.lender_id, 'review_prompt', `"${request.item_name}" return confirmed! Leave a review for ${request.borrower_name}.`, rid).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    console.error('POST /requests/:id/confirm-return error:', err);
    res.status(500).json({ error: 'Failed to confirm return' });
  }
});

// FR-11: Lender reports a problem with the returned item (return_reported → disputed)
router.post('/:id/dispute', requireAuth, async (req, res) => {
  try {
    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the lender can raise a dispute' });
    }
    if (request.status !== 'return_reported') {
      return res.status(400).json({ error: 'A dispute can only be raised after the borrower reports a return' });
    }

    await pool.query("UPDATE borrow_requests SET status = 'disputed' WHERE id = $1", [req.params.id]);

    const rid = parseInt(req.params.id);
    createNotification(
      request.borrower_id, 'dispute_raised',
      `${request.lender_name} raised a dispute about "${request.item_name}". Please discuss in chat and mark as resolved when agreed.`,
      rid
    ).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    console.error('POST /requests/:id/dispute error:', err);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// FR-11: Either party marks dispute as resolved on their side.
// Status changes to 'resolved' only when BOTH parties confirm.
router.post('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const request = await fetchRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.borrower_id !== req.user.id && request.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this request' });
    }
    if (request.status !== 'disputed') {
      return res.status(400).json({ error: 'Request is not in a disputed state' });
    }

    const isBorrower = request.borrower_id === req.user.id;
    const field = isBorrower ? 'dispute_resolved_borrower' : 'dispute_resolved_lender';
    await pool.query(`UPDATE borrow_requests SET ${field} = TRUE WHERE id = $1`, [req.params.id]);

    // Check if both parties have now confirmed
    const updated = await pool.query(
      'SELECT dispute_resolved_borrower, dispute_resolved_lender FROM borrow_requests WHERE id = $1',
      [req.params.id]
    );
    const flags = updated.rows[0];
    const rid = parseInt(req.params.id);

    if (flags.dispute_resolved_borrower && flags.dispute_resolved_lender) {
      await pool.query("UPDATE borrow_requests SET status = 'resolved' WHERE id = $1", [req.params.id]);
      createNotification(request.borrower_id, 'dispute_resolved', `Dispute for "${request.item_name}" resolved by both parties.`, rid).catch(console.error);
      createNotification(request.lender_id, 'dispute_resolved', `Dispute for "${request.item_name}" resolved by both parties.`, rid).catch(console.error);
      return res.json({ success: true, fullyResolved: true });
    }

    // Notify the other party
    const otherUserId = isBorrower ? request.lender_id : request.borrower_id;
    const myName = isBorrower ? request.borrower_name : request.lender_name;
    createNotification(otherUserId, 'dispute_partial', `${myName} marked the dispute for "${request.item_name}" as resolved. Please confirm when you agree.`, rid).catch(console.error);

    res.json({ success: true, fullyResolved: false });
  } catch (err) {
    console.error('POST /requests/:id/resolve error:', err);
    res.status(500).json({ error: 'Failed to mark dispute as resolved' });
  }
});

module.exports = router;
