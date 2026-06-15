# Neighborly — Project Context for Claude Code

## What this project is
Neighborly is a hyperlocal borrowing platform for urban residents (HWR Berlin,
"Digital Literacy IV: Software Architecture" group project). Residents list
items they rarely use, search for items nearby, send borrow requests, chat
with each other, and leave ratings after a transaction. Full requirements are
in `Neighborly_Project_Charter.docx` in the project root.

## Architecture decision
**Modular monolith** with service-oriented folder boundaries. Each folder under
`server/services/` corresponds to a "service" in the SDD and is intentionally
decoupled from the others (own routes, own queries) so it *could* later be
split into a real microservice without major restructuring.

This is a deliberate trade-off worth mentioning in the presentation:
microservices overhead (separate deployments, network calls, service
discovery) is too high for this timeline, but the module boundaries
demonstrate the intended architecture and keep the option open.

Services and the Functional Requirements (FR) they implement:
- `auth`          — FR-01 (registration, login, JWT, profile)
- `listings`      — FR-02, FR-04, FR-09 (item CRUD, detail view, my listings)
- `search`        — FR-03 (geolocation + keyword search)
- `requests`      — FR-05, FR-06 (borrow request workflow)
- `messaging`     — FR-07 (chat — REST history + Socket.io real-time)
- `ratings`       — FR-08 (reviews after completed transactions)
- `notifications` — FR-10 (in-app notifications)

## Tech stack
- Backend: Node.js + Express
- DB: SQLite via `better-sqlite3` (file at `server/db/neighborly.db`, created
  automatically from `server/db/schema.sql` on first run)
- Auth: JWT (`jsonwebtoken`) + `bcryptjs`
- Real-time: Socket.io
- Frontend: React + Vite, `react-router-dom`, `socket.io-client`
- Keep it simple — no extra build tooling, no ORM

## Key non-functional requirements to keep in mind while coding
- **NFR-01 (Performance)**: search must respond within ~2 seconds even with
  many listings — keep the search query simple and indexed.
- **NFR-03 (Reliability)**: chat messages must never be lost. Always write a
  message to the database BEFORE (or atomically with) broadcasting it via
  Socket.io, so a reconnecting client can always reload full history from
  `GET /api/messages/:requestId`.
- **NFR-04 (Security/Privacy)**: never return a user's precise `lat`/`lng` to
  *other* users in API responses. Only the owner sees their own coordinates.
  Other users should see `neighborhood_area` (a human-readable area name) and
  a computed `distanceKm`, not raw coordinates.
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
cp .env.example .env
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
- DB access is synchronous via better-sqlite3:
  `db.prepare('SELECT ...').get(...)` / `.all(...)` / `.run(...)` — no
  async/await needed for queries.
- Add a comment referencing the FR ID(s) above each route, e.g.
  `// FR-03: Geolocation-based search` — this keeps traceability back to the
  Project Charter for the SDD and presentation.

## Current status / suggested build order
Work through this list top to bottom. Each item should be runnable and
testable (via curl/Postman or the UI) before moving to the next.

1. [x] Scaffold — server boots, client boots, `/api/health` works, DB schema
       created automatically
2. [x] Auth (FR-01) — register/login/me implemented — test end-to-end from
       the client (build a Login/Register page)
3. [x] Listings (FR-02, FR-04, FR-09) — basic CRUD implemented — build the
       "Create Listing" form and "My Listings" page
4. [x] Search (FR-03) — basic implementation done — build a search page that
       uses `navigator.geolocation.getCurrentPosition()` for the user's
       coordinates and a radius slider
5. [x] Borrow requests (FR-05, FR-06) — basic implementation done — build the
       "Request to Borrow" button and an "Incoming/Outgoing Requests" page
       for accept/decline
6. [x] Messaging (FR-07) — Socket.io wired server-side — build the chat UI
       (connect with the JWT, join `request:<id>` room, send/receive)
7. [x] Ratings (FR-08) — basic implementation done — build the review form,
       shown once a request's status is `completed`
8. [ ] Notifications (FR-10) — list/read endpoints exist but nothing creates
       notifications yet. Call `createNotification()` (exported from
       `server/services/notifications/routes.js`) from the `requests`
       service when a request is created/accepted/declined, and surface the
       list in the UI.
9. [ ] Polish — loading states, error handling, basic styling, and a "mark
       request as completed" action so reviews (step 7) can be tested.

`[x]` above means "backend exists, needs a UI" — none of the React pages
exist yet beyond the placeholder in `client/src/App.jsx`. Build pages one
service at a time, following this order.
