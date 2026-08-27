# Teknisk audit og refactor

Dato: 27. august 2026
Omfang: performance, stabilitet, serversikkerhed, afhængigheder, PWA og teknisk dokumentation.

## Ledelsesresume

Projektets grundarkitektur er sund: browseren bestemmer ikke priser eller roller, ordreoprettelse er transaktionel og idempotent, statustokens lagres som hashes, og følsomme svar er markeret `no-store`. Auditens refactor fokuserer derfor på at fjerne unødigt arbejde frem for at omskrive produktet.

De største gennemførte forbedringer er:

- Offentlige gæstesider er igen egnede til prerendering og CDN-cache. Den strikse nonce-CSP er bevaret på login, personale og menuadmin.
- Menuens seks parallelle databaseopslag caches i 60 sekunder og invalideres straks efter en adminændring. Checkout validerer stadig pris og lager direkte i transaktionen.
- Forside, bekræftelse, ordrestatus og historiksider henter ikke længere hele menuen uden at bruge den.
- Ordrelinjer og tilvalg indsættes i batches. Ordrehistorik bruger tre forespørgsler i alt i stedet for to pr. ordre, og statuspolling samler ordre, linjer og tilvalg i ét opslag.
- Personaleautorisation henter session og aktiv profil i ét join.
- Gæste-, personale- og menuadmin-profiler har korrekte PWA-startadresser og 180/192/512-pixel ikoner.
- Service workeren rydder gamle caches, opdaterer billeder i baggrunden og holder alle private ruter uden for sin cache.
- Auth-webhook accepterer kun signeret, valideret HTTPS-link til appens eller Neon Auths kendte origin. HTML-attributten escapes.
- Upload kontrollerer både størrelse, MIME-type og filsignatur; kataloget accepterer kun lokale billeder eller den konfigurerede Vercel Blob-hosttype.

## Baseline før ændringer

| Kontrol | Resultat |
| --- | --- |
| ESLint | Grøn |
| TypeScript | Grøn |
| Vitest | 14/14 tests grønne |
| Next.js produktionsbuild | Grøn |
| Produktionsafhængigheder (`npm audit --omit=dev`) | 0 kendte sårbarheder |
| Alle afhængigheder | Ét moderat udviklings-only fund og dets følgeposter i Drizzle Kits indlejrede esbuild 0.18.20 |
| Rendering | Alle applikationsruter blev dynamisk renderet på grund af global nonce-CSP |

Playwright-projekterne havde desuden misvisende navne: `mobile-chromium` og `tablet-chromium` arvede WebKit fra Apples device-profiler. De bruger nu eksplicit Chromium med de samme mobil-/tablet-dimensioner. Testserveren bruger en isoleret port 3010 og må ikke genbruge en vilkårlig proces. Rigtig Safari-installation ligger fortsat i den fysiske releasekontrol.

## Endelig verifikation

| Kontrol | Resultat 27. august 2026 |
| --- | --- |
| ESLint | Grøn |
| TypeScript | Grøn |
| Vitest | 8 testfiler, 22/22 tests grønne |
| Playwright | 12 scenarier grønne, 8 bevidst projektspecifikke skips, 0 fejl |
| Next.js 16.3.3 produktionsbuild | Grøn; 15 sider genereret ved build |
| Produktionsafhængigheder | 0 kendte sårbarheder |
| Fuld afhængighedsgraf | 4 moderate udviklingsposter i samme Drizzle Kit/esbuild-kæde |
| Diff-kvalitet | `git diff --check` grøn |

Den centrale gæstechunk faldt fra 48.446 til 45.857 bytes (ca. 5 %), primært fordi fixturedata ikke længere pakkes i browserkoden, og fordi serveren kun serialiserer de menudata, den aktuelle visning bruger. Browserforløbene dækker blandt andet prismanipulation, idempotency, ordrestatus, roller, samtidige personaleændringer, cacheinvalidering og PWA-offlineadfærd. Origin-regressionstesten dækker desuden app-, preview- og reverse-proxyadresser uden at tillade en fremmed origin. Den lokale testdatabase blev kontrolleret efter testen, og midlertidige testdata er fjernet eller gendannet til seed-værdierne.

