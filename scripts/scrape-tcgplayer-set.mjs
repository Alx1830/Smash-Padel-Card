/**
 * Construye un set completo a partir de una agrupacion de TCGplayer.
 *
 * Por cada carta: descarga la imagen del CDN, la convierte a WebP, la sube a R2
 * con la misma convencion de llaves que las cartas de Scrydex
 * (pokemon/<code>-<numero>/large), escribe src/data/sets/<slug>.ts y guarda el
 * precio en la tabla card_prices de Supabase.
 *
 * Uso:
 *   node --env-file=.env.local scripts/scrape-tcgplayer-set.mjs --slug prize-pack-series
 *   node --env-file=.env.local scripts/scrape-tcgplayer-set.mjs --all
 *   node --env-file=.env.local scripts/scrape-tcgplayer-set.mjs --slug misc-cards --limit 20
 *   node --env-file=.env.local scripts/scrape-tcgplayer-set.mjs --all --dry-run
 *   node --env-file=.env.local scripts/scrape-tcgplayer-set.mjs --all --force   (re-sube imagenes)
 *
 * Portada del set (opcional), desde el panel de admin o a mano:
 *   ... --slug <slug> --cover https://…/logo.png
 * La descarga, la convierte a WebP y la deja en public/pokemon-sets/. Sin
 * --cover el set usa el logo generado con su nombre.
 *
 * Es reanudable: las imagenes que ya estan en R2 se saltan, y los numeros de
 * carta ya asignados se conservan (scripts/tcgplayer-sets/<slug>.json).
 *
 * Requiere en .env.local: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import {
  TCG_SETS, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL, R2_API_TOKEN, TCG_UA,
  fetchCatalog, splitVariant, buildCardId, loadMap, saveMap, assignNumbers,
  imageKeyFor, imageUrlFor, cdnImageFor, sleep,
} from "./tcgplayer-set-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETS_DIR  = path.resolve(__dirname, "../src/data/sets");

const CONCURRENCY  = 5;
const IMG_WIDTH    = 734;   // el "large" de Scrydex ronda este ancho
const WEBP_QUALITY = 82;

// ── Args ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes("--dry-run");
const FORCE   = args.includes("--force");
const ALL     = args.includes("--all");
const SLUG    = getArg("--slug");
const COVER   = getArg("--cover");
const LIMIT   = getArg("--limit") ? parseInt(getArg("--limit"), 10) : Infinity;

const targets = ALL ? TCG_SETS : TCG_SETS.filter(s => s.slug === SLUG);
if (targets.length === 0) {
  console.error(`❌ Usa --all o --slug con uno de: ${TCG_SETS.map(s => s.slug).join(", ")}`);
  process.exit(1);
}

const {
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

// Dos caminos a R2: la API S3 (preferida, aguanta volumen) y la REST de
// Cloudflare con el token que ya usa scripts/upload-to-r2.mjs. La REST empieza
// a responder 429 con decenas de miles de objetos, pero aqui son ~1.500.
const USE_S3 = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
if (!DRY_RUN && !USE_S3) {
  if (!R2_API_TOKEN) {
    console.error("❌ Falta como subir a R2. Pon en .env.local una de las dos:");
    console.error("   · R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY  (API S3, preferida)");
    console.error("   · R2_API_TOKEN                             (API REST de Cloudflare)");
    process.exit(1);
  }
  console.log("ℹ️  Sin llaves S3: uso la API REST de Cloudflare.");
}
if (!DRY_RUN && (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const s3 = (DRY_RUN || !USE_S3) ? null : new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const supabase = DRY_RUN ? null
  : createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

// ── Imagenes ────────────────────────────────────────────────────────────────
const restUrl = key =>
  `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${key}`;

async function alreadyInR2(key) {
  if (FORCE || DRY_RUN) return false;
  if (USE_S3) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      return true;
    } catch { return false; }
  }
  // La imagen es publica, asi que basta preguntarle al dominio del bucket:
  // es mas barato que la API de Cloudflare y no gasta cuota del token.
  try {
    const res = await fetch(imageUrlFromKey(key), { method: "HEAD" });
    return res.ok;
  } catch { return false; }
}

const imageUrlFromKey = key => `${R2_PUBLIC_URL}/${key}`;

async function putToR2(key, buffer, attempt = 1) {
  if (USE_S3) {
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: "image/webp",
    }));
    return;
  }

  const res = await fetch(restUrl(key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${R2_API_TOKEN}`,
      "Content-Type": "image/webp",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });

  if (res.status === 429 || res.status >= 500) {
    if (attempt <= 5) {
      await sleep(attempt * 5000);      // el 429 de Cloudflare cede al esperar
      return putToR2(key, buffer, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`R2 ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

async function uploadImage(productId, key, attempt = 1) {
  if (await alreadyInR2(key)) return { skipped: true };
  if (DRY_RUN) return { skipped: false, bytes: 0 };

  let res;
  try {
    res = await fetch(cdnImageFor(productId), {
      headers: { "User-Agent": TCG_UA, Referer: "https://www.tcgplayer.com/" },
    });
  } catch (err) {
    if (attempt <= 3) { await sleep(attempt * 2000); return uploadImage(productId, key, attempt + 1); }
    throw err;
  }

  // Algunos productos no tienen foto en TCGplayer: el CDN responde 403/404.
  if (res.status === 403 || res.status === 404) return { missing: true };
  if (!res.ok) {
    if (attempt <= 3) { await sleep(attempt * 2000); return uploadImage(productId, key, attempt + 1); }
    throw new Error(`imagen HTTP ${res.status}`);
  }

  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: IMG_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await putToR2(key, webp);
  return { skipped: false, bytes: webp.length };
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// ── Archivo del set ─────────────────────────────────────────────────────────
function writeSetFile(slug, cards) {
  const pad = Math.max(...cards.map(c => c.name.length));
  const body = cards
    .sort((a, b) => a.card_number - b.card_number)
    .map(c =>
      `  { id: ${JSON.stringify(c.id)}, name: ${JSON.stringify(c.name).padEnd(pad + 2)}, ` +
      `image: ${JSON.stringify(c.image)}, version: ${JSON.stringify(c.version)}, card_number: ${c.card_number} },`
    ).join("\n");

  const contents =
`import type { PokemonCard } from "@/data/pokemon-cards-meta";

const cards: PokemonCard[] = [
${body}
];

export default cards;
`;
  fs.writeFileSync(path.join(SETS_DIR, `${slug}.ts`), contents, "utf8");
}

/**
 * Portada del set. Las de los sets normales viven en public/pokemon-sets/ como
 * PNG, asi que la de TCGplayer se guarda ahi mismo en WebP — pesa menos y
 * cualquier navegador la abre.
 */
