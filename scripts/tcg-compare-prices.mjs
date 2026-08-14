/**
 * Compara los precios de TCGplayer (tcg_card_prices) contra los de Scrydex
 * (card_prices), que es lo que la app usa hoy.
 *
 * Es la herramienta para decidir la migracion: dice cuanta cobertura gana o
 * pierde cada set y, sobre todo, cuanto se moveria el valor de los portafolios.
 * No consulta a TCGplayer — solo lee las dos tablas.
 *
 * Uso:
 *   node scripts/tcg-compare-prices.mjs
 *   node scripts/tcg-compare-prices.mjs --peores 30   (los sets mas dispares)
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK_TS = path.resolve(__dirname, "../src/hooks/useScrydexPrice.ts");

const args = process.argv.slice(2);
const PEORES = (() => { const i = args.indexOf("--peores"); return i >= 0 ? Number(args[i + 1]) : 15; })();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/** codigo de set → slug, para poder nombrar los sets en el reporte. */
function readCodes() {
  const src = fs.readFileSync(HOOK_TS, "utf8");
  const block = src.slice(src.indexOf("SCRYDEX_SET_CODES"), src.indexOf("const supabase"));
  const porCodigo = {};
  for (const m of block.matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9]+)"/gi)) porCodigo[m[2]] = m[1];
  return porCodigo;
}

/** Lee una tabla entera de precios; son ~20.000 filas, hay que paginar. */
async function leerTodo(tabla) {
  const map = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(tabla).select("card_id, prices").range(from, from + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    data.forEach(r => map.set(r.card_id, r.prices ?? {}));
    if (data.length < 1000) break;
  }
  return map;
}

const mediana = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const codigoDe = cardId => cardId.slice(0, cardId.lastIndexOf("-"));

console.log("Leyendo las dos tablas...");
const [tcg, scry] = await Promise.all([leerTodo("tcg_card_prices"), leerTodo("card_prices")]);
console.log(`  tcg_card_prices: ${tcg.size} cartas`);
console.log(`  card_prices:     ${scry.size} cartas`);

const porCodigo = readCodes();
/** codigo → acumulado del set */
const sets = new Map();
const setDe = code => {
  if (!sets.has(code)) {
    sets.set(code, { difs: [], soloTCG: 0, soloScry: 0, ambos: 0 });
  }
  return sets.get(code);
};

const difsGlobal = [];
let soloTCG = 0, soloScry = 0, ambos = 0;

// Union de las dos: interesa tanto lo que gana como lo que pierde
for (const cardId of new Set([...tcg.keys(), ...scry.keys()])) {
  const a = tcg.get(cardId) ?? {};
  const b = scry.get(cardId) ?? {};
  const set = setDe(codigoDe(cardId));

  for (const version of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const nuevo = Number(a[version]);
    const viejo = Number(b[version]);
    const hayNuevo = Number.isFinite(nuevo) && nuevo > 0;
    const hayViejo = Number.isFinite(viejo) && viejo > 0;

    if (hayNuevo && hayViejo) {
      const dif = ((nuevo - viejo) / viejo) * 100;
      difsGlobal.push(dif);
      set.difs.push(dif);
      ambos++;
    } else if (hayNuevo) { soloTCG++;  set.soloTCG++;  }
    else if (hayViejo)   { soloScry++; set.soloScry++; }
  }
}

const dentro10 = difsGlobal.filter(d => Math.abs(d) <= 10).length;
console.log("\n═══ Global ═══");
console.log(`  variantes en ambas fuentes: ${ambos}`);
console.log(`  mediana de la diferencia:   ${mediana(difsGlobal)?.toFixed(2)} %`);
console.log(`  dentro de ±10 %:            ${dentro10} (${(dentro10 / ambos * 100).toFixed(1)} %)`);
console.log(`  solo en TCGplayer (gana):   ${soloTCG}`);
console.log(`  solo en Scrydex (pierde):   ${soloScry}`);

// Los sets donde migrar cambiaria mas el valor, que son los que hay que mirar a mano
const rank = [...sets.entries()]
  .filter(([, s]) => s.difs.length >= 10)
  .map(([code, s]) => ({
    code, slug: porCodigo[code] ?? code,
    n: s.difs.length, med: mediana(s.difs),
    soloScry: s.soloScry, soloTCG: s.soloTCG,
  }))
  .sort((a, b) => Math.abs(b.med) - Math.abs(a.med));

console.log(`\n═══ ${Math.min(PEORES, rank.length)} sets con mayor diferencia ═══`);
console.log("  set                          n     mediana   pierde  gana");
for (const r of rank.slice(0, PEORES)) {
  console.log(
    `  ${r.slug.padEnd(28)} ${String(r.n).padStart(4)}  ${r.med.toFixed(1).padStart(7)} %  ` +
    `${String(r.soloScry).padStart(6)} ${String(r.soloTCG).padStart(5)}`,
  );
}

// Sets que hoy tienen precio y con la migracion se quedarian sin ninguno
const perdidos = [...sets.entries()]
  .filter(([, s]) => s.difs.length === 0 && s.soloScry > 0)
  .map(([code, s]) => `${porCodigo[code] ?? code} (${s.soloScry})`);
if (perdidos.length) {
  console.log(`\n⚠️  Sets con precio hoy y ninguno en TCGplayer:\n   ${perdidos.join(", ")}`);
}
