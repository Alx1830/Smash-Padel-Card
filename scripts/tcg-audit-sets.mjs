/**
 * Paso 1 del mapeo a TCGplayer: emparejar nuestros sets con los de TCGplayer.
 *
 * Nada de esto toca la app todavia. Produce dos archivos en scripts/tcgplayer-mapping/:
 *   · tcg-sets.json  — catalogo de sets de TCGplayer (cache, para no repetir la consulta)
 *   · sets.json      — el mapeo, con el estado de cada set nuestro
 *
 * Estados:
 *   confirmed — el nombre casa exacto y el numero de cartas cuadra
 *   review    — hay candidato pero algo no cuadra; toca mirarlo a mano
 *   unmatched — no se encontro nada parecido
 *   manual    — resuelto a mano (este script nunca lo pisa)
 *
 * Uso:
 *   node scripts/tcg-audit-sets.mjs           (usa cache si existe)
 *   node scripts/tcg-audit-sets.mjs --refresh (vuelve a bajar el catalogo)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.resolve(__dirname, "tcgplayer-mapping");
const SETS_DIR  = path.resolve(__dirname, "../src/data/sets");
const SETS_TS   = path.resolve(__dirname, "../src/data/pokemon-sets.ts");
const HOOK_TS   = path.resolve(__dirname, "../src/hooks/useScrydexPrice.ts");

const API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const UA  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const REFRESH = process.argv.includes("--refresh");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Catalogo de TCGplayer ───────────────────────────────────────────────────
async function fetchTcgSets() {
  const cache = path.join(OUT_DIR, "tcg-sets.json");
  if (!REFRESH && fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      algorithm: "sales_synonym_v2", from: 0, size: 1,
      filters: { term: { productLineName: ["pokemon"], productTypeName: ["Cards"] }, range: {}, match: {} },
      listingSearch: {
        context: { cart: {} },
        filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
      },
      context: { cart: {}, shippingCountry: "US", userProfile: {} },
      settings: { useFuzzySearch: true, didYouMean: {} },
      aggregations: ["setName"],
    }),
  });
  if (!res.ok) throw new Error(`catalogo HTTP ${res.status}`);
  const j = await res.json();
  const sets = (j.results?.[0]?.aggregations?.setName ?? [])
    .map(b => ({ name: b.value, cards: b.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(cache, JSON.stringify(sets, null, 1) + "\n");
  return sets;
}

// ── Nuestros sets ───────────────────────────────────────────────────────────
/** Lee los sets declarados en pokemon-sets.ts, con su serie. */
function readLocalSets() {
  const src = fs.readFileSync(SETS_TS, "utf8");
  const out = [];
  // Cada set es una linea con id, name, logo — las series no tienen logo en la misma linea
  for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*logo:/g)) {
    out.push({ id: m[1], name: m[2] });
  }
  return out;
}

/** Codigo de Scrydex por set (es la llave de card_prices hoy). */
function readCodes() {
  const src = fs.readFileSync(HOOK_TS, "utf8");
  const codes = {};
  const block = src.slice(src.indexOf("SCRYDEX_SET_CODES"), src.indexOf("const supabase"));
  for (const m of block.matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9]+)"/gi)) codes[m[1]] = m[2];
  return codes;
}

/** Cuantas cartas unicas tiene cada set nuestro (por numero, no por variante). */
function countLocalCards(setId) {
  const f = path.join(SETS_DIR, `${setId}.ts`);
  if (!fs.existsSync(f)) return null;
  const src = fs.readFileSync(f, "utf8");
  const nums = [...src.matchAll(/card_number:\s*(\d+)/g)].map(m => +m[1]);
  return { entries: nums.length, unique: new Set(nums).size };
}

// ── Emparejamiento ──────────────────────────────────────────────────────────
/**
 * Quita lo que cambia entre catalogos pero no identifica al set: prefijos de
 * coleccion ("SV08:", "SM - "), el "Base Set" que TCGplayer le pone a los
 * primeros de cada serie, y la diferencia entre "Promos" y "Promo Cards".
 */
