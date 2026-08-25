# Beslutninger

| Dato | Beslutning | Status | Konsekvens |
| --- | --- | --- | --- |
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

## Åbne beslutninger før database- og driftsfaser

- Hvordan den delte konto administreres og roteres sikkert i driften.
- Præcis restaurantadresse, afsenderdomæne og Brevo-konfiguration.
- Endelig billedstrategi, når demoassets udskiftes.
