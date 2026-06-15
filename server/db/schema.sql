-- Neighborly database schema
-- Tables map to the Functional Requirements in the Project Charter.

-- FR-01: Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  neighborhood_area TEXT,        -- human-readable area, e.g. "Prenzlauer Berg"
  lat REAL,                       -- precise location, NEVER exposed to other users (NFR-04)
  lng REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-02, FR-04, FR-09: Item listings
-- NOTE (NFR-06): `category` is intentionally free text, not an enum/constraint,
-- so new categories can be added without schema or code changes.
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'unavailable'
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-05, FR-06: Borrow requests
CREATE TABLE IF NOT EXISTS borrow_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  borrower_id INTEGER NOT NULL REFERENCES users(id),
  lender_id INTEGER NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | completed
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-07: Chat messages (one thread per borrow_request)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES borrow_requests(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-08: Ratings & reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES borrow_requests(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-10: Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,             -- e.g. 'new_request' | 'request_accepted' | 'request_declined' | 'new_message' | 'review_prompt'
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes to support NFR-01 (search performance)
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_requests_item ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_requests_lender ON borrow_requests(lender_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
