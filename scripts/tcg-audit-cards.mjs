/**
 * Paso 2 del mapeo a TCGplayer: emparejar carta por carta dentro de cada set.
 *
 * No toca la app ni la base de datos. Produce, por cada set mapeado, un archivo
 * scripts/tcgplayer-mapping/cards/<setId>.json que dice, para cada carta
 * nuestra, cual es su producto en TCGplayer y con cuanta confianza.
 *
 * Estados por carta:
 *   ok       — el numero y el nombre coinciden; se puede usar sin mirarlo
 *   review   — coincide el numero pero el nombre no (o al reves)
 *   missing  — TCGplayer no tiene esa carta
 *
 * Las variantes especiales (Poke Ball, Cosmos Holo, Winner...) son productos
 * aparte en TCGplayer y se guardan como tales. Las de impresion (normal,
 * reverse holo, holo) viven en el mismo producto y las resuelve el scraper mas
 * adelante con el endpoint de historial, que si las nombra bien.
 *
 * Uso:
 *   node scripts/tcg-audit-cards.mjs                 (todos los sets)
 *   node scripts/tcg-audit-cards.mjs --set chaos-rising
 *   node scripts/tcg-audit-cards.mjs --refresh       (vuelve a bajar catalogos)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR    = path.resolve(__dirname, "tcgplayer-mapping");
const CARDS_DIR  = path.join(MAP_DIR, "cards");
const CACHE_DIR  = path.join(MAP_DIR, ".cache");
const SETS_DIR   = path.resolve(__dirname, "../src/data/sets");

const API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const UA  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const PAGE = 50;

const args    = process.argv.slice(2);
const REFRESH = args.includes("--refresh");
const ONE     = (() => { const i = args.indexOf("--set"); return i >= 0 ? args[i + 1] : null; })();

const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(CARDS_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ── Catalogo de un set en TCGplayer (con cache en disco) ────────────────────
async function fetchSetProducts(tcgSetName, setId) {
  const cache = path.join(CACHE_DIR, `${setId}.json`);
  if (!REFRESH && fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));

  const all = [];
  const seen = new Set();
  let from = 0, total = Infinity;

  while (from < total) {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.tcgplayer.com",
        Referer: "https://www.tcgplayer.com/",
        "User-Agent": UA,
      },
      body: JSON.stringify({
        algorithm: "sales_synonym_v2", from, size: PAGE,
        filters: { term: { productLineName: ["pokemon"], productTypeName: ["Cards"], setName: [tcgSetName] }, range: {}, match: {} },
        listingSearch: {
          context: { cart: {} },
          filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
        },
        context: { cart: {}, shippingCountry: "US", userProfile: {} },
        settings: { useFuzzySearch: true, didYouMean: {} },
        sort: { field: "product-sorting-name", order: "asc" },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = (await res.json()).results?.[0];
    total = r?.totalResults ?? 0;
    if (!r?.results?.length) break;
    for (const p of r.results) {
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      all.push({
        id: p.productId,
        name: p.productName,
        number: p.customAttributes?.number ?? null,
        rarity: p.rarityName ?? null,
        price: p.marketPrice ?? null,
      });
    }
    from += PAGE;
    await sleep(320);
  }

  fs.writeFileSync(cache, JSON.stringify(all));
  return all;
}

// ── Nuestras cartas ─────────────────────────────────────────────────────────
function readOurCards(setId) {
  const f = path.join(SETS_DIR, `${setId}.ts`);
  if (!fs.existsSync(f)) return null;
  const src = fs.readFileSync(f, "utf8");
  const out = [];
  const re = /name:\s*"((?:[^"\\]|\\.)*)"\s*,\s*image:\s*"[^"]*"\s*,\s*version:\s*"([^"]+)"\s*,\s*card_number:\s*(\d+)/g;
  for (const m of src.matchAll(re)) {
    out.push({ name: m[1].replace(/\\"/g, '"').trim(), version: m[2], number: +m[3] });
  }
  return out;
}

// ── Normalizacion de nombres de carta ───────────────────────────────────────
/** "Froakie - 020/086 (Cosmos Holo)" → { base: "froakie", suffix: "Cosmos Holo" } */
function splitTcgName(productName) {
  let s = productName.trim();
  let suffix = null;
  const par = s.match(/^(.*)\s+\(([^()]+)\)\s*$/);
  if (par) { s = par[1].trim(); suffix = par[2].trim(); }
  const brk = s.match(/^(.*)\s+\[([^\][]+)\]\s*$/);        // "[Winner]"
  if (brk) { s = brk[1].trim(); suffix = suffix ?? brk[2].trim(); }
  s = s.replace(/\s+-\s+[\dA-Za-z]+(\/[\dA-Za-z]+)?\s*$/, "");  // quita " - 020/086"
  return { base: s.trim(), suffix };
}

