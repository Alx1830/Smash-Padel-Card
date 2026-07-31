/**
 * Piezas compartidas por los scripts que trabajan con sets de TCGplayer
 * (scrape-tcgplayer-set.mjs y scrape-tcgplayer-prices.mjs).
 *
 * Estos sets no existen en Scrydex: son agrupaciones que solo TCGplayer maneja
 * ("Prize Pack Series Cards", "Miscellaneous Cards & Products"), asi que el
 * catalogo, las imagenes y los precios salen todos de la misma API interna.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config compartida ───────────────────────────────────────────────────────
export const R2_ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
export const R2_BUCKET     = "facebinder-cards";
export const R2_PUBLIC_URL = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";
/**
 * Token de la API REST de Cloudflare, usado solo cuando no hay llaves S3.
 * Va por variable de entorno: un token escrito aqui queda en el historial de
 * git y GitHub lo detecta y lo revoca.
 */
export const R2_API_TOKEN = process.env.R2_API_TOKEN ?? "";

const SEARCH_API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PAGE_SIZE  = 50;   // la API rechaza size:100 con HTTP 400
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Los sets de TCGplayer que tratamos como expansiones propias. */
export const TCG_SETS = [
  {
    slug: "prize-pack-series", code: "pp",
    setName: "Prize Pack Series Cards", name: "Prize Pack Series Cards",
    placeholder: "/pokemon-sets/Prize-Pack-Series.symbol.png",
  },
  {
    slug: "misc-cards", code: "misc",
    setName: "Miscellaneous Cards & Products", name: "Miscellaneous Cards & Products",
    placeholder: "/pokemon-sets/Miscellaneous-Cards.symbol.png",
  },
];

export const MAPS_DIR = path.resolve(__dirname, "tcgplayer-sets");

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Catalogo ────────────────────────────────────────────────────────────────
function searchBody(setName, from) {
  return {
    algorithm: "sales_synonym_v2",
    from,
    size: PAGE_SIZE,
    filters: {
      term: { productLineName: ["pokemon"], productTypeName: ["Cards"], setName: [setName] },
      range: {}, match: {},
    },
    listingSearch: {
      context: { cart: {} },
      filters: {
        term: { sellerStatus: "Live", channelId: 0 },
        range: { quantity: { gte: 1 } },
        exclude: { channelExclusion: 0 },
      },
    },
    context: { cart: {}, shippingCountry: "US", userProfile: {} },
    settings: { useFuzzySearch: true, didYouMean: {} },
    // Orden estable: sin esto la paginacion repite o se salta productos
    sort: { field: "product-sorting-name", order: "asc" },
  };
}

async function fetchPage(setName, from, attempt = 1) {
  const res = await fetch(SEARCH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": UA,
    },
    body: JSON.stringify(searchBody(setName, from)),
  });

  if (!res.ok) {
    if (attempt <= 4) {
      const wait = attempt * 4000;
      console.warn(`  ⚠️  HTTP ${res.status} en from=${from}, reintento ${attempt} en ${wait / 1000}s`);
      await sleep(wait);
      return fetchPage(setName, from, attempt + 1);
    }
    throw new Error(`Busqueda fallo en from=${from}: HTTP ${res.status}`);
  }

  const r = (await res.json()).results?.[0];
  if (!r) throw new Error(`Respuesta sin resultados en from=${from}`);
  return { items: r.results ?? [], total: r.totalResults ?? 0 };
}

/**
 * Trae el catalogo completo del set, sin las "Code Card" (son codigos digitales
 * para el juego online, no cartas fisicas que alguien pueda tener en su binder).
 */
export async function fetchCatalog(setName, { limit = Infinity, quiet = false } = {}) {
  const all = [];
  const seen = new Set();
  let from = 0, total = Infinity, codeCards = 0;

  while (from < total) {
    const { items, total: t } = await fetchPage(setName, from);
    total = t;
    if (items.length === 0) break;

    for (const it of items) {
      if (seen.has(it.productId)) continue;   // la paginacion puede solapar
      seen.add(it.productId);
      if (/code card/i.test(it.productName)) { codeCards++; continue; }
      all.push(it);
    }
    if (!quiet) process.stdout.write(`\r   ${seen.size}/${total} leidos (${all.length} cartas, ${codeCards} code cards descartadas)`);
    from += PAGE_SIZE;
    await sleep(350);   // no atropellar la API
  }
  if (!quiet) console.log("");

  return limit === Infinity ? all : all.slice(0, limit);
}

// ── Variantes ───────────────────────────────────────────────────────────────
/**
 * TCGplayer mete la variante de impresion entre parentesis al final del nombre:
 * "Air Balloon - 079/086 (Cosmos Holo)". Cuando el parentesis es una variante
 * que la app ya conoce, se convierte en `version` y sale del nombre. Cuando es
 * procedencia ("San Diego Comic Con", "Build-A-Bear Workshop Exclusive") se
 * queda en el nombre, porque es lo que distingue a esa carta de las demas.
 */
const KNOWN_VARIANTS = {
  "cosmos holo":          "cosmosHolofoil",
  "cracked ice holo":     "crackedIceHolofoil",
  "sheen holo":           "sheenHolofoil",
  "sequin holo":          "sequinHolofoil",
  "water web holo":       "waterWebHolofoil",
  "tinsel holo":          "tinselHolofoil",
  "mirror holo":          "mirrorReverseHolofoil",
  "reverse holo":         "reverseHolofoil",
  "reverse holofoil":     "reverseHolofoil",
  "holo":                 "holofoil",
  "holofoil":             "holofoil",
  "jumbo":                "jumbo",
  "non holo":             "normal",
  "non-holo":             "normal",
};

export function splitVariant(productName) {
  const m = productName.match(/^(.*)\s+\(([^()]+)\)\s*$/);
  if (!m) return { name: productName.trim(), version: "normal" };

  const version = KNOWN_VARIANTS[m[2].trim().toLowerCase()];
  if (!version) return { name: productName.trim(), version: "normal" };
  return { name: m[1].trim(), version };
}

/** "cosmosHolofoil" → "CosmosHolofoil", para la parte final del id. */
export const versionPascal = v => v.charAt(0).toUpperCase() + v.slice(1);

/** El id que usan los archivos de sets: "001:Nombre:Version". */
export const buildCardId = (number, name, version) =>
  `${String(number).padStart(3, "0")}:${name}:${versionPascal(version)}`;

// ── Mapa productId → numero de carta ────────────────────────────────────────
/**
 * El numero de carta se asigna una sola vez y se guarda. Si se recalculara por
 * posicion alfabetica en cada corrida, un producto nuevo en TCGplayer correria
 * la numeracion y el inventario de la gente apuntaria a otra carta.
 */
export function loadMap(slug) {
  const file = path.join(MAPS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveMap(slug, map) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(MAPS_DIR, `${slug}.json`),
    JSON.stringify(map, null, 1) + "\n",
    "utf8",
  );
}

/** Asigna numero a los productos nuevos, respetando los ya asignados. */
export function assignNumbers(map, catalog) {
  let next = Math.max(0, ...Object.values(map)) + 1;
  const added = [];
  for (const p of catalog) {
    const key = String(p.productId);
    if (map[key] == null) { map[key] = next++; added.push(key); }
  }
  return added;
}

export const imageKeyFor = (code, number) => `pokemon/${code}-${number}/large`;
export const imageUrlFor = (code, number) => `${R2_PUBLIC_URL}/${imageKeyFor(code, number)}`;
export const cdnImageFor = productId =>
  `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
export const TCG_UA = UA;
