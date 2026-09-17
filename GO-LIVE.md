# GO-LIVE: Guide til at gå i produktion

Skrevet under den selvstændige natte-opgave (2026-09-17), Del D. Dette er
en guide til dig, ikke en handling jeg har udført. Jeg har ikke deployet,
merget til `main`, eller ændret noget i Railway i denne omgang - alt
herunder er research, plan og anbefaling, klar til at du kører det, når du
er klar.

To uafhængige spor:

- **Spor 1 (portalen):** tre grene på `mood-board-booking`
  (`security-typing`, `calendar-button`, `jarvis-control-v2`). Kan merges
  og deployes **når som helst**, uafhængigt af Jarvis og Railway-planen
  nedenfor - alt tre virker fuldt ud i demo-tilstand uden nogen af de nye
  miljøvariabler.
- **Spor 2 (Jarvis-infrastruktur):** kun nødvendigt hvis I vil have
  **rigtige** Jarvis-trends/chat-data i portalen i stedet for
  demo-tilstand. Bygger på `~/jarvis`'s `MIGRATION-PLAN.md` og starter med
  kontoflytning og regionsskift til Amsterdam, per din instruktion.

Du kan gå live med Spor 1 alene og lade Spor 2 vente. Ingenting i Spor 1
kræver Spor 2.

---

## Spor 1: Portal-grenene (mood-board-booking)

