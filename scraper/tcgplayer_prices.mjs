/**
 * Refresca precios desde la API interna de TCGplayer.
 *
 * Cubre lo que Scrydex no tiene:
 *   · productos sellados  → sealed_products.market_price
 *   · sets de TCGplayer   → card_prices (Prize Pack Series, Miscellaneous Cards)
 *
 * No usa navegador: es la misma API que alimenta la busqueda del sitio, asi que
 * termina en minutos en vez de horas y no compite con los runners de Playwright.
 *
 * Uso:
 *   node tcgplayer_prices.mjs                (todo)
 *   node tcgplayer_prices.mjs --only sealed
 *   node tcgplayer_prices.mjs --only sets
 *   node tcgplayer_prices.mjs --dry-run
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import {
  TCG_SETS, fetchCatalog, splitVariant, loadMap, sleep,
} from "../scripts/tcgplayer-set-lib.mjs";

const SEALED_API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PAGE_SIZE  = 50;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY    = (() => { const i = args.indexOf("--only"); return i >= 0 ? args[i + 1] : null; })();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = DRY_RUN ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function upsert(table, rows, onConflict) {
  if (DRY_RUN) { console.log(`   🧪 dry-run: ${rows.length} filas para ${table}`); return; }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`   💾 ${rows.length} filas en ${table}`);
}

// ── Sellados ────────────────────────────────────────────────────────────────
async function sealedPage(from, attempt = 1) {
  const res = await fetch(SEALED_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      algorithm: "sales_synonym_v2",
      from, size: PAGE_SIZE,
      filters: {
        term: { productLineName: ["pokemon"], productTypeName: ["Sealed Products"] },
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
      sort: { field: "product-sorting-name", order: "asc" },
    }),
  });

  if (!res.ok) {
    if (attempt <= 4) { await sleep(attempt * 4000); return sealedPage(from, attempt + 1); }
    throw new Error(`sellados HTTP ${res.status} en from=${from}`);
  }
  const r = (await res.json()).results?.[0];
  return { items: r?.results ?? [], total: r?.totalResults ?? 0 };
}

/** Los product_id que ya estan en la tabla, para no insertar filas a medias. */
async function knownSealedIds() {
  if (DRY_RUN) return null;
  const ids = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("sealed_products").select("product_id").range(from, from + 999);
    if (error) throw new Error(`sealed_products: ${error.message}`);
    data.forEach(r => ids.add(r.product_id));
    if (data.length < 1000) break;
  }
  return ids;
}

async function refreshSealed() {
  console.log("\n📦 Productos sellados");
  const known = await knownSealedIds();
  const rows = [];
  const seen = new Set();
  let from = 0, total = Infinity, sinFicha = 0;

  while (from < total) {
    const { items, total: t } = await sealedPage(from);
    total = t;
    if (!items.length) break;
    for (const it of items) {
      if (seen.has(it.productId)) continue;
      seen.add(it.productId);
      if (it.marketPrice == null) continue;
      // Un producto que TCGplayer agrego despues del ultimo catalogo no tiene
      // ficha aqui; insertarlo con solo el precio lo dejaria sin nombre ni foto,
      // asi que se salta hasta que corra scrape-sealed-products.
      if (known && !known.has(it.productId)) { sinFicha++; continue; }
      // Solo se toca el precio: nombre e imagen los fija scrape-sealed-products.
      rows.push({ product_id: it.productId, market_price: it.marketPrice });
    }
    process.stdout.write(`\r   ${seen.size}/${total} leidos, ${rows.length} con precio`);
    from += PAGE_SIZE;
    await sleep(350);
  }
  console.log(sinFicha ? `\n   ℹ️  ${sinFicha} productos nuevos sin ficha, se saltaron` : "");
  await upsert("sealed_products", rows, "product_id");
}

// ── Sets de TCGplayer ───────────────────────────────────────────────────────
async function refreshSets() {
  for (const set of TCG_SETS) {
    console.log(`\n🃏 ${set.name}`);
    const map = loadMap(set.slug);
    if (Object.keys(map).length === 0) {
      console.log("   ⏭️  sin numeracion todavia — corre scripts/scrape-tcgplayer-set.mjs primero");
      continue;
    }

    const catalog = await fetchCatalog(set.setName);
    const now = new Date().toISOString();
    const rows = [];
    let sinNumero = 0;

    for (const p of catalog) {
      const number = map[String(p.productId)];
      // Un producto que TCGplayer agrego despues del ultimo scrape todavia no
      // tiene numero en este set; entra cuando se vuelva a correr el generador.
      if (number == null) { sinNumero++; continue; }
      if (p.marketPrice == null) continue;
      const { version } = splitVariant(p.productName);
      rows.push({ card_id: `${set.code}-${number}`, prices: { [version]: p.marketPrice }, updated_at: now });
    }

    console.log(`   ${rows.length} precios${sinNumero ? `, ${sinNumero} cartas nuevas sin numerar` : ""}`);
    await upsert("card_prices", rows, "card_id");
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
const t0 = Date.now();
if (ONLY !== "sets")   await refreshSealed();
if (ONLY !== "sealed") await refreshSets();
console.log(`\n🎉 Listo en ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
