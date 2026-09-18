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

## Del D.2: admin view of the Jarvis log (same branch)

Added on this same branch, not a separate one - the task description put
this under "Del D... på jarvis-control-v2".

- `app/api/jarvis/log/route.ts` - `GET`, admin-only, returns
  `getJarvisActionLog()` (already added in Del C, above), newest first,
  `?limit=` capped to 500.
- `JarvisHud.tsx` - a collapsible "Aktivitetslog" section under the trends
  grid, lazy-loaded on first expand (not on page load - most admin visits
  won't open it). Shows action, detail and timestamp for every logged
  chat turn, trend save, and draft approval/rejection.
- **2 new tests**: `GET /api/jarvis/log` requires admin (`401` without a
  session), and returns logged entries newest-first with a real admin
  session. `npm test`: **56/56 passing**. Build and lint re-run clean
  (same zero-new-errors, pattern-consistent-warnings-only result as Del C
  above - re-verified, not assumed, after this addition).

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

---

# Jarvis HUD redesign (same branch, `jarvis-control-v2`)

A full visual/interaction rebuild of `/admin/jarvis` into a holographic
cyber-HUD (hexagon core, concentric rings, circular menu, a gold three.js
hologram for content). **100% original** - no Marvel/Iron Man/Stark
Industries names, logos, or arc-reactor shapes anywhere; everything is
drawn in SVG, CSS and three.js. **Local only** - not merged, not deployed,
no Railway changes.

## What's done and tested

**Structure** - `app/components/JarvisHud.tsx` is now a thin orchestrator
over `app/components/jarvis-hud/`: `HexCore.tsx` (SVG core + 6 rings),
`CircularMenu.tsx` (8-way mode/hologram menu), `Panel.tsx`/`Panels.tsx`
(the cut-corner status/clock/weather/activity/log panels), `BottomBar.tsx`
(chat input + mic), `GoldHologram.tsx` (three.js wireframe globe) +
`GoldHologramContent.tsx` (the HTML panels floating over it),
`SaveModal.tsx`, `hooks.ts` (mic volume, voice audio analysis, reduced
motion), and `theme.ts` (the two color tracks). All admin auth stays
exactly as Del C left it - `requireAdminSession()` gates every route,
`AdminNav`/`proxy.ts` gate the page, nothing here touches that.

1. **Two color tracks** - cyan/ice (`#00d9ff`/`#4fc3f7`/`#0a84ff`) for
   Jarvis itself, gold/amber (`#ffd54f`/`#ffb300`/`#ff8f00`) for anything
   Jarvis shows (trends, customers, calendar). Near-black navy background
   (`#02060d`) with a drifting grid and a scanline sweep. JetBrains Mono
   via `next/font/google` (self-hosted at build time, no runtime Google
   Fonts request). Cut-corner panels with corner brackets throughout.
2. **Hexagon core** - outer/inner hexagon wireframe, center dot, 6
   concentric rings (dashed circle, dense tick ring, segmented arcs +
   ticks, hex-code ring, sparse arcs, thin dashed outer ring), each
   rotating at its own speed/direction. Respects `prefers-reduced-motion`
   (all animation classes are gated behind `:not(.jh-core-reduced)`, and
   the gold hologram's rotation/materialize skip straight to their end
   state when reduced motion is on).
3. **Four core states**: IDLE (slow breathing pulse), LISTENING (blue
   pulse driven by real mic RMS via `getUserMedia` + `AnalyserNode`,
   mic only ever starts on an explicit click, with a visible green
   button state while active), THINKING (a rotating scanner sweep),
   SPEAKING (see below). `hudState` is *derived*, not stored
   (`mic.listening ? 'listening' : sending ? 'thinking' : voice.speaking
   ? 'speaking' : 'idle'`) - no manual state juggling, no races.
4. **Speaking, audio-reactive**: real mode decodes ElevenLabs' base64 mp3
   through `AudioContext.decodeAudioData` into an `AnalyserNode`, splits
   the frequency spectrum into low/mid/high thirds every animation frame,
   and feeds that into the core (low band scales the outer hexagon, mid
   band the inner wireframe, high band drives sparkle-particle opacity).
   `lib/jarvisClient.ts`'s `synthesizeSpeech()` now calls ElevenLabs'
   **with-timestamps** endpoint first (character-level alignment data,
   for future syllable-precise pulsing), falling back to the plain TTS
   endpoint if that ever fails, so speech never breaks outright. Demo mode
   (no `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID`) has no analysable audio
   graph for the browser's own `speechSynthesis`, so it pulses on
   `onboundary` (word-boundary) events instead, exactly as the brief
   describes. `/api/jarvis/speak` now always returns JSON
   (`{audioBase64, alignment, demo}`) instead of raw audio bytes, so the
   client can decode+analyse either way.
5. **Circular menu** - CVS/PRIVAT/NETS/TRENDS/KUNDER/KALENDER/CHAT/SYSTEM
   around the core. CVS/PRIVAT/NETS send `/cvs`, `/privat`, `/nets` to
   Jarvis exactly as before; NETS is visibly red with a warning tooltip
   ("ingen kunde- eller persondata"). TRENDS/KUNDER/KALENDER/SYSTEM open
   the gold hologram to that tab (toggle - click again to close); CHAT
   closes the hologram and focuses the text input.
6. **Panels**: top-left "JARVIS OS" (version, user "Lymae", hex-framed
   avatar); left "System status" (Jarvis/portal online dots, response-time
   sparkline, customer/project/trends-this-week counts); left-bottom
   "Seneste handlinger" (a live-updating terminal list from the existing
   `/api/jarvis/log`, Del D.2); right "København" (live clock+date, and
   real weather - see below); right-bottom "I dag" (today's meetings from
   `/api/meetings`, unread customer message count from `/api/messages`);
   bottom bar (chat input + mic + "CHROME VAULT STUDIOS").
7. **Weather** - new `lib/jarvisWeather.ts` + admin-gated
   `GET /api/jarvis/weather`, calling Open-Meteo (no API key) for
   Copenhagen: temperature, feels-like, wind, humidity, sunrise/sunset,
   tomorrow's forecast. Kept behind an admin route rather than fetched
   directly from the browser, matching "all data via existing routes with
   an admin session" - falls back to a fixed, clearly-marked reserve value
   if Open-Meteo is unreachable (network-down safety, not a demo-mode
   concept - Open-Meteo needs no key at all).
8. **Status ping** - new `checkJarvisStatus()` in `lib/jarvisClient.ts` +
   admin-gated `GET /api/jarvis/status`, pinging Jarvis's own documented
   `/health` path (see `~/jarvis` README, Fase 2) rather than running a
   real, expensive chat turn. Demo mode (no `JARVIS_API_URL`) returns a
   realistic-looking synthetic response-time history for the sparkline,
   not a flat line.
9. **Gold hologram** - `three.js` (added as a real dependency, imported
   directly, not a `<script>` tag - `@types/three` pinned to the exact
   matching version since three.js ships no bundled types). A wireframe
   sphere (a plain `SphereGeometry` wireframed already reads as
   latitude/longitude lines), a sparser outer sphere for depth, a glowing
   core, ~90-220 additive-blended sparkle particles (fewer on mobile),
   slow auto-rotation, and manual drag-to-rotate via pointer events (no
   `OrbitControls` import needed for something this simple). Opens/closes
   with a materialize/dematerialize scale+opacity tween. A dark backdrop
   (`rgba(2,6,13,0.8)`) fades in behind it so the gold content reads
   clearly over the cyan HUD underneath. The trend/customer/calendar/
   system content itself renders as HTML panels on top (not part of the
   3D scene) - `GoldHologramContent.tsx`.
10. **"Hvilken video vil du se først?"** - shown above the trend cards in
    the hologram when trends are loaded, matching the brief.
11. **Tests**: `tests/jarvisControl.test.ts` extended with the two new
    routes - `GET /api/jarvis/weather` and `GET /api/jarvis/status` both
    require admin (`401` without a session), `status` returns realistic
    demo data with a sparkline history, `weather` returns a well-shaped
    payload whether Open-Meteo answered or the fallback kicked in. The
    existing admin-gating/customers-never-see-drafts/save-to-customer/
    approve-reject tests from Del C all still pass unchanged (the speak
    route's new JSON-always contract didn't break its existing demo-mode
    test). **60/60 tests passing.**
12. **Build**: succeeds, all new routes listed in the route manifest.
13. **Lint**: compared file-by-file against `main`'s own baseline (152
    problems: 92 errors, 60 warnings), not just the total. This work adds
    **zero new errors** and exactly 4 new warnings, all matching
    pre-existing, untouched patterns elsewhere in the codebase: one
    `@next/next/no-img-element` in `GoldHologramContent.tsx` (already
    exists untouched on 4+ other components), one
    `react-hooks/exhaustive-deps` on the fetch-on-mount effect in
    `JarvisHud.tsx` (already exists untouched on `ProjectDetail.tsx`'s
    identical pattern), and the 2 `no-unused-vars` in `lib/db-postgres.ts`
    that were already documented from Del C. Two of React's newer, very
    strict "purity"/"set-state-in-effect" rules fired on legitimate
    patterns (a live clock's initial tick, `matchMedia`'s initial read, a
    "filter a fetched list against now" computation) - suppressed with
    targeted `eslint-disable-next-line` comments, the same pattern the
    pre-existing `JarvisHud.tsx` already used for its own fetch-on-mount
    effect before this rewrite.
