/**
 * Cuanto perderia el usuario si se apagara el scraper de Scrydex.
 *
 * A diferencia de tcg-huecos.mjs, esto NO compara tabla contra tabla: recorre
 * las cartas que la app realmente muestra (src/data/sets/*.ts) y pregunta si
 * cada variante tiene precio en TCGplayer. Una fila de Scrydex para una carta
 * que la app no lista no le sirve a nadie, y contarla exageraba el hueco.
 *
 * Uso:
 *   node scripts/tcg-cobertura-real.mjs
 *   node scripts/tcg-cobertura-real.mjs --detalle sword-shield
 *   node scripts/tcg-cobertura-real.mjs --escribir-lista
 *
 * Con --escribir-lista deja en scraper/scrydex-respaldo.json exactamente que
 * cartas y variantes siguen dependiendo de Scrydex, para que su scraper corra
 * solo sobre eso en vez de sobre los 20.000 de siempre.
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, "..");
const SETS_DIR = path.join(ROOT, "src", "data", "sets");
const HOOK_TS  = path.join(ROOT, "src", "hooks", "useScrydexPrice.ts");
const BULK_JS  = path.join(ROOT, "scraper", "bulk_scrape_prices.js");

const args    = process.argv.slice(2);
const DETALLE = (() => { const i = args.indexOf("--detalle"); return i >= 0 ? args[i + 1] : null; })();
const ESCRIBIR = args.includes("--escribir-lista");
const LISTA_OUT = path.join(ROOT, "scraper", "scrydex-respaldo.json");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

function readCodes() {
  const codes = {};
  const bulk = fs.readFileSync(BULK_JS, "utf8");
  for (const m of bulk.matchAll(/\{\s*slug:\s*"([^"]+)",\s*code:\s*"([^"]+)"\s*\}/g)) codes[m[1]] = m[2];
  const hook = fs.readFileSync(HOOK_TS, "utf8");
  const block = hook.slice(hook.indexOf("SCRYDEX_SET_CODES"), hook.indexOf("const supabase"));
  for (const m of block.matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9]+)"/gi)) codes[m[1]] = m[2];
  return codes;
}

/** Las cartas tal como las lista la app: [{ number, version }] */
function leerSet(slug) {
  const f = path.join(SETS_DIR, `${slug}.ts`);
  if (!fs.existsSync(f)) return [];
  const src = fs.readFileSync(f, "utf8");
  const out = [];
  for (const m of src.matchAll(/version:\s*"([^"]+)"\s*,\s*card_number:\s*(\d+)/g)) {
    out.push({ version: m[1], number: Number(m[2]) });
  }
  return out;
}

async function leerTodo(tabla) {
  const map = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(tabla).select("card_id, prices").range(from, from + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    data.forEach(r => map.set(r.card_id, r.prices ?? {}));
    if (data.length < 1000) break;
  }
  return map;
}

const codes = readCodes();
const [tcg, scry] = await Promise.all([leerTodo("tcg_card_prices"), leerTodo("card_prices")]);

const hayPrecio = (tabla, cardId, version) => {
  const p = tabla.get(cardId);
  if (!p) return false;
  const pascal = version.charAt(0).toUpperCase() + version.slice(1);
  return Number(p[version]) > 0 || Number(p[pascal]) > 0;
};

let total = 0, conTcg = 0, soloScry = 0, sinNada = 0;
const porSet = new Map();
const porVariante = new Map();
const detalle = [];
/** slug → { code, cards: { numero: [versiones] } } — lo que Scrydex debe seguir cubriendo */
const lista = {};

for (const slug of fs.readdirSync(SETS_DIR).filter(f => f.endsWith(".ts")).map(f => f.replace(/\.ts$/, ""))) {
  const code = codes[slug];
  const cartas = leerSet(slug);
  if (!cartas.length) continue;

  for (const { number, version } of cartas) {
    total++;
    const cardId = code ? `${code}-${number}` : null;
    const enTcg  = cardId && hayPrecio(tcg, cardId, version);
    const enScry = cardId && hayPrecio(scry, cardId, version);

    if (enTcg) { conTcg++; continue; }
    if (enScry) {
      soloScry++;
      porSet.set(slug, (porSet.get(slug) ?? 0) + 1);
      porVariante.set(version, (porVariante.get(version) ?? 0) + 1);
      if (DETALLE === slug) detalle.push(`#${number} ${version}`);
      if (!lista[slug]) lista[slug] = { code, cards: {} };
      (lista[slug].cards[number] ??= []).push(version);
    } else {
      sinNada++;
    }
  }
}

const pct = n => `${((n / total) * 100).toFixed(1)} %`;
console.log(`\nVariantes que la app muestra: ${total}`);
console.log(`  con precio de TCGplayer:    ${conTcg} (${pct(conTcg)})`);
console.log(`  solo en Scrydex:            ${soloScry} (${pct(soloScry)})  <- lo que se perderia`);
console.log(`  sin precio en ninguna:      ${sinNada} (${pct(sinNada)})  <- ya no tienen precio hoy`);

console.log(`\n═══ Lo que solo tiene Scrydex, por variante ═══`);
[...porVariante.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([v, n]) => console.log(`  ${v.padEnd(30)} ${String(n).padStart(5)}`));

console.log(`\n═══ Por set ═══`);
[...porSet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([s, n]) => console.log(`  ${s.padEnd(30)} ${String(n).padStart(5)}`));

if (DETALLE) {
  console.log(`\n═══ Detalle de ${DETALLE} ═══`);
  console.log("  " + (detalle.join(", ") || "nada"));
}

if (ESCRIBIR) {
  const cartas = Object.values(lista).reduce((n, s) => n + Object.keys(s.cards).length, 0);
  fs.writeFileSync(LISTA_OUT, JSON.stringify(lista, null, 1) + "\n", "utf8");
  console.log(`\n📝 scraper/scrydex-respaldo.json: ${Object.keys(lista).length} sets, ${cartas} cartas, ${soloScry} variantes`);
  console.log(`   El scraper de Scrydex corre solo sobre esto con: node bulk_scrape_prices.js --respaldo`);
}
