# Fase 5: drift, release og rollback

## E-mailflow

Når en ordre committes, oprettes der i samme Neon-transaktion én `email_outbox`-post med en stabil idempotency-nøgle. Brevo-kaldet sker først efter commit. En fejl i Brevo ændrer derfor aldrig ordrestatus eller gæstens kvittering.

`BREVO_DELIVERY_MODE` er altid en af:

- `disabled` — sikker lokal standard; posten markeres som blokeret, indtil en komplet konfiguration findes.
- `sandbox` — sender en valideringsrequest med Brevos `X-Sib-Sandbox: drop`; Brevo sender ingen mail og opretter ingen Brevo-mail-log.
- `live` — sender én driftsmail til `RESTAURANT_NOTIFICATION_EMAIL` fra en verificeret `BREVO_SENDER_EMAIL`.

Vercel Cron kalder hvert femte minut `/api/internal/email-retry`. Ruten kræver `CRON_SECRET`, genoptager konfigurationsblokerede poster, håndterer låse og prøver midlertidige fejl op til fem gange med stigende ventetid. Logning indeholder kun tekniske id'er og fejlkoder — aldrig token, navn, telefon, e-mail, noter eller provider-respons.

Et timeout efter Brevo kan være accepteret hos udbyderen uden at appen har modtaget svaret. Flowet er derfor **at-least-once**. Outbox-låsen minimerer dobbeltsendelser, men driftspersonalet skal kunne håndtere en sjælden dubletmail.

## Brevo: sikker opsætning

1. Opret eller brug restaurantens Brevo-konto; den bør ejes af restauranten, ikke af en privat udviklerkonto.
2. Tilføj restaurantens afsenderdomæne i Brevo og læg de viste SPF- og DKIM-poster ind hos domænets DNS-udbyder. Vent på Brevos verifikation.
3. Opret en separat API-nøgle til Tee-Time. Kopiér den direkte til Vercels hemmelige miljøvariabel `BREVO_API_KEY` — aldrig til Git, chat eller en offentlig skærm.
4. I Preview sættes `BREVO_DELIVERY_MODE=sandbox`, `BREVO_SENDER_EMAIL` og en ufarlig `BREVO_SANDBOX_RECIPIENT`. Sandboxtilstanden bruger `X-Sib-Sandbox: drop`, så ingen rigtig mail sendes.
5. Sæt en lang, tilfældig `CRON_SECRET`, kontrollér at Vercel Cron rammer retry-ruten, og opret en testordre. Bekræft i Neon, at outbox-posten når `sent`.
6. Først efter Preview-godkendelse sættes `BREVO_DELIVERY_MODE=live` og `RESTAURANT_NOTIFICATION_EMAIL` i Production med adskilte nøgler. En ukendt mode fejler sikkert som `disabled` og kan ikke sende mail.

## Vercel-miljøer

| Miljø | Database/Auth | Brevo | Vigtige regler |
| --- | --- | --- | --- |
| Local | Dev Neon-branch | `disabled` eller `sandbox` | Kun `.env.local`; ingen rigtige restaurantmails. |
| Preview | Separat Neon preview-branch | `sandbox` | Separat `CRON_SECRET`; aldrig production-modtager eller credentials. |
| Production | Dedikeret production Neon-branch | `live` efter afsenderverifikation | Separat `DATABASE_URL`, Auth-URL, Brevo-nøgle og cron-secret. |

`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `RESTAURANT_NOTIFICATION_EMAIL`, `CRON_SECRET` og testadgangskoder oprettes som hemmelige Vercel-miljøvariabler. Ingen værdi må være en `NEXT_PUBLIC_*`-variabel eller ligge i Git.

## Persondata før pilot

Kundeoplysninger anonymiseres automatisk senest 30 dage efter ordreoprettelsen af den beskyttede cron-kørsel: navn, telefon, placeringstekst, ordrelinjens bemærkning, statusbegrundelse, statuslink og outbox-modtager fjernes eller gøres ubrugelige. Kun anonyme ordre- og driftsoplysninger bevares. Den dataansvarlige skal stadig godkende formål, adgang, backup/restore, eksport/indsigtsproces samt Brevos databehandler-/retentionindstillinger før pilot. Restaurantmailen indeholder kun de oplysninger, der er nødvendige for at behandle ordren.

## Releasecheckliste

- [ ] Preview-migrationen er gennemgået og testet to gange på en ny Neon-branch.
- [ ] Preview bruger `BREVO_DELIVERY_MODE=sandbox`; sandbox-request og outbox-`sent`-hændelse er verificeret.
- [ ] Production-afsenderdomæne er verificeret i Brevo.
- [ ] Production bruger nye, separate Neon-, Auth-, Brevo- og cron-hemmeligheder.
- [ ] `CRON_SECRET` beskytter retry-ruten, og Vercel Cron-kørslen er observeret.
- [ ] CSP, HSTS (production), `nosniff`, frame- og permissions-policy er tjekket i preview-browseren.
- [ ] Service worker cacher kun offline-siden og billeder; personale, admin, ordrestatus og API-svar er ikke cachet.
- [ ] Retention- og beredskabsbeslutningen ovenfor er godkendt af den dataansvarlige.

## Rollback

1. Stop eller rollback Vercel-deploymenten til sidste kendte gode deployment.
2. Slå Brevo-kørsler fra ved at fjerne `CRON_SECRET`/pause cronen; slet ikke outbox-poster.
3. Lad eksisterende ordrer og snapshots stå urørte. Send eventuelle ventende driftsmails manuelt fra den auditerbare outbox efter godkendelse.
4. Opret en ny Neon-branch fra et kendt godt tidspunkt, eller brug Neons godkendte restore-proces. Kør aldrig automatisk down-migration i production.
5. Gennemgå outbox-status, fejlkoder og ordredata før relancering.

## Uafsluttede fund før pilot

Disse punkter er bevidst udsat, mens byggearbejdet fortsætter. De skal lukkes og afkrydses i releasechecklisten før en production-pilot:

- [ ] Godkend den implementerede 30-dages anonymisering, adgang og backup/restore for person- og ordredata.
- [ ] Konfigurér separate Preview- og Production-hemmeligheder i Vercel; ingen hemmeligheder må ligge lokalt i repoet.
- [ ] Udfør en rigtig Brevo-sandboxtest i Preview med verificeret afsender. Bekræft at outbox går til `sent` uden at sende en rigtig mail.
- [ ] Verificér SPF/DKIM og endelig afsenderdomæne, før `BREVO_DELIVERY_MODE=live` aktiveres.
- [ ] Aftal driftsprocedure for den sjældne dubletmail, som kan opstå ved provider-timeout efter accepteret levering.
