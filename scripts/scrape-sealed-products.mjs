/**
 * Scraper de productos sellados de Pokémon (TCGplayer).
 *
 * La página /search/pokemon/product es una SPA: el HTML llega vacío y las clases
 * product-card__* solo existen después de que Angular renderiza. En vez de un
 * navegador headless, se consulta la misma API interna que alimenta esa vista,
 * que devuelve el nombre, el set y el productId directamente.
 *
 * Por cada producto: descarga la imagen del CDN, la convierte a WebP, la sube a
 * R2 bajo sealed/ y guarda la fila en la tabla sealed_products de Supabase.
 *
 * Uso:
 *   node --env-file=.env.local scripts/scrape-sealed-products.mjs
 *   node --env-file=.env.local scripts/scrape-sealed-products.mjs --limit 20   (prueba)
 *   node --env-file=.env.local scripts/scrape-sealed-products.mjs --dry-run    (no sube nada)
 *   node --env-file=.env.local scripts/scrape-sealed-products.mjs --force      (re-sube existentes)
 *
 * Requiere en .env.local: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────────────────
const ACCOUNT_ID   = "f41f124769343cd4354765d6a149a75a";
const BUCKET       = "facebinder-cards";
const PUBLIC_URL   = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";
const PREFIX       = "sealed";          // mismo bucket que las cartas, carpeta aparte
const PAGE_SIZE    = 50;                // la API rechaza 100 con HTTP 400
const CONCURRENCY  = 6;                 // imágenes en paralelo
const IMG_WIDTH    = 800;               // suficiente para una ficha de producto
const WEBP_QUALITY = 80;
const SEARCH_API   = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const CDN          = "https://tcgplayer-cdn.tcgplayer.com/product";
const UA           = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE   = args.includes("--force");
const LIMIT   = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
})();

const {
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!DRY_RUN && (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
  console.error("❌ Faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.");
  console.error("   Corre: node --env-file=.env.local scripts/scrape-sealed-products.mjs");
  process.exit(1);
}
if (!DRY_RUN && (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const s3 = DRY_RUN ? null : new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const supabase = DRY_RUN ? null
  : createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Catálogo: paginar la API de búsqueda ────────────────────────────────────
function searchBody(from) {
  return {
    algorithm: "sales_synonym_v2",
    from,
    size: PAGE_SIZE,
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
    // Orden estable: sin esto la paginación puede repetir o saltarse productos
    sort: { field: "product-sorting-name", order: "asc" },
  };
}

async function fetchPage(from, attempt = 1) {
  const res = await fetch(SEARCH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://www.tcgplayer.com",
      "Referer": "https://www.tcgplayer.com/",
      "User-Agent": UA,
    },
    body: JSON.stringify(searchBody(from)),
  });

  if (!res.ok) {
    if (attempt <= 3) {
      const wait = attempt * 3000;
      console.warn(`  ⚠️  HTTP ${res.status} en from=${from}, reintento ${attempt} en ${wait / 1000}s`);
      await sleep(wait);
      return fetchPage(from, attempt + 1);
    }
    throw new Error(`Búsqueda falló en from=${from}: HTTP ${res.status}`);
  }

  const json = await res.json();
  const r = json.results?.[0];
  if (!r) throw new Error(`Respuesta sin resultados en from=${from}`);
  return { items: r.results ?? [], total: r.totalResults ?? 0 };
}

async function fetchCatalog() {
  console.log("📚 Leyendo el catálogo de sellados...");
  const all = [];
  const seen = new Set();
  let from = 0, total = Infinity;

  while (from < total && all.length < LIMIT) {
    const { items, total: t } = await fetchPage(from);
    total = t;
    if (items.length === 0) break;

    for (const it of items) {
      // La paginación puede solapar; el productId es la clave real
      if (!seen.has(it.productId)) { seen.add(it.productId); all.push(it); }
    }
    console.log(`   ${Math.min(all.length, total)}/${total}`);
    from += PAGE_SIZE;
    await sleep(400);   // no atropellar la API
  }

  return all.slice(0, LIMIT === Infinity ? undefined : LIMIT);
}

// ── Imagen: descargar, convertir, subir ─────────────────────────────────────
const keyFor = productId => `${PREFIX}/${productId}.webp`;

async function alreadyInR2(key) {
  if (FORCE || DRY_RUN) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function processImage(product) {
  const key = keyFor(product.productId);

  if (await alreadyInR2(key)) return { key, skipped: true };
  if (DRY_RUN) return { key, skipped: false };

  const res = await fetch(`${CDN}/${product.productId}_in_1000x1000.jpg`, {
    headers: { "User-Agent": UA, Referer: "https://www.tcgplayer.com/" },
  });

  // Hay productos sin foto en TCGplayer (cajas, "Case", "[Set of 2]"): el CDN
  // responde 403/404. No es un fallo — el producto se guarda sin imagen.
  if (res.status === 403 || res.status === 404) return { key: null, missing: true };
  if (!res.ok) throw new Error(`imagen HTTP ${res.status}`);

  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: IMG_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: webp, ContentType: "image/webp",
  }));

  return { key, skipped: false, bytes: webp.length };
}

/** Procesa en tandas para no abrir 2891 conexiones a la vez */
async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
const catalog = await fetchCatalog();
console.log(`\n🚀 ${catalog.length} productos. Imágenes → R2 ${BUCKET}/${PREFIX}/\n`);

