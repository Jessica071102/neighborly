const express = require('express');
const pool = require('../../db/db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// FR-08: Submit a review after a completed transaction
router.post('/', requireAuth, async (req, res) => {
  const { requestId, revieweeId, rating, comment } = req.body;

  if (!requestId || !revieweeId || rating == null) {
    return res.status(400).json({ error: 'requestId, revieweeId and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }

  const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [requestId]);
  const request = reqResult.rows[0];
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'completed') {
    return res.status(400).json({ error: 'Request must be completed before it can be reviewed' });
  }
  if (request.borrower_id !== req.user.id && request.lender_id !== req.user.id) {
    return res.status(403).json({ error: 'Not part of this transaction' });
  }
  if (Number(revieweeId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot review yourself' });
  }

  await pool.query(
    'INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
    [requestId, req.user.id, revieweeId, rating, comment || null]
  );

  res.status(201).json({ success: true });
});

// FR-08: Get all reviews + average rating for a user's profile
router.get('/user/:userId', async (req, res) => {
  const reviewsResult = await pool.query(
    `SELECT reviews.*, users.display_name AS reviewer_name
     FROM reviews
     JOIN users ON users.id = reviews.reviewer_id
     WHERE reviewee_id = $1
     ORDER BY created_at DESC`,
    [req.params.userId]
  );

  const avgResult = await pool.query(
    'SELECT AVG(rating) AS avg FROM reviews WHERE reviewee_id = $1',
    [req.params.userId]
  );

  const avg = avgResult.rows[0].avg;
  res.json({
    reviews: reviewsResult.rows,
    averageRating: avg !== null ? Number(avg) : null
  });
});

module.exports = router;
