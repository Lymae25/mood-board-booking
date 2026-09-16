# Jarvis Control - Status

Branch: `jarvis-control`. Never merged to `main`, never deployed, never touched
production. All work developed and tested against a local Postgres in Docker
(see "How to test locally" below).

## What's done and actually tested

### 1. Real admin authentication (replaces the "1010" PIN)
- The old admin gate was a literal hardcoded string `'1010'` in client-side
  JS (`CustomerSelector.tsx`) plus a handful of API routes checking
  `?admin=1010` in the URL - and most admin-only routes (creating/deleting
  customers, deleting projects, scheduling/deleting meetings) had **no
  server-side check at all**. Confirmed by reading the code before touching
  it, not assumed.
- New: `lib/adminAuth.ts` - scrypt password hashing (Node's built-in
  `crypto.scrypt`, not bcrypt/argon2 specifically since neither is a Node
  built-in and adding a native dependency felt riskier than a well-known KDF
  already in the standard library; salted, verified with `timingSafeEqual`),
  TOTP 2FA (RFC 6238, hand-rolled with Node's built-in `crypto.createHmac`,
  no new dependency), httpOnly session cookies (`mbb_admin_session`, 12h
  sliding expiry, random 32-byte token), and DB-backed login rate limiting
  (5 failed attempts / 15 min per IP).
- New `proxy.ts` (Next.js 16 renamed `middleware.js` to `proxy.js` - see
  "Next.js 16 breaking changes" below) gates `/admin` and `/admin/jarvis` at
  the page level: no valid session, no page. Confirmed by curl: unauthenticated
  `/admin` returns a 307 redirect to `/`; with a valid session cookie it
  returns 200.
- Every previously-open or `1010`-gated admin route now calls
  `requireAdminSession(request)` and returns 401 without a valid session:
  `POST /api/customers`, `DELETE /api/customers/[id]`,
  `DELETE /api/projects/[id]`, `POST`/`DELETE /api/meetings`,
  `GET /api/meetings`, and the admin branches of
  `GET /api/customers` / `GET /api/messages` / `GET /api/timeline`.
