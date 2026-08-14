# Personale-login og driftsopsætning

## Roller

Neon Auth bekræfter e-mail og adgangskode. Tee-Time slår derefter den aktive profil op i `staff_profiles` på serveren ved hver beskyttet side og API-handling:

- `staff` kan behandle ordrer på `/personale`.
- `admin` kan desuden åbne og ændre `/menuadmin`.

Rollen kommer aldrig fra browseren. En session er en tilfældig, `HttpOnly`, `SameSite=Lax` cookie; kun dens SHA-256-hash gemmes i `staff_sessions`. Den udløber efter 30 minutter. En deaktiveret profil mister adgang med det samme ved næste request.

## Miljøer uden hemmeligheder

| Miljø | Neon Auth | App-miljøvariabler | Konti |
| --- | --- | --- | --- |
| Lokal | Auth på Tee-Times dev-branch | `DEPLOYMENT_ENV=local`, lokal `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Kun test-personale og test-admin i `.env.local` |
| Preview | Auth og database på separat preview-branch | `DEPLOYMENT_ENV=preview`, preview-URL som `NEXT_PUBLIC_APP_URL` | Adskilte, mindst privilegerede testkonti |
| Produktion | Auth og database på produktionsbranch | `DEPLOYMENT_ENV=production`, produktions-URL | To valgte driftkonti med stærke, unikke adgangskoder |

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

Produktionsreset er en manuel driftsprocedure: deaktiver profilen, tilbagekald sessioner med godkendt produktionsadgang, skift adgangskoden i Neon Auth og genaktivér først profilen, når ejerskabet er verificeret. Den korte 30-minutters session begrænser et vindue, hvis et reset i Neon foretages før sessionerne er tilbagekaldt.

Alle state-ændringer kræver appens samme `Origin` som ekstra CSRF-værn. En browser uden adgang må hverken se personaleordrer eller udføre admin-mutationer.
