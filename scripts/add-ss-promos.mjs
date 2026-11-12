/**
 * Carga Sword & Shield Promos (ss-promos, código swshp) desde TCGplayer,
 * numerado por el número IMPRESO: "Zacian V - SWSH076" es la carta 76.
 *
 * El set ya estaba registrado en la app con 0 cartas. No se usa
 * scrape-tcgplayer-set.mjs porque ese numera desde 1 en orden alfabético, y las
 * listas de mazos (Limitless, TCG Live) nombran las promos por su número
 * impreso ("PR-SW SWSH076"): con el número real la importación las encuentra.
 *
 * Las versiones del mismo número van juntas: Prerelease → prereleaseStamp,
 * Staff → staffStamp, World Championships → worldChampionshipsStamp,
 * Cosmos Holo → cosmosHolofoil. Se saltan los productos sin número SWSH
 * (V-UNION en sets de 4, "226/S-P", el Dragonite de Silver Tempest).
 *
 *   node --env-file=.env.local scripts/add-ss-promos.mjs [--dry-run]
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
const SLUG = "ss-promos";
const CODE = "swshp";
const TCG_SET = "SWSH: Sword & Shield Promo Cards";
const SET_FILE = path.resolve(__dirname, `../src/data/sets/${SLUG}.ts`);
const MAP_FILE = path.resolve(__dirname, `tcgplayer-mapping/cards/${SLUG}.json`);
const DRY_RUN = process.argv.includes("--dry-run");

const setSrc = fs.readFileSync(SET_FILE, "utf8");
if (/card_number:/.test(setSrc)) {
  console.error("❌ src/data/sets/ss-promos.ts ya tiene cartas: este script es solo para el set vacío.");
  process.exit(1);
}

const catalogo = await fetchCatalog(TCG_SET);

function versionDe(p, resto) {
  if (/staff/i.test(resto)) return "staffStamp";
  if (/prerelease/i.test(resto)) return "prereleaseStamp";
  if (/world championships/i.test(resto)) return "worldChampionshipsStamp";
  if (/cosmos? holo/i.test(resto)) return "cosmosHolofoil";
  if (/25th anniversary/i.test(resto)) return "anniversaryStamp";
  if (/holiday calendar/i.test(resto)) return "holidayCalendar";
  return p.foilOnly ? "holofoil" : "normal";
}

function nombreDe(resto) {
  let n = resto;
  // Se sacan los paréntesis y corchetes del final ("(Prerelease) [Staff]",
  // "(Full Art)"); los del medio son parte del nombre ("[Professor Willow]")
  for (let antes = ""; antes !== n;) { antes = n; n = n.replace(/\s*(\([^)]*\)|\[[^\]]*\])\s*$/, ""); }
  return n.trim();
}

const filas = [];
const saltados = [];
for (const p of catalogo) {
  const m = /^SWSH(\d{3})$/.exec(p.customAttributes?.number ?? "");
  // Los V-UNION "[Set of 4]" son el paquete de 4 cartas, no una carta
  if (!m || /set of 4/i.test(p.productName)) { saltados.push(p.productName); continue; }
  const numero = parseInt(m[1], 10);
  const resto = p.productName.replace(/\s*-\s*SWSH\d+/, "");
  const version = versionDe(p, resto);
  filas.push({ numero, name: nombreDe(resto), version, p });
}

// Dos productos no pueden caer en el mismo número + versión
const llaves = new Map();
for (const f of filas) {
  const k = `${f.numero}:${f.version}`;
  if (llaves.has(k)) {
    console.error(`❌ Choque en ${k}: «${llaves.get(k).p.productName}» y «${f.p.productName}»`);
    process.exit(1);
  }
  llaves.set(k, f);
}
const ORDEN = ["normal", "holofoil", "cosmosHolofoil", "prereleaseStamp", "worldChampionshipsStamp", "staffStamp"];
filas.sort((a, b) => a.numero - b.numero || ORDEN.indexOf(a.version) - ORDEN.indexOf(b.version));

console.log(`📦 ${catalogo.length} productos → ${filas.length} cartas, ${new Set(filas.map(f => f.numero)).size} números; ${saltados.length} saltados`);
for (const s of saltados) console.log(`   saltado: ${s}`);

if (DRY_RUN) {
  for (const f of filas) console.log(`   ${String(f.numero).padStart(3)} ${f.name} [${f.version}]  ← ${f.p.productName}`);
  process.exit(0);
}

// ── Imágenes: una por número, la del producto base si existe ───────────────
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)) {
  console.error("❌ Faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY en .env.local");
  process.exit(1);
}
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function subirImagen(productId, key, intento = 1) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { /* no está: se sube */ }
  const res = await fetch(cdnImageFor(productId), { headers: { "User-Agent": TCG_UA, Referer: "https://www.tcgplayer.com/" } });
  if (res.status === 403 || res.status === 404) return false;
  if (!res.ok) {
    if (intento <= 3) { await sleep(intento * 2000); return subirImagen(productId, key, intento + 1); }
    throw new Error(`imagen HTTP ${res.status}`);
  }
  const webp = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 734, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: webp, ContentType: "image/webp" }));
  return true;
}