Rækkefølge, og hvorfor: `security-typing` og `calendar-button` er begge
små, uafhængige rettelser direkte på `main` og har ingen indbyrdes
konflikt. `jarvis-control-v2` er langt den største ændring (hele
Jarvis-HUD'en) og bør merges sidst, så en eventuel konflikt med de to
første opdages og løses på den mindst komplicerede gren.

### 1. `security-typing` → `main`

**Hvad den gør:** Kræver admin- eller ejer-kunde-session på
`GET`/`POST /api/typing` (chatten's "skriver..."-indikator), som før var
helt uden adgangskontrol. Ingen nye miljøvariabler. Ingen database-ændring.

**Sådan merger du (i din terminal, ikke via mig):**
```sh
git checkout main
git pull
git merge --no-ff security-typing
git push
```
Eller opret en pull request på GitHub og merge den derfra, hvis du hellere
vil se diffen i en PR først (`gh pr create --base main --head
security-typing`).

**Hvad du selv gør i browseren:** Intet særligt - dette er en
bagvedliggende rettelse uden UI-ændring.

**Test efter merge (lokalt, før du pusher til `main`, og igen efter
Railway har deployet):**
```sh
DATABASE_URL=... npm test    # accessControl.test.ts's nye "/api/typing"-tests skal bestå
DATABASE_URL=... npm run build
npm run lint
```
Efter deploy: åbn en samtale i admin-panelet og på en kundes chat samtidig,
bekræft at "skriver..."-indikatoren stadig virker normalt (den bruger
samme session, som allerede er logget ind - ingen synlig ændring for en
rigtig bruger, kun for en uautoriseret anmoder).

**Rollback:** `git revert <merge-commit>` på `main`, push. Ingen
database-ændring at fortryde.

### 2. `calendar-button` → `main`

**Hvad den gør:** Rent UI - en "Hent kalender-link"-knap i admin-panelets
Kalender-fane, med kopiér-til-udklipsholder og "Ny link". Ingen nye
backend-ruter, ingen nye miljøvariabler, ingen nye afhængigheder - kalder
den eksisterende `GET`/`DELETE /api/admin/calendar-token`.

**Sådan merger du:**
```sh
git checkout main
git pull
git merge --no-ff calendar-button
git push
```

**Hvad du selv gør i browseren:** Log ind som admin, gå til Kalender-fanen,
klik "Hent kalender-link", bekræft at linket vises og at "Kopiér" rent
faktisk lægger det i udklipsholderen. Klik "Ny link" og bekræft at det
gamle link derefter ikke længere virker (kalendertokenet er engangs-
udskiftet, ikke tilføjet).

**Test:** `npm test` (ingen nye tests i denne gren - ren UI oven på en
allerede testet rute), `npm run build`, `npm run lint`.

**Rollback:** `git revert <merge-commit>`, push. Ingen database-ændring.

### 3. `jarvis-control-v2` → `main`

**Hvad den gør:** Hele Jarvis-HUD'en (`/admin/jarvis`) - chat, stemme,
trends, gem-til-kunde, aktivitetslog, og densitets-/visuel polish fra Del
A/B i denne omgang. Tilføjer to nye databasetabeller
(`moodBoardDrafts`, `jarvisActionLog`) via `CREATE TABLE IF NOT EXISTS` i
`initDB()` - oprettes automatisk ved første request efter deploy, ingen
manuel migration nødvendig, og er ikke-destruktivt (rører ikke
eksisterende tabeller). Tilføjer også en admin-UI til TOTP 2FA (Del B).

**Miljøvariabler (kun navne - ingen værdier her, og ingen er
obligatoriske: HUD'en kører fuldt ud i demo-tilstand uden nogen af dem):**
- `JARVIS_API_URL`, `JARVIS_API_KEY` - rigtig Jarvis-chat i stedet for
  demo-svar. Kræver Spor 2 nedenfor er gennemført mindst til og med "sæt
  trends-endpoint live", og at I har valgt en forbindelsesmetode.
- `JARVIS_TRENDS_URL`, `JARVIS_TRENDS_API_KEY` - rigtige trends i stedet
  for demo-data. Samme forudsætning.
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` - valgfrit, kun for rigtig
  stemme-syntese. Uden dem falder HUD'en automatisk tilbage til browserens
  egen `speechSynthesis` - virker fint uden.

Ingen af disse fire par afhænger af hinanden - sæt kun det par du rent
faktisk har en modpart til (chat kræver kun de to `JARVIS_API_*`, trends
kun de to `JARVIS_TRENDS_*`).

**Sådan merger du:**
```sh
git checkout main
git pull
git merge --no-ff jarvis-control-v2
git push
```
Denne gren er størst - hvis Railway auto-deployer på push til `main`
(bekræftet i `STATUS.md`, "Production"-afsnittet), sker deploy automatisk
efter push. Følg deploy-loggen i Railway-dashboardet til den viser
`SUCCESS`/`● Online`, før du går videre.

**Hvad du selv gør i browseren:**
1. Log ind som admin på den nu-opdaterede produktionsside.
2. Åbn `/admin/jarvis`, bekræft HUD'en loader (demo-tilstand er helt
   forventet, indtil Spor 2 er gennemført).
3. Prøv alle fire tilstande (skriv i chatten, klik mikrofonen, vent på
   svar, lyt til talesvaret) - alle skal virke i demo-tilstand.
4. Gå til admin-panelets nye "Sikkerhed"-fane, sæt selv en 2FA op hvis du
   vil bruge det (scan QR-koden med din egen autenticator-app - det er en
   reel hemmelighed, så det er bevidst ikke noget jeg kan gøre for dig).
5. Hvis I senere sætter `JARVIS_API_URL`/`JARVIS_TRENDS_URL` (Spor 2): sæt
   dem i Railway's variabel-UI for `mood-board-booking`-servicen, ingen
   kode-ændring nødvendig - HUD'en registrerer selv at de er sat.

**Test (lokalt før push, og igen mod produktion efter deploy):**
```sh
DATABASE_URL=... npm test     # 60+ tests, se STATUS.md for det præcise antal
DATABASE_URL=... npm run build
npm run lint
```
Mod produktion efter deploy: `/admin/jarvis` kræver login (uden session:
omdirigeres), `GET /api/jarvis/status` uden session giver `401`, kunder
(PIN-login) kan stadig ikke se `/admin/jarvis` overhovedet
(`proxy.ts`/`AdminNav` gater den, uændret af denne gren).

**Rollback:** `git revert <merge-commit>` på `main`, push - udløser et nyt
deploy af den forrige, kendte gode version. De to nye tabeller
(`moodBoardDrafts`, `jarvisActionLog`) bliver liggende tomme i databasen -
harmløst, ingen anden kode læser dem, og de kan fjernes manuelt senere hvis
I vil (`DROP TABLE IF EXISTS "moodBoardDrafts"`, `DROP TABLE IF EXISTS
"jarvisActionLog"` - kør kun det, hvis I er sikre på at I ikke ruller
frem igen).

---

## Spor 2: Jarvis-infrastruktur (kun for rigtige Jarvis-data)

Dette spor bygger direkte på `~/jarvis`'s `MIGRATION-PLAN.md`. Rækkefølgen
herunder er den samme som den plan konkluderer, gentaget her så du har den
ét sted sammen med portal-siden. **Se selve `MIGRATION-PLAN.md` for kilder,
forbehold og de punkter der ikke er bekræftet af Railways dokumentation -
det gentages ikke alt sammen her.**

### 1. Kontoflytning (arbejdsmail → privat mail) - først

Railways "Transfer Ownership" (til en anden bruger) eller "Transfer
Project" (til et andet workspace). Kræver aktiv Hobby- eller Pro-plan i
**begge** ender.

**Hvad du selv gør i browseren:** Alt - dette er en kontohandling, jeg kan
ikke gøre den for dig. Accepter transfer-invitationen (mail-link), og
genforbind evt. GitHub-integrationen bagefter hvis den beder om det.

**Anbefaling fra migrationsplanen:** test hele flowet på et tomt
wegkast-projekt først, da effekten på domæner/volumes/variabler ikke er
dokumenteret af Railway.

**Test efter:** Bekræft `portal.chromevaultstudios.dk` og
`mood-board-booking-production.up.railway.app` stadig svarer normalt,
bekræft alle miljøvariabler stadig er sat (uden at vise deres værdier -
`railway variable list --service mood-board-booking --json | python3 -c
"import json,sys;print('\n'.join(sorted(json.load(sys.stdin).keys())))"`),
bekræft auto-deploy fra GitHub stadig trigger'er (push en triviel ændring
og se om Railway reagerer).

**Rollback:** Transfer tilbage samme vej (samme 24-timers accept-flow).

### 2. Region: portal + Postgres fra `sfo` til `ams` - dernæst

Indbygget, in-place funktion (Settings → Scale → Regions), ingen ny
service. Jarvis er allerede i `ams` - dette bringer portalen tættere på,
hvilket bliver en forudsætning hvis I senere vælger "Mulighed 2" (privat
netværk) nedenfor.

**Hvad du selv gør i browseren:** Tag en manuel volume-backup af begge
volumes (Railways indbyggede Backups-fane) og kør en `pg_dump` til en fil
uden for Railway, **før** du klikker noget. Skift derefter Postgres'
region først, vent til den er sund igen, skift så
`mood-board-booking`-servicens region.

**Nedetid:** Kun under selve volume-flytningen (udokumenteret varighed -
se `MIGRATION-PLAN.md`s forbehold). Domænerne ændres ikke.

**Test efter:** Samme som ovenfor - portalen svarer, login virker, en
kundes PIN-login virker, en admin-handling (fx oprette en test-kunde og
slette den igen) virker mod den nu ams-placerede database.

**Rollback:** Skift regionen tilbage til `sfo` samme vej. Har du en
volume-backup fra lige før, kan den også gendannes (kun inden for samme
projekt, jf. Railways egen begrænsning).

### 3. `trends-endpoint` → `main` (i `~/jarvis`) - trends-endpoint live

**Hvad den gør:** En ny, separat, autentificeret HTTP-server i Jarvis'
container (port 8643, intern - ingen offentlig adgang), der returnerer
`trends/latest.json`. Se `~/jarvis/README.md`, afsnittet "Fase 5B / Del B".

**Miljøvariabel (navn kun):** `JARVIS_TRENDS_API_KEY` - valgfri; hvis den
ikke sættes, genbruger endpointet automatisk den allerede satte
`API_SERVER_KEY`. Sæt kun en separat nøgle hvis I vil kunne rotere
trends-adgangen uafhængigt af selve chat-API'et.

**Sådan merger du:**
```sh
cd ~/jarvis
git checkout main
git pull
git merge --no-ff trends-endpoint
git push
```
Railway deployer Jarvis-servicen automatisk (samme mekanisme som
portalen). Følg loggen til `● Online`.

**Hvad du selv gør i browseren:** Ingenting nødvendigt, medmindre du vil
sætte en dedikeret `JARVIS_TRENDS_API_KEY` - i så fald sættes den i
Railways variabel-UI for `jarvis`-servicen.

**Test efter (kun mod Jarvis selv, ikke portalen endnu - de to services
kan ikke tale sammen før trin 4 er valgt og gennemført):**
```sh
railway ssh --service jarvis -- curl -s http://127.0.0.1:8643/healthz
```
skal give `{"status":"ok"}`. En rigtig token-test kræver at du selv har
værdien af `API_SERVER_KEY`/`JARVIS_TRENDS_API_KEY` ved hånden - kør den
selv, ikke via mig:
```sh
railway ssh --service jarvis -- sh -c 'curl -s -H "Authorization: Bearer $API_SERVER_KEY" http://127.0.0.1:8643/trends/latest'
```

**Rollback:** `git revert <merge-commit>` i `~/jarvis`, push. Ingen
database-ændring (Jarvis' egen fil-baserede trends-data rører den slet
ikke).

### 4. Forbind portalen og Jarvis - vælg én af to muligheder

Portalen bliver ved med at vise demo-trends/demo-chat, indtil dette trin er
gennemført **og** `JARVIS_API_URL`/`JARVIS_TRENDS_URL` er sat på
portal-siden. Ifølge `~/jarvis`'s `STATUS.md` er to services i
**forskellige** Railway-projekter aldrig i stand til at nå hinanden over
det private netværk, uanset indstillinger - så I skal vælge en af disse to
reelle muligheder:

**Mulighed 1 (enklest): Offentlig HTTPS-adgang til Jarvis, beskyttet af
bearer-token.** Giv Jarvis' port 8642 (chat) og evt. 8643 (trends) et
offentligt Railway-domæne. Portalens `JARVIS_API_URL`/`JARVIS_TRENDS_URL`
peger så på det offentlige domæne. Ulempe: bryder Jarvis' hidtidige
"kun dashboard-porten er offentlig"-arkitektur og kræver ekstra hærdning
(rate limiting findes allerede for trends-endpointet, men chat-endpointet
er ikke bygget til offentlig eksponering).

**Mulighed 2 (anbefalet i `~/jarvis`'s egen plan, mere arbejde): Saml de to
Railway-projekter i ét, brug privat netværk.** Flyt
`mood-board-booking`-servicen (og dens Postgres) ind i samme
Railway-projekt som `jarvis`. Sæt `JARVIS_API_URL`/`JARVIS_TRENDS_URL` til
Jarvis-servicens interne `RAILWAY_PRIVATE_DOMAIN`-navn i stedet for en
offentlig URL. Ingen ny offentlig angrebsflade, matcher Jarvis' eksisterende
sikkerhedsfilosofi fuldt ud - men portal-servicen skal flyttes mellem
Railway-projekter, hvilket hverken jeg eller migrationsplanen har testet
undervejs i denne opgave.

**Hvad du selv gør i browseren (uanset valg):** Selve valget er dit. Ved
Mulighed 1: opret domænet i Jarvis-servicens Settings → Networking. Ved
Mulighed 2: flyt servicen i Railway-dashboardet (Settings → "Transfer
Service" eller tilsvarende - bekræft den præcise knap-tekst i jeres
Railway-UI, den kan hedde noget andet end i dokumentationen på
tidspunktet I gør det).

**Miljøvariabler at sætte på portal-siden efter valget (navne kun):**
`JARVIS_API_URL`, `JARVIS_API_KEY`, `JARVIS_TRENDS_URL`,
`JARVIS_TRENDS_API_KEY` (sæt `JARVIS_API_KEY`/`JARVIS_TRENDS_API_KEY` til
den samme værdi som Jarvis-sidens `API_SERVER_KEY`, medmindre I valgte en
dedikeret `JARVIS_TRENDS_API_KEY` i trin 3).

**Test efter:** Åbn `/admin/jarvis`, bekræft "Demo-tilstand"-badgen er
væk, send en rigtig besked i chatten og bekræft et rigtigt (ikke
"(Demo-svar)"-præfikset) svar kommer tilbage, åbn TRENDS-hologrammet og
bekræft rigtige trend-kort (ikke "DEMO-DATA"-mærkede) vises.

**Rollback:** Fjern `JARVIS_API_URL`/`JARVIS_TRENDS_URL` fra portalens
variabler igen (eller sæt dem tomme) - HUD'en falder øjeblikkeligt
tilbage til demo-tilstand uden kodeændring eller redeploy af Jarvis. Ved
Mulighed 2: flyt servicen tilbage til sit eget projekt samme vej.

---

## Generel rollback-huskeregel

For alt i Spor 1 og trin 3 i Spor 2 (almindelige kode-deploys): `git
revert <commit>` + push er altid den sikre vej - det udløser et nyt,
almindeligt deploy af en tidligere kendt god tilstand, uden at røre nogen
database. For trin 1, 2 og 4 i Spor 2 (kontoflytning, regionsskift,
service-flytning): det er infrastruktur-handlinger i selve Railway, ikke
noget en `git revert` kan fortryde - brug den specifikke rollback-note
under hvert trin ovenfor, og tag altid en backup/dump lige før du
begynder, hvis trinnet involverer en volume eller en database.

## Rækkefølge, samlet

1. `security-typing` → `main` (portal)
2. `calendar-button` → `main` (portal)
3. `jarvis-control-v2` → `main` (portal, demo-tilstand er fint at stoppe ved)
4. Kontoflytning (Jarvis + portal-konti til privat mail)
5. Region: portal + dens Postgres til `ams`
6. `trends-endpoint` → `main` (i `~/jarvis`)
7. Vælg Mulighed 1 eller 2, forbind portalen og Jarvis, sæt de fire
   `JARVIS_*`-variabler på portal-siden

Trin 1-3 kan gøres i dag. Trin 4-7 er en separat beslutning, og kan vente
så længe I vil - portalen fungerer fuldt ud i demo-tilstand indtil da.
