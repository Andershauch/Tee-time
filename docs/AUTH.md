# Personale-login og driftsopsætning

## Roller

Neon Auth bekræfter e-mail og adgangskode. Tee-Time slår derefter den aktive profil op i `staff_profiles` på serveren ved hver beskyttet side og API-handling:

- `staff` kan behandle ordrer på `/personale`.
- `admin` kan desuden åbne og ændre `/menuadmin`.

Rollen kommer aldrig fra browseren. En session er en tilfældig, `HttpOnly`, `SameSite=Lax` cookie; kun dens SHA-256-hash gemmes i `staff_sessions`. Den udløber efter 30 minutter. En deaktiveret profil mister adgang med det samme ved næste request.

## Individuelle konti

Hver medarbejder har sin egen Neon Auth-konto og sin egen `staff_profiles`-række — der er ikke længere kun én delt konto pr. rolle. En ny konto oprettes med:

```bash
npm run db:invite-staff -- person@example.com "Fulde Navn" staff
```

(`admin` i stedet for `staff` for menuadgang.) Scriptet (`db/invite-staff.ts`) opretter Neon Auth-kontoen med en lang, tilfældig adgangskode som ingen ser eller bruger, opdaterer `staff_profiles`, og beder derefter Neon Auth sende en nulstillings-mail med det samme — personens første handling er selv at vælge sin adgangskode via mailen. `ADMIN_DEMO_EMAIL`/`ADMIN_DEMO_PASSWORD` er stadig kun til gennemgang før drift og bør fjernes, når rigtige individuelle konti er på plads.

## Mail til login og adgangskode (Resend)

Neon Auth sender selv verifikations- og nulstillingsmails som standard, men med generiske skabeloner. `app/api/auth/neon-webhook` overtager afsendelsen: Neon kalder dette webhook-endpoint i stedet for at sende sin egen mail, og vi sender en brandet, dansk mail via Resend (`lib/auth-mail.ts`) fra `mail.hansendjurhuus.dk` — samme domæne/konto som er sat op til andre Hansen-Djurhuus-projekter. Dette er adskilt fra Brevo, som fortsat kun bruges til restaurantens ordre-driftsmail.

Krævede miljøvariabler (se `.env.example`): `RESEND_API_KEY`, `AUTH_MAIL_FROM_NAME`, `AUTH_MAIL_FROM_ADDRESS`.

### Webhook-verifikation

`lib/neon-auth-webhook.ts` verificerer hvert kald: Neon signerer med en detached Ed25519-signatur (`x-neon-signature`, `x-neon-signature-kid`, `x-neon-timestamp`-headers) mod en offentlig nøgle hentet fra `${NEON_AUTH_BASE_URL}/.well-known/jwks.json`, plus et 5-minutters friskhedsvindue mod replay. Et kald der ikke verificerer, logges (`auth_webhook_rejected`) og afvises med 401 — der sendes aldrig mail på baggrund af et uverificeret kald.

### Webhook-registrering

Skal gøres én gang pr. miljø (lokal/preview/produktion har hver sin Neon Auth-instans), efter deployment, med en Neon-kontos API-nøgle (ikke en app-hemmelighed — sæt den ikke i `.env`):

```bash
curl -X PUT "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$NEON_BRANCH_ID/auth/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -d '{
    "enabled": true,
    "webhook_url": "https://<dit-miljø>/api/auth/neon-webhook",
    "enabled_events": ["send.otp", "send.magic_link"]
  }'
```

Bevidst kun `send.otp` og `send.magic_link` — ikke `user.before_create`/`user.created`, som forventer en anden svarform og ikke er implementeret i denne route.

### Glemt adgangskode (medarbejdere)

`/auth/glemt-adgangskode` → `/api/auth/forgot-password` (rate-begrænset, svarer altid `{ok:true}` for ikke at afsløre om en adresse findes) → Neon Auths `/forget-password` → webhook → mail. Linket i mailen peger på `/auth/nulstil-adgangskode?token=...`, som kalder `/api/auth/reset-password` → Neon Auths `/reset-password`.

## Miljøer uden hemmeligheder

| Miljø | Neon Auth | App-miljøvariabler | Konti |
| --- | --- | --- | --- |
| Lokal | Auth på Tee-Times dev-branch | `DEPLOYMENT_ENV=local`, lokal `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Kun test-personale og test-admin i `.env.local` |
| Preview | Auth og database på separat preview-branch | `DEPLOYMENT_ENV=preview`, preview-URL som `NEXT_PUBLIC_APP_URL` | Adskilte, mindst privilegerede testkonti |
| Produktion | Auth og database på produktionsbranch | `DEPLOYMENT_ENV=production`, produktions-URL | Individuelle konti pr. medarbejder, oprettet via `db:invite-staff` |

Opret `NEON_AUTH_BASE_URL`, `DATABASE_URL` og eventuelle lokale testcredentials i den pågældende platforms hemmelige miljøvariabler. De må ikke indskrives i filer eller deles i chat. Preview og produktion må aldrig genbruge samme databaseforbindelse eller konti.

## Lokal opstart

1. Kopiér `.env.example` til `.env.local` og indsæt kun dev-branchens værdier.
2. Kør `npm run db:migrate`, `npm run db:seed` og `npm run db:provision-dev-auth`.
3. Kør `npm run dev` og åbn `/auth/sign-in`.

## Adgangsændringer og reset

Ved mistanke om kompromitteret adgang: deaktiver først profilen i `staff_profiles`, skift derefter adgangskoden i Neon Auth og tilbagekald eksisterende sessioner. I lokal/preview kan det sidste ske med:

```bash
npm run db:revoke-staff-sessions -- medarbejder@example.com
```

Produktionsreset er en manuel driftsprocedure: deaktiver profilen, tilbagekald sessioner med godkendt produktionsadgang, skift adgangskoden i Neon Auth og genaktivér først profilen, når ejerskabet er verificeret. Den korte 30-minutters session begrænser et vindue, hvis et reset i Neon foretages før sessionerne er tilbagekaldt. Med individuelle konti kan en medarbejder nu også selv bruge "Glemt adgangskode" — det erstatter ikke denne procedure ved mistanke om kompromittering.

Alle state-ændringer kræver appens samme `Origin` som ekstra CSRF-værn. En browser uden adgang må hverken se personaleordrer eller udføre admin-mutationer.
