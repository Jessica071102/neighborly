-- Neighborly database schema (PostgreSQL)
-- Tables map to the Functional Requirements in the Project Charter.

-- FR-01: Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  neighborhood_area TEXT,        -- human-readable area, e.g. "Prenzlauer Berg"
  lat FLOAT8,                    -- precise location, NEVER exposed to other users (NFR-04)
  lng FLOAT8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-02, FR-04, FR-09: Item listings
-- NOTE (NFR-06): `category` is intentionally free text, not an enum/constraint,
-- so new categories can be added without schema or code changes.
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'unavailable'
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-05, FR-06: Borrow requests
CREATE TABLE IF NOT EXISTS borrow_requests (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  borrower_id INTEGER NOT NULL REFERENCES users(id),
  lender_id INTEGER NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-07: Chat messages (one thread per borrow_request)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES borrow_requests(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-08: Ratings & reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES borrow_requests(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-10: Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,             -- e.g. 'new_request' | 'request_accepted' | 'request_declined' | 'new_message' | 'review_prompt'
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema migrations (idempotent -- safe to run on every startup)
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_per_day FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES borrow_requests(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences TEXT;

-- Migrate start_date/end_date from TEXT to DATE for type safety and query planner support
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_requests' AND column_name = 'start_date' AND data_type = 'text'
  ) THEN
    ALTER TABLE borrow_requests ALTER COLUMN start_date TYPE DATE USING start_date::DATE;
    ALTER TABLE borrow_requests ALTER COLUMN end_date   TYPE DATE USING end_date::DATE;
  END IF;
END $$;

-- Migrate is_read from INTEGER to BOOLEAN (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_read' AND data_type = 'integer'
  ) THEN
    ALTER TABLE notifications ALTER COLUMN is_read TYPE BOOLEAN USING is_read::BOOLEAN;
    ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT FALSE;
  END IF;
END $$;

-- FR-08: enforce one review per reviewer per transaction at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review ON reviews (request_id, reviewer_id);

-- Indexes to support NFR-01 (search performance)
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_requests_item ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_requests_lender ON borrow_requests(lender_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