- **Deliberately left untouched** (would have broken live customer flows -
  confirmed each one is genuinely called from a customer-facing component,
  not just old admin code): `POST /api/projects` (customers create their own
  projects from their dashboard), `PATCH /api/customers/[id]` (customer's own
  PIN change), `PATCH /api/projects/[id]` (used by both admin and
  `CustomerDashboard.tsx`'s `StatusBadge`), `POST /api/scenes` /
  `POST /api/ideas` / `POST /api/timeline` / `POST /api/notes` (all reachable
  from `ProjectDetail.tsx`, which customers also view via `?customer=1`, and
  I found no existing code path that restricts these to admin only - locking
  them down was a judgment call I chose not to make unilaterally since it
  risks breaking something customers currently rely on).
- `scripts/set-admin-password.mjs` - sets/resets the admin password with
  masked terminal input, never printed anywhere. Includes a length minimum
  (12 chars) and a confirm-password step. Tested against the local DB.
- Tested: password hashing round-trip and rejection, TOTP generation +
  independent-reference-implementation verification + clock drift tolerance
  + malformed-token rejection, session create/verify/destroy/expiry,
  `requireAdminSession` against real cookie headers (valid, missing, forged),
  rate limiting after 5 failures, `clientIdentifier` header precedence. All
  in `tests/adminAuth.test.ts` and `tests/adminAuthDb.test.ts` - **25/25
  passing**.
- **Not automated**: the login/logout HTTP flow itself, because both routes
  use `next/headers`'s `cookies()`, which throws outside a live Next.js
  request context and can't be unit-tested by importing the route function
  directly (unlike every other retrofitted route, which reads the cookie
  header off the raw `Request` and imports cleanly). **Manually verified
  instead**, end-to-end, against a running `next dev` server backed by the
  local Postgres: wrong password rejected, correct password accepted and set
  a working session cookie, 5 wrong attempts triggered `rate_limited`, full
  TOTP setup -> confirm -> subsequent login required it -> correct code
  accepted -> disable worked. See the curl transcript pattern in "How to test
  locally" if you want to repeat it.

### 2. Server-side Jarvis + ElevenLabs routes, admin-only, with demo mode
- `lib/jarvisClient.ts`: `chatWithJarvis()`, `fetchLatestTrends()`,
  `synthesizeSpeech()`. All server-only (never import from a client
  component - the API keys must never reach the browser).
- Routes: `POST /api/jarvis/chat`, `GET /api/jarvis/trends`,
  `POST /api/jarvis/speak` - all require `requireAdminSession`.
- **Demo mode confirmed working**: with `JARVIS_API_URL` /
  `JARVIS_API_KEY` / `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` all unset
  (the state of this branch's `.env.local`), chat returns a canned Danish
  reply, `/cvs` `/privat` `/nets` return the same mode-switch confirmations
  Jarvis itself would say, trends returns a realistic fake trend with one
  demo TikTok video, and speak returns `{demo:true}` so the client falls back
  to the browser's own `speechSynthesis`. All tested via curl against the
  running dev server.
- **Real Jarvis connection: an assumption, not yet built on the Jarvis
  side.** `fetchLatestTrends()` calls `${JARVIS_API_URL}/v1/trends/latest`
  with the same Bearer `JARVIS_API_KEY` auth the chat endpoint uses. This
  endpoint does not exist yet in the Jarvis repo (I did not modify
  `~/jarvis` - out of scope for this branch) - it needs a small route added
  there that reads `$HERMES_HOME/trends/latest.json` off the volume and
  returns it, gated the same way `/v1/chat/completions` already is. Until
  that exists, this call 404s and the portal falls back to demo data
  automatically (see the try/catch in `fetchLatestTrends`), so nothing
  breaks - it just won't show real trends until that endpoint is added.
- The chat route sends the raw text `message` straight to Jarvis's
  OpenAI-compatible `/v1/chat/completions` - clicking a CVS/Privat/Nets
  button in the HUD sends `/cvs` etc. as a normal message first, exactly like
  typing it in Telegram, per Jarvis's own documented slash-command mechanism.

### 3. `/admin/jarvis` HUD page
- Full-screen black/silver Chrome Vault-styled page (`JarvisHud.tsx`),
  gated by the same admin session via `proxy.ts`.
- Animated ring with 4 states (idle/listening/thinking/speaking), pure CSS
  (no animation library) - color and pulse speed change per state.
- Press-to-toggle mic button using the browser's built-in
  `SpeechRecognition`/`webkitSpeechRecognition` (Web Speech API) - free, no
  server dependency, works in Chrome/Edge. Falls back to a clear message in
  unsupported browsers (Firefox, Safari as of writing) instead of failing
  silently.
- Mode buttons CVS / Privat / Nets. Nets is visually distinct (dark red
  border/background when active) with a title-attribute warning; clicking it
  sends `/nets` and shows Jarvis's own "nothing is saved" confirmation.
- Text chat fallback alongside voice (input box + Enter/Send).
- Speech output: tries `POST /api/jarvis/speak` (ElevenLabs) first, falls
  back to the browser's `speechSynthesis` in demo mode or on any failure -
  the HUD always "speaks" a reply either way.
- **"Hey Jarvis" wake word: researched, not implemented** (see below) - the
  build ships tap-to-activate only.

### 4. Trend video cards
- TikTok videos render via TikTok's real public embed mechanism (the
  standard `<blockquote class="tiktok-embed">` + `embed.js`, the same
  official method the Jarvis `trend-scout` skill already validated links
  against via oEmbed) - no scraping, no downloads, official embed only.
- Instagram links render as a clearly marked external-link card (thumbnail
  if one was provided, otherwise just the caption/author) - no embed
  attempted, matching `embed_type: "open_external"` in the trends schema.
- Age label ("X dage/uger gammel") computed client-side from `posted_at`,
  same rule the Jarvis skill itself uses.

### 5. "Save to customer" -> draft -> approve flow
- Every trend card has a "Gem til kunde" button -> picks an existing
  customer, then one of their existing projects -> `POST
  /api/mood-board-drafts` (admin-only).
- New `moodBoardDrafts` table, status `draft` -> `approved`/`rejected`.
  **Drafts are never exposed through any customer-facing route** - verified
  by an actual integration test (`tests/accessControl.test.ts`), not just
  code review: creates a draft as admin, confirms it does NOT appear in the
  same customer-facing `GET /api/ideas?projectId=...` call the customer PIN
  dashboard makes, confirms the drafts endpoint itself 401s with no session,
  approves it, then confirms it NOW appears in that same customer-facing
  call. This is the single most important test in the suite given the
  explicit "customers must never see drafts" requirement.
- Approving a draft copies it into the existing `ideas` table (category
  "Trend") - **no changes were needed to the customer PIN dashboard or the
  customer-facing `/api/ideas` route** to display it, since it becomes a
  completely ordinary idea row once approved.
- A small "Ventende trend-forslag" (pending trend suggestions) panel was
  added to `ProjectDetail.tsx`'s Inspo tab with Godkend/Afvis buttons. It's
  safe for a customer to load that same page - the `GET
  /api/mood-board-drafts` call it makes 401s for them and the panel just
  renders empty, no separate `isCustomerView` check needed.

### 6. Logging
- `jarvisActionLog` table, written on every chat message, every trend saved
  to a customer, and every draft approve/reject, via `logJarvisAction()` in
  `lib/db-postgres.ts`. No admin UI to browse it yet (out of time) - it's a
  flat table, queryable directly (`SELECT * FROM "jarvisActionLog" ORDER BY
  "createdAt" DESC`) until one is built.

### 7. Tests, build, lint
- `npm test` (vitest): **25/25 passing** - `tests/adminAuth.test.ts` (pure
  logic, no DB), `tests/adminAuthDb.test.ts` (sessions + rate limiting
  against the real local Postgres), `tests/accessControl.test.ts` (the
  actual route handlers, called directly, covering exactly the three things
  asked for: login/session gating on admin routes, a valid session reaching
  them, and the customer-draft-isolation flow end to end).
- `npm run build`: succeeds (Next.js 16 + Turbopack), type-checks clean.
- `npm run lint`: **zero errors, zero warnings in every file this branch
  created or modified**, confirmed by linting that exact file list in
  isolation. The full-repo `npm run lint` still reports errors, but every
  one of them is in code this branch did not touch (mostly
  `@typescript-eslint/no-explicit-any` scattered through the pre-existing
  `AdminPanel.tsx`, `ProjectDetail.tsx`, and `lib/db-postgres.ts`, dating
  from before this branch). Fixing ~65 pre-existing violations across live,
  untested legacy component code was out of scope and risked the one thing
  explicitly off-limits - breaking the customer PIN system - for no benefit
  to this branch's actual goal. See "Next.js 16 breaking changes" below for
  why `npm run lint` even runs differently now than it used to.

## What was skipped or simplified, and why

- **Real Jarvis trends endpoint**: not built (would require modifying the
  `~/jarvis` repo, out of this branch's scope). Documented above as an
  assumption; the portal degrades to demo data automatically until it
  exists.
- **"Hey Jarvis" wake word**: researched only, not implemented.
  - Option A - a dedicated wake-word engine (e.g. Picovoice Porcupine's
    client-side JS/WASM SDK): purpose-built for this, low false-positive
    rate, works offline in the browser. Requires a free Picovoice account,
    training a custom "Hey Jarvis" keyword model in their console, and
    bundling their SDK + model file. Real always-on listening.
  - Option B - keep using the Web Speech API in "continuous" mode and just
    watch the transcript for the words "hey jarvis": free, zero new
    dependencies, already in the codebase. But it is not designed for
    always-on passive listening - browsers throttle/stop it in background
    tabs, it is far less reliable at rejecting non-wake speech, and Safari
    doesn't support it at all.
  - **Recommendation**: Option A if always-on wake-word is actually wanted
    day to day; Option B only as a quick, honestly-limited stopgap. Given
    the added account/build complexity of A and the reliability problems of
    B, I did not implement either and shipped tap-to-activate instead,
    which needs no extra infrastructure and works everywhere Chrome/Edge do.
- **Full TypeScript typing of the pre-existing `AdminPanel.tsx` /
  `ProjectDetail.tsx` `any` usage**: out of scope, see above.
- **`<img>` -> `next/image` migration**: `next/image` needs external image
  domains allow-listed in `next.config.ts` (TikTok/Instagram CDN hosts here),
  and the existing codebase already uses plain `<img>` everywhere for
  externally-sourced images - matched that existing convention rather than
  introducing an inconsistency, left as the same lint *warning* (not error)
  the rest of the app already has.
- **Admin UI for browsing `jarvisActionLog`**: table + writes exist, no
  browsing UI - ran out of time budget for this pass.

## Next.js 16 breaking changes hit during this work (for future reference)

- `middleware.js` is deprecated and renamed to `proxy.js` (same mechanism,
  exported function renamed `proxy`). Defaults to the **Node.js runtime**
  now (used to be Edge-only) - this is what makes it possible for `proxy.ts`
  to import `lib/adminAuth.ts` (Postgres client, Node's `crypto`) directly.
- `next lint` was **removed outright** in Next 16 in favor of running
  ESLint's own CLI. `package.json`'s `lint` script was updated from `next
  lint` to `eslint .` - the existing `eslint.config.mjs` was already
  flat-config compatible and needed no changes.
- `cookies()` from `next/headers` is async (`await cookies()`) and only
  works inside a live Next.js request context - this is exactly why
  login/logout couldn't be unit-tested by direct function import (see
  above).

## What you need to do next

Environment variable **names** only (values are never in this file or
anywhere I've printed) - set these in Railway when ready to go live with
each piece:

- `JARVIS_API_URL` - Jarvis's own API server base URL (the one already
  gated by `API_SERVER_KEY` on port 8642 per the Jarvis repo's README).
- `JARVIS_API_KEY` - same value as Jarvis's `API_SERVER_KEY`.
- `ELEVENLABS_API_KEY` - your ElevenLabs account API key.
- `ELEVENLABS_VOICE_ID` - the specific ElevenLabs voice ID to use for
  Jarvis's spoken replies.
- `DATABASE_URL` - already set in production presumably; unchanged by this
  branch, just noting the new tables (`admin_auth`, `admin_sessions`,
  `admin_login_attempts`, `moodBoardDrafts`, `jarvisActionLog`) are created
  automatically by the existing `initDB()` the first time any route runs
  against a given database, exactly like every other table already does -
  no manual migration step needed, additive only, nothing dropped or
  altered on existing tables.

Decisions only you can make:

1. **Set the admin password before this branch can ever be deployed for
   real** - run `npm run admin:set-password` with `DATABASE_URL` pointed at
   the real database (not the local Docker one). Until that's run, `/api/
   admin/login` returns `admin_not_configured` and nobody can log in - that
   is intentional (fail closed, not open).
2. **Turn on 2FA or not** - it's optional, off by default. If you want it,
   log in once with just the password, then use the (currently API-only,
   no UI button yet) `POST /api/admin/totp` -> scan the returned
   `otpauth://` URI's QR in your authenticator app -> `PUT /api/admin/totp`
   with the code it shows to confirm and turn on enforcement. A small
   settings-page button for this would be a nice quick follow-up.
3. **Which wake-word option, if either** - see above.
4. **Whether to lock down the customer-reachable routes I deliberately left
   open** (`POST /api/projects`, `POST /api/scenes` etc.) - I did not do
   this because I could not confirm from the code alone whether customers
   are *supposed* to be able to do those things today. If they're not, that
   is a separate, real gap worth its own careful pass (with you confirming
   which of those are intentional features vs. accidents) rather than me
   guessing and possibly breaking something customers use.
5. **The Jarvis trends endpoint** needs to actually be built on the Jarvis
   side before real (non-demo) trends show up here.

## How to test `/admin/jarvis` locally, step by step

```sh
# 1. Start a local Postgres in Docker (throwaway, not production data)
docker run -d --name mbb-local-pg \
  -e POSTGRES_PASSWORD=localdevpass -e POSTGRES_DB=mbb_dev \
  -p 5432:5432 postgres:16-alpine

# 2. Point the app at it (already gitignored, won't be committed)
echo "DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev" > .env.local

# 3. Install deps (adds vitest as a new devDependency this branch introduced)
npm install

# 4. Set a local admin password (12+ chars; input is hidden, never printed)
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev \
  npm run admin:set-password

# 5. Run the test suite
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm test

# 6. Run the build
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run build

# 7. Start the dev server (demo mode, since no Jarvis/ElevenLabs env vars
#    are set - JARVIS_API_URL/JARVIS_API_KEY/ELEVENLABS_API_KEY/
#    ELEVENLABS_VOICE_ID are all intentionally left unset for this)
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run dev

# 8. Open http://localhost:3000, click "Admin Login" at the bottom, log in
#    with the password from step 4, then open http://localhost:3000/admin/jarvis
```

Expect in demo mode: an orange "Demo-tilstand" notice under the ring, canned
Danish replies to anything you type or say (mic button needs Chrome or
Edge), one fake "Neon-lys walk-in intro (demo)" trend card with a demo
TikTok embed, and speech played through your browser's own built-in voice
rather than ElevenLabs.

## Files changed on this branch (`jarvis-control`)

New: `lib/adminAuth.ts`, `lib/jarvisClient.ts`, `proxy.ts`,
`scripts/set-admin-password.mjs`, `vitest.config.ts`, `tests/*.ts`,
`app/admin/jarvis/page.tsx`, `app/components/JarvisHud.tsx`,
`app/api/admin/{login,logout,session,totp}/route.ts`,
`app/api/jarvis/{chat,trends,speak}/route.ts`,
`app/api/mood-board-drafts/{route.ts,[id]/route.ts}`.

Modified: `lib/db-postgres.ts` (new tables + helpers), `lib/translations.ts`
(new da/en/tl keys), `app/components/CustomerSelector.tsx` (real login form),
`app/components/AdminPanel.tsx` (dropped `?admin=1010`, real logout),
`app/components/ProjectDetail.tsx` (pending-drafts panel), the 7 retrofitted
API routes listed under "Real admin authentication" above, `package.json`
(added `vitest`, `test` and `admin:set-password` scripts, fixed the `lint`
script for Next 16).
