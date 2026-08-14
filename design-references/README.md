# Handoff: Tee-Time — Roskilde Golf Restaurant App

## Overview
Ordre-app til restauranten "Tee-Time" på Roskilde Golfklub. Tre roller i én app: Gæst (bestiller mad/drikke, følger ordrestatus), Personale (godkender/behandler ordrer), og Menuadministration (redigerer menu, priser, allergener, kategorier).

## About the Design Files
Filerne i denne pakke er **designreferencer bygget i HTML** — en klikbar prototype der viser udseende og opførsel, ikke produktionskode der skal kopieres direkte. Opgaven er at **genskabe designet i jeres rigtige udviklingsmiljø** (fx React Native, Swift/SwiftUI, Kotlin, eller web) med dets etablerede mønstre og biblioteker. Er der intet miljø endnu, vælg det mest passende framework og implementér der.

`Tee-time.dc.html` er en enkelt fil der indeholder alle tre roller/skærme; rolleskift sker via en simpel tab-switcher i toppen (kun til preview — i den rigtige app er Gæst, Personale og Menuadmin sandsynligvis separate apps/logins).

## Fidelity
**High-fidelity**: Farver, typografi, spacing og indhold er endelige designbeslutninger, ikke placeholder. Billeder markeret som `<image-slot>` er pladsholdere for rigtige fotos.

## Roller & skærme

### Gæst (vises i iPhone-ramme, 402×874 — design til denne skærmstørrelse)
1. **Hjem / "Hvor er du?"** — hero-billede (terrasse), valg af lokation (Klubhus / Terrasse / Hul 1 osv. — se `placementOptions` i koden), starter en ordre.
2. **Menu** — kategori-chips i horisontal scroll (ingen synlig scrollbar — `scrollbar-width:none` + `::-webkit-scrollbar{display:none}`), produktliste pr. kategori, allergen-badges pr. produkt.
3. **Produktdetalje** — beskrivelse, valg/tilvalg (options), antal, "Læg i kurv".
4. **Kurv** — linjeoversigt, redigér antal/fjern, total, "Gå til betaling".
5. **Checkout** — ordreoversigt + "Bekræft bestilling".
6. **Bekræftelse** — kvittering.
7. **Status** — live ordrestatus (afventer / godkendt / på vej). Springer automatisk hertil når personalet godkender ordren, hvis gæsten ikke allerede selv har navigeret væk.
8. **Tidligere bestillinger** — liste + detaljeside med **"Genbestil"** (lægger varerne direkte i kurven).
9. **Tilbud** — kort med billede (220px højt), badge, beskrivelse, "Bestil nu" → menu.

**Bundnavigation** (fast/sticky i bunden, altid synlig): Hjem · Menu · Tidligere · Tilbud. "Menu" sender til lokationsvalg først, hvis ingen lokation er valgt endnu.

### Personale (vises i iPad-ramme, liggende, 1050px bredde / 4:3 — design til tablet)
- Liste over aktive ordrer, grupperet efter status.
- **Godkend**-knap pr. ordre (evt. med forslag til nyt tidspunkt, +10 min).
- Arkiv over afsluttede ordrer.
- Kan sortere ordreoversigten nyeste/ældste først (tweakable — se Design Tokens/State).

### Menuadministration (vises i iPad-ramme, samme som Personale)
- Redigér pris og udsolgt-status pr. produkt (toggle-switch).
- Tilføj/fjern allergener globalt (fjernelse renser automatisk allergenet fra alle produkter).
- Tilføj/fjern menupunkter pr. kategori (navn + pris).
- Tilføj/fjern kategorier (fjernelse af en kategori beholder ikke dens produkter i visningen — bør besluttes i den rigtige app om produkter skal flyttes eller slettes).

