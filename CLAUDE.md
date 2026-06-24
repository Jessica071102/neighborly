# Neighborly — Project Context for Claude Code

## What this project is
Neighborly is a hyperlocal borrowing platform for urban residents (HWR Berlin,
"Digital Literacy IV: Software Architecture" group project). Residents list
items they rarely use, search for items nearby, send borrow requests, chat
with each other, and leave ratings after a transaction. Full requirements are
in `Neighborly_Project_Charter.docx` in the project root.

## Architecture decision
**Modular monolith** with service-oriented folder boundaries, using plain REST
request/response throughout — no WebSockets, no push notifications.

Each folder under `server/services/` corresponds to a "service" in the SDD and
is intentionally decoupled (own routes, own queries). This aligns with the
Client-Server pattern taught in the course and keeps the codebase simple.

Services and the Functional Requirements (FR) they implement:
- `auth`      — FR-01 (registration, login, JWT, profile)
- `listings`  — FR-02, FR-04, FR-09 (item CRUD, detail view, my listings)
- `search`    — FR-03 (neighbourhood text filter + keyword search)
- `requests`  — FR-05, FR-06, FR-11 (borrow request workflow + return/dispute)
- `messaging` — FR-07 (chat — REST history + REST send, client polls every 4 s)
- `ratings`   — FR-08 (reviews after completed transactions)
- `users`     — public profiles + profile editing

## Tech stack
- Backend: Node.js + Express
- DB: PostgreSQL via `pg` (Neon in production; schema auto-applied from
  `server/db/schema.sql` on every startup — idempotent migrations)
- Auth: JWT (`jsonwebtoken`) + `bcryptjs`
- Frontend: React + Vite, `react-router-dom`
- Keep it simple — no extra build tooling, no ORM, no WebSockets

## Key design decisions (mention these in the presentation)

- **No geolocation.** Search filters on the owner's `neighborhood_area` text
  column (ILIKE). No `lat`/`lng` is stored anywhere. This is the simplest
  possible implementation of FR-03 and fully satisfies NFR-04 (no precise
  coordinates ever collected).
- **No payments table.** `price_per_day` is display-only. Neighborly never
  handles money; parties settle privately (classifieds-style). There is an
  explanatory comment in `schema.sql`.
- **No notifications table.** `borrow_requests.status` is the notification.
  Each party sees current transaction state on their Requests page. There is an
  explanatory comment in `schema.sql`.
- **Chat is polling.** `ChatPage` sends via `POST /api/messages/:requestId` and
  refreshes via `GET` on a 4-second interval. No WebSocket connection is opened.
- **Condition photos (FR-11/FR-12).** Borrower must upload a return photo
  before reporting a return; lender can then confirm or dispute. Mutual
  acknowledgement required before a dispute clears.

## Key non-functional requirements to keep in mind while coding
- **NFR-01 (Performance)**: search query is simple and uses indexes — no
  in-process distance calculations.
- **NFR-04 (Security/Privacy)**: no `lat`/`lng` anywhere. Other users only
  ever see `neighborhood_area` (a human-readable area name).
- **NFR-05 (Security)**: passwords are always hashed with bcrypt; never log or
  return `password_hash`.
- **NFR-06 (Modifiability)**: item `category` is free text / a config list,
  NOT a hardcoded enum or DB constraint — new categories must not require
  schema or code changes.

## How to run
```bash
# Backend (port 4000)
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm run dev

# Frontend (port 5173, proxies /api -> :4000)
cd client
npm install
npm run dev
```

## Conventions
- All API routes are prefixed `/api/...` and grouped by service in
  `server/services/<name>/routes.js`, mounted in `server/index.js`.
- Protected routes use `requireAuth` from `server/middleware/auth.js`, which
  sets `req.user = { id, email }` from the JWT.
- DB access uses `pg` with async/await: `await pool.query('SELECT ...', [...])`.
- Add a comment referencing the FR ID(s) above each route, e.g.
  `// FR-03: Neighbourhood-based search` — keeps traceability to the Project Charter.

## Current status
All features are implemented and the UI is complete:

1. [x] Auth (FR-01) — register/login/profile
2. [x] Listings (FR-02, FR-04, FR-09) — CRUD + photo upload
3. [x] Search (FR-03) — neighbourhood + keyword filter
4. [x] Borrow requests (FR-05, FR-06) — full workflow with accept/decline
5. [x] Messaging (FR-07) — REST chat with 4 s polling
6. [x] Ratings (FR-08) — post-transaction reviews with star ratings
7. [x] Return confirmation + dispute flow (FR-11) — mutual resolution
8. [x] Condition photos (FR-12) — handover and return photos required
