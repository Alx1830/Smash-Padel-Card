/**
 * Baja los catalogos de los sets "transversales" de TCGplayer: los que agrupan
 * cartas de muchas expansiones en vez de ser una expansion propia.
 *
 * Nuestras cartas con sello de torneo, jumbo o de mazo de campeonato viven en
 * su expansion original, pero TCGplayer las saca de ahi y las mete en estos
 * cajones. Sin sus catalogos, esas variantes se quedan sin producto.
 *
 * Va con pausa de 1 segundo entre paginas: son ~75 peticiones. Una version
 * anterior de este trabajo hizo 21.000 seguidas y termino en un 403.
 *
 * Uso: node scripts/tcg-fetch-transversales.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, "tcgplayer-mapping", ".cache");

const API  = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const PAGE = 50;
const PAUSA = 1000;

/** Nombre en TCGplayer → archivo de cache */
const TRANSVERSALES = [
  ["World Championship Decks",        "_wcd"],
  ["League & Championship Cards",     "_league"],
  ["Jumbo Cards",                     "_jumbo"],
  ["Deck Exclusives",                 "_deck-exclusives"],
  ["Blister Exclusives",              "_blister"],
  ["Alternate Art Promos",            "_alt-art"],
  ["Celebrations: Classic Collection","_celebrations-classic"],
  ["Shining Fates: Shiny Vault",      "_shiny-vault-sf"],
  ["Hidden Fates: Shiny Vault",       "_shiny-vault-hf"],
  ["Professor Program Promos",        "_professor"],
  ["Pikachu World Collection Promos", "_pikachu-world"],
  ["Countdown Calendar Promos",       "_countdown"],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(CACHE_DIR, { recursive: true });

async function pagina(setName, from, intento = 1) {
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
      filters: { term: { productLineName: ["pokemon"], productTypeName: ["Cards"], setName: [setName] }, range: {}, match: {} },
      listingSearch: {
        context: { cart: {} },
        filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
      },
      context: { cart: {}, shippingCountry: "US", userProfile: {} },
      settings: { useFuzzySearch: true, didYouMean: {} },
      sort: { field: "product-sorting-name", order: "asc" },
    }),
  });

  if (!res.ok) {
    if (intento <= 3) {
      console.warn(`\n   ⚠️  HTTP ${res.status}, reintento ${intento} en ${intento * 5}s`);
      await sleep(intento * 5000);
      return pagina(setName, from, intento + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  const r = (await res.json()).results?.[0];
  return { items: r?.results ?? [], total: r?.totalResults ?? 0 };
}

for (const [setName, archivo] of TRANSVERSALES) {
  const destino = path.join(CACHE_DIR, `${archivo}.json`);
  if (fs.existsSync(destino)) {
    console.log(`⏭️  ${setName} — ya estaba`);
    continue;
  }

  const todos = [];
  const vistos = new Set();
  let from = 0, total = Infinity;

  try {
    while (from < total) {
      const { items, total: t } = await pagina(setName, from);
      total = t;
      if (!items.length) break;
      for (const p of items) {
        if (vistos.has(p.productId)) continue;
        vistos.add(p.productId);
        todos.push({
          id: p.productId,
          name: p.productName,
          number: p.customAttributes?.number ?? null,
          rarity: p.rarityName ?? null,
        });
      }
      process.stdout.write(`\r   ${setName}: ${todos.length}/${total}`);
      from += PAGE;
      await sleep(PAUSA);
    }
    fs.writeFileSync(destino, JSON.stringify(todos));
    console.log(`\r✅ ${setName}: ${todos.length} productos          `);
  } catch (err) {
    console.error(`\r❌ ${setName}: ${err.message}          `);
  }
}

console.log("\nListo.");
