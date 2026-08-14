/**
 * Suma a un set que YA existe los productos que TCGplayer tiene y nosotros no.
 *
 * Distinto de scrape-tcgplayer-set.mjs: aquel construye el set entero y numera
 * desde 1, lo que en un set que ya vive en la app le correria el numero a todas
 * las cartas y le moveria el inventario a la gente. Este solo agrega al final,
 * desde el numero mas alto que ya exista, y no toca ninguna carta anterior.
 *
 * Que hace por cada producto nuevo:
 *   · le da el siguiente numero libre
 *   · baja la imagen del CDN, la pasa a WebP y la sube a R2 (<code>-<n>/large)
 *   · agrega la fila a src/data/sets/<slug>.ts
 *   · agrega la carta al mapeo scripts/tcgplayer-mapping/cards/<slug>.json,
 *     que es de donde el cron de precios saca los productos a consultar
 *
 * Uso:
 *   node --env-file=.env.local scripts/add-missing-cards.mjs \
 *     --slug wotc-promos --tcg-set "WoTC Promo" --code basep [--dry-run]
 *
 * Requiere en .env.local: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  R2_ACCOUNT_ID, R2_BUCKET, TCG_UA,
  fetchCatalog, splitVariant, buildCardId,
  imageKeyFor, imageUrlFor, cdnImageFor, sleep,
} from "./tcgplayer-set-lib.mjs";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const SETS_DIR   = path.resolve(__dirname, "../src/data/sets");
const CARDS_DIR  = path.resolve(__dirname, "tcgplayer-mapping/cards");

const IMG_WIDTH    = 734;
const WEBP_QUALITY = 82;

const args   = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes("--dry-run");
const SLUG    = getArg("--slug");
const TCG_SET = getArg("--tcg-set");
const CODE    = getArg("--code");

if (!SLUG || !TCG_SET || !CODE) {
  console.error("❌ Faltan --slug, --tcg-set y --code");
  process.exit(1);
}

const setFile = path.join(SETS_DIR, `${SLUG}.ts`);
const mapFile = path.join(CARDS_DIR, `${SLUG}.json`);
for (const f of [setFile, mapFile]) {
  if (!fs.existsSync(f)) { console.error(`❌ No existe ${f}`); process.exit(1); }
}

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!DRY_RUN && !(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)) {
  console.error("❌ Faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY en .env.local");
  process.exit(1);
}

const s3 = DRY_RUN ? null : new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// ── Lo que ya tenemos ───────────────────────────────────────────────────────
const mapping = JSON.parse(fs.readFileSync(mapFile, "utf8"));

const usados = new Set();
for (const c of Object.values(mapping.cards)) {
  if (c.product_id) usados.add(c.product_id);
  for (const v of c.variant_products ?? []) usados.add(v.product_id);
  for (const v of Object.values(c.variants ?? {})) usados.add(v.product_id);
}

const setSrc  = fs.readFileSync(setFile, "utf8");
const maxNum  = Math.max(...[...setSrc.matchAll(/card_number:\s*(\d+)/g)].map(m => +m[1]));

console.log(`📚 ${SLUG}: ${Object.keys(mapping.cards).length} cartas, numero mas alto ${maxNum}`);

// ── Que falta ───────────────────────────────────────────────────────────────
const catalogo = await fetchCatalog(TCG_SET);
const faltan = catalogo.filter(p => !usados.has(p.productId));
console.log(`   TCGplayer tiene ${catalogo.length}; faltan ${faltan.length}`);
if (faltan.length === 0) { console.log("✅ Nada que agregar."); process.exit(0); }

// ── Imagen ──────────────────────────────────────────────────────────────────
async function subirImagen(productId, key, intento = 1) {
  if (DRY_RUN) return { ok: true };
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { ok: true, yaEstaba: true };
  } catch { /* no esta: se sube */ }

  const res = await fetch(cdnImageFor(productId), {
    headers: { "User-Agent": TCG_UA, Referer: "https://www.tcgplayer.com/" },
  });
  // TCGplayer lista productos sin foto: el CDN responde 403/404 en todo tamano.
  if (res.status === 403 || res.status === 404) return { ok: false };
  if (!res.ok) {
    if (intento <= 3) { await sleep(intento * 2000); return subirImagen(productId, key, intento + 1); }
    throw new Error(`imagen HTTP ${res.status}`);
  }

  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: IMG_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: webp, ContentType: "image/webp",
  }));
  return { ok: true, bytes: webp.length };
}

// ── Alta ────────────────────────────────────────────────────────────────────
const filas = [];
let numero = maxNum, sinFoto = 0;

for (const p of faltan) {
  numero++;
  const key = imageKeyFor(CODE, numero);
  const { name, version } = splitVariant(p.productName);

  const img = await subirImagen(p.productId, key);
  if (!img.ok) sinFoto++;

  filas.push({
    numero, name, version,
    id: buildCardId(numero, name, version),
    image: img.ok ? imageUrlFor(CODE, numero) : "",
    productId: p.productId,
    tcgName: p.productName,
    precio: p.marketPrice ?? null,
  });
  console.log(`   ${String(numero).padStart(3)}  ${p.productName}${img.ok ? "" : "  (sin foto)"}`);
}

if (DRY_RUN) {
  console.log(`\n🧪 --dry-run: no se escribio nada. ${filas.length} cartas irian de ${maxNum + 1} a ${numero}.`);
  process.exit(0);
}

// El set .ts se edita, no se reescribe: las filas de arriba son las que la
// gente ya tiene en su inventario y no pueden cambiar de forma ni de orden.
const nuevasFilas = filas.map(f =>
  `  { id: ${JSON.stringify(f.id)}, name: ${JSON.stringify(f.name)}, ` +
  `image: ${JSON.stringify(f.image)}, version: ${JSON.stringify(f.version)}, card_number: ${f.numero} },`
).join("\n");

fs.writeFileSync(setFile, setSrc.replace(/\n\];/, `\n${nuevasFilas}\n];`), "utf8");
console.log(`\n📝 src/data/sets/${SLUG}.ts — +${filas.length} cartas (ahora ${maxNum + filas.length} numeros)`);

for (const f of filas) {
  mapping.cards[String(f.numero)] = {
    name: f.name,
    versions: [f.version],
    status: "ok",
    product_id: f.productId,
    tcg_name: f.tcgName,
    tcg_number: null,
    variant_products: [],
    variants: { [f.version]: { product_id: f.productId, printing: "Normal" } },
  };
}
const total = Object.keys(mapping.cards).length;
mapping.summary = {
  ...mapping.summary,
  total, ok: total, review: 0, missing: 0, pct: 100,
  variantes: {
    total: (mapping.summary?.variantes?.total ?? 0) + filas.length,
    resueltas: (mapping.summary?.variantes?.resueltas ?? 0) + filas.length,
    sinResolver: mapping.summary?.variantes?.sinResolver ?? 0,
  },
};
fs.writeFileSync(mapFile, JSON.stringify(mapping, null, 1) + "\n", "utf8");
console.log(`🔗 tcgplayer-mapping/cards/${SLUG}.json — ${total} cartas mapeadas`);

console.log(`\n🎉 Listo. ${sinFoto} sin foto. Los precios entran en el ciclo siguiente del cron.`);
console.log(`   Falta a mano: SET_CARD_COUNT["${SLUG}"] en src/data/pokemon-cards.ts.`);
