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

---

# Del C: Jarvis control panel v2 (branch `jarvis-control-v2`, off `main`)

Written during the same overnight autonomous task as `~/jarvis`'s Del A/B
(see that repo's `MIGRATION-PLAN.md` and `STATUS.md`). **Not merged, not
deployed** - `main` and production are untouched.

## What this branch is

An older branch, `jarvis-control` (predates the admin-login/cross-customer
security work now live on `main`), added an admin-only Jarvis chat/trends
HUD, "save trend to customer" drafts, and an ElevenLabs speech route - but
on top of the OLD hardcoded-`1010` auth. Porting it wholesale would have
reintroduced that. Instead, this branch is `main` (with the current, real
security) plus only the parts of `jarvis-control` that were genuinely new
Jarvis functionality:

- `app/admin/jarvis/page.tsx`, `app/components/JarvisHud.tsx` - the HUD
  itself (chat, voice input/output, trending videos grid, save-to-customer
  modal). Ported unchanged - it already called the current-shaped API
  (`/api/jarvis/chat`, `/trends`, `/speak`, `/api/mood-board-drafts`) and
  already used the real trend-scout JSON schema (see below), so nothing in
  it needed to change.
- `app/api/jarvis/{chat,speak,trends}/route.ts`, `app/api/mood-board-drafts/
  {route.ts,[id]/route.ts}` - ported unchanged. Each already called
  `requireAdminSession()` from `lib/adminAuth.ts`, which turned out to be
  **the same function signature** the current, real admin-auth system on
  `main` already exports - so these routes work correctly against the new
  security with no changes at all.
- `lib/db-postgres.ts` - added the `moodBoardDrafts` and `jarvisActionLog`
  tables plus their CRUD functions (`createMoodBoardDraft`,
  `getMoodBoardDrafts`, `approveMoodBoardDraft`, `rejectMoodBoardDraft`,
  `logJarvisAction`, `getJarvisActionLog`). Did **not** re-add the
  `initAdminAuthSchema()` call `jarvis-control` had here - `main` already
  calls it.
- `app/components/ProjectDetail.tsx` - added the "pending trend drafts"
  panel on the Inspo tab (admin-only, approve/reject buttons), gated on
  `!isCustomerView` so a customer's browser never even requests the
  admin-only drafts endpoint (the endpoint's own 401 is the actual
  security boundary; skipping the fetch is just avoiding a pointless
  network call).
- `app/components/AdminPanel.tsx` - added a "Jarvis" link next to the
  logout button, the entry point into `/admin/jarvis` (there wasn't one
  in `jarvis-control` either - it only had the page itself).
- `lib/translations.ts` - added the `jarvisHud` keys (da/en/tl) the HUD
  component needs.

**Explicitly NOT ported** (all superseded by the current, stronger security
on `main` - re-adding them would have reintroduced the `1010`-era auth or
duplicated logic `main` already has correctly): `jarvis-control`'s own
`lib/adminAuth.ts`, `proxy.ts`, `scripts/set-admin-password.mjs`, and its
changes to `CustomerSelector.tsx` / `AdminPanel.tsx`'s login flow /
`app/api/{customers,meetings,messages,timeline,projects}` admin-gating -
checked each one directly against `main`'s current version first;  all of
them already have equivalent or stronger gating (`requireAdminSession`/
`requireOwnerOrAdmin`) than `jarvis-control`'s old version did.

## Trends: real schema, real (not-yet-live) endpoint

`lib/jarvisClient.ts`'s trends demo data already matched the real
trend-scout schema (`trends[].videos[]` with `url`, `platform`, `title`,
`author`, `thumbnail_url`, `embed_type`, `posted_at`, `verified_at`, plus
`suggested_client` and `usage_idea` on the trend itself) - verified
directly against `~/jarvis/skills/social-media/trend-scout/SKILL.md`'s
schema, field for field. What changed:

- Added `trendsConfigured()`, separate from `jarvisConfigured()` (chat).
  Del B's trends endpoint (`~/jarvis`, branch `trends-endpoint`) is its own
  service on its own internal port (8643), not a route on the chat API's
  port 8642 - so it has its own base URL and bearer key:
  `JARVIS_TRENDS_URL` + `JARVIS_TRENDS_API_KEY` (set the latter to
  whatever Jarvis's `API_SERVER_KEY`/`JARVIS_TRENDS_API_KEY` actually is -
  see `~/jarvis`'s README, "Fase 5B").
- `fetchLatestTrends()` now calls `${JARVIS_TRENDS_URL}/trends/latest`
  (Del B's actual route) instead of the old, never-built `/v1/trends/
  latest` guess.
- **Demo mode when unset:** neither variable is set in this branch's test
  environment, by design - confirmed via the test suite that
  `GET /api/jarvis/trends` returns `demo: true` and the same demo data
  shape as the real schema.
- **Not live yet:** Del B is built and tested locally in `~/jarvis` but not
  merged/deployed there, and the two Railway projects can't reach each
  other yet either way (see `MIGRATION-PLAN.md`, private networking
  section) - so this stays in demo mode until both of those happen.

## Tests, build, lint

- **15 new tests** (`tests/jarvisControl.test.ts`), all passing, run
  against the same real local Postgres (`mbb-local-pg`) as the rest of the
  suite:
  - Every Jarvis route (`chat`, `speak`, `trends`, both `mood-board-drafts`
    routes) returns `401` with no session.
  - A valid admin session reaches all of them and gets demo-mode responses
    (chat/speak/trends), including a field-by-field check that the demo
    trends payload has every field Del C's spec named
    (`suggested_client`, `usage_idea`, and all 8 video fields).
  - **Customers can never see drafts** - a real customer session against
    `GET /api/mood-board-drafts` still gets `401`, even for their own
    project.
  - **Save-to-customer**: admin `POST`s a draft, it shows up scoped to its
    project.
  - **Approve**: copies the draft into `getIdeas(projectId)` (the same
    customer-visible ideas table the PIN dashboard already reads) and it
    drops out of the pending list.
  - **Reject**: drops out of the pending list, does NOT create an idea.
  - A customer session cannot approve or reject a draft either (`401`).
  - `npm test` overall: **54/54 passing** (39 pre-existing + 15 new).
- `npm run build`: succeeds, all new routes listed in the route manifest
  (`/admin/jarvis`, `/api/jarvis/{chat,speak,trends}`,
  `/api/mood-board-drafts[/[id]]`).
- `npm run lint`: compared file-by-file against `main`'s own lint baseline
  (152 problems: 92 errors, 60 warnings) rather than just eyeballing the
  total. This branch adds exactly **zero new errors** and **3 new
  warnings**, both matching pre-existing, untouched patterns elsewhere in
  this codebase, not a new category of issue:
  - 1× `@next/next/no-img-element` in the new `JarvisHud.tsx` (plain
    `<img>` for an Instagram thumbnail) - same warning already exists
    untouched on 4 other components (`FileUploader.tsx`, `PinScreen.tsx`,
    `ProjectDetail.tsx`, `SceneFlowchart.tsx`).
  - 2× `@typescript-eslint/no-unused-vars` in `lib/db-postgres.ts`'s two
    new functions' `catch (e) { return [] }` - identical to the other 17
    already-present instances of the exact same pattern in that file.
  - `ProjectDetail.tsx`'s pre-existing `any`/unescaped-quote/exhaustive-deps
    issues are unchanged in count - confirmed by diffing line-by-line
    against `main`, not just re-running lint and eyeballing a smaller
    number.
- Manually smoke-tested against a local `next dev` (same local Postgres):
  `GET /admin/jarvis` with no session redirects (`307`), `GET /api/jarvis/
  trends` with no session returns `401` - both against the actual running
  server, not just the route handler in isolation.

## What you need to decide/do

- Nothing merges or deploys on its own. When you're ready to actually wire
  the two together: merge `trends-endpoint` in `~/jarvis` first, deploy it,
  then set `JARVIS_API_URL`/`JARVIS_API_KEY` (chat) and `JARVIS_TRENDS_URL`/
  `JARVIS_TRENDS_API_KEY` (trends) here - both fall back to demo mode
  individually if only one pair is set.
- `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` are optional - unset, the HUD
  falls back to the browser's own `speechSynthesis` (confirmed in
  `JarvisHud.tsx`'s `speak()`), so voice output works locally with zero
  extra setup.
- Del D (calendar button, Jarvis log admin view) is a separate, later
  branch (`calendar-button`) and the log viewer, per the original task
  ordering - not started as part of this branch.

## How to test this branch locally

Same setup as the section above (`mbb-local-pg`, `.env.local` with
`DATABASE_URL`), then:

```sh
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm test
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run build
npm run lint
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run dev
# then, logged in as admin in the browser: open /admin/jarvis
```

With no `JARVIS_API_URL`/`JARVIS_TRENDS_URL` set, `/admin/jarvis` is fully
usable in demo mode - chat replies, demo trend cards, and save-to-customer
all work against the local database with zero real credentials.
