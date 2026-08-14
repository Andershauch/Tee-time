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

## Åbne beslutninger før database- og driftsfaser

- Hvordan den delte konto administreres og roteres sikkert i driften.
- Præcis restaurantadresse, afsenderdomæne og Brevo-konfiguration.
- Endelig billedstrategi, når demoassets udskiftes.
