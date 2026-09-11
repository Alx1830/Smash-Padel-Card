/**
 * Trae las fotos de una nota externa, las pasa a WebP y las sube a R2.
 *
 * Se usa al cubrir un set nuevo: las cartas todavía no están en nuestro
 * catálogo, así que las fotos del anuncio son la única ilustración posible
 * hasta que el set entre. Quedan bajo `posts/<carpeta>/` en el bucket, con el
 * mismo nombre de archivo pero en `.webp`.
 *
 * Va despacio a propósito —de a cuatro, con una pausa entre tandas— porque el
 * sitio de origen nos está haciendo un favor y no hay que atropellarlo.
 *
 * Uso:
 *   node --env-file=.env.local scripts/importar-imagenes-nota.mjs <lista.txt> <carpeta>
 *
 * `lista.txt` es un archivo con una dirección por línea.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET     = "facebinder-cards";
const PUBLICO    = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";

const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const A_LA_VEZ  = 4;
const PAUSA_MS  = 400;
const CALIDAD   = 85;
const ANCHO_MAX = 900;

const [listaPath, carpeta] = process.argv.slice(2);
if (!listaPath || !carpeta) {
  console.error("Uso: node --env-file=.env.local scripts/importar-imagenes-nota.mjs <lista.txt> <carpeta>");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const dormir = ms => new Promise(r => setTimeout(r, ms));

/** El nombre del archivo, sin el sufijo de miniatura y ya en .webp */
function nombreDestino(url) {
  const base = url.split("/").pop().split("?")[0];
  return base.replace(/-\d+x\d+(?=\.[a-z]+$)/i, "").replace(/\.[a-z]+$/i, ".webp");
}

/** La dirección del original: el sufijo `-143x200` es la miniatura */
function versionGrande(url) {
  return url.replace(/-\d+x\d+(?=\.[a-z]+$)/i, "");
}

async function yaSubida(key) {
  try {
    const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return (h.ContentLength ?? 0) > 0;
  } catch { return false; }
}

async function importar(url) {
  const key = `posts/${carpeta}/${nombreDestino(url)}`;
  if (await yaSubida(key)) return { key, saltada: true };

  const res = await fetch(versionGrande(url), {
    headers: { "User-Agent": NAVEGADOR, Referer: "https://www.pokebeach.com/" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const original = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(original)
    .resize({ width: ANCHO_MAX, withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: webp,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return { key, origKB: Math.round(original.length / 1024), webpKB: Math.round(webp.length / 1024) };
}

const urls = readFileSync(listaPath, "utf8").split("\n").map(l => l.trim()).filter(Boolean);
console.log(`${urls.length} imágenes → posts/${carpeta}/\n`);

const subidas = [];
let hechas = 0, saltadas = 0, fallidas = 0, kbOrig = 0, kbWebp = 0;

for (let i = 0; i < urls.length; i += A_LA_VEZ) {
  const tanda = urls.slice(i, i + A_LA_VEZ);
  const res = await Promise.all(tanda.map(u =>
    importar(u).catch(e => { console.error(`  ✗ ${u.split("/").pop()}: ${e.message}`); return { error: true }; })
  ));

  for (const r of res) {
    if (r.error) { fallidas++; continue; }
    subidas.push(`${PUBLICO}/${r.key}`);
    if (r.saltada) saltadas++;
    else { hechas++; kbOrig += r.origKB; kbWebp += r.webpKB; }
  }

  console.log(`[${Math.min(i + A_LA_VEZ, urls.length)}/${urls.length}] nuevas ${hechas} · ya estaban ${saltadas} · fallidas ${fallidas}`);
  await dormir(PAUSA_MS);
}

writeFileSync(`${listaPath}.subidas.txt`, subidas.join("\n"), "utf8");

console.log("\n── Resumen ──");
console.log(`Subidas: ${hechas}   ya estaban: ${saltadas}   fallidas: ${fallidas}`);
if (hechas) console.log(`Peso: ${(kbOrig / 1024).toFixed(1)} MB → ${(kbWebp / 1024).toFixed(1)} MB`);
console.log(`Direcciones en: ${listaPath}.subidas.txt`);
