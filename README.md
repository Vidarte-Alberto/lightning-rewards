# Lightning Rewards

Loyalty app (5 stamps / 5 purchases) for businesses that accept payment over the
Lightning Network. Two account types: **Business Owner** and **Customer**. A stamp is
added automatically when a Lightning payment is confirmed.

- **Backend**: `backend/` — Node.js/Express + Prisma (PostgreSQL) + `@shocknet/clink-sdk`
  (CLINK protocol over Nostr for payments).
- **Frontend**: `frontend/` — React + Vite + Tailwind.

There's no root workspace — install and run each app from its own folder.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL running locally (macOS: `brew install postgresql@16 && brew services start postgresql@16`)

## Setup

### 1. Database

```bash
createdb lightning_rewards
```

### 2. Backend

```bash
cd backend
npm install
cp env-example .env
```

Edit `backend/.env`:

```
PORT=3000
DATABASE_URL="postgresql://<your-user>@localhost:5432/lightning_rewards?schema=public"
JWT_SECRET="<any-random-string-for-local-dev>"
```

`DATABASE_URL` user/password depend on your local Postgres auth setup — if you connect
with plain `psql` with no password prompt, omit the password from the URL.

Apply the schema and generate the client:

```bash
npx prisma migrate dev
```

Run the backend:

```bash
npm run dev
```

Backend runs at `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Common scripts

Run from inside `backend/` or `frontend/`:

| Command | Backend | Frontend |
| --- | --- | --- |
| `npm run dev` | start with hot reload (nodemon) | start Vite dev server |
| `npm run lint` | ESLint | ESLint |
| `npm test` / `npm run test:unit` | Jest (unit) | Jest + React Testing Library |
| `npm run build` | — | production build |

## Payments (CLINK)

Payments go through the [CLINK protocol](https://github.com/shocknet/CLINK) (Nostr), via
`@shocknet/clink-sdk` — **not** NWC or Alby. A business exposes a `noffer` string to
receive payments; a customer connects an `ndebit` string to pay. Before touching
`backend/src/services/clink.service.js`, check the SDK's actual method signatures in
`backend/node_modules/@shocknet/clink-sdk` rather than assuming them from the specs.

## Conventions

- Table/model names in English; user-facing strings in Spanish.
- Never commit `.env` — sensitive values (DB credentials, Nostr keys, JWT secret) stay
  local.