14. **Screenshots** (`docs/jarvis-hud-*.png`, all 6 requested) captured
    with a real Playwright browser against a real running `next dev` +
    local Postgres, logged in as a real (freshly-generated, local-only
    test) admin: `hvile` (idle), `lytter` (mic clicked, real
    `getUserMedia` with Chromium's fake-device flag), `taenker`
    (thinking, chat route artificially delayed to give a real window to
    capture it), `taler` (speaking, demo-mode word-boundary pulsing),
    `hologram-trends` (the gold globe + trend cards), `mobil` (420px
    viewport, panels stacked below the core as specified). The capture
    script is committed at `scripts/capture-hud-screenshots.mjs` so these
    can be regenerated later.

## What failed and why (found and fixed during this work)

- **Circular menu buttons off-screen/overlapping.** The initial radius
  math (`radius * cos(angle) / 4`, with `radius` passed as a *pixel*
  value) put the top item (CVS) at -20% of the container's height -
  hidden behind the fixed admin nav bar - and the bottom item (KUNDER) at
  +120%, overlapping the page content below. Fixed by switching to a
  plain percentage radius (`radiusPercent`, ~37) computed directly against
  the container's own 0-100% box, verified by screenshot before/after.
- **Mobile layout overflowed the viewport.** Root cause, found by
  inspecting computed styles/bounding boxes directly rather than guessing:
  `.jh-layout`'s `align-items: flex-start` (chosen for row-mode's
  "top-align panels of different heights") only affects the *cross axis* -
  which becomes **width** once the mobile media query flips
  `flex-direction` to `column`. With `flex-start`, children never stretch
  to fill that width and instead take their own max-content size; `HexCore`
  additionally had a **hardcoded 560px `size` prop** ignoring its
  container entirely, compounding the overflow. Fixed both: `align-items:
  stretch` inside the mobile media query, and `HexCore` now always fills
  its parent (`width: 100%; height: 100%`, no size prop) - the SVG's own
  `viewBox` handles scaling.