const rows = [];
let done = 0, skipped = 0, failed = 0, missing = 0, bytes = 0;
const failures = [];

await inBatches(catalog, CONCURRENCY, async product => {
  try {
    const { key, skipped: wasSkipped, missing: noImage, bytes: b } = await processImage(product);
    if (noImage)          missing++;
    else if (wasSkipped)  skipped++;
    else { done++; bytes += b ?? 0; }

    rows.push({
      product_id:   product.productId,
      name:         product.productName,
      // Es el subtítulo de la card en TCGplayer (product-card__set-name)
      variant:      product.setName ?? null,
      set_code:     product.setCode ?? null,
      image_url:    key ? `${PUBLIC_URL}/${key}` : null,
      market_price: product.marketPrice ?? null,
      // productUrlName no siempre viene como slug (a veces trae espacios o está
      // vacío); TCGplayer resuelve el producto con solo el id.
      tcgplayer_url: `https://www.tcgplayer.com/product/${product.productId}`,
    });

    const n = done + skipped + failed + missing;
    if (n % 50 === 0) console.log(`   ${n}/${catalog.length} — nuevas ${done}, ya estaban ${skipped}, sin foto ${missing}, fallidas ${failed}`);
  } catch (err) {
    failed++;
    failures.push({ id: product.productId, name: product.productName, why: err.message });
  }
});

console.log(`\n🖼️  Imágenes: ${done} nuevas (${(bytes / 1048576).toFixed(1)} MB), ${skipped} ya estaban, ${missing} sin foto en TCGplayer, ${failed} fallidas`);
if (failures.length) {
  console.log("   Fallidas:");
  failures.slice(0, 15).forEach(f => console.log(`   · ${f.id} ${f.name} — ${f.why}`));
  if (failures.length > 15) console.log(`   … y ${failures.length - 15} más`);
}

if (DRY_RUN) {
  console.log("\n🧪 --dry-run: no se subió nada. Muestra de las primeras 5 filas:");
  console.log(JSON.stringify(rows.slice(0, 5), null, 1));
  process.exit(0);
}

// ── Guardar en Supabase ─────────────────────────────────────────────────────
console.log(`\n💾 Guardando ${rows.length} filas en sealed_products...`);
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { error } = await supabase
    .from("sealed_products")
    .upsert(chunk, { onConflict: "product_id" });
  if (error) {
    console.error(`❌ Error guardando filas ${i}-${i + chunk.length}: ${error.message}`);
    process.exit(1);
  }
  console.log(`   ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
}

console.log("\n🎉 Listo.");
