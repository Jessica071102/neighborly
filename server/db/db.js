// Uses Node's built-in SQLite module (available in Node 22.5+, no native
// compilation required -- avoids the common better-sqlite3 build issues on
// Windows). The API (.prepare().get/.all/.run()) matches better-sqlite3.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'neighborly.db');
const db = new DatabaseSync(DB_PATH);

// Apply schema on every boot. All statements use IF NOT EXISTS, so this is
// safe to run repeatedly and keeps the DB structure in sync with schema.sql.
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

module.exports = db;
