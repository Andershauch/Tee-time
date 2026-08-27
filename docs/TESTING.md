# Teststrategi og kvalitetsport

Alle ændringer skal kunne passere den samme deterministiske kvalitetsport lokalt og i GitHub Actions. Tests må aldrig bruge produktionsdatabase, produktionskonti eller aktive mail-/printerintegrationer.

## Kommandoer

| Kommando | Formål | Kræver hemmeligheder |
| --- | --- | --- |
| `npm run verify` | Lint, TypeScript, alle enhedstests, fixturebaseret produktionsbuild og performancebudgetter | Nej |
| `npm run test:watch` | Hurtig Vitest-feedback under udvikling | Nej |
| `npm run test:db` | Kontrollerer seeddata, relationer og outbox i en ikke-produktions Neon-branch | Ja |
| `npm run test:e2e` | Komplette mobil- og tabletflows med rigtig database og testkonti | Ja |

Kør `npm run verify` før hvert commit. Kør også `npm run test:e2e`, når en ændring berører bestilling, priser, database, auth, personale, menuadmin, caching, PWA eller service worker.

## Hvad der dækkes

- Vitest dækker schema- og telefonvalidering, migrationssikkerhed, seeddata, mail/cron, PWA-filer, origin-kontrol og tidsberegning.
- Playwright dækker gæstebestilling, serverpriser, idempotency, personligt statuslink, personale-/adminroller, samtidige statusændringer, menu-cacheinvalidering og PWA-offlineadfærd.
- `test:performance` fejler buildet, hvis den centrale gæstechunk eller PWA-assets overskrider deres dokumenterede bytebudget, eller hvis centrale gæsteruter mister prerendering.
- Releasechecklisten dækker de ting, emulering ikke kan bevise: installation og opdatering på rigtig Android, iPhone og iPad samt eksterne mail-/printertjenester.

## GitHub Actions

Workflowet `.github/workflows/quality.yml` kører `npm run verify` på hvert pull request og hvert push til `master`. Jobbet bruger ingen applikationshemmeligheder og kan derfor altid køre.

Repositoryet har endnu ikke branch protection. Indtil `master` kræver pull request og det grønne `quality`-job, opdager workflowet fejl efter et direkte push, men kan ikke forhindre Vercel i at starte deploymenten. Aktivering af beskyttelsen ændrer arbejdsformen til branch → pull request → grøn kontrol → merge → produktion.

`build:verify` sætter kun `TEE_TIME_BUILD_WITH_FIXTURES=1` i sin egen underproces. Dermed er CI-buildet stabilt og forsøger ikke at kontakte Neon. Den normale `npm run build`, Vercel-buildet og runtime bruger fortsat de konfigurerede menudata.

E2E-jobbet er bevidst slukket, indtil et isoleret testmiljø findes. Opret følgende GitHub Secrets med værdier fra en Neon-branch, der kun bruges til automatiske tests:

- `E2E_DATABASE_URL`
- `E2E_NEON_AUTH_BASE_URL`
- `E2E_TEST_STAFF_EMAIL`
- `E2E_TEST_STAFF_PASSWORD`
- `E2E_TEST_ADMIN_EMAIL`
- `E2E_TEST_ADMIN_PASSWORD`
- `E2E_CRON_SECRET`

Migrér og seed testbranchen, opret de to testkonti og kør `npm run test:db` mod den. Sæt derefter repository-variablen `RUN_E2E=true`. Workflowet afviser manglende værdier og sætter altid `DEPLOYMENT_ENV=local` samt `BREVO_DELIVERY_MODE=disabled`.

E2E-hemmeligheder udleveres aldrig til pull requests fra forks. De får stadig den fulde hemmelighedsfri kvalitetsport.

E2E-jobbet rydder rate-limit-testdata før start. Tests, der ændrer katalogdata, skal gendanne den oprindelige værdi i en `finally`-blok. Nye tests skal bruge tydelige testkundenavne og må ikke forudsætte et bestemt ordrenummer.

## Krav til nye ændringer

1. En fejlrettelse skal have en regressionstest, der fejler uden rettelsen.
2. Ny forretningslogik skal have en hurtig enhedstest tæt på schemaet eller hjælpefunktionen.
3. Nye kritiske brugerflows eller rollegrænser skal have en Playwright-test.
4. Mutationer skal testes med manipulerede browserdata; serveren er altid autoritativ.
5. Nye offentlige JavaScript-assets skal passe inden for performancebudgettet eller ledsages af en dokumenteret budgetbeslutning.
6. Skips skal have en konkret begrundelse. En test må ikke gøres grøn ved blot at blive slået fra.

## Fejlfinding

- Vitest-fejl: kør den nævnte fil alene med `npm test -- --run <fil>`.
- Playwright-fejl: åbn `playwright-report/` og brug trace fra `test-results/`.
- Tidsfejl: brug `tests/e2e/test-config.ts`; hardcod ikke relative minutter.
- Databasetest må kun køres med `DEPLOYMENT_ENV=local` eller `preview`. Stop, hvis forbindelsens miljø ikke kan bekræftes.
