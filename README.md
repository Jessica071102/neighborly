# Neighborly

Hyperlocal borrowing platform — HWR Berlin, *Digital Literacy IV: Software
Architecture* group project.

## Architecture

**Modular monolith** — plain REST request/response throughout. No WebSockets,
no push notifications, no payment processing.

| Decision | Choice | Reason |
|---|---|---|
| Chat delivery | REST GET + 4 s client poll | Fits Client-Server pattern taught in course |
| Search | Neighbourhood text filter (ILIKE) | No coordinates collected (privacy); simpler than geolocation |
| Payments | Display-only price field | Neighborly never touches money; parties settle privately |
| Notifications | None — status page is the notification | `borrow_requests.status` tells each party what's happening |

## Quick start

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm run dev
```

Server runs on http://localhost:4000. The PostgreSQL schema is applied
automatically from `server/db/schema.sql` on every startup (idempotent).

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. API calls to `/api/*` are proxied to the backend.

## Services

```
server/services/
├── auth/          FR-01  register · login · /me
├── listings/      FR-02, FR-04, FR-09  item CRUD
├── search/        FR-03  neighbourhood + keyword filter
├── requests/      FR-05, FR-06  borrow request workflow
├── messaging/     FR-07  REST history + REST send
├── ratings/       FR-08  post-transaction reviews
└── users/         public profiles · profile editing
```

## Key design notes

- **No lat/lng anywhere.** Search filters on the `neighborhood_area` text column
  of the owner; no browser geolocation is used and no coordinates are stored.
- **No payments table.** `price_per_day` and `deposit_cents` are display-only
  labels the lender sets as a suggestion; all money moves privately between
  the two people (classifieds-style).
- **Chat is polling.** `ChatPage` polls `GET /api/messages/:requestId` every
  4 seconds and sends via `POST`. No WebSocket connection is opened.
- **Status is the notification.** When something happens to a request
  (accepted, return reported, disputed, …) the status column updates and the
  other party sees it the next time they open the Requests page.
- **Condition photos (FR-11/FR-12).** Borrower must upload a return photo
  before reporting a return; lender can then confirm or dispute. Mutual
  acknowledgement required before a dispute clears.