## Sikkerhedsmodel efter refactor

| Grænse | Beskyttelse |
| --- | --- |
| Ordreoprettelse | Same-origin-kontrol mod den aktuelle app-/proxyadresse, delt rate limit, Zod, serveropslag af pris/tilvalg/lager, database-låse og idempotency |
| Ordrestatus | 256-bit token i URL-fragment, kun hash i Neon, POST-body, rate limit og `private, no-store` |
| Personale/admin | Neon-valideret login, kort HttpOnly-session, aktiv profil og rolle fra databasen ved hver handling |
| Adminmutationer | Origin-kontrol, serverrolle, Zod og cacheinvalidering efter commit |
| Auth-mail | Ed25519-signatur, replay-vindue, schema, kendt link-origin og escaped HTML |
| Upload | Adminrolle, origin-kontrol, 4 MB-grænse, MIME-allowlist, magic bytes og unik Blob-nøgle |
| Browser | CSP, HSTS i produktion, frame-forbud, `nosniff`, begrænset Permissions Policy og referrer-forbud |
| PWA | Ingen API/private routes i Cache Storage; konservativ offlineoplevelse |

Den offentlige CSP tillader de inline bootstrap-scripts og styles, som Next.js kræver for statisk rendering. Den indeholder fortsat en snæver origin-policy og appen renderer ikke bruger-HTML. Login og backoffice bruger fortsat nonce-baseret `strict-dynamic`, fordi de håndterer restaurantens private drift.

## Performanceegenskaber

- Menu-cache: 60 sekunder som sikkerhedsnet samt øjeblikkelig tag-invalidering ved adminændring.
- Checkout og lager: aldrig cachet som autoritativ sandhed.
- Historik: højst de 20 seneste ordrer, svarende til browserens lokale token-grænse.
- Billeder: `next/image`, responsive `sizes` og små PWA-ikoner; det oprindelige 1024-pixel-logo er bevaret som kildeasset.
- Polling: ordrestatus hvert 7,5 sekund og personale hvert 6. sekund; private svar er ikke cachet.

## Afhængighedsrisiko

Produktionsgrafen er ren i npm-audit. Det moderate udviklingsfund kan kun ramme en lokalt startet, sårbar esbuild-udviklingsserver gennem Drizzle Kits gamle transitive loader. Seneste stabile Drizzle Kit indeholder stadig denne kæde, og npm foreslår en inkompatibel nedgradering. Accepteret midlertidig kontrol:

- Kør ikke Drizzle Studio eller andre udviklingsservere på en offentligt tilgængelig adresse.
- Brug kun projektets lokale/preview-database til migrationsværktøjer.
- Genkontrollér ved hver Drizzle Kit-opdatering.
- Fundet berører ikke produktionsbundlen.

## Resterende pilotblokeringer

- Den dataansvarlige skal godkende 30-dages anonymisering, adgang, backup/restore og indsigtsproces.
- Preview og Production skal have adskilte Neon/Auth/mail/cron-hemmeligheder.
- Brevo sandbox, SPF/DKIM, Vercel Blob og den valgte køkkenprinter skal verificeres i de rigtige miljøer.
- Installation og opdatering skal testes på rigtige Android-, iPhone- og iPad-enheder; Chromium-emulering kan ikke bevise iOS-installation.
- Rate-limit-tabellen bruger Neon. Mål databasekald og egress under pilot; flyt kun til platformens firewall/KV, hvis målingerne viser et reelt behov.

Se [PWA-guiden](PWA.md) og [releasechecklisten](RELEASE.md) for de operative kontroller.
