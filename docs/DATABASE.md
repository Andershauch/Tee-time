# Databaseopsætning

## Formål

Fase 2 bruger Neon Postgres og Drizzle. Schema og migrations er versionsstyrede i `db/schema.ts` og `db/migrations/`; seeddata bruger stabile tekst-id'er og beløb i heltal i øre.

## Miljøer

| Miljø | Neon-kilde | `DEPLOYMENT_ENV` | Formål |
| --- | --- | --- | --- |
| Lokal | Egen ikke-produktions Neon-branch | `local` | Udvikling og migrationstest |
| Preview | Separat Neon-branch pr. preview eller delt preview-branch | `preview` | Vercel Preview og review |
| Produktion | Produktionens Neon-branch | `production` | Kun godkendt deployment-runbook |

Preview og produktion må aldrig bruge samme `DATABASE_URL`. Vercels Preview- og Production-miljøvariabler sættes separat i Vercel; `.env` og credentials committes aldrig.

## Første lokale eller preview-kørsel

1. Opret eller vælg en tom **ikke-produktions** Neon-branch.
2. Sæt `DATABASE_URL` og `DEPLOYMENT_ENV=local` eller `preview` i en lokal `.env.local`-fil. CLI-kommandoerne læser denne fil automatisk; den må aldrig committes.
3. Kør `npm run db:migrate`. Scriptet afviser `production` før databaseforbindelsen oprettes.
4. Kør `npm run db:seed`.
5. Start appen med `npm run dev`. Når `DATABASE_URL` findes, læser gæsteruterne menu og tilbud server-side fra Neon.
6. For personale/admin lokalt: sæt Neon Auth-URL og testkonti i `.env.local`, og kør `npm run db:provision-dev-auth`. Se [auth-drift](AUTH.md).

Mangler `DATABASE_URL`, bruger appen bevidst fase-1 fixtures for at holde design- og buildarbejde credential-frit. Det er ikke en produktionsfallback.

## Migrationer og rollback

- Kør først `npm run db:generate`, gennemgå den nye SQL-fil, og commit den sammen med schemaændringen.
- Test altid migration og seed to gange på en ny Neon preview-branch. Anden kørsel skal være en no-op for migrations og idempotent for seeddata.
- Fase 2 indeholder ingen `DROP`, sletning eller automatisk down-migration.
- Ved fejl: stop deploymenten, opret en ny branch fra et kendt godt punkt eller brug Neons godkendte restore/branch-proces. Foretag ikke manuel produktionstilbageførsel uden backup-/rollback-plan.

## Seedpolitik

Seedet opserter kun `seed_source = 'phase-2-menu'`. Når en seedet kategori, vare, tilvalg, allergen eller tilbud ikke længere findes i `db/seed-data.ts`, deaktiveres den i stedet for at blive slettet. Produkt-allergen-links deaktiveres tilsvarende. Administrativt oprettede rækker skal ikke bruge denne seed source.

## Kontroller før produktion

- Kontroller at `price_ore` og `price_delta_ore` altid er heltal.
- Kontroller fremmednøgler, unikke slugs, negative-beløbs constraints og tilbudsperioder på preview.
- Kontroller at inaktive kategorier, produkter, tilvalg, allergener og tilbud ikke vises i gæstemenuen; udsolgte, aktive varer vises stadig som udsolgte.
