# Mapeo a TCGplayer — lo que quedó sin resolver

Estado al cerrar el paso 2 de la auditoría. Regenerar con:

```
node scripts/tcg-audit-sets.mjs
node scripts/tcg-audit-cards.mjs
```

## Resumen

| | |
|---|---|
| Sets nuestros | 192 |
| Sets mapeados | 182 |
| Cartas comparadas | 18.840 |
| Cartas identificadas | **18.829 (99,94 %)** |
| Sin resolver | 11 |

Quedan fuera del cálculo `prize-pack-series` y `misc-cards`: sus números de
carta son un índice nuestro, no el número impreso, y su mapeo a TCGplayer ya
está resuelto por `product_id` en `scripts/tcgplayer-sets/`.

## 10 sets que TCGplayer no tiene

Sus precios tendrían que seguir saliendo de Scrydex, o quedarse sin precio.

`topps-1`, `topps-2`, `topps-3`, `futsal-promos`, `poke-card-creator`,
`mcd-2013`, `mcd-2019-fr`, `mcd-dragon-discovery`, `mcd-match-2023`,
`mcd-match-battle`.

## 11 cartas sin resolver

**Repetidas de nuestro lado (3).** La misma carta está dos veces en nuestro
`sv-promos` con dos números distintos. TCGplayer tiene una sola, así que ambas
apuntan al mismo producto. Habría que decidir si se borra la copia.

| Carta | Nuestros números |
|---|---|
| Flaaffy | #15 y #108 |
| Armarouge ex | #105 y #125 |
| Kingambit | #113 y #130 |

**Ambigua (1).** `nintendo-promos` #27 "Tropical Tidal Wave": TCGplayer la tiene
en 7 versiones del mundial 2005 (Finalist, Participation, Staff, Top 16…), cada
una con su precio. Nuestra carta no distingue cuál es, así que no se puede
elegir sin decidirlo a mano.

**No están en ese set de TCGplayer (7).**

- `base-set` #8 Machamp — en Base Set solo salía 1st Edition, TCGplayer lo lista aparte
- `sv-promos` #106 Pikachu ex, #107 Mareep, #109 Ampharos, #110 Darkrai ex,
  #111 Pawniard, #112 Bisharp — puede que allá estén dentro de Blister
  Exclusives o Deck Exclusives, que son sets aparte

## Sets de TCGplayer que no tenemos

No hacen falta para migrar, pero son candidatos a agregar con el mismo proceso
de Prize Pack Series:

```
World Championship Decks      1963
League & Championship Cards    626
Deck Exclusives                506
Jumbo Cards                    342
Blister Exclusives             135
Shining Fates: Shiny Vault     122
Hidden Fates: Shiny Vault       94
```