const key = s => s.toLowerCase()
  .replace(/δ/g, " delta species ")     // nosotros usamos el simbolo, TCGplayer la palabra
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\bpokemon\b/g, "")
  .replace(/&/g, "and")
  .replace(/[^a-z0-9]/g, "");

/** El numero que TCGplayer pone como "020/086" o "TG12/TG30" → 20 */
function numOf(raw) {
  if (!raw) return null;
  const first = String(raw).split("/")[0].replace(/[^\d]/g, "");
  return first ? parseInt(first, 10) : null;
}

// ── Main ────────────────────────────────────────────────────────────────────
const sets = JSON.parse(fs.readFileSync(path.join(MAP_DIR, "sets.json"), "utf8"));
const objetivo = Object.entries(sets)
  .filter(([id, e]) => e.tcg_set && (e.status === "confirmed" || e.status === "manual"))
  .filter(([id]) => !ONE || id === ONE);

console.log(`Comparando cartas en ${objetivo.length} sets...\n`);

const global = { sets: 0, cards: 0, ok: 0, review: 0, missing: 0, sinArchivo: 0 };
const peores = [];

for (const [setId, info] of objetivo) {
  const ours = readOurCards(setId);
  if (!ours || ours.length === 0) { global.sinArchivo++; continue; }

  let products;
  try {
    products = await fetchSetProducts(info.tcg_set, setId);
  } catch (err) {
    console.log(`  ${setId}: error bajando catalogo — ${err.message}`);
    continue;
  }

  // Indices: por numero y por nombre
  const byNumber = new Map();
  const byName   = new Map();
  for (const p of products) {
    const { base, suffix } = splitTcgName(p.name);
    const entry = { ...p, base, suffix, k: key(base) };
    const n = numOf(p.number);
    if (n != null) {
      if (!byNumber.has(n)) byNumber.set(n, []);
      byNumber.get(n).push(entry);
    }
    if (!byName.has(entry.k)) byName.set(entry.k, []);
    byName.get(entry.k).push(entry);
  }

  const cards = {};
  const res = { ok: 0, review: 0, missing: 0 };
  const usados = new Set();     // productos ya asignados a una carta nuestra

  // Una entrada por numero de carta (las variantes se listan dentro)
  const porNumero = new Map();
  for (const c of ours) {
    if (!porNumero.has(c.number)) porNumero.set(c.number, { name: c.name, versions: [] });
    porNumero.get(c.number).versions.push(c.version);
  }

  for (const [number, c] of porNumero) {
    const k = key(c.name);
    const candidatosNum = byNumber.get(number) ?? [];
    const porNombre     = candidatosNum.filter(p => p.k === k);

    let status, elegido, nota;
    if (porNombre.length) {
      status  = "ok";
      elegido = porNombre.find(p => !p.suffix) ?? porNombre[0];
    } else if (candidatosNum.length) {
      elegido = candidatosNum.find(p => !p.suffix) ?? candidatosNum[0];
      nota    = `nuestro "${c.name}" vs TCG "${elegido.base}"`;
      // Dentro de un set el numero identifica la carta. Si todos los productos
      // con ese numero son la misma carta, el match vale aunque el nombre este
      // escrito distinto ("Bubbly Water Energy" alla es "Bubbly W Energy").
      const nombresDistintos = new Set(candidatosNum.map(p => p.k));
      status = nombresDistintos.size === 1 ? "ok" : "review";
    } else {
      const soloNombre = byName.get(k) ?? [];
      if (soloNombre.length === 1) {
        status  = "review";
        elegido = soloNombre[0];
        nota    = `nombre casa pero el numero no (nuestro ${number}, TCG ${elegido.number})`;
      } else {
        status = "missing";
      }
    }

    res[status]++;
    const fila = { name: c.name, versions: c.versions, status };
    if (elegido) {
      fila.product_id = elegido.id;
      fila.tcg_name   = elegido.name;
      fila.tcg_number = elegido.number;
      // Variantes que en TCGplayer son un producto aparte
      const especiales = (byNumber.get(number) ?? []).filter(p => p.suffix && p.k === k);
      if (especiales.length) {
        fila.variant_products = especiales.map(p => ({ suffix: p.suffix, product_id: p.id }));
      }
    }
    if (nota) fila.note = nota;
    // Solo se reserva el producto si el match es firme; si no, la segunda
    // pasada debe poder volver a considerarlo.
    if (elegido && status === "ok") usados.add(elegido.id);
    cards[number] = fila;
  }

  /*
   * Segunda pasada. No todos los sets numeran igual: nuestro sv-promos va
   * corrido (105, 106...) y TCGplayer usa el numero impreso de cada promo; las
   * energias basicas alla van sin numero. Cuando el nombre casa exacto y ese
   * producto no se lo llevo ninguna otra carta, es esa y no hay ambiguedad.
   */
  for (const [number, fila] of Object.entries(cards)) {
    if (fila.status === "ok") continue;
    const libres = (byName.get(key(fila.name)) ?? []).filter(p => !usados.has(p.id));
    const base   = libres.filter(p => !p.suffix);
    const unico  = base.length === 1 ? base[0] : (libres.length === 1 ? libres[0] : null);
    if (!unico) continue;

    res[fila.status]--; res.ok++;
    usados.add(unico.id);
    fila.status     = "ok";
    fila.product_id = unico.id;
    fila.tcg_name   = unico.name;
    fila.tcg_number = unico.number;
    fila.note       = "emparejado por nombre (la numeracion no coincide)";
  }

  const total = porNumero.size;
  const pct = total ? Math.round((res.ok / total) * 100) : 0;
  fs.writeFileSync(path.join(CARDS_DIR, `${setId}.json`), JSON.stringify({
    set: setId, tcg_set: info.tcg_set, code: info.code,
    summary: { total, ...res, pct },
    cards,
  }, null, 1) + "\n");

  global.sets++; global.cards += total;
  global.ok += res.ok; global.review += res.review; global.missing += res.missing;
  if (pct < 90) peores.push({ setId, pct, ...res, total });

  const barra = pct === 100 ? "100%" : `${String(pct).padStart(3)}%`;
  console.log(`  ${barra}  ${setId.padEnd(26)} ${res.ok}/${total}${res.review ? `  revisar ${res.review}` : ""}${res.missing ? `  faltan ${res.missing}` : ""}`);
}

console.log(`\n${"═".repeat(56)}`);
console.log(`Sets comparados : ${global.sets}`);
console.log(`Cartas          : ${global.cards}`);
console.log(`  identificadas : ${global.ok}  (${((global.ok / global.cards) * 100).toFixed(1)}%)`);
console.log(`  por revisar   : ${global.review}`);
console.log(`  sin match     : ${global.missing}`);
if (peores.length) {
  console.log(`\nSets por debajo del 90%:`);
  peores.sort((a, b) => a.pct - b.pct).slice(0, 20)
    .forEach(p => console.log(`  ${String(p.pct).padStart(3)}%  ${p.setId.padEnd(26)} ok ${p.ok}/${p.total}, revisar ${p.review}, faltan ${p.missing}`));
}
console.log(`\n→ ${path.relative(process.cwd(), CARDS_DIR)}`);
