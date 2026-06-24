require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db/db');

const authRoutes = require('./services/auth/routes');
const listingsRoutes = require('./services/listings/routes');
const searchRoutes = require('./services/search/routes');
const requestsRoutes = require('./services/requests/routes');
const messagingRoutes = require('./services/messaging/routes');
const ratingsRoutes = require('./services/ratings/routes');
const usersRoutes = require('./services/users/routes');
const neighborhoodsRoutes = require('./services/neighborhoods/routes');

// Prevent an unhandled rejection in any async route from crashing the process
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

const app = express();

// In production the client is served from the same Express server (same origin),
// so CORS is only needed for local development where Vite runs on :5173.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public platform stats + real testimonials for the landing page
app.get('/api/stats', async (req, res) => {
  try {
    const [items, users, areas, rating, testimonials] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM items WHERE status = 'available'"),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(DISTINCT neighborhood_area) FROM users WHERE neighborhood_area IS NOT NULL'),
      pool.query('SELECT ROUND(AVG(rating)::numeric, 1) AS avg FROM reviews'),
      pool.query(`
        SELECT r.comment, r.rating, u.display_name, u.neighborhood_area
        FROM reviews r JOIN users u ON u.id = r.reviewer_id
        WHERE r.comment IS NOT NULL AND TRIM(r.comment) != '' AND LENGTH(TRIM(r.comment)) > 5
        ORDER BY r.created_at DESC LIMIT 3
      `),
    ]);
    res.json({
      itemCount: parseInt(items.rows[0].count),
      userCount: parseInt(users.rows[0].count),
      neighbourhoodCount: parseInt(areas.rows[0].count),
      averageRating: rating.rows[0].avg ? parseFloat(rating.rows[0].avg) : null,
      testimonials: testimonials.rows,
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Could not load stats' });
  }
});

// Each mount point corresponds to a "service" from the SDD / Project Charter
app.use('/api/auth', authRoutes);       // FR-01
app.use('/api/items', listingsRoutes);  // FR-02, FR-04, FR-09
app.use('/api/search', searchRoutes);   // FR-03
app.use('/api/requests', requestsRoutes); // FR-05, FR-06
app.use('/api/messages', messagingRoutes); // FR-07
app.use('/api/reviews', ratingsRoutes); // FR-08
app.use('/api/users', usersRoutes);     // public profiles + profile editing
app.use('/api/neighborhoods', neighborhoodsRoutes); // FR-03: reference list for dropdowns

// Serve the built React client in production (same-origin, no CORS needed)
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Let React Router handle all non-API paths
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;

async function start() {
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf-8');
  await pool.query(schema);
  app.listen(PORT, () => {
    console.log(`Neighborly server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
