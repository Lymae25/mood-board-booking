# Security status

Live in production as of 2026-09-16 (`main`, merge commit `32b7108`). Admin
login and customer-to-customer data isolation are done and verified against
the real production database. `POST /api/upload` is the next known gap (see
"Known gaps" below) - work on it happens on a separate branch,
`security-upload`, off `main`.

## What's done and confirmed live

### 1. Real admin authentication (replaces the "1010" PIN)
- The old admin gate was a literal hardcoded string `'1010'` in client-side
  JS (`CustomerSelector.tsx`) plus a handful of API routes checking
  `?admin=1010` in the URL - and most admin-only routes (creating/deleting
  customers, deleting projects, scheduling/deleting meetings) had **no
  server-side check at all**.
- `lib/adminAuth.ts` - scrypt password hashing (Node's built-in
  `crypto.scrypt`, salted, verified with `timingSafeEqual`), optional TOTP
  2FA (RFC 6238, hand-rolled with Node's built-in `crypto.createHmac`),
  httpOnly session cookies (`mbb_admin_session`, 12h sliding expiry, random
  32-byte token), and DB-backed login rate limiting (5 failed attempts / 15
  min per IP).
- `proxy.ts` (Next.js 16 renamed `middleware.js` to `proxy.js`) gates
  `/admin` and `/admin/jarvis` at the page level: no valid session, no page.
- Every previously-open or `1010`-gated admin route now calls
  `requireAdminSession(request)` and returns 401 without a valid session.
- `scripts/set-admin-password.mjs` sets/resets the admin password with
  masked terminal input, never printed anywhere; creates its own schema so
  it works against a completely empty database (verified).
- `GET /api/calendar/feed.ics` used to be fully unauthenticated and leaked
  every customer's name, every project and every meeting (with location) to
  anyone with the URL. Now requires an admin session or a long random
  per-install token (`GET/DELETE /api/admin/calendar-token`), since
  Apple/Google Calendar's ICS subscription mechanism can't send cookies.
- **Confirmed live in production (2026-09-16):** admin login works with the
  real password, `1010` is rejected everywhere (grepped out of the client
  bundle entirely), customer PIN login and chat still work normally.

### 2. Cross-customer data isolation
Before this, a customer's "identity" was just a plain `customerId` in every
request - no session, no proof. Any visitor who knew or guessed another
customer's id could read/write their projects, scenes, ideas, notes and
messages, and reset their PIN outright (full account takeover).

- New `lib/customerAuth.ts` - a customer session (`mbb_customer_session`),
  issued on a correct PIN at `POST /api/verify-pin` (which is now also
  rate-limited; a 4-digit PIN is only 10,000 combinations and previously had
  no limit at all).
- Every customer-scoped route (`/api/projects`, `/api/projects/[id]`
  (added a `GET`), `/api/scenes`, `/api/ideas`, `/api/notes`,
  `/api/timeline`, `/api/messages`, `PATCH /api/customers/[id]`) now
  verifies the requester owns the `customerId`/`projectId`/`sceneId`
  involved via `requireOwnerOrAdmin()` - never off a plain id the client
  sends. An admin session always passes.
- `ProjectDetail.tsx` and `CustomerDashboard.tsx` redirect to the PIN screen
  (or home) instead of silently rendering an empty page when a stale tab has
  no valid session.
- Covered by `tests/accessControl.test.ts`, which directly proves two test
  customers cannot read, write, or reset each other's data.

### 3. Tests, build, lint
- `npm test` (vitest): **31/31 passing** - `tests/adminAuth.test.ts` (pure
  logic), `tests/adminAuthDb.test.ts` (sessions + rate limiting against a
  real Postgres), `tests/accessControl.test.ts` (route handlers, covering
  admin gating and cross-customer isolation end to end).
- `npm run build`: succeeds (Next.js 16 + Turbopack), type-checks clean.
- `npm run lint`: introduces no new errors or warnings beyond this repo's
  existing baseline (pre-existing `@typescript-eslint/no-explicit-any` in
  legacy components, untouched).
- Manually verified against a running `next dev` server and, separately,
  directly against production after deploy: login/logout, PIN verify +
  session cookie, rate limiting (5 failed attempts), calendar-token flow,
  and that customer A's session cannot reach customer B's data - all use
  `next/headers`' `cookies()` and can't be covered by direct unit import.

## Known gaps

- **`POST /api/upload` accepts files from anyone, no login required.**
  Being fixed on branch `security-upload` (off `main`) - will require an
  admin or the owning customer's session, and restrict file type
  (images + PDF) and size.
- **`GET /api/typing`** (chat "is typing" indicator) is not session-gated.
  Low severity - reveals only a boolean presence blip, no message content -
  left open for now.
- No admin UI yet for TOTP setup (API-only: `POST`/`PUT`/`DELETE
  /api/admin/totp`) or for browsing login/PIN rate-limit history.

## How to test locally

```sh
# 1. Local Postgres in Docker (throwaway, not production data)
docker run -d --name mbb-local-pg \
  -e POSTGRES_PASSWORD=localdevpass -e POSTGRES_DB=mbb_dev \
  -p 5432:5432 postgres:16-alpine

# 2. Point the app at it
echo "DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev" > .env.local

# 3. Install deps
npm install

# 4. Set a local admin password (12+ chars; input hidden, never printed)
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev \
  npm run admin:set-password

# 5. Tests, build, lint
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm test
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run build
npm run lint

# 6. Dev server
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run dev
```

## Production

- Railway project `zestful-empathy`, service `mood-board-booking`,
  domains `mood-board-booking-production.up.railway.app` and
  `portal.chromevaultstudios.dk`. Auto-deploy is on for `main`.
- Admin password is set directly against the production database via
  `railway ssh --service mood-board-booking` then
  `node scripts/set-admin-password.mjs` - never through a web route (there
  isn't one; this is deliberate, fail-closed).
- Calendar subscribe URL: log in as admin in the browser, then open
  `GET /api/admin/calendar-token` in the same session to get the current
  tokenized URL.
