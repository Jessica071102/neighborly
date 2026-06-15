# Neighborly

Hyperlocal borrowing platform — HWR Berlin, *Digital Literacy IV: Software
Architecture* group project.

## Quick start

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Server runs on http://localhost:4000. The SQLite database is created
automatically at `server/db/neighborly.db` from `server/db/schema.sql` the
first time it runs.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. API calls to `/api/*` are proxied to the backend.

## Project structure

```
neighborly/
├── CLAUDE.md              ← architecture & build-order context for Claude Code
├── Neighborly_Project_Charter.docx
├── server/
│   ├── index.js           ← Express + Socket.io entry point
│   ├── db/
│   │   ├── schema.sql      ← table definitions
│   │   └── db.js            ← SQLite connection, runs schema on boot
│   ├── middleware/auth.js  ← JWT verification
│   └── services/
│       ├── auth/            (FR-01)
│       ├── listings/        (FR-02, FR-04, FR-09)
│       ├── search/          (FR-03)
│       ├── requests/         (FR-05, FR-06)
│       ├── messaging/        (FR-07)
│       ├── ratings/          (FR-08)
│       └── notifications/    (FR-10)
└── client/                  ← React + Vite frontend
```

## Where to start

Open this folder in Claude Code — it will read `CLAUDE.md` automatically and
pick up from the build-order checklist there. The backend already has working
endpoints for auth, listings, search, requests, messaging (sockets), and
ratings; the main remaining work is building the React pages and wiring up
notifications.

## Requirements reference

Full functional and non-functional requirements, stakeholders, and the
execution plan for search/chat are documented in
`Neighborly_Project_Charter.docx`.
