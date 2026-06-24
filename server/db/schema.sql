-- Neighborly database schema (PostgreSQL)
-- Tables map to the Functional Requirements in the Project Charter.

-- FR-01: Users
-- NOTE: No lat/lng columns. Precise coordinates are not collected.
-- Search filters by neighbourhood_area (text); no geolocation is used (NFR-04).
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  neighborhood_area TEXT,        -- human-readable area, e.g. "Prenzlauer Berg"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-02, FR-04, FR-09: Item listings
-- NOTE (NFR-06): `category` is intentionally free text, not an enum/constraint,
-- so new categories can be added without schema or code changes.
-- NOTE: No lat/lng columns. Item location is the owner's neighbourhood_area;
-- no precise coordinates are stored.
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'unavailable'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: There is intentionally no `payments` table.
-- Neighborly never handles money. price_per_day is display-only information;
-- any deposit or payment is arranged privately between lender and borrower
-- (classifieds-style). This keeps the architecture simple and out of PCI scope.

-- FR-05, FR-06: Borrow requests
CREATE TABLE IF NOT EXISTS borrow_requests (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  borrower_id INTEGER NOT NULL REFERENCES users(id),
  lender_id INTEGER NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | return_reported | disputed | resolved | completed
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

-- NOTE: There is intentionally no `notifications` table (FR-10 removed).
-- The borrow_requests.status column is the notification: each party sees
-- current transaction state on their Requests page. This keeps the
-- architecture to plain REST request-response with no push mechanism.

-- FR-11, FR-12: Condition photos for borrow requests (handover and return)
CREATE TABLE IF NOT EXISTS request_photos (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES borrow_requests(id),
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  photo_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('handover', 'return')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FR-03: Neighbourhood reference table — centroid coordinates for Haversine distance.
-- Privacy-preserving: all distance calculations use area centroids, not user GPS (NFR-04).
CREATE TABLE IF NOT EXISTS neighborhoods (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  lat  FLOAT8 NOT NULL,
  lng  FLOAT8 NOT NULL
);

-- Schema migrations (idempotent -- safe to run on every startup)
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_per_day FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences TEXT;

-- Remove precise location fields (architecture simplification: neighbourhood
-- text filter replaces geolocation; no coordinates collected anywhere)
ALTER TABLE users DROP COLUMN IF EXISTS lat;
ALTER TABLE users DROP COLUMN IF EXISTS lng;
ALTER TABLE items DROP COLUMN IF EXISTS lat;
ALTER TABLE items DROP COLUMN IF EXISTS lng;

-- Remove notifications subsystem (FR-10 cut: request status is the notification)
DROP TABLE IF EXISTS notifications CASCADE;

-- Migrate start_date/end_date from TEXT to DATE for type safety (idempotent)
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

-- FR-11: Track mutual dispute resolution — both parties must confirm before badge clears
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS dispute_resolved_borrower BOOLEAN DEFAULT FALSE;
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS dispute_resolved_lender BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_request_photos_request ON request_photos(request_id);

-- FR-08: enforce one review per reviewer per transaction at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review ON reviews (request_id, reviewer_id);

-- Seed Berlin neighbourhood centroids (idempotent)
INSERT INTO neighborhoods (name, lat, lng) VALUES
  ('Charlottenburg',  52.5168, 13.3044),
  ('Friedrichshain',  52.5153, 13.4534),
  ('Kreuzberg',       52.4987, 13.4043),
  ('Mitte',           52.5200, 13.4050),
  ('Neukölln',        52.4806, 13.4322),
  ('Pankow',          52.5688, 13.4030),
  ('Prenzlauer Berg', 52.5390, 13.4135),
  ('Schöneberg',      52.4847, 13.3633),
  ('Spandau',         52.5351, 13.2006),
  ('Steglitz',        52.4573, 13.3212),
  ('Tempelhof',       52.4729, 13.4088),
  ('Wedding',         52.5490, 13.3730)
ON CONFLICT (name) DO NOTHING;

-- Link users to their neighbourhood for Haversine distance computation
ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood_id INTEGER REFERENCES neighborhoods(id);

-- Indexes for query performance (NFR-01)
CREATE INDEX IF NOT EXISTS idx_users_neighborhood ON users(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_items_status    ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_owner     ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_requests_item   ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_requests_lender   ON borrow_requests(lender_id);
CREATE INDEX IF NOT EXISTS idx_messages_request  ON messages(request_id);