- **Demo TikTok embeds showed TikTok's real cookie-consent chrome for a
  fake video ID.** The demo trend data's TikTok URL isn't a real video, so
  handing it to the real `tiktok-embed.js` (loaded for the live-data case)
  produced TikTok's actual embed UI trying and failing to load it. Fixed:
  demo trends now render a clearly-labelled placeholder card instead of a
  real embed attempt.
- **An early Playwright test run audibly played synthesized speech through
  the machine's speakers.** Chromium's `speechSynthesis` apparently routes
  to the real OS TTS engine even when launched normally, and my first
  screenshot/video script used the demo "speaking" flow (real
  `window.speechSynthesis.speak()`) without muting anything. **Fixed
  immediately upon being told**: the committed
  `scripts/capture-hud-screenshots.mjs` launches Chromium with
  `--mute-audio` *and* fully stubs `window.speechSynthesis` before any
  page loads (synthetic `onboundary`/`onend` events, no real TTS call at
  all) - belt and suspenders. The local dev server and every test browser
  were closed as soon as each test step finished, per your instruction.
  **The optional screen recording (`docs/jarvis-hud-taler.mp4`/`.gif`)
  was skipped entirely** rather than risk this again - the six PNG
  screenshots (including `jarvis-hud-taler.png`, captured with the
  stubbed, silent speech path) cover the same "speaking" state visually.
  If you want the video, it can be recorded safely now with the fixed
  script (`recordVideo` on the context, same audio stubs already in
  place) - just say so.
