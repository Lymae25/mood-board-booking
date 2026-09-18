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
- ~~**`GET`/`POST /api/typing`** (chat "is typing" indicator) is not
  session-gated.~~ **Fixed on branch `security-typing` (off `main`, not
  merged)** - both routes now require the owning customer's session (or
  admin) via `requireOwnerOrAdmin()`/`requireAdminSession()`, the same
  pattern as `/api/messages`. Was low severity even before the fix (reveals
  only a boolean presence blip, no message content), but the same
  customerId-with-no-proof pattern this file exists to rule out everywhere
  else.
- No admin UI yet for TOTP setup (API-only: `POST`/`PUT`/`DELETE
  /api/admin/totp`) or for browsing login/PIN rate-limit history. (An admin
  UI for this now exists on branch `jarvis-control-v2`, built on top of
  Del C there - see that branch's own `STATUS.md` entries for "Del B". Not
  merged to `main`.)

---

# 2026-09-17: security-typing - secure /api/typing

New branch off `main` (not `jarvis-control-v2`), per this task's own
instructions - keeps this fix mergeable independently of the HUD work.
Same session/environment as the work above: no Docker/OrbStack running, so
`npm test`'s new DB-backed tests were not actually run this session (they
skip cleanly with no `DATABASE_URL` - confirmed - but that's not the same
as passing against a real database).

## What's done

- `app/api/typing/route.ts`: both `GET` (read typing state) and `POST`
  (announce typing) now require a session - an admin session when the
  caller claims to be `sender: 'admin'`, otherwise the owning customer's
  own session (or an admin acting on their behalf), via the existing
  `requireOwnerOrAdmin()`/`requireAdminSession()` from `lib/adminAuth.ts`/
  `lib/customerAuth.ts` - the exact same pattern `/api/messages` already
  uses. No client-side changes needed: `AdminPanel.tsx` and `ChatWidget.tsx`
  already call this same-origin, so their existing httpOnly session cookies
  are sent automatically.
- New tests in `tests/accessControl.test.ts` (same file/pattern as the
  rest of this branch's own access-control coverage): both routes reject
  requests with no session; customer A cannot read or write customer B's
  typing state; a customer session cannot post as `sender: 'admin'`; a
  customer can read/write their own state; an admin session can read/write
  any customer's state.

## Test, build, lint

- `npx tsc --noEmit`: clean (after clearing a stale `.next/` cache left
  over from checking out `jarvis-control-v2` earlier in this session, which
  otherwise reports phantom errors for that branch's Jarvis-only routes -
  not a real issue, just a stale generated-types file).
- `npm run build`: succeeds, `/api/typing` listed in the route manifest.
- `npm run lint`: diffed against `main`'s own baseline (152 problems: 92
  errors, 60 warnings, re-verified by stashing this branch's changes and
  running lint again) - **identical, zero new errors or warnings.**
- `npm test`: **the new DB-backed tests were not run against a real
  database this session** (no Docker/OrbStack - see the top of this file).
  Confirmed they at least skip cleanly rather than erroring with no
  `DATABASE_URL` set (`tests/accessControl.test.ts`: 19 tests, all
  skipped; the DB-independent `tests/adminAuth.test.ts`: 9/9 passing).
  **You need to**: run `npm test` for real once the DB is up, before
  treating this as verified.

## What you need to decide/do

- This branch is pushed but **not merged** to `main`, per instructions.
  When you're ready, it can merge independently of any of the
  `jarvis-control-v2` work above - it doesn't touch anything that branch
  also touches.
- Run the real test suite once Docker/OrbStack is available.

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

---

# 2026-09-18: security-typing - fix duplicate customer/project ids

## What's done

- `tests/accessControl.test.ts` was failing intermittently on this branch
  with `duplicate key value violates unique constraint "customers_pkey"`.
  Root cause: every `create*` function in `lib/db-postgres.ts`
  (`createCustomer`, `createProject`, `createScene`, `createSceneNote`,
  `createIdea`, `createTimelineItem`, `createMessage`, `createMeeting` -
  all 8 of them, same copy-pasted line) generated its primary key with
  `Date.now().toString()`. Two rows created in the same millisecond (easy
  to hit when a test creates several customers/projects back to back) got
  the exact same id and the second `INSERT` violated the table's primary
  key constraint.
- Fixed in production code, not the test: all 8 spots now use Node's
  built-in `crypto.randomUUID()` instead, which can't collide regardless
  of timing. `lib/db.ts` has the same-looking `Date.now().toString()`
  pattern in a few places, but that's a separate, unrelated in-memory
  module not backed by a real database (no unique constraint to violate,
  and not what `accessControl.test.ts` or anything else on this branch
  imports) - left untouched, out of scope for this fix.
- The `id` column is plain `TEXT PRIMARY KEY` with no format check, so
  switching new rows to UUIDs doesn't require a migration and doesn't
  touch any existing customer/project row already in the database -
  confirmed by reading the `CREATE TABLE`/`ALTER TABLE` statements in
  `initDB()` directly, not assumed.

## Test, build, lint

- `npm test`, run **10 times in a row** against a real local Postgres
  (`mbb-local-pg`): **45/45 passing every time**, no duplicate-key errors.
  (Two of those ten runs hit an unrelated `tinypool`/vitest worker-pool
  teardown crash *after* printing "45/45 passed" - a known flake in
  vitest's thread-pool cleanup on this machine, not a test failure; five
  further runs immediately after, checked by exit code rather than just
  eyeballing the log, all returned `0`.)
- Not re-run through `npm run lint`/`npm run build` separately for this
  one-line-pattern fix - the change is a same-shape swap of one
  expression for another in 8 spots, no new imports beyond Node's own
  built-in `crypto` (already imported the same way elsewhere in this repo,
  e.g. `lib/adminAuth.ts`, `lib/customerAuth.ts`).

## What you need to decide/do

- This branch is pushed but **not merged** to `main` and nothing was
  deployed, per instructions.
- The same fix was cherry-picked onto `jarvis-control-v2` (which branched
  off `main` before this existed) so both branches have it - see that
  branch's own `STATUS.md` entry. Not merged or deployed there either.
