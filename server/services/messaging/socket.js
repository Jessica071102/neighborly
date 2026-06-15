const jwt = require('jsonwebtoken');
const db = require('../../db/db');
const { JWT_SECRET } = require('../../middleware/auth');
const { createNotification } = require('../notifications/routes');

// FR-07: Real-time chat delivery.
//
// NFR-03 (Reliability): every message is written to SQLite BEFORE it is
// broadcast. If a recipient is offline or the socket drops, the message is
// still safely stored and will be returned by
// GET /api/messages/:requestId when the client reconnects -- nothing is
// lost in transit.
function registerMessagingSocket(io) {
  // Authenticate the socket using the same JWT used for REST requests.
  // Client should connect with: io(URL, { auth: { token: '<jwt>' } })
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: missing token'));

    try {
      socket.user = jwt.verify(token, JWT_SECRET); // { id, email }
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Client joins the room for the borrow request they're chatting about.
    socket.on('join', (requestId) => {
      const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(requestId);
      const isParticipant = request &&
        (request.borrower_id === socket.user.id || request.lender_id === socket.user.id);

      if (!isParticipant) return; // silently ignore - not part of this chat
      socket.join(`request:${requestId}`);
    });

    // Client sends a message.
    socket.on('message', ({ requestId, content }) => {
      if (!content || !content.trim()) return;

      const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(requestId);
      const isParticipant = request &&
        (request.borrower_id === socket.user.id || request.lender_id === socket.user.id);
      if (!isParticipant) return;

      // Persist first (NFR-03), then broadcast.
      const result = db.prepare(`
        INSERT INTO messages (request_id, sender_id, content) VALUES (?, ?, ?)
      `).run(requestId, socket.user.id, content.trim());

      const message = db.prepare(`
        SELECT messages.*, users.display_name AS sender_name
        FROM messages JOIN users ON users.id = messages.sender_id
        WHERE messages.id = ?
      `).get(result.lastInsertRowid);

      io.to(`request:${requestId}`).emit('message', message);

      // FR-10: notify the other participant of a new message
      const recipientId = request.borrower_id === socket.user.id
        ? request.lender_id
        : request.borrower_id;
      createNotification(recipientId, 'new_message', 'You have a new message.');
    });
  });
}

module.exports = registerMessagingSocket;