- **A pre-existing hydration warning** ("server rendered HTML didn't
  match the client", around `AdminNav`'s `<style>` tag) appears on every
  screenshot as a small dev-mode-only "1 Issue" badge. Confirmed via `git
  diff main -- app/components/AdminNav.tsx` (no output - completely
  unchanged) that this is **pre-existing, not introduced by this work**,
  and it comes from `AdminNav`'s own `useState(readIsAdmin)` lazy
  localStorage read (a well-known SSR/CSR mismatch pattern) - it affects
  every page that uses `AdminNav` (also `ProjectDetail.tsx`), not just
  this one. React just regenerates the tree client-side; nothing breaks
  functionally, and it's invisible in a production build. Left alone as
  out of scope for a HUD redesign task - flagging here rather than
  silently leaving it unmentioned.

## What you need to decide/do

- Nothing deploys or merges on its own, same as Del C/D.
- The gold hologram's content (trends/customers/calendar/system) all pull
  from the same admin-gated routes as before - no new data-access
  decisions needed here beyond what Del C already established.
- If you want the optional `.mp4`/`.gif` speaking demo after all, it's
  safe to record now (see above) - just ask and it'll use the same muted,
  stubbed script.
- Consider (separately, out of scope here) whether the pre-existing
  `AdminNav` hydration warning is worth a real fix at some point - it's
  cosmetic-only today.

## How to see it locally

```sh
# 1-4: same local Postgres + admin password setup as the rest of this file
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm test
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run build
npm run lint
DATABASE_URL=postgres://postgres:localdevpass@localhost:5432/mbb_dev npm run dev
# then, logged in as admin in the browser: open /admin/jarvis

# To regenerate the docs/ screenshots yourself (dev server must be running):
LOCAL_ADMIN_PASSWORD=<your local test password> node scripts/capture-hud-screenshots.mjs
```

No `JARVIS_API_URL`/`JARVIS_API_KEY`/`ELEVENLABS_API_KEY`/
`ELEVENLABS_VOICE_ID` needed - the whole HUD, including chat, trends, and
the gold hologram, works fully in demo mode with realistic test data.

---

# 2026-09-17: Del A - HUD-polish på jarvis-control-v2

Autonomous session (usage limit reset mid-task; picking up from the last
committed state, `08a6b6b`). Working through Del A → D in order per the
task instructions, noting blockers here rather than stopping. **Local
only, still not merged or deployed.**

## Environment note (applies to this whole session)

**Docker/OrbStack was not running** at the start of this session
(`docker info` failed: `dial unix .../docker.sock: connect: no such file or
directory`). Per instructions, OrbStack was **not** started. This means:
- `mbb-local-pg` could not be started, so **no test suite runs, no `next
  dev` server, and no new screenshots could be produced this session.**
- All work below was written and verified via `npx tsc --noEmit`, `npm run
  build`, and `npm run lint` only - all three pass (see below) - but not
  exercised against a running server or the real test suite.
- **You need to**: start OrbStack yourself, then `docker start mbb-local-pg`
  (or `docker run` it fresh per the "How to test locally" section above if
  it doesn't exist yet), then run `npm test` and re-generate the Del A
  screenshots (command below) before treating this as fully verified.

## What's done

1. **Numbers fix (punkt 7)**: `GET /api/jarvis/status` (`app/api/jarvis/
   status/route.ts`) is now the single source for every headline number the
   HUD shows - customer count, project count, unread messages, uptime, and
   network activity - computed directly from `getAllCustomers()`/
   `getProjects()`/`getAllMessages()` in one call, behind the same
   `requireAdminSession()` that already worked correctly for the messages
   panel. Previously, `StatusPanel`'s customer/project counts came from two
   *separate* client-side fetches (`/api/customers`, `/api/projects`) that
   silently fell back to an empty array on any failure
   (`.catch(() => {})`), while the unread-message count came from a third,
   independent fetch that happened to keep working - which is exactly the
   symptom described (0 vs. 13, from different code paths). Root cause
   **could not be directly reproduced or confirmed against a real database
   this session** (no Docker) - the fix removes the failure mode
   structurally (one source, real errors now logged via
   `console.error` instead of swallowed) rather than patching a guessed
   cause. **You need to**: once the DB is up, confirm in the browser
   console that no `/api/customers` or `/api/projects` errors appear, and
   that the counts match what `/admin` itself shows for the same data.
   New test: `tests/jarvisControl.test.ts` - `GET /api/jarvis/status
   includes real customer/project/unread-message counts and process
   metrics` (creates a real customer+project, asserts the counts reflect
   them, cleans up after itself). **Not run this session** (no DB) - added
   for you to run once Postgres is available.
2. **Density (punkt 1)**: new bottom row of small panels
   (`app/components/jarvis-hud/Panels.tsx`): `NetworkPanel` (a real,
   process-local "admin API calls per minute" line graph -
   `lib/requestMetrics.ts`, incremented inside `requireAdminSession()` on
   every successful admin request across the whole app, not just Jarvis
   routes), `UptimePanel` (real `process.uptime()`, from the same status
   call), `NextRunPanel` (a live countdown to the next trend-scout run,
   Monday 08:00 - a fixed schedule fact computed client-side with `Date`,
   same pattern as the existing clock panel, not "demo data"),
   `PlatformBarsPanel` (bar chart of trend video counts per platform, from
   the already-loaded `trends` data, labelled DEMO-DATA when trends are
   demo), and `DataStripPanel` (a purely decorative hex-code ticker -
   never claims to represent a real metric, same spirit as `HexCore`'s
   existing hex-code ring). The whole HUD's max width also grew from 1600px
   to 1920px to use more of a wide screen.
3. **Kernen (punkt 2)**: the core's on-screen size grew ~40% (560px → 780px
   container), with the SVG itself now inset 11% inside that box so there's
   dedicated empty space between the outermost tick ring and the box edge -
   see punkt 3. New layers in `HexCore.tsx`: a 7th, outermost segmented ring
   (`arcs7`, thicker/brighter than the existing ring 6), a faint radial
   gradient glow sitting behind the whole hexagon assembly, glowing
   (pulsing) corner points on the outer hexagon's 6 vertices, and thin
   decorative connector lines from the core out toward each side-panel
   column (`JarvisHud.tsx`, a low-opacity SVG behind the panels - cosmetic
   wiring, not literally anchored to exact panel positions since those
   reflow with content height).
4. **Menu (punkt 3)**: `CircularMenu` moved from `radiusPercent={37}` (which
   sat almost on top of the hex-code ring at 36.5%) to `47`, now landing
   outside every tick/code ring in the newly-inset core - its own clear
   ring. Buttons got a more solid frame (thicker border, dark-filled
   background instead of near-transparent) and a real hover state (glow,
   border brightens, slight scale-up), not just a background tint.
5. **Tilstande (punkt 4)**: LYTTER now uses a distinct green-cyan
   (`LISTEN_GREEN = '#12ffb0'`, `theme.ts`) instead of the same bright cyan
   as SPEAKING, and the rings now visibly contract (start at 0.93× scale)
   before pulsing outward with live mic level, instead of only ever
   growing. TÆNKER's rings now spin measurably faster (each ring's
   animation-duration cut to roughly a third) on top of the existing
   scanner sweep. TALER gained two expanding "wave" rings rippling outward
   from the hexagon on a loop while speaking, in addition to the existing
   glow/scale-with-audio-band behavior. The status text under the core is
   now Danish (`HVILER`/`LYTTER`/`TÆNKER`/`TALER` -
   `STATE_LABEL_DA` in `theme.ts`, replacing the raw English state key) and
   much larger (10px → 18px, bold, colored/glowing to match the state).