async function descargarPortada(set, urlOrigen) {
  const destino = path.resolve(__dirname, "../public/pokemon-sets", `${set.slug}.logo.webp`);
  const res = await fetch(urlOrigen, { headers: { "User-Agent": TCG_UA } });
  if (!res.ok) throw new Error(`portada HTTP ${res.status}`);

  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: 640, height: 300, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  fs.writeFileSync(destino, webp);
  return { ruta: `/pokemon-sets/${set.slug}.logo.webp`, bytes: webp.length };
}

// ── Main ────────────────────────────────────────────────────────────────────
if (COVER && targets.length === 1 && !DRY_RUN) {
  try {
    const { ruta, bytes } = await descargarPortada(targets[0], COVER);
    console.log(`🎨 Portada → public${ruta}  (${(bytes / 1024).toFixed(0)} KB)`);
    console.log(`   Apuntar el logo del set a "${ruta}" en src/data/pokemon-sets.ts`);
  } catch (err) {
    console.error(`⚠️  No se pudo traer la portada: ${err.message}`);
    console.error(`   El set queda con el logo generado a partir de su nombre.`);
  }
}

for (const set of targets) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${set.name}  (${set.slug} / ${set.code})`);
  console.log(`${"═".repeat(60)}`);

  console.log("📚 Leyendo el catalogo...");
  const catalog = await fetchCatalog(set.setName, { limit: LIMIT });

  const map = loadMap(set.slug);
  const added = assignNumbers(map, catalog);
  console.log(`   ${catalog.length} cartas — ${added.length} nuevas, ${catalog.length - added.length} ya numeradas`);

  console.log(`\n🖼️  Imagenes → R2 ${R2_BUCKET}/pokemon/${set.code}-*/large`);
  const cards = [];
  const priceRows = [];
  let done = 0, skipped = 0, missing = 0, failed = 0, bytes = 0, seenProgress = 0;
  const failures = [];
  const now = new Date().toISOString();

  await inBatches(catalog, CONCURRENCY, async product => {
    const number = map[String(product.productId)];
    const key    = imageKeyFor(set.code, number);
    const { name, version } = splitVariant(product.productName);

    let hasImage = true;
    try {
      const r = await uploadImage(product.productId, key);
      if (r.missing)       { missing++; hasImage = false; }
      else if (r.skipped)  skipped++;
      else { done++; bytes += r.bytes ?? 0; }
    } catch (err) {
      failed++;
      hasImage = false;
      failures.push({ id: product.productId, name: product.productName, why: err.message });
    }

    cards.push({
      id: buildCardId(number, name, version),
      name,
      // TCGplayer lista algunas cartas sin foto (el CDN responde 403 en todos
      // los tamanos). Van con el simbolo del set en vez de cadena vacia, porque
      // un <img src=""> hace que el navegador vuelva a pedir la pagina.
      image: hasImage ? imageUrlFor(set.code, number) : set.placeholder,
      version,
      card_number: number,
    });

    if (product.marketPrice != null) {
      priceRows.push({ card_id: `${set.code}-${number}`, prices: { [version]: product.marketPrice }, updated_at: now });
    }

    if (++seenProgress % 25 === 0) {
      process.stdout.write(`\r   ${seenProgress}/${catalog.length} — nuevas ${done}, ya estaban ${skipped}, sin foto ${missing}, fallidas ${failed}`);
    }
  });

  console.log(`\r   ${seenProgress}/${catalog.length} — nuevas ${done} (${(bytes / 1048576).toFixed(1)} MB), ya estaban ${skipped}, sin foto ${missing}, fallidas ${failed}          `);
  if (failures.length) {
    console.log("   Fallidas:");
    failures.slice(0, 10).forEach(f => console.log(`   · ${f.id} ${f.name} — ${f.why}`));
    if (failures.length > 10) console.log(`   … y ${failures.length - 10} mas`);
  }

  if (DRY_RUN) {
    console.log("\n🧪 --dry-run: no se subio nada. Muestra de 5 cartas:");
    console.log(JSON.stringify(cards.slice(0, 5), null, 1));
    console.log(`   precios listos: ${priceRows.length}`);
    continue;
  }

  // Con --limit solo se vio un pedazo del catalogo: escribir el archivo lo
  // dejaria con esas pocas cartas y borraria el resto del set.
  if (LIMIT === Infinity) {
    saveMap(set.slug, map);
    writeSetFile(set.slug, cards);
    console.log(`📝 src/data/sets/${set.slug}.ts — ${cards.length} cartas`);
  } else {
    console.log(`⏭️  --limit activo: no se toca src/data/sets/${set.slug}.ts`);
  }

  console.log(`💲 Guardando ${priceRows.length} precios en card_prices...`);
  for (let i = 0; i < priceRows.length; i += 500) {
    const chunk = priceRows.slice(i, i + 500);
    const { error } = await supabase.from("card_prices").upsert(chunk, { onConflict: "card_id" });
    if (error) { console.error(`❌ ${error.message}`); process.exit(1); }
  }
  console.log("   ok");
}

console.log("\n🎉 Listo.");
