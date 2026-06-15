const jwt = require('jsonwebtoken');
const pool = require('../../db/db');
const { JWT_SECRET } = require('../../middleware/auth');
const { createNotification } = require('../notifications/routes');

// FR-07: Real-time chat delivery.
//
// NFR-03 (Reliability): every message is written to the DB BEFORE it is
// broadcast. If a recipient is offline or the socket drops, the message is
// still safely stored and will be returned by
// GET /api/messages/:requestId when the client reconnects.
function registerMessagingSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: missing token'));

    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', async (requestId) => {
      const result = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [requestId]);
      const request = result.rows[0];
      const isParticipant = request &&
        (request.borrower_id === socket.user.id || request.lender_id === socket.user.id);

      if (!isParticipant) return;
      socket.join(`request:${requestId}`);
    });

    socket.on('message', async ({ requestId, content }) => {
      if (!content || !content.trim()) return;

      const reqResult = await pool.query('SELECT * FROM borrow_requests WHERE id = $1', [requestId]);
      const request = reqResult.rows[0];
      const isParticipant = request &&
        (request.borrower_id === socket.user.id || request.lender_id === socket.user.id);
      if (!isParticipant) return;

      // Persist first (NFR-03), then broadcast.
      const insertResult = await pool.query(
        'INSERT INTO messages (request_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id',
        [requestId, socket.user.id, content.trim()]
      );

      const msgResult = await pool.query(
        `SELECT messages.*, users.display_name AS sender_name
         FROM messages JOIN users ON users.id = messages.sender_id
         WHERE messages.id = $1`,
        [insertResult.rows[0].id]
      );

      io.to(`request:${requestId}`).emit('message', msgResult.rows[0]);

      // FR-10: notify the other participant of a new message
      const recipientId = request.borrower_id === socket.user.id
        ? request.lender_id
        : request.borrower_id;
      createNotification(recipientId, 'new_message', 'You have a new message.', requestId).catch(console.error);
    });

    socket.on('delete_message', async ({ messageId }) => {
      const msgResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
      const msg = msgResult.rows[0];
      if (!msg || msg.sender_id !== socket.user.id) return;

      await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
      io.to(`request:${msg.request_id}`).emit('message_deleted', { messageId });
    });
  });
}

module.exports = registerMessagingSocket;
