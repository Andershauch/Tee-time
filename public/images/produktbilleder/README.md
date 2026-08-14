# Produktbilleder — Tee-Time

20 billeder, WebP. Filnavnet er identisk med varens `id` i koden, så de kan slås op direkte:

```js
const img = `/assets/produkter/${product.id}.webp`;
```

## Produkter (`produkter/`)

| Fil | Vare | Slot-id | Størrelse |
| --- | --- | --- | --- |
| `aeblekage.webp` | Æblekage med flødeskum | `product-aeblekage` | 8 KB |
| `alkoholfri.webp` | Alkoholfri øl | `product-alkoholfri` | 9 KB |
| `burger-klub.webp` | Klubhusburger | `product-burger-klub` | 9 KB |
| `burger-kylling.webp` | Kyllingeburger | `product-burger-kylling` | 9 KB |
| `burger-vegetar.webp` | Grøntsagsburger | `product-burger-vegetar` | 9 KB |
| `dagens-fangst.webp` | Dagens fangst | `product-dagens-fangst` | 9 KB |
| `ekstra-1.webp` | Egen vare 1 (custom-msdfk9lw-m5lz) | `product-custom-msdfk9lw-m5lz` | 7 KB |
| `ekstra-2.webp` | Egen vare 2 (custom-msdfkknf-2a6h) | `product-custom-msdfkknf-2a6h` | 7 KB |
| `entrecote.webp` | Entrecôte 200g | `product-entrecote` | 9 KB |
| `fadoel.webp` | Fadøl 0,4L | `product-fadoel` | 8 KB |
| `fiskefrikadeller.webp` | Fiskefrikadeller | `product-fiskefrikadeller` | 10 KB |
| `islagkage.webp` | Islagkage | `product-islagkage` | 8 KB |
| `kaffe.webp` | Kaffe | `product-kaffe` | 9 KB |
| `moerbrad.webp` | Grillet flæskemørbrad | `product-moerbrad` | 10 KB |
| `salat-caesar.webp` | Cæsarsalat | `product-salat-caesar` | 9 KB |
| `sandwich-club.webp` | Club sandwich | `product-sandwich-club` | 9 KB |
| `sodavand.webp` | Sodavand | `product-sodavand` | 9 KB |

## Tilbud (`tilbud/`)

| Fil | Tilbud | Slot-id | Størrelse |
| --- | --- | --- | --- |
| `19hul.webp` | 19. hul happy hour | `offer-19hul` | 43 KB |
| `family.webp` | Familiesøndag | `offer-family` | 58 KB |
| `lunch.webp` | Ugens frokosttilbud | `offer-lunch` | 34 KB |

Billederne er gemt i den opløsning appen brugte (produktbilleder ca. 2× af 80 px-feltet, tilbudsbilleder ca. 2× af fuld bredde). Skal de bruges større, skal originalerne lægges ind igen i højere opløsning.