6. **Hologram (punkt 5)**: the gold core (`GoldHologram.tsx`) is dimmed -
   the previous solid, fully-opaque near-white sphere (`0xfff3d6`) is now a
   smaller, 85%-opacity warm gold (`0xffc94d`) with a separate larger,
   low-opacity (18%) halo sphere behind it for the "glow" instead of raw
   brightness. Layout: the sphere now renders in a left-hand 42%-wide pane
   and `GoldHologramContent` in the remaining right-hand pane (`≥900px`;
   stacked sphere-on-top/content-below under 900px), per "placér
   indholdskortene til højre for kuglen". The backdrop behind the whole
   hologram is darker (0.8 → 0.88 opacity) with a slight blur. Trend cards
   in the TRENDS tab are now a horizontal, scroll-snapping carousel
   (`overflowX: auto`, `scrollSnapType: x mandatory`) instead of a
   multi-column grid.
7. **Loggen (punkt 6)**: `LogPanel` now renders plain Danish sentences via a
   new `translateLogEntry()` helper instead of the raw `action`/`detail`
   pair - `Chat: <besked>`, `Trend gemt til <kundenavn>`, `Kladde godkendt`,
   `Kladde afvist`. This required two small server-side changes to what
   gets logged in the first place: `POST /api/jarvis/chat` now logs just
   the message text (was `mode=... demo=... message=...`), and `POST
   /api/mood-board-drafts` now looks up and logs the customer's *name*
   (was `customerId=... projectId=... title=...`) via the existing
   `getCustomerById()` - so the log view never needs a separate lookup to
   show it. Approve/reject still log the draft id server-side (kept for any
   future audit need) but the UI doesn't display it, matching the brief's
   examples exactly.
