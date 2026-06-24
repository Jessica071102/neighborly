const express = require('express');
const pool = require('../../db/db');

const router = express.Router();

// Reference list for neighbourhood dropdowns.
// Public — no auth required; neighbourhood names are not sensitive data.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM neighborhoods ORDER BY name ASC');
    res.json({ neighborhoods: result.rows });
  } catch (err) {
    console.error('GET /neighborhoods error:', err);
    res.status(500).json({ error: 'Could not fetch neighbourhoods' });
  }
});

module.exports = router;
