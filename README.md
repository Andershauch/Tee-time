# Tee-Time

En dansk, mobil-først bestillingsapp til golfklubbens restaurant. Gæster bestiller banebestilling til afhentning i baren; personalet accepterer og køkkenet får besked.

## Status

Fase 0–5 er etableret: menu og tilbud læses fra en ikke-produktions Neon-branch, gæster kan oprette rigtige, servervaliderede ordrer med personlige statuslinks, og personale/admin kan behandle ordrer og administrere hele menuen (inkl. billeder, tilvalg og tilbud) fra beskyttede tablet-ruter. Fase 5 tilføjer en transaktionel Brevo-outbox med retry, konservativ PWA-offlineadfærd, sikkerhedsheaders og release-dokumentation. Personaleflowet er forenklet til Accepter/Afvis, og en køkkenbon-outbox (`print_outbox`) er klar til en fysisk printer, når én er valgt — se [Arkitektur](docs/ARCHITECTURE.md). En produktionspilot afventer stadig en godkendt retentionpolitik og de rigtige produktionsmiljøvariabler.

## Lokal start

```bash
npm install
npm run dev
```

Åbn derefter `http://localhost:3000`.

## Kvalitetstjek

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Browsertests køres med `npm run test:e2e`, efter Playwrights Chromium-browser er installeret.

## Database og lokale testkonti

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:provision-dev-auth
```

`db:migrate` afviser eksplicit `DEPLOYMENT_ENV=production`. Brug kun en lokal eller preview Neon-branch, og læs [databaseopsætningen](docs/DATABASE.md), før du sætter `DATABASE_URL`.

De lokale browsertestkonti læses kun fra `.env.local`. Opret dem med `db:provision-dev-auth`; der må aldrig ligge adgangskoder i repoet. Se [auth-drift](docs/AUTH.md) for sessioner og miljøopsætning.

## Dokumentation

- [Byggeplan](docs/Tee-Time-Codex-Byggeplan.md)
- [Arkitektur](docs/ARCHITECTURE.md)
- [Beslutninger](docs/DECISIONS.md)
- [Databaseopsætning](docs/DATABASE.md)
- [Auth-drift](docs/AUTH.md)
- [Release og rollback](docs/RELEASE.md)
- [Assets og licenser](docs/assets-and-licensing.md)

## Asset-URL'er

Filer under `public/` tilgås fra URL-roden. Eksempel: `public/images/tee-time-logo.png` bruges som `/images/tee-time-logo.png`.
