# Beslutninger

| Dato | Beslutning | Status | Konsekvens |
| --- | --- | --- | --- |
| 2026-08-27 | Hvert pull request og push til `master` kører en hemmelighedsfri kvalitetsport med lint, typer, enhedstests, build og performancebudgetter. Database-E2E aktiveres kun mod en særskilt testbranch via GitHub Secrets. | Besluttet | Almindelige regressioner opdages automatisk. De blokeres først før produktion, når `master` er beskyttet med et PR-/statuscheck-krav; produktionsdata og produktionskonti eksponeres aldrig for CI. |
| 2026-08-27 | Offentlige sider bruger statisk CSP og prerendering; nonce-CSP afgrænses til login, personale og menuadmin. | Besluttet | En global nonce gjorde alle sider dynamiske og fjernede CDN-cache. Backoffice bevarer den strengeste politik, mens den offentlige app fortsat har en snæver CSP og ingen brugerdefineret HTML-rendering. |
| 2026-08-27 | Gæst, personale og menuadmin udgives som tre PWA-profiler med separate manifest-id'er og startadresser. | Besluttet | Installerede ikoner åbner den relevante arbejdsflade på Android, iPhone og iPad uden at ændre adgangskontrollen. |
| 2026-08-27 | Menu-readmodellen caches i 60 sekunder og invalides efter adminmutationer; checkout er altid frisk og transaktionel. | Besluttet | Reducerer Neon-latens og egress uden at stole på cache for pris, lager eller ordreaccept. |
| 2026-08-14 | V1 er en Next.js-app på Vercel med Neon Postgres og Brevo. | Besluttet | Den tidligere Supabase/Hetzner-retning anvendes ikke. |
| 2026-08-14 | Gæster modtager ikke e-mail i V1. | Besluttet | Kvittering og status vises i appen via et personligt statuslink. |
| 2026-08-14 | Restauranten får én driftsmail ved hver serverbekræftet, ny ordre. | Besluttet | Mail sendes efter database-commit og må ikke blokere ordreoprettelse. |
| 2026-08-14 | Personale og menuadmin bruger Neon Auth med separate `staff`- og `admin`-konti i V1. | Besluttet | Roller ligger i servervaliderede `staff_profiles`; `staff` kan aldrig udføre menuadminhandlinger. |
| 2026-08-14 | Alle nuværende billeder er AI-genererede demoassets af Hansen-Djurhuus. | Besluttet | Der er ingen tredjepartsrettigheder; aktiverne udskiftes før produktion. |
| 2026-08-14 | Runtime-assets ligger i `public/images/`. | Besluttet | Koden bruger URL'er som `/images/tee-time-logo.png`. |
| 2026-08-14 | Kundeoplysninger anonymiseres senest 30 dage efter ordreoprettelse. | Besluttet | Navn, telefon, placeringstekst, noter, statuslinks og outbox-modtager fjernes; anonyme ordredata bevares. |
| 2026-08-14 | Databeskyttelsestekst publiceres i appen før pilot. | Besluttet | Restaurantens juridiske oplysninger og kontakt skal udfyldes før produktion. |
| 2026-08-25 | Gæstesiden forenkles til kun banebestilling; klubhus/terrasse fjernes fra gæste-UI'et (men bevares i datamodellen og API'et). | Besluttet | Kun ét bestillingssted vises og understøttes i gæsteflowet fremover. |
| 2026-08-25 | Personaleflowet reduceres til Accepter/Afvis; mellemstatusser (`preparing`/`ready`/`delivering`/`completed`) bruges ikke længere aktivt. | Besluttet | `approved` er nu en slutstatus for personalet; gæsten får besked om afhentningstidspunkt direkte i stedet for en flertrins-status. |
| 2026-08-25 | Køkkenbon-udskrivning forberedes som et outbox-mønster, før en fysisk printer er valgt. | Besluttet | `print_outbox` og `KITCHEN_PRINTER_URL` er klar til en fremtidig printerintegration. Star TSP143IV X4 (CloudPRNT, åben standard) og Sunmi NT311 (billigere, proprietært API) er de to overvejede modeller. |
| 2026-08-25 | Menuadministration udvides til fuld CRUD (kategorier, allergener, menupunkter, tilvalg, tilbud) med billedupload via Vercel Blob. | Besluttet | Ingen "Gem"-knapper; alt gemmes automatisk ved blur/klik. Billedupload kræver en tilsluttet, public Blob-butik. |
| 2026-08-25 | Et tilbud med en pris bliver automatisk et bestilbart menupunkt i gæstemenuen. | Besluttet | Reducerer dobbeltarbejde for personalet; se `lib/admin-catalog.ts::syncOfferProduct`. |
| 2026-08-25 | En midlertidig, let huskelig admin-demo-konto er tilføjet til gennemgang før drift. | Besluttet | `ADMIN_DEMO_EMAIL`/`ADMIN_DEMO_PASSWORD` giver adgang til både personale og menuadmin. Skal fjernes eller roteres før produktionslancering. |
| 2026-08-26 | Personale- og adminkonti går fra én delt konto pr. rolle til individuelle Neon Auth-konti pr. medarbejder, oprettet via `npm run db:invite-staff`. | Besluttet | Løser det tidligere åbne spørgsmål om delt kontoadministration. `staff_profiles` understøttede allerede individuelle rækker; det manglende var en måde at oprette dem på. `ADMIN_DEMO_EMAIL`/`ADMIN_DEMO_PASSWORD` er stadig til overs og bør udfases, når rigtige konti findes for alle brugere. |
| 2026-08-26 | Login-, verifikations- og nulstillingsmails for medarbejdere sendes via Resend (`mail.hansendjurhuus.dk`) gennem et Neon Auth-webhook, i stedet for Neon Autts standardskabeloner. | Besluttet | Adskilt fra Brevo, som fortsat udelukkende er restaurantens ordre-driftskanal — to udbydere, to formål. Webhooket skal registreres én gang pr. miljø, se `docs/AUTH.md`. |
| 2026-08-26 | `db/invite-staff.ts` og glemt-adgangskode-routen kaldte fejlagtigt `/forget-password`; det korrekte endpoint er `/request-password-reset` (bekræftet mod Neons egen SDK-dokumentation for `auth.requestPasswordReset`). | Besluttet | Fundet ved en reel test (404). Rettet begge steder; ingen andre kald bruger det forkerte navn. |
| 2026-08-26 | `db/invite-staff.ts` sendte `redirectTo` som appens forside i stedet for `/auth/nulstil-adgangskode`. | Besluttet | Fundet ved en reel test (mail-linket endte på forsiden i stedet for password-siden). Rettet; `app/api/auth/forgot-password/route.ts` havde allerede den korrekte sti. |

| 2026-08-26 | Der er tilføjet en admin-side (`/menuadmin/personale`) til at invitere medarbejdere, som gør det samme som `db:invite-staff` men via browseren i stedet for en terminal. | Besluttet | CLI-scriptet findes stadig som alternativ. Valgt fordi ejeren ikke selv er udvikler og skal kunne oprette konti uden hjælp. |

## Åbne beslutninger før database- og driftsfaser

- Præcis restaurantadresse, afsenderdomæne og Brevo-konfiguration.
- Endelig billedstrategi, når demoassets udskiftes.
