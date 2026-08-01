/**
 * Paso 3 del mapeo: vincular CADA VARIANTE de cada carta con su producto de
 * TCGplayer, para que ninguna se quede sin precio.
 *
 * Una carta no es una unidad: la #001 de Chaos Rising son dos cosas
 * coleccionables (normal y reverse holo) con precios distintos. En TCGplayer
 * eso puede estar de dos maneras:
 *
 *   · como "printing" dentro del mismo producto — Normal, Reverse Holofoil, y
 *     tambien 1st Edition / Unlimited en los sets viejos
 *   · como producto aparte, con la variante entre parentesis en el nombre —
 *     (Poke Ball Pattern), (Cosmos Holo), (Winner), (Staff)...
 *
 * NO CONSULTA LA RED. El nombre del printing se deriva del nuestro con una
 * tabla, y los productos aparte salen del catalogo que ya esta en .cache/.
 * Una version anterior preguntaba producto por producto que variantes tenia:
 * 21.000 peticiones que terminaron en un 403 de TCGplayer. Los nombres son
 * predecibles y no hay que pedirlos; si un printing no existiera para una
 * carta, el scraper lo vera al pedir el precio.
 *
 * Escribe `variants` en scripts/tcgplayer-mapping/cards/<set>.json:
 *   "variants": { "reverseHolofoil": { "product_id": 693561, "printing": "Reverse Holofoil" } }
 *
 * Uso:
 *   node scripts/tcg-map-variants.mjs
 *   node scripts/tcg-map-variants.mjs --set chaos-rising
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR   = path.resolve(__dirname, "tcgplayer-mapping");
const CARDS_DIR = path.join(MAP_DIR, "cards");
const CACHE_DIR = path.join(MAP_DIR, ".cache");

const args = process.argv.slice(2);
const ONE  = (() => { const i = args.indexOf("--set"); return i >= 0 ? args[i + 1] : null; })();

/**
 * Variantes que viven DENTRO del producto, con el nombre exacto que usa
 * TCGplayer. Es la lista cerrada de sus tipos de impresion.
 */
const PRINTINGS = {
  normal:                  "Normal",
  holofoil:                "Holofoil",
  reverseHolofoil:         "Reverse Holofoil",
  firstEdition:            "1st Edition",
  firstEditionHolofoil:    "1st Edition Holofoil",
  firstEditionShadowless:  "1st Edition Shadowless",
  unlimited:               "Unlimited",
  unlimitedHolofoil:       "Unlimited Holofoil",
  unlimitedShadowless:     "Unlimited Shadowless",
  normalAlternate:         "Normal",
  nonEreader:              "Non Holofoil",
};

/**
 * Variantes que son un producto aparte: el texto que TCGplayer pone entre
 * parentesis. Varias no se parecen en nada al nombre nuestro.
 */
