/**
 * Rehace desde TCGplayer un set de la era WotC numerado por su numero impreso.
 *
 * Nacio para los cuatro Neo y Gym Challenge, que habian quedado a medio cargar
 * (solo algunas holo, fotos de pokemontcg.io e ids numericos repetidos). Cada
 * carta sale en 1st Edition y Unlimited; las Holo Rare y Secret Rare (las
 * Shining) en sus versiones holo.
 *
 * REESCRIBE src/data/sets/<slug>.ts y el mapeo entero: usarlo solo en un set que
 * nadie tenga en su inventario, wishlist, decks ni market (comprobarlo antes).
 *
 * Uso:
 *   node --env-file=.env.local scripts/rebuild-wotc-set.mjs \
 *     --slug neo-genesis --tcg-set "Neo Genesis" --code neo1 [--dry-run]
 * Despues: node --env-file=.env.local scripts/generate-r2-thumbs.mjs <code>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  R2_ACCOUNT_ID, R2_BUCKET, TCG_UA,
  fetchCatalog, buildCardId, imageKeyFor, imageUrlFor, cdnImageFor, sleep,
} from "./tcgplayer-set-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args   = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes("--dry-run");
const SLUG = getArg("--slug"), TCG_SET = getArg("--tcg-set"), CODE = getArg("--code");
if (!SLUG || !TCG_SET || !CODE) { console.error("❌ Faltan --slug, --tcg-set y --code"); process.exit(1); }

const setFile = path.resolve(__dirname, `../src/data/sets/${SLUG}.ts`);
const mapFile = path.resolve(__dirname, `tcgplayer-mapping/cards/${SLUG}.json`);
if (!fs.existsSync(setFile)) { console.error(`❌ No existe ${setFile}`); process.exit(1); }

const s3 = DRY_RUN ? null : new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function subirImagen(productId, numero, intento = 1) {
  if (DRY_RUN) return true;
  const key = imageKeyFor(CODE, numero);
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; } catch { /* se sube */ }
  const res = await fetch(cdnImageFor(productId), { headers: { "User-Agent": TCG_UA, Referer: "https://www.tcgplayer.com/" } });
  if (res.status === 403 || res.status === 404) return false;   // producto sin foto
  if (!res.ok) {
    if (intento <= 3) { await sleep(intento * 2000); return subirImagen(productId, numero, intento + 1); }
    throw new Error(`imagen ${productId}: HTTP ${res.status}`);
  }
  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: 734, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: webp, ContentType: "image/webp" }));
  return true;
}

const HOLO = new Set(["Holo Rare", "Secret Rare"]);
const catalogo = await fetchCatalog(TCG_SET);

const cartas = catalogo.map(p => {
  const numero = parseInt(p.customAttributes?.number, 10);
  // "Magnemite (26)" → "Magnemite": el numero ya va en card_number
  const name = p.productName.replace(/\s*\(\d+\)$/, "").trim();
  return { p, numero, name, holo: HOLO.has(p.rarityName) || p.foilOnly };
});
const malos = cartas.filter(c => !Number.isFinite(c.numero));
const repetidos = cartas.filter((c, i) => cartas.findIndex(o => o.numero === c.numero) !== i);
if (malos.length || repetidos.length) {
  console.error("❌ Productos sin numero o con numero repetido:");
  [...malos, ...repetidos].forEach(c => console.error(`   ${c.p.productName} [${c.p.customAttributes?.number}]`));
  process.exit(1);
}
cartas.sort((a, b) => a.numero - b.numero);

// Fotos: de a 5 en paralelo
let sinFoto = 0;
for (let i = 0; i < cartas.length; i += 5) {
  await Promise.all(cartas.slice(i, i + 5).map(async c => {
    c.foto = await subirImagen(c.p.productId, c.numero);
    if (!c.foto) sinFoto++;
  }));
  process.stdout.write(`\r   fotos ${Math.min(i + 5, cartas.length)}/${cartas.length}`);
}
console.log("");

const filas = [], cards = {};
for (const c of cartas) {
  const versiones = c.holo
    ? [["firstEditionHolofoil", "1st Edition Holofoil"], ["unlimitedHolofoil", "Unlimited Holofoil"]]
    : [["firstEdition", "1st Edition"], ["unlimited", "Unlimited"]];
  const image = c.foto ? imageUrlFor(CODE, c.numero) : "";
  for (const [v] of versiones) {
    filas.push(`  { id: ${JSON.stringify(buildCardId(c.numero, c.name, v))}, name: ${JSON.stringify(c.name.padEnd(40))}, ` +
      `image: ${JSON.stringify(image)}, version: ${JSON.stringify(v)}, card_number: ${c.numero} },`);
  }
  cards[c.numero] = {
    name: c.name,
    versions: versiones.map(([v]) => v),
    status: "ok",
    product_id: c.p.productId,
    tcg_name: c.p.productName,
    tcg_number: c.p.customAttributes.number,
    variants: Object.fromEntries(versiones.map(([v, printing]) => [v, { product_id: c.p.productId, printing }])),
  };
}

console.log(`${SLUG}: ${cartas.length} cartas, ${filas.length} filas, ${sinFoto} sin foto`);
if (DRY_RUN) { console.log("🧪 --dry-run: no se escribio nada."); process.exit(0); }

const src = fs.readFileSync(setFile, "utf8");
// "= [" y no "[": el primer corchete del archivo es el de `PokemonCard[]`.
const cabecera = src.slice(0, src.indexOf("= [") + 3);
fs.writeFileSync(setFile, `${cabecera}\n${filas.join("\n")}\n];\n\nexport default cards;\n`, "utf8");

const mapa = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : { set: SLUG, tcg_set: TCG_SET };
mapa.code = CODE;
mapa.cards = cards;
mapa.summary = { total: cartas.length, ok: cartas.length, review: 0, missing: 0, pct: 100,
  variantes: { total: filas.length, resueltas: filas.length, sinResolver: 0 } };
fs.writeFileSync(mapFile, JSON.stringify(mapa, null, 1) + "\n", "utf8");
console.log(`✅ Escrito. Falta SET_CARD_COUNT["${SLUG}"] = ${filas.length} y las miniaturas.`);
