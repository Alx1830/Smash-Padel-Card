/**
 * Descarga cada imagen de R2, la convierte a WebP con sharp,
 * y la re-sube al MISMO key sobreescribiendo el original.
 * El storage baja conforme avanza porque WebP es 6-8x más liviano.
 *
 * Uso:
 *   node scripts/convert-r2-to-webp.mjs          (todo)
 *   node scripts/convert-r2-to-webp.mjs xy7 swsh1 (solo esos sets)
 *
 * Requiere: npm install sharp @aws-sdk/client-s3
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// ── Config ───────────────────────────────────────────────────────────────────
const ACCOUNT_ID  = "f41f124769343cd4354765d6a149a75a";
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID     ?? "";
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET      = "facebinder-cards";
const WEBP_QUALITY = 85;     // 85 es el punto dulce calidad/tamaño
const BATCH_SIZE   = 10;     // procesa N imágenes en paralelo a la vez
const FILTER_SETS  = process.argv.slice(2); // ej: ["xy7", "swsh1"]

// ── S3 client apuntando a R2 ─────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function listAllKeys() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents ?? []) {
      if (FILTER_SETS.length === 0 || FILTER_SETS.some(s => obj.Key.includes(s))) {
        keys.push(obj.Key);
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function isAlreadyWebP(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return head.ContentType === "image/webp";
  } catch { return false; }
}

async function getObject(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function convertAndUpload(key) {
  if (await isAlreadyWebP(key)) {
    console.log(`  ⏭  ya es WebP: ${key}`);
    return { skipped: true };
  }

  const original = await getObject(key);
  const originalKB = Math.round(original.length / 1024);

  const webp = await sharp(original)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  const webpKB = Math.round(webp.length / 1024);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: webp,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));

  const saving = Math.round((1 - webp.length / original.length) * 100);
  console.log(`  ✓  ${key}  ${originalKB}KB → ${webpKB}KB  (-${saving}%)`);
  return { originalKB, webpKB, saving };
}

async function processBatch(keys) {
  return Promise.all(keys.map(k => convertAndUpload(k).catch(err => {
    console.error(`  ✗  ${k}: ${err.message}`);
    return { error: true };
  })));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SECRET_KEY) {
    console.error("ERROR: Falta SECRET_KEY. Agrégala en el script (línea ~18).");
    process.exit(1);
  }

  console.log("Listando objetos en R2...");
  const keys = await listAllKeys();
  console.log(`Total de objetos: ${keys.length}${FILTER_SETS.length ? ` (filtrando: ${FILTER_SETS.join(", ")})` : ""}\n`);

  let totalOrigKB = 0, totalWebpKB = 0, converted = 0, skipped = 0, errors = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const progress = `[${i + 1}-${Math.min(i + BATCH_SIZE, keys.length)}/${keys.length}]`;
    console.log(`\nLote ${progress}`);

    const results = await processBatch(batch);
    for (const r of results) {
      if (r.skipped)   skipped++;
      else if (r.error) errors++;
      else {
        converted++;
        totalOrigKB += r.originalKB;
        totalWebpKB  += r.webpKB;
      }
    }
  }

  const savedMB = Math.round((totalOrigKB - totalWebpKB) / 1024);
  console.log(`
════════════════════════════════
  Convertidas : ${converted}
  Ya eran WebP: ${skipped}
  Errores     : ${errors}
  Liberado    : ~${savedMB} MB de storage
════════════════════════════════`);
}

main().catch(err => { console.error(err); process.exit(1); });