function norm(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/^(sv|swsh|sm|xy|bw|hgss|dp|pl|ex|me|mee|hs|neo)\d*(pt\d)?:\s*/i, "")
    .replace(/^(sm|xy|hs|bw|dp|pl|swsh|sv)\s*-\s*/i, "")
    .replace(/^(hs|platinum)\s+/i, "")
    .replace(/\bpokemon\b/g, "")
    .replace(/\bpromo cards\b/g, "promos")
    .replace(/\bbase set\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Equivalencias que ningun parecido de texto puede adivinar: nombres que
 * cambiaron entre catalogos, y sets nuestros que alla viven dentro de uno mas
 * grande (los tres TCG Classic, los Trainer Kit que agrupan dos mazos).
 */
const OVERRIDES = {
  "tcg-classic-venusaur":   "Trading Card Game Classic",
  "tcg-classic-charizard":  "Trading Card Game Classic",
  "tcg-classic-blastoise":  "Trading Card Game Classic",
  "ex-trainer-kit-latias":  "EX Trainer Kit 1: Latias & Latios",
  "ex-trainer-kit-latios":  "EX Trainer Kit 1: Latias & Latios",
  "ex-trainer-kit-plusle":  "EX Trainer Kit 2: Plusle & Minun",
  "ex-trainer-kit-minun":   "EX Trainer Kit 2: Plusle & Minun",
  "ex-unseen-forces-unown": "EX Unseen Forces",
  "radiant-collection":     "Generations: Radiant Collection",
  "mega-evo-promos":        "ME: Mega Evolution Promo",
  "sm-promos":              "SM Promos",
  "ss-promos":              "SWSH: Sword & Shield Promo Cards",
  "dp-promos":              "Diamond and Pearl Promos",
  "hgss-promos":            "HGSS Promos",
  // McDonald's: nosotros decimos "Collection", TCGplayer dice "Promos".
  // El de 2021 alla se llama por el aniversario, no por el ano.
  "mcd-2011": "McDonald's Promos 2011",
  "mcd-2012": "McDonald's Promos 2012",
  "mcd-2013": "McDonald's Promos 2013",
  "mcd-2014": "McDonald's Promos 2014",
  "mcd-2015": "McDonald's Promos 2015",
  "mcd-2016": "McDonald's Promos 2016",
  "mcd-2017": "McDonald's Promos 2017",
  "mcd-2018": "McDonald's Promos 2018",
  "mcd-2019": "McDonald's Promos 2019",
  "mcd-2022": "McDonald's Promos 2022",
  "mcd-2023": "McDonald's Promos 2023",
  "mcd-2024": "McDonald's Promos 2024",
  "mcd-2021": "McDonald's 25th Anniversary Promos",
  "mcd-25th": "McDonald's 25th Anniversary Promos",
  // El set base de cada serie: TCGplayer le dice "Base Set", nosotros no
  "sun-moon":        "SM Base Set",
  "sv-energies":     "SVE: Scarlet & Violet Energies",
  "wotc-promos":     "WoTC Promo",
  // Nosotros escribimos el prefijo pegado, TCGplayer lo separa con guion
  "xy-breakthrough": "XY - BREAKthrough",
  "xy-flashfire":    "XY - Flashfire",
  // Verificado carta por carta: mismas 9 (001/009 a 009/009), con la variante
  // [Winner] aparte — la que nosotros llamamos winnerStamp.
  "best-of-game":    "Best of Promos",
};

/**
 * Sets nuestros que TCGplayer sencillamente no lista. Se marcan aparte para no
 * volver a revisarlos en cada corrida: no es que falte emparejarlos, es que no
 * hay con que. Sus precios tendrian que seguir saliendo de Scrydex.
 */
const SIN_EQUIVALENTE = {
  "poke-card-creator":    "TCGplayer no lista este pack",
  "futsal-promos":        "TCGplayer no lista los Futsal por separado",
  "topps-1":              "Topps no es parte del catalogo de TCGplayer",
  "topps-2":              "Topps no es parte del catalogo de TCGplayer",
  "topps-3":              "Topps no es parte del catalogo de TCGplayer",
  "mcd-2013":             "TCGplayer no tiene McDonald's 2013",
  "mcd-2019-fr":          "la edicion francesa no esta en el catalogo ingles",
  "mcd-dragon-discovery": "TCGplayer no lista este set",
  "mcd-match-2023":       "TCGplayer no lista este set",
  "mcd-match-battle":     "TCGplayer no lista este set",
};

/** Similitud 0..1 por bigramas — para proponer candidatos, no para decidir solo. */
function similar(a, b) {
  const bi = s => { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
  const A = bi(a), B = bi(b);
  if (!A.size || !B.size) return a === b ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// ── Main ────────────────────────────────────────────────────────────────────
const tcgSets = await fetchTcgSets();
const locals  = readLocalSets();
const codes   = readCodes();

const tcgByNorm = new Map();
for (const t of tcgSets) {
  const k = norm(t.name);
  if (!tcgByNorm.has(k)) tcgByNorm.set(k, t);
}

// Conserva lo ya resuelto a mano
const outFile = path.join(OUT_DIR, "sets.json");
const previo = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const mapping = {};
const stats = { confirmed: 0, review: 0, unmatched: 0, manual: 0, sinArchivo: 0 };

for (const local of locals) {
  const anterior = previo[local.id];
  if (anterior?.status === "manual") {          // decision humana, no se pisa
    mapping[local.id] = anterior;
    stats.manual++;
    continue;
  }

  const counts = countLocalCards(local.id);
  const entry = {
    name: local.name,
    code: codes[local.id] ?? null,
    cards_local: counts?.unique ?? 0,
    tcg_set: null,
    cards_tcg: null,
    status: "unmatched",
  };
  if (!counts) { entry.note = "sin archivo de cartas"; stats.sinArchivo++; }

  if (SIN_EQUIVALENTE[local.id]) {
    entry.status = "no_existe";
    entry.note   = SIN_EQUIVALENTE[local.id];
    stats.no_existe = (stats.no_existe ?? 0) + 1;
    mapping[local.id] = entry;
    continue;
  }

  const forzado = OVERRIDES[local.id];
  const exacto  = forzado
    ? tcgSets.find(t => t.name === forzado)
    : tcgByNorm.get(norm(local.name));

  if (exacto) {
    entry.tcg_set   = exacto.name;
    entry.cards_tcg = exacto.cards;
    entry.status    = "confirmed";
    if (forzado) entry.by = "override";
    // El conteo no decide el match, solo avisa: TCGplayer siempre trae mas
    // productos (cada variante va aparte) y varios sets nuestros estan a medias.
    if (counts && counts.unique > exacto.cards) {
      entry.note = `tenemos ${counts.unique} y TCGplayer ${exacto.cards} — revisar`;
      entry.status = "review";
    } else if (counts && counts.unique > 0 && exacto.cards > counts.unique * 3) {
      entry.note = `nuestro set parece incompleto (${counts.unique} de ${exacto.cards})`;
    }
  } else {
    // Sin coincidencia exacta: proponer los 3 mas parecidos para revisar
    const n = norm(local.name);
    entry.candidates = tcgSets
      .map(t => ({ name: t.name, cards: t.cards, score: +similar(n, norm(t.name)).toFixed(2) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(c => c.score > 0.4);
    entry.status = entry.candidates.length ? "review" : "unmatched";
  }

  stats[entry.status]++;
  mapping[local.id] = entry;
}

fs.writeFileSync(outFile, JSON.stringify(mapping, null, 1) + "\n");

console.log(`Sets nuestros: ${locals.length}  |  sets en TCGplayer: ${tcgSets.length}`);
console.log(`\n  confirmados  : ${stats.confirmed}`);
console.log(`  por revisar  : ${stats.review}`);
console.log(`  sin match    : ${stats.unmatched}`);
console.log(`  no existe    : ${stats.no_existe ?? 0}  (TCGplayer no los tiene)`);
console.log(`  ya a mano    : ${stats.manual}`);
if (stats.sinArchivo) console.log(`  (${stats.sinArchivo} sin archivo de cartas)`);
console.log(`\n→ ${path.relative(process.cwd(), outFile)}`);