8. **Screenshots (punkt 8)**: **not done this session** - blocked on no
   Docker/OrbStack (see above). **You need to**: run
   `LOCAL_ADMIN_PASSWORD=<your local test password> node
   scripts/capture-hud-screenshots.mjs` once the dev server and DB are up;
   it already launches Chromium with `--mute-audio` and stubs
   `window.speechSynthesis` before the page loads (unchanged from the
   existing script), and will overwrite the same six `docs/jarvis-hud-*.png`
   filenames with the new, denser layout.
9. **Test, build, lint (punkt 9)**:
   - `npx tsc --noEmit`: clean, no errors.
   - `npm run build`: succeeds (Next.js 16 + Turbopack), all routes listed
     in the route manifest, no build-time errors.
   - `npm run lint`: compared line-by-line against this exact branch's own
     pre-change baseline (156 problems: 92 errors, 64 warnings, verified by
     running lint again on the untouched `git stash`-ed tree) - **identical
     output** except one pre-existing warning's line number shifting by 13
     lines (from code added above it). Zero new errors, zero new warnings.
   - `npm test`: **not run** - no local Postgres this session (see
     Environment note above). One new test was added
     (`tests/jarvisControl.test.ts`) for the punkt 7 fix; it needs a real
     run once the DB is available.

## What you need to decide/do

- Start OrbStack, `docker start mbb-local-pg` (or create it fresh), then run
  `npm test`, confirm the new status-route test passes, and regenerate the
  `docs/jarvis-hud-*.png` screenshots.
- Manually eyeball the new density row and the moved circular menu in a
  real browser at a few widths (this was built and type-checked but never
  rendered this session) - CSS math can be right on paper and still look
  off in practice.
- If the customer/project-count bug still reproduces after this fix (i.e.
  `/api/jarvis/status`'s own `customerCount`/`projectCount` are wrong, not
  just the old separate fetches), that would point at the DB layer itself
  rather than the client - worth a first check with `SELECT count(*) FROM
  customers` / `projects` directly against the local DB.

---

# 2026-09-17: Del B - Små rettelser på jarvis-control-v2

Same session, same environment caveat as Del A above (no Docker/OrbStack -
`npm test` and `next dev` not run this session either).

## What's done

1. **AdminNav hydration warning, fixed.** Root cause: `AdminNav.tsx` read
   `localStorage` (`readIsAdmin()`) directly inside a `useState` lazy
   initializer, which runs during render. The server always renders with no
   `localStorage` (`isAdmin` = `false` → the bar renders `null`), but on the
   client's *first* render during hydration, that same initializer now sees
   the real value - so whenever an admin actually has `isAdmin=true` stored,
   the client's very first render produces the actual nav bar while the
   server's HTML was `null`. That mismatch is exactly what caused the
   dev-only red "1 Issue" badge. The previous comment here reasoned that
   callers always gate `AdminNav` behind a loading screen so this couldn't
   happen - true for `ProjectDetail`/`CustomerDashboard`, but not for
   `JarvisHud`, which renders `<AdminNav>` immediately with no such gate.
   Fixed by starting `isAdmin` at `false` on both server and client, and
   only reading `localStorage` in a `useEffect` after mount (same pattern
   already used elsewhere in this codebase, e.g. `useReducedMotion` in
   `jarvis-hud/hooks.ts`) - the bar now appears one frame later on the
   client instead of mismatching the server's output. **You need to**:
   confirm in a real browser (once the DB is up) that the "1 Issue" badge
   is gone on `/admin/jarvis` specifically, since that's the page that
   actually exercises the un-gated code path.