const SUFIJOS = {
  cosmosHolofoil:            ["cosmos holo", "cosmo holo"],
  cosmosReverseHolofoil:     ["cosmos holo", "cosmo holo"],
  pokeBallReverseHolofoil:   ["poke ball pattern", "poke ball"],
  masterBallReverseHolofoil: ["master ball pattern", "master ball"],
  energyReverseHolofoil:     ["energy symbol pattern", "energy symbol"],
  duskBallReverseHolofoil:   ["dusk ball pattern", "dusk ball"],
  loveBallReverseHolofoil:   ["love ball pattern", "love ball"],
  friendBallReverseHolofoil: ["friend ball pattern", "friend ball"],
  quickBallReverseHolofoil:  ["quick ball pattern", "quick ball"],
  rocketReverseHolofoil:     ["team rocket"],
  mirrorReverseHolofoil:     ["mirror holo"],
  crackedIceHolofoil:        ["cracked ice holo"],
  sheenHolofoil:             ["sheen holo"],
  sequinHolofoil:            ["sequin holo"],
  tinselHolofoil:            ["tinsel holo"],
  waterWebHolofoil:          ["water web holo"],
  winnerStamp:               ["winner"],
  staffStamp:                ["staff"],
  prereleaseStamp:           ["prerelease"],
  prereleaseStaffStamp:      ["prerelease staff"],
  holidayStamp:              ["holiday calendar"],
  toysRusStamp:              ["toys r us promo", "toys r us"],
  buildABearStamp:           ["build-a-bear workshop exclusive", "build-a-bear"],
  pokemonCenterStamp:        ["pokemon center exclusive", "pokemon center"],
  gamestopStamp:             ["gamestop promo", "gamestop"],
  ebGamesStamp:              ["eb games promo", "eb games"],
  ebgamesStamp:              ["eb games promo", "eb games"],
  burgerKingStamp:           ["burger king promo", "burger king"],
  sevenElevenStamp:          ["7-eleven promo", "7 eleven"],
  comicConStamp:             ["san diego comic con", "comic con"],
  comicConStaffStamp:        ["san diego comic con staff"],
  jumbo:                     ["jumbo"],
  jumboAlternate:            ["jumbo"],
  metal:                     ["metal"],
  goldBorder:                ["gold border"],
  blackStarPromo:            ["black star promo"],
  peelableDitto:             ["peelable ditto"],
  normalUnnumbered:          ["2017 unnumbered", "unnumbered"],
  leagueStamp:               ["pokemon league", "league promo", "league challenge", "league cup"],
  league1StPlaceStamp:       ["1st place"],
  league2NdPlaceStamp:       ["2nd place"],
  league3RdPlaceStamp:       ["3rd place"],
  league4ThPlaceStamp:       ["4th place"],
  regionalChampionshipsStamp:      ["regional championships"],
  nationalChampionshipsStamp:      ["national championships"],
  worldChampionshipsStamp:         ["world championships"],
  internationalChallengeStamp:     ["international challenge"],
  cityChampionshipsStamp:          ["city championships"],
  playPokemonStamp:          ["play pokemon"],
  expansionStamp:            ["expansion"],
  mewtwoStamp:               ["mewtwo"],
  eeveeStamp:                ["eevee"],
  snowflakeStamp:            ["snowflake"],
  pokemonDayStamp:           ["pokemon day"],
  darkraiStamp:              ["darkrai"],
  wStamp:                    ["w stamp"],
};

const limpiar = s => String(s).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]/g, "");

/** "playPokemonStamp" → "play pokemon stamp" (para comparar con el sufijo) */
const legible = v => v.replace(/([A-Z])/g, " $1").toLowerCase().trim();

/** ¿El sufijo de TCGplayer corresponde a esta variante nuestra? */
function coincideSufijo(version, sufijo) {
  if (!sufijo) return false;
  const s = limpiar(sufijo);
  const v = limpiar(version);
  if (v === s) return true;
  if ((SUFIJOS[version] ?? []).some(a => limpiar(a) === s)) return true;
  // "playPokemonStamp" ↔ "(Play! Pokemon Stamp)"
  const sinStamp = limpiar(legible(version).replace(/\bstamp\b/, ""));
  return sinStamp.length > 3 && (s === sinStamp || s.startsWith(sinStamp));
}

/**
 * Sets transversales: TCGplayer saca de su expansion las cartas con sello de
 * torneo, las jumbo y las de mazo de campeonato, y las junta en cajones
 * propios. Se buscan por nombre de carta, porque alli la numeracion no es la
 * de la expansion original.
 *
 * Indice: nombre limpio de la carta → [{ id, sufijo }]
 */
const transversal = new Map();
for (const f of fs.readdirSync(CACHE_DIR).filter(x => x.startsWith("_"))) {
  for (const p of JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), "utf8"))) {
    // "Accelgor - 12/101 (Championship Series) [Staff]" → base + sufijos
    const sufijos = [];
    let base = p.name;
    for (const re of [/\s*\[([^\]]+)\]\s*$/, /\s*\(([^)]+)\)\s*$/]) {
      const m = base.match(re);
      if (m) { sufijos.push(m[1]); base = base.slice(0, m.index).trim(); }
    }
    base = base.replace(/\s+-\s+[\dA-Za-z/]+\s*$/, "").replace(/\s+-\s+\d{4}\s*$/, "").trim();
    const k = limpiar(base);
    if (!k) continue;
    if (!transversal.has(k)) transversal.set(k, []);
    transversal.get(k).push({ id: p.id, sufijos, cajon: f.replace(/^_|\.json$/g, "") });
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
const archivos = fs.readdirSync(CARDS_DIR).filter(f => !ONE || f === `${ONE}.json`);

