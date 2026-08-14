/**
 * Logo de portada para los sets que salen de TCGplayer.
 *
 * TCGplayer no publica el logo de sus agrupaciones (Battle Academy, Trick or
 * Trade, Deck Exclusives...), asi que se dibuja uno con el nombre del set:
 * texto blanco centrado sobre transparente, del mismo tamano que los logos de
 * Scrydex que ya viven en public/pokemon-sets/.
 *
 * Uso:
 *   node scripts/generate-set-logo.mjs                        (todos los que falten)
 *   node scripts/generate-set-logo.mjs --slug battle-academy  (uno)
 *   node scripts/generate-set-logo.mjs --force                (rehacer los que ya estan)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { TCG_SETS } from "./tcgplayer-set-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/pokemon-sets");

const args  = process.argv.slice(2);
const SLUG  = args.indexOf("--slug") >= 0 ? args[args.indexOf("--slug") + 1] : null;
const FORCE = args.includes("--force");

const W = 640, H = 300;

const escape = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Parte el nombre en lineas de ~16 caracteres para que quepa a buen tamano. */
function wrap(name, max = 16) {
  const lineas = [];
  let actual = "";
  for (const palabra of name.split(/\s+/)) {
    if (actual && (actual + " " + palabra).length > max) { lineas.push(actual); actual = palabra; }
    else actual = actual ? `${actual} ${palabra}` : palabra;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function svgFor(name) {
  const lineas = wrap(name);
  const size   = Math.min(72, Math.floor(220 / lineas.length));
  const alto   = size * 1.15;
  const y0     = H / 2 - ((lineas.length - 1) * alto) / 2;

  const tspans = lineas
    .map((l, i) => `<tspan x="${W / 2}" y="${y0 + i * alto}">${escape(l)}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${size}" fill="#ffffff"
        stroke="#00000055" stroke-width="${Math.max(2, size / 18)}"
        paint-order="stroke">${tspans}</text>
</svg>`;
}

const targets = SLUG ? TCG_SETS.filter(s => s.slug === SLUG) : TCG_SETS;
if (targets.length === 0) {
  console.error(`❌ Slug desconocido: ${SLUG}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const set of targets) {
  // Los sets que ya traian logo propio (prize pack, misc, los promos de
  // Scrydex) apuntan su placeholder a un archivo que no es este: no se tocan.
  const destino = path.join(OUT_DIR, `${set.slug}.logo.webp`);
  if (!set.placeholder.endsWith(`${set.slug}.logo.webp`)) {
    console.log(`⏭️  ${set.slug} — ya tiene logo propio`);
    continue;
  }
  if (fs.existsSync(destino) && !FORCE) {
    console.log(`⏭️  ${set.slug} — ya existe`);
    continue;
  }

  const webp = await sharp(Buffer.from(svgFor(set.name))).webp({ quality: 90 }).toBuffer();
  fs.writeFileSync(destino, webp);
  console.log(`🎨 ${set.slug}.logo.webp  (${(webp.length / 1024).toFixed(0)} KB)`);
}
