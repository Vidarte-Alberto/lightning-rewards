# Lightning Rewards

Lightning Rewards is a loyalty application for businesses that accept Lightning
payments. Customers earn one stamp after each confirmed payment and unlock the
configured reward when their card reaches the required number of stamps.

Payments use the [CLINK protocol](https://github.com/shocknet/CLINK) over Nostr:

- Businesses receive through a Lightning.Pub `noffer1…`.
- Customers pay through a ShockWallet `ndebit1…`.
- The backend signs every CLINK request with one persistent Nostr identity.
- A successful CLINK response is the only action that grants a stamp.

NWC and Alby are not part of the payment flow.

## Stack

- `backend/`: Node.js, Express, TypeScript, Prisma 7, PostgreSQL, CLINK SDK
- `frontend/`: React, Vite, Tailwind CSS, React Testing Library

The repository does not use a root workspace. Install and run each application
from its own directory.

## Prerequisites

- Node.js 20.19 or newer and npm
- PostgreSQL 16 or newer
- Lightning.Pub with a working `noffer1…` for a live business demo
- ShockWallet with a funded `ndebit1…` for a live customer demo

On Ubuntu, install Node.js 20, npm, OpenSSL, build tools, and PostgreSQL 16 with:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg openssl build-essential

curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs

sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
sudo systemctl enable --now postgresql
```

### Lightning.Pub on Ubuntu

For a live payment demo, install Lightning.Pub separately on the machine that will
receive payments:

```bash
wget -qO- https://deploy.lightning.pub | bash
```

The installer creates user-level `systemd` services and stores data under
`~/lightning_pub/`. After installation, confirm the services are running:

```bash
systemctl --user status lnd
systemctl --user status lightning_pub
```

The admin connection string is printed by the installer and saved at:

```bash
cat ~/lightning_pub/admin.connect
```

If the machine has an older system-wide Lightning.Pub install, stop and remove those
old units before running the new user-level installer:

```bash
sudo systemctl stop lnd lightning_pub
sudo systemctl disable lnd lightning_pub
sudo rm /etc/systemd/system/lnd.service /etc/systemd/system/lightning_pub.service
sudo systemctl daemon-reload
```

## Local setup

### 1. Create the database

```bash
sudo -u postgres psql -c "CREATE USER lightning_rewards WITH PASSWORD 'dev_password';"
sudo -u postgres psql -c "CREATE DATABASE lightning_rewards OWNER lightning_rewards;"
```

### 2. Configure and start the backend

```bash
cd backend
npm install
cp env-example .env
```

Set these required values in `backend/.env`:

```dotenv
PORT=3000
DATABASE_URL="postgresql://lightning_rewards:dev_password@localhost:5432/lightning_rewards?schema=public"
JWT_SECRET="<output-of-openssl-rand-hex-32>"
CLINK_PRIVATE_KEY="<output-of-openssl-rand-hex-32>"
CLINK_TIMEOUT_SECONDS=30
COINGECKO_API_KEY="<optional-demo-api-key>"
```

Generate secure local secrets with:

```bash
openssl rand -hex 32
```

`CLINK_PRIVATE_KEY` must remain stable. ShockWallet associates approval rules and
budgets with the public identity derived from this key. Changing it makes Lightning
Rewards appear as a different application.

`COINGECKO_API_KEY` is optional for local experimentation, but configuring a free
CoinGecko Demo API key is recommended for reliable MXN-to-sats product pricing.

Apply migrations, generate Prisma Client, and load demo data:

```bash
npm run db:migrate
npx prisma generate
npm run db:seed
```

Start the API:

```bash
npm run dev
```

The backend runs at `http://localhost:3000`.

### 3. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and uses
`http://localhost:3000` by default. Set `VITE_API_URL` when the API uses another
origin.

## Demo seed

All seeded accounts use the password `DemoPass123!`.

| Role | Email | Purpose |
| --- | --- | --- |
| Customer | `customer@lightning-rewards.local` | Discover, pay, and view loyalty cards |
| Business | `cafe@lightning-rewards.local` | Lightning Coffee dashboard |
| Business | `tacos@lightning-rewards.local` | Tacos Satoshi dashboard |
| Business | `bici@lightning-rewards.local` | Bitcoin Bikes dashboard |
| Business | `books@lightning-rewards.local` | Block & Book dashboard |

The default seed uses clearly marked placeholder offers. They are suitable for UI
testing but cannot receive payments. For a live CLINK demo, set one or more optional
values before running `npm run db:seed`:

```dotenv
DEMO_CUSTOMER_NDEBIT="ndebit1…"
DEMO_CAFE_NOFFER="noffer1…"
DEMO_TACOS_NOFFER="noffer1…"
DEMO_BIKES_NOFFER="noffer1…"
DEMO_BOOKS_NOFFER="noffer1…"
```

Running the seed again does not overwrite a valid existing business offer or customer
debit unless its corresponding environment variable is present. Legacy seed offers
without a `noffer1` prefix are replaced with the new placeholder. A business owner can
also paste a real Lightning.Pub offer from the Settings screen, and a customer can
connect a real ShockWallet debit from the Wallet screen.

## Demo script

1. Start PostgreSQL, the backend, the frontend, Lightning.Pub, and ShockWallet.
2. Log in as `cafe@lightning-rewards.local` and open **Settings**.
3. Confirm the saved value is the intended Lightning.Pub `noffer1…` and that the
   **Offer available** badge appears.
4. Log out and sign in as `customer@lightning-rewards.local`.
5. Open **Wallet**, connect the ShockWallet `ndebit1…`, and verify the Lightning
   Rewards `npub` before accepting the app-link request. Optionally set the suggested
   20,000 sats/month auto-approval budget.
6. Open **Discover**, select Lightning Coffee, enter an amount accepted by the offer,
   and press **Pay with Lightning**.
7. If auto-approval is not enabled, open ShockWallet and approve the request while the
   app displays **Waiting for wallet approval**.
8. Show the confirmation and updated stamp progress in **My cards**. Repeat until the
   reward unlocks, then log in as the business owner to show **Dashboard** and
   **Transactions**.

If the result is **Payment not confirmed**, check ShockWallet before attempting another
purchase. Do not retry blindly: the payment may have settled even when its final status
could not be confirmed in time.

## Validation commands

### Backend

```bash
cd backend
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run build
```

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Common CLINK failures

- **Invalid offer/debit:** confirm the complete pointer begins with `noffer1` or
  `ndebit1`; an `npub` alone is not a CLINK pointer.
- **Offer unavailable:** keep Lightning.Pub running and verify its LND node is synced.
- **Approval declined:** open ShockWallet and approve the next request, or configure an
  optional budget for the Lightning Rewards app identity shown on the Wallet screen.
- **Payment not confirmed:** inspect the wallet before retrying to avoid paying twice.
- **Identity changed:** restore the original `CLINK_PRIVATE_KEY`; approval rules are
  attached to its public key.

## Security and data integrity

- Never commit `.env`, `CLINK_PRIVATE_KEY`, `JWT_SECRET`, `ndebit1…`, or real
  `noffer1…` values.
- Customer and business routes enforce JWT authentication and role authorization.
- Loyalty stamps are granted idempotently and only for persisted `PAID` transactions.
- Internal CLINK settlements normalize missing preimages to `NULL` to avoid duplicate
  uniqueness conflicts.
- Use `npm run db:migrate` for deployed environments. Use `prisma migrate dev` only
  when creating a new migration during development.