const total = { variantes: 0, printing: 0, producto: 0, sinResolver: 0 };
const huerfanas = {};

for (const file of archivos) {
  const j = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, file), "utf8"));
  const catFile = path.join(CACHE_DIR, `${j.set}.json`);
  const catalogo = fs.existsSync(catFile) ? JSON.parse(fs.readFileSync(catFile, "utf8")) : [];

  // Productos del set agrupados por numero de carta, con su sufijo
  const porNumero = new Map();
  for (const p of catalogo) {
    const n = parseInt(String(p.number ?? "").split("/")[0].replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n)) continue;
    const m = p.name.match(/\(([^)]+)\)\s*$/) ?? p.name.match(/\[([^\]]+)\]\s*$/);
    if (!porNumero.has(n)) porNumero.set(n, []);
    porNumero.get(n).push({ id: p.id, sufijo: m ? m[1] : null });
  }

  const res = { variantes: 0, printing: 0, producto: 0, sinResolver: 0 };

  for (const [num, c] of Object.entries(j.cards)) {
    const variants = {};
    const candidatos = porNumero.get(+num) ?? [];

    for (const v of c.versions ?? []) {
      res.variantes++;

      /*
       * En los sets que armamos nosotros (Prize Pack, Miscellaneous) cada
       * entrada YA es un producto de TCGplayer con su variante incluida: la
       * numeracion es nuestra y no hay nada que emparejar.
       */
      if (j.propio && c.product_id) {
        variants[v] = { product_id: c.product_id };
        res.producto++;
        continue;
      }

      // a) Producto aparte con la variante en el nombre — se mira primero
      //    porque una Poke Ball es su propio producto, no un printing
      const suelto = candidatos.find(p => coincideSufijo(v, p.sufijo));
      if (suelto) {
        variants[v] = { product_id: suelto.id };
        res.producto++;
        continue;
      }

      // b) Printing dentro del producto principal
      if (PRINTINGS[v] && c.product_id) {
        variants[v] = { product_id: c.product_id, printing: PRINTINGS[v] };
        res.printing++;
        continue;
      }

      // c) En un set transversal (torneos, jumbo, mazos de campeonato)
      const cajones = transversal.get(limpiar(c.name)) ?? [];
      // Las jumbo tienen cajon propio: estar ahi ya las identifica
      const enCajon = (v === "jumbo" || v === "jumboAlternate")
        ? cajones.find(p => p.cajon === "jumbo")
        : cajones.find(p => p.sufijos.some(s => coincideSufijo(v, s)));
      if (enCajon) {
        variants[v] = { product_id: enCajon.id, fuente: "transversal" };
        res.producto++;
        continue;
      }

      res.sinResolver++;
      huerfanas[v] = (huerfanas[v] ?? 0) + 1;
    }

    if (Object.keys(variants).length) c.variants = variants;
  }

  j.summary.variantes = {
    total: res.variantes,
    resueltas: res.printing + res.producto,
    sinResolver: res.sinResolver,
  };
  fs.writeFileSync(path.join(CARDS_DIR, file), JSON.stringify(j, null, 1) + "\n");

  for (const k of Object.keys(res)) total[k] += res[k];

  const pct = res.variantes ? Math.round((res.printing + res.producto) / res.variantes * 100) : 100;
  if (pct < 100) {
    console.log(`  ${String(pct).padStart(3)}%  ${j.set.padEnd(26)} ${res.printing + res.producto}/${res.variantes}  faltan ${res.sinResolver}`);
  }
}

const resueltas = total.printing + total.producto;
console.log(`\n${"═".repeat(58)}`);
console.log(`Variantes            : ${total.variantes.toLocaleString("es")}`);
console.log(`  dentro del producto: ${total.printing.toLocaleString("es")}`);
console.log(`  producto aparte    : ${total.producto.toLocaleString("es")}`);
console.log(`  RESUELTAS          : ${resueltas.toLocaleString("es")}  (${(resueltas / total.variantes * 100).toFixed(2)}%)`);
console.log(`  sin resolver       : ${total.sinResolver.toLocaleString("es")}`);

if (total.sinResolver) {
  console.log(`\nsin resolver, por tipo:`);
  Object.entries(huerfanas).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([v, n]) => console.log(`   ${String(n).padStart(5)}  ${v}`));
}