2. **Admin UI for TOTP 2FA**, on top of the existing `POST`/`PUT`/`DELETE
   /api/admin/totp` routes (already admin-session-gated, already had pure
   TOTP-math unit tests in `tests/adminAuth.test.ts`, but no admin UI and no
   route-level test coverage before this):
   - New `app/components/TotpSettings.tsx`, wired into `AdminPanel.tsx` as
     a new "Sikkerhed" tab. Three states: **off** (a "Slå 2FA til" button),
     **enrolling** (QR code + manual-entry secret + a 6-digit confirm
     field), **on** (status + a "Slå 2FA fra" button with a confirm
     dialog).
   - The QR code is generated **fully client-side** from the `otpauth://`
     URI using the `qrcode` npm package (`QRCode.toDataURL()`) - no
     third-party QR-image service is called, which matters here because
     the URI embeds the actual TOTP secret; sending that to an external
     API would leak it. `qrcode` + `@types/qrcode` added as real
     dependencies (`npm view` confirmed registry access first). `npm
     audit` shows 5 pre-existing vulnerabilities, all in the `vitest`/
     `vite` dev-toolchain dependency chain (moderate/high/critical) -
     **none introduced by `qrcode` itself** and out of scope for this task
     (a `--force` fix would be a breaking devDependency change nobody
     asked for).
   - `GET /api/admin/session` (already existed, used elsewhere to check
     "am I still logged in") now also returns `totpEnabled: boolean`
     (reading the existing `admin_auth.totpEnabled` column via
     `getAdminAuth()`), so the settings UI knows which state to render on
     load without a second bespoke endpoint.
   - Danish, English and Tagalog strings added to `lib/translations.ts`
     under `admin.totp*`/`admin.tabSecurity` (this app is otherwise
     i18n'd via `useTranslation()`, so hardcoding only-Danish text here
     would have shown Danish to English/Tagalog admins - `t(key,
     fallback)` only falls back to the given string when the key is
     missing for *any* language, not just Danish).
   - New test file `tests/totpRoutes.test.ts` (same real-Postgres pattern
     as `tests/adminAuthDb.test.ts`): every TOTP route requires an admin
     session; `GET /api/admin/session` reports `totpEnabled: false` before
     enrolling; confirming with a wrong code is rejected (400); and a full
     enroll → confirm-with-a-real-computed-code → verify-enabled →
     disable → verify-disabled round trip, using the same independent
     RFC 6238 reference implementation already used in
     `tests/adminAuth.test.ts` to compute a real code from the returned
     secret (not a login-flow simulation - a genuine, independently-
     computed valid TOTP code). **Not run this session** - no DB.
3. **Test, build, lint**:
   - `npx tsc --noEmit`: clean.
   - `npm run build`: succeeds, `/api/admin/totp` and `/api/admin/session`
     both listed in the route manifest.
   - `npm run lint`: diffed against this branch's own baseline with line
     numbers stripped out (not just the total count) - **zero new errors,
     zero new warnings**. One new `eslint-disable-next-line
     react-hooks/set-state-in-effect` was needed on `AdminNav`'s new
     effect (same rule, same suppression pattern already used on the
     pre-existing effects in `hooks.ts`/`Panels.tsx`/`JarvisHud.tsx` - not
     a new category of suppression for this codebase).
   - `npm test`: **not run** - no local Postgres this session. The new
     `tests/totpRoutes.test.ts` needs a real run once the DB is available,
     same as Del A's new test.

## What you need to decide/do

- Run `npm test` once Docker/OrbStack + `mbb-local-pg` are up, and actually
  scan the QR code with a real authenticator app once in a live browser -
  the route-level test proves the *math and wiring* are correct end to end,
  but never renders the actual `<img>` or scans it with a phone.
- `npm audit`'s 5 pre-existing vitest/vite vulnerabilities are unrelated to
  this work but are sitting there regardless - your call on whether/when to
  address them (would need `npm audit fix --force`, a breaking
  devDependency bump, not attempted here).

---

# 2026-09-17: Del C and Del D

## Del C: secure /api/typing

Done on its own branch, **not this one** - see `security-typing` (pushed,
not merged), branched from `main` per the task's own instructions. Full
detail is in that branch's own `STATUS.md` entry, not duplicated here to
avoid two reports drifting apart. Summary: both `GET` and `POST
/api/typing` now require an admin or owning-customer session, same pattern
as `/api/messages`; new access-control tests added; no Docker/OrbStack
locally this session so the new DB-backed tests weren't run for real
(confirmed they skip cleanly).

## Del D: GO-LIVE.md

New file at the repo root, `GO-LIVE.md`, in Danish - a guide, not an
action. Nothing was deployed, merged to `main`, or changed in Railway
while writing it.

