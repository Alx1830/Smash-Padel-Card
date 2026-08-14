/**
 * Precios de los productos sellados desde la API interna de TCGplayer
 * (sealed_products.market_price).
 *
 * Solo sellados: no son cartas —no tienen numero ni variante— asi que no caben
 * en card_prices ni en el scraper de cartas.
 *
 * Prize Pack Series y Miscellaneous Cards se llevaban aqui cuando eran lo unico
 * que salia de TCGplayer. Ahora los cubre tcgplayer_card_prices.mjs junto con
 * los demas sets, y mejor: aquel pide el precio de cada variante, mientras que
 * esto tomaba el marketPrice del producto entero.
 *
 * No usa navegador: es la misma API que alimenta la busqueda del sitio, asi que
 * termina en minutos.
 *
 * Uso:
 *   node tcgplayer_prices.mjs
 *   node tcgplayer_prices.mjs --dry-run
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { sleep } from "../scripts/tcgplayer-set-lib.mjs";

const SEALED_API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PAGE_SIZE  = 50;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

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

/**
 * product_id → name de lo que ya esta guardado.
 *
 * Hace falta el nombre, no solo el id: `name` es NOT NULL y Postgres valida esa
 * restriccion sobre la fila propuesta ANTES de resolver el ON CONFLICT, asi que
 * un upsert con solo el precio revienta aunque el producto ya exista.
 */
async function knownSealed() {
  if (DRY_RUN) return new Map();
  const map = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("sealed_products").select("product_id, name").range(from, from + 999);
    if (error) throw new Error(`sealed_products: ${error.message}`);
    data.forEach(r => map.set(r.product_id, r.name));
    if (data.length < 1000) break;
  }
  return map;
}

async function refreshSealed() {
  console.log("\n📦 Productos sellados");
  const known = await knownSealed();
  const rows = [];
  const seen = new Set();
  const ahora = new Date().toISOString();
  let from = 0, total = Infinity, nuevos = 0;

  while (from < total) {
    const { items, total: t } = await sealedPage(from);
    total = t;
    if (!items.length) break;
    for (const it of items) {
      if (seen.has(it.productId)) continue;
      seen.add(it.productId);
      if (it.marketPrice == null) continue;

      const nombreGuardado = known.get(it.productId);
      if (nombreGuardado != null) {
        // Se reenvia el nombre que ya estaba para satisfacer el NOT NULL; el
        // unico dato que cambia es el precio.
        rows.push({
          product_id: it.productId, name: nombreGuardado,
          market_price: it.marketPrice, updated_at: ahora,
        });
      } else {
        // Producto que TCGplayer agrego despues del ultimo catalogo. Entra con
        // lo que da la busqueda; la imagen la pone scrape-sealed-products.
        nuevos++;
        rows.push({
          product_id: it.productId, name: it.productName,
          variant: it.setName ?? null,
          tcgplayer_url: `https://www.tcgplayer.com/product/${it.productId}`,
          market_price: it.marketPrice, updated_at: ahora,
        });
      }
    }
    process.stdout.write(`\r   ${seen.size}/${total} leidos, ${rows.length} con precio`);
    from += PAGE_SIZE;
    await sleep(350);
  }
  console.log(nuevos ? `\n   ℹ️  ${nuevos} productos nuevos, entran sin imagen` : "");
  await upsert("sealed_products", rows, "product_id");
}

// ── Main ────────────────────────────────────────────────────────────────────
const t0 = Date.now();
await refreshSealed();
console.log(`\n🎉 Listo en ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
