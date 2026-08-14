# Tee-Time agentregler

## Produkt og fasearbejde

- Byg en dansk, mobil-først bestillingsapp til golfklubbens restaurant.
- Følg `docs/Tee-Time-Codex-Byggeplan.md` fase for fase. En fase afsluttes først efter review og grøn lint, typecheck, relevante tests og build.
- Designreferencerne i `design-references/` er visuelt facit. `Tee-time.dc.html`, device-rammer, `manifest.json` og `sw.js` er referencefiler og må ikke kopieres direkte ind i appen.

## Sikkerhed og data

- Stol aldrig på priser, totaler, lagerstatus eller roller fra browseren. Serveren validerer alle mutationer.
- Brug kun hemmeligheder via miljøvariabler. Commit aldrig `.env`-filer eller produktionsnøgler.
- I version 1 bruges én delt Neon Auth-konto til både personale og menuadministration. Individuel ansvarssporing og rolleopdeling er bevidst udsat.
- Gæster modtager ingen e-mail i version 1. Når en ordre er oprettet og serverbekræftet, sendes én driftsmail til restaurantens konfigurerede adresse; mailfejl må aldrig forhindre ordreoprettelse.

## Assets og kodekvalitet

- Runtime-assets ligger kun i `public/images/` og tilgås med rodbaserede URL'er, fx `/images/tee-time-logo.png`.
- De nuværende billeder er Hansen-Djurhuus' AI-genererede demoassets og skal udskiftes før produktionslancering.
- Brug Server Components som standard; brug klientkomponenter kun for browser-state, interaktion eller polling.
- Bevar tilgængelighed: semantisk HTML, synlige fokusmarkeringer og tastaturbetjening.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
