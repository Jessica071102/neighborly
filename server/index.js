require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db/db');

const authRoutes = require('./services/auth/routes');
const listingsRoutes = require('./services/listings/routes');
const searchRoutes = require('./services/search/routes');
const requestsRoutes = require('./services/requests/routes');
const messagingRoutes = require('./services/messaging/routes');
const ratingsRoutes = require('./services/ratings/routes');
const notificationsRoutes = require('./services/notifications/routes');
const usersRoutes = require('./services/users/routes');
const registerMessagingSocket = require('./services/messaging/socket');

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Each mount point corresponds to a "service" from the SDD / Project Charter
app.use('/api/auth', authRoutes);                 // FR-01
app.use('/api/items', listingsRoutes);            // FR-02, FR-04, FR-09
app.use('/api/search', searchRoutes);             // FR-03
app.use('/api/requests', requestsRoutes);         // FR-05, FR-06
app.use('/api/messages', messagingRoutes);        // FR-07 (REST history)
app.use('/api/reviews', ratingsRoutes);           // FR-08
app.use('/api/notifications', notificationsRoutes); // FR-10
app.use('/api/users', usersRoutes);               // public profiles + profile editing

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN }
});

registerMessagingSocket(io); // FR-07 (real-time)

const PORT = process.env.PORT || 4000;

async function start() {
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf-8');
  await pool.query(schema);
  server.listen(PORT, () => {
    console.log(`Neighborly server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
