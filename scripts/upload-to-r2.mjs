/**
 * Descarga todas las imágenes de cartas desde Scrydex y las sube a Cloudflare R2.
 * Luego actualiza todas las URLs en los archivos de sets.
 *
 * Uso: node --env-file=.env.local scripts/upload-to-r2.mjs
 *
 * Requiere R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en .env.local
 * (R2 → API → Manage API tokens; las credenciales son de tipo S3).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const ACCOUNT_ID  = "f41f124769343cd4354765d6a149a75a";
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID     ?? "";
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET_NAME = "facebinder-cards";
const PUBLIC_URL  = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";
const SETS_DIR    = path.resolve(__dirname, "../src/data/sets");

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error("❌ Faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.");
  console.error("   Corre: node --env-file=.env.local scripts/upload-to-r2.mjs");
  process.exit(1);
}

// ── S3 client apuntando a R2 (la vía REST responde 429 con tanto volumen) ────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": "FaceBinder/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToR2(key, buffer, contentType = "image/png") {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

function scrydexUrlToKey(scrydexUrl) {
  // https://images.scrydex.com/pokemon/sv8pt5-1/large → pokemon/sv8pt5-1/large
  const u = new URL(scrydexUrl);
  return u.pathname.replace(/^\//, "");
}

function keyToPublicUrl(key) {
  return `${PUBLIC_URL}/${key}`;
}

// ── Paso 1: Extraer todas las URLs únicas de Scrydex ─────────────────────────
console.log("📂 Leyendo archivos de sets...");
const setFiles = fs.readdirSync(SETS_DIR).filter(f => f.endsWith(".ts"));
console.log(`   ${setFiles.length} archivos encontrados`);

const allUrls = new Set();
const fileContents = {};

for (const file of setFiles) {
  const fullPath = path.join(SETS_DIR, file);
  const content = fs.readFileSync(fullPath, "utf8");
  fileContents[file] = content;
  const matches = content.match(/https:\/\/images\.scrydex\.com\/[^\s"']*/g) ?? [];
  for (const url of matches) allUrls.add(url);
}

console.log(`   ${allUrls.size} imágenes únicas encontradas\n`);

// ── Paso 2: Descargar y subir cada imagen ────────────────────────────────────
const urlList = [...allUrls];
let done = 0;
let failed = 0;
const failedUrls = [];

console.log("🚀 Iniciando descarga y subida...\n");

for (const url of urlList) {
  const key = scrydexUrlToKey(url);
  const label = `[${done + 1}/${urlList.length}] ${key}`;

  try {
    const buffer = await downloadImage(url);
    await uploadToR2(key, buffer, "image/png");
    done++;
    if (done % 10 === 0 || done <= 5) {
      console.log(`  ✅ ${label}`);
    }
  } catch (err) {
    failed++;
    failedUrls.push(url);
    console.error(`  ❌ ${label} — ${err.message}`);
  }

  // Pequeña pausa para no saturar los APIs
  await sleep(80);
}

console.log(`\n✅ Subidas: ${done} / ${urlList.length}`);
if (failed > 0) {
  console.log(`❌ Fallidas: ${failed}`);
  console.log("URLs fallidas:", failedUrls);
}

// ── Paso 3: Actualizar URLs en los archivos de sets ──────────────────────────
if (done === 0) {
  console.log("\n⚠️  No se subió ninguna imagen, no se actualizan los archivos.");
  process.exit(1);
}

console.log("\n📝 Actualizando URLs en archivos de sets...");

let filesUpdated = 0;
for (const file of setFiles) {
  const original = fileContents[file];
  const updated = original.replace(
    /https:\/\/images\.scrydex\.com\/([^\s"']*)/g,
    (_, path) => `${PUBLIC_URL}/${path}`
  );
  if (updated !== original) {
    fs.writeFileSync(path.join(SETS_DIR, file), updated, "utf8");
    filesUpdated++;
  }
}

console.log(`   ${filesUpdated} archivos actualizados`);
console.log("\n🎉 ¡Listo! Todas las imágenes están en Cloudflare R2.");
console.log(`   URL base: ${PUBLIC_URL}`);