## Interactions & Behavior
- Alle knapper/inputs er almindelige klik/change-handlers, ingen komplekse animationer — hold overgange simple (fade/slide ~150–200ms er passende, prototypen har ingen).
- Toast-besked (mørk pille, bund af skærm) ved handlinger som "Ordre godkendt", "Menupunkt tilføjet", "Genbestilling tilføjet til kurv" — vises kort og forsvinder selv.
- Ingen formvalidering udover: navn/pris skal være udfyldt for at tilføje menupunkt/kategori/allergen (tom streng → knap gør intet).
- PWA: `manifest.json` + `sw.js` (cache-first service worker) er inkluderet som reference for install-/offline-adfærd — I skal bygge jeres egen ifht. jeres rigtige asset-liste og build-pipeline.

## State Management
Al state ligger i én komponent-klasse i prototypen (`DCLogic`/React-agtig `state` + `setState`). Central state til at genskabe:
- `screen` — hvilken skærm der vises (string enum, se skærmliste ovenfor).
- `mode` — 'guest' | 'staff' | 'admin' (rolle).
- `placement` — valgt lokation for gæsten.
- `cart` — array af linjer `{id, productId, name, unitPrice, qty, options, note}`.
- `orders` — alle ordrer, med status (afventer/godkendt/afsluttet), `requestedClock`, `approvedClock`, `currentOrderId` peger på gæstens aktive ordre.
- `products` — array med `{id, category, name, price, desc, allergens[], soldOut, options}`.
- `categories` — array af kategorinavne (redigerbar liste).
- `allergensAll` — array af allergennavne (redigerbar liste).
- `previousOrders` — historik pr. gæst, bruges til genbestilling.
- `toast` — aktuel toast-tekst eller null.

Nøgle-transition: **Personale godkender ordre → hvis ordren er gæstens aktive (`currentOrderId`) og gæsten ikke allerede er på statusskærmen, skift gæstens skærm automatisk til 'status'.**

## Design Tokens

**Farver**
- Mørkegrøn (primær/tekst/knapper): `#1E3328`
- Creme (baggrund): `#F7F3EC`
- Beige/topbar-baggrund: `#E9E2D0`
- Kort-kant: `#EFE7D8` / `#EDE4CF` / `#F3EEDF`
- Sekundær tekst: `#8A8378`
- Guld-accent (aktiv-dot): `#A9812F`
- Fejl/rød (udsolgt-toggle, fjern-knapper): `#8C3B2E`
- Mørk tekst: `#1C2620`

**Typografi**
- Overskrifter: **Spectral** (serif), 600–700 weight.
- Brødtekst/UI: **Manrope**, 400–800 weight.
- Skala i prototypen: H1 ~19–26px, sektionsoverskrift ~15px, brødtekst ~12.5–14.5px, labels/badges ~10–12px.

**Spacing/radius**
- Kort-radius: 14–18px. Pille-radius (badges/knapper): 999px eller 7–12px afhængig af element.
- Standard padding i skærme: 16–20px sider.

**Device-rammer** (kun til prototype-preview, ikke del af selve app-designet)
- Gæst: iPhone-ramme, 402×874.
- Personale/Menuadmin: iPad-ramme (sølv bezel), 1050px bred, 4:3 format.

## Assets
- `assets/tee-time-logo.png` — app-logo (brugerens eget billede), vises i topbar og iOS-app-ikon/manifest.
- `assets/golf-restaurant-terrasse.jpg` — hero-foto på gæstens forside (brugerens eget billede).
- Tilbudskort på Tilbud-siden bruger `<image-slot>` pladsholdere (`offer-lunch`, `offer-family`, `offer-19hul`) — indsæt rigtige fotos.
- Ingen ikoner fra et ikon-bibliotek er brugt; navigation bruger tekst + en lille farvet prik som aktiv-indikator.

## Files
- `Tee-time.dc.html` — hele prototypen (alle tre roller, alle skærme).
- `ios-frame.jsx` — device-bezel bruges kun til preview i prototypen, ikke en del af selve UI-designet.
- `manifest.json`, `sw.js` — PWA-reference (installérbarhed + basic offline caching).
- `assets/` — logo og hero-billede.