Structure: two independent tracks. **Spor 1** is the three
`mood-board-booking` branches (`security-typing` → `calendar-button` →
`jarvis-control-v2`, in that order, reasoning given for the order) - all
three work fully in demo mode with zero new environment variables, so this
track can go live today, independent of anything else. **Spor 2** is the
`~/jarvis` infrastructure work, sequenced exactly as that repo's own
`MIGRATION-PLAN.md` concludes - account transfer first, then the region
move to `ams`, then merging/deploying `trends-endpoint`, then choosing
between the two documented connection options (public HTTPS + bearer
token, or consolidating both Railway projects for private networking) and
setting `JARVIS_API_URL`/`JARVIS_API_KEY`/`JARVIS_TRENDS_URL`/
`JARVIS_TRENDS_API_KEY` on the portal side. Per your instruction, this
explicitly puts account transfer and the Amsterdam region move before any
of the trends-endpoint/connection work, matching
`~/jarvis/MIGRATION-PLAN.md`'s own "samlet rækkefølge" section.

Each step lists: what it does, environment variable **names** only (never
values), what you personally do in a browser (Railway UI clicks, accepting
a transfer invite, scanning a 2FA QR code - things I can't or shouldn't do
for you), what to test immediately after, and how to roll it back. Closes
with a one-page numbered summary of the whole sequence and a note that
steps 1-3 (the portal branches) can happen today while steps 4-7 (the
Jarvis infrastructure) wait indefinitely with no downside - the portal
stays fully functional in demo mode until you're ready for those.

**Not verified against real Railway/Postgres state this session** - it's
built entirely from reading `~/jarvis/MIGRATION-PLAN.md`,
`~/jarvis/STATUS.md`, `~/jarvis/README.md`'s "Fase 5B" section (read
directly off the `trends-endpoint` branch, since that section doesn't
exist on `~/jarvis`'s `main`), and this branch's own `STATUS.md` entries
above - not by actually running any of the Railway steps.

---

# 2026-09-18: fix duplicate customer/project ids (cherry-picked from security-typing)

`tests/accessControl.test.ts` on `security-typing` was failing
intermittently with `duplicate key value violates unique constraint
"customers_pkey"`. Root cause: every `create*` function in
`lib/db-postgres.ts` (`createCustomer`, `createProject`, `createScene`,
`createSceneNote`, `createIdea`, `createTimelineItem`, `createMessage`,
`createMeeting` - all 8, same copy-pasted line) generated its primary key
with `Date.now().toString()`, so two rows created in the same millisecond
got the same id and the second `INSERT` violated the primary key.

## What's done

- Fixed on `security-typing` first (full detail and 10x-in-a-row test
  verification in that branch's own `STATUS.md`), then cherry-picked onto
  this branch (commit originally `c6f8045`, here `35a82d1`) so both
  branches have the fix - a clean cherry-pick, no conflicts, since neither
  branch had touched these particular lines otherwise.
- All 8 spots now use `crypto.randomUUID()` instead of
  `Date.now().toString()`. This branch's own two `lib/db-postgres.ts`
  additions from Del C (`createMoodBoardDraft`, and `jarvisActionLog`'s
  insert inside `logJarvisAction`) already used `randomUUID()` from the
  start (checked directly - they weren't part of the original bug), so
  this fix only touches the 8 pre-existing functions and doesn't change
  anything Jarvis-specific.
- `lib/db.ts` has the same-looking pattern but is a separate, unrelated
  in-memory module with no real database and no unique constraint to
  violate - left untouched, out of scope here too.

## Test, build, lint

- `npm test` against the same real local Postgres (`mbb-local-pg`), run 3
  times in a row: **65/65 passing every time** (60 from before this fix
  plus this branch's existing full count - no new tests added, this is a
  pure bugfix), no duplicate-key errors, exit code `0` every run.
- Not re-run through `npm run build`/`npm run lint` separately - same
  reasoning as on `security-typing`: an 8-spot same-shape expression swap,
  no new imports beyond Node's own built-in `crypto` (already used the
  same way elsewhere in this file and in `lib/adminAuth.ts`/
  `lib/customerAuth.ts`).

## What you need to decide/do

- Nothing merges or deploys on its own, same as everything else on this
  branch. Both `security-typing` and `jarvis-control-v2` now have this fix
  independently - merging either one to `main` first doesn't block the
  other.