const porNumero = new Map();
for (const f of filas) if (!porNumero.has(f.numero)) porNumero.set(f.numero, f);   // el primero es el base (por ORDEN)
const conFoto = new Map();
const numeros = [...porNumero.keys()];
for (let i = 0; i < numeros.length; i += 5) {
  await Promise.all(numeros.slice(i, i + 5).map(async n => {
    const f = porNumero.get(n);
    let ok = await subirImagen(f.p.productId, imageKeyFor(CODE, n));
    // Si el base no tiene foto, se prueba con otra versión del mismo número
    if (!ok) for (const otra of filas.filter(x => x.numero === n && x !== f)) {
      ok = await subirImagen(otra.p.productId, imageKeyFor(CODE, n));
      if (ok) break;
    }
    conFoto.set(n, ok);
  }));
  process.stdout.write(`\r   imágenes ${Math.min(i + 5, numeros.length)}/${numeros.length}`);
  await sleep(200);
}
console.log("");

// ── Set .ts ─────────────────────────────────────────────────────────────────
const lineas = filas.map(f =>
  `  { id: ${JSON.stringify(buildCardId(f.numero, f.name, f.version))}, name: ${JSON.stringify(f.name)}, ` +
  `image: ${JSON.stringify(conFoto.get(f.numero) ? imageUrlFor(CODE, f.numero) : "")}, version: ${JSON.stringify(f.version)}, card_number: ${f.numero} },`
).join("\n");
fs.writeFileSync(SET_FILE, setSrc.replace(/\[\s*\];/, `[\n${lineas}\n];`), "utf8");

// ── Mapeo para el cron de precios ──────────────────────────────────────────
const cards = {};
for (const f of filas) {
  const c = cards[String(f.numero)] ??= {
    name: f.name, versions: [], status: "ok",
    product_id: f.p.productId, tcg_name: f.p.productName,
    tcg_number: `SWSH${String(f.numero).padStart(3, "0")}`,
    variant_products: [], variants: {},
  };
  c.versions.push(f.version);
  c.variants[f.version] = { product_id: f.p.productId, printing: f.p.foilOnly ? "Holofoil" : "Normal" };
  if (f.p.productId !== c.product_id) c.variant_products.push({ suffix: f.version, product_id: f.p.productId });
}
const total = Object.keys(cards).length;
fs.writeFileSync(MAP_FILE, JSON.stringify({
  set: SLUG, tcg_set: TCG_SET, code: CODE,
  summary: { total, ok: total, review: 0, missing: 0, pct: 100,
    variantes: { total: filas.length, resueltas: filas.length, sinResolver: 0 } },
  cards,
}, null, 1) + "\n", "utf8");

const sinFoto = [...conFoto.values()].filter(v => !v).length;
console.log(`🎉 ${filas.length} cartas en ${total} números; ${sinFoto} números sin foto.`);
console.log(`   Falta: SET_CARD_COUNT["${SLUG}"] = ${filas.length}, miniaturas y el índice de nombres.`);
