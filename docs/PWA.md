# PWA på telefon og iPad

Tee-Time udgiver tre installerbare profiler fra samme sikre kodebase:

| Profil | Installer fra | Åbner på | Formål |
| --- | --- | --- | --- |
| Gæst | `/` | `/` | Bestilling på Android og iPhone |
| Personale | `/personale` | `/personale` | Ordrebehandling på iPad/tablet |
| Menuadmin | `/menuadmin` | `/menuadmin` | Menuadministration på iPad/tablet |

Profilerne har separate manifest-id'er og startadresser. Login, rolle- og datakontrol sker fortsat på serveren; installation giver ingen ekstra adgang.

## Installation

### Android

1. Åbn den ønskede profil i Chrome over HTTPS.
2. Vælg **Installér app** i browsermenuen eller den viste installationsprompt.
3. Kontrollér, at ikonet åbner den forventede startside i et selvstændigt vindue.

### iPhone og iPad

1. Åbn den ønskede profil i Safari over HTTPS.
2. Tryk **Del** og derefter **Føj til hjemmeskærm**.
3. Bevar det foreslåede navn, og tryk **Tilføj**.

iOS viser ikke den samme automatiske installationsprompt som Chromium. Installation via Safaris delingsmenu er derfor forventet adfærd.

## Offlinegrænse

- Offline-siden og et lille appikon precaches.
- Lokale billeder bruger stale-while-revalidate og opdateres i baggrunden.
- API'er, login, personale, menuadmin, ordrestatus og tidligere ordrer lægges aldrig i service-worker-cachen.
- En ordre vises aldrig som sendt uden et succesfuldt serversvar.
- Ved en ny service-worker-version fjernes gamle Tee-Time-caches, og den nye worker overtager åbne faner.

## Verifikation før pilot

- Installér gæsteprofilen på mindst én rigtig Android-telefon og én rigtig iPhone.
- Installér både personale- og menuadmin-profilen på den iPad-model, restauranten vil bruge.
- Kontrollér startside, ikon, standalone-visning, login, logout og genåbning efter enhedsgenstart.
- Slå netværket fra på en gæsteside og kontrollér offline-beskeden.
- Kontrollér, at ordre-, personale- og adminindhold ikke kan genåbnes som cachede data offline.
- Gentag testen efter en deployment for at kontrollere service-worker-opdatering.

## Fejlfinding

PWA-installation kræver HTTPS i preview/produktion (localhost er den normale udviklingsundtagelse). Hvis et gammelt ikon eller en gammel offline-side bliver hængende, luk alle installerede Tee-Time-vinduer, åbn siden online igen og genstart appen. Ved fortsatte problemer fjernes installationen og oprettes på ny.
