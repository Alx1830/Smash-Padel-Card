/**
 * Genera una copia chica de cada carta en R2, al lado de la original.
 *
 * Por qué: las fotos de R2 existen en un solo tamaño (`.../<carta>/large`,
 * ~190 KB, 734 px de ancho) y se muestran del tamaño de una estampilla —en una
 * grilla de celular, 120 px—. El navegador descarga los 190 KB igual. La
 * portada llegaba a pesar 2.850 KB por esto.
 *
 * Deja la original intacta y escribe `.../<carta>/small`, así el cambio en la
 * app es reemplazar una palabra en la dirección. Es idempotente: si la copia
 * chica ya existe y no está vacía, la saltea, así que se puede cortar y
 * retomar sin rehacer trabajo.
 *
 * Uso:
 *   node --env-file=.env.local scripts/generate-r2-thumbs.mjs            (todo)
 *   node --env-file=.env.local scripts/generate-r2-thumbs.mjs me4 swsh1  (solo esos sets)
 *   node --env-file=.env.local scripts/generate-r2-thumbs.mjs --limite 20 (una prueba)
 *
 * Requiere: sharp y @aws-sdk/client-s3, que ya están en el repo.
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET     = "facebinder-cards";

/* 450 px de ancho: alcanza para una carta a 150 px en una pantalla de triple
   densidad, que es el uso más exigente de los tamaños chicos. Por encima de
   eso el archivo crece sin que se note. */
const ANCHO   = 450;
const CALIDAD = 82;
const LOTE    = 12;

const args    = process.argv.slice(2);
const iLimite = args.indexOf("--limite");
const LIMITE  = iLimite >= 0 ? Number(args[iLimite + 1]) : 0;
const SETS    = args.filter((a, i) => !a.startsWith("--") && i !== iLimite + 1);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/** Todas las originales, o sea las que terminan en `/large`. */
async function listarOriginales() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
    for (const obj of res.Contents ?? []) {
      if (!obj.Key.endsWith("/large")) continue;
      if (SETS.length && !SETS.some(s => obj.Key.includes(s))) continue;
      keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function yaHecha(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return (head.ContentLength ?? 0) > 0;
  } catch { return false; }
}

async function bajar(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const trozos = [];
  for await (const t of res.Body) trozos.push(t);
  return Buffer.concat(trozos);
}

async function achicar(keyGrande) {
  const keyChica = keyGrande.replace(/\/large$/, "/small");

  if (await yaHecha(keyChica)) return { saltada: true };

  const original = await bajar(keyGrande);
  const chica = await sharp(original)
    .resize({ width: ANCHO, withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: keyChica,
    Body: chica,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return { grandeKB: Math.round(original.length / 1024), chicaKB: Math.round(chica.length / 1024) };
}

async function main() {
  if (!process.env.R2_SECRET_ACCESS_KEY) {
    console.error("Falta R2_SECRET_ACCESS_KEY. Corré con: node --env-file=.env.local scripts/generate-r2-thumbs.mjs");
    process.exit(1);
  }

  console.log("Listando originales en R2...");
  let keys = await listarOriginales();
  if (LIMITE) keys = keys.slice(0, LIMITE);
  console.log(`${keys.length} cartas${SETS.length ? ` (sets: ${SETS.join(", ")})` : ""}\n`);

  let hechas = 0, saltadas = 0, fallidas = 0, kbGrande = 0, kbChica = 0;
  const arranque = Date.now();

  for (let i = 0; i < keys.length; i += LOTE) {
    const lote = keys.slice(i, i + LOTE);
    const res = await Promise.all(lote.map(k =>
      achicar(k).catch(e => { console.error(`  ✗ ${k}: ${e.message}`); return { error: true }; })
    ));

    for (const r of res) {
      if (r.saltada) saltadas++;
      else if (r.error) fallidas++;
      else { hechas++; kbGrande += r.grandeKB; kbChica += r.chicaKB; }
    }

    const vistas = Math.min(i + LOTE, keys.length);
    const min = ((Date.now() - arranque) / 60000).toFixed(1);
    console.log(`[${vistas}/${keys.length}] hechas ${hechas} · saltadas ${saltadas} · fallidas ${fallidas} · ${min} min`);
  }

  console.log("\n── Resumen ──");
  console.log(`Copias nuevas: ${hechas}   ya estaban: ${saltadas}   fallidas: ${fallidas}`);
  if (hechas) {
    console.log(`Peso: ${(kbGrande / 1024).toFixed(1)} MB → ${(kbChica / 1024).toFixed(1)} MB`);
    console.log(`Promedio por carta: ${Math.round(kbGrande / hechas)} KB → ${Math.round(kbChica / hechas)} KB`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
