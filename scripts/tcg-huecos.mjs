/**
 * Que se perderia al migrar: variantes con precio en Scrydex y sin precio en
 * TCGplayer, agrupadas para ver si son un patron o casos sueltos.
 *
 * Uso: node scripts/tcg-huecos.mjs
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK_TS = path.resolve(__dirname, "../src/hooks/useScrydexPrice.ts");
const BULK_JS = path.resolve(__dirname, "../scraper/bulk_scrape_prices.js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function readCodes() {
  const codes = {};
  const bulk = fs.readFileSync(BULK_JS, "utf8");
  for (const m of bulk.matchAll(/\{\s*slug:\s*"([^"]+)",\s*code:\s*"([^"]+)"\s*\}/g)) codes[m[1]] = m[2];
  const hook = fs.readFileSync(HOOK_TS, "utf8");
  const block = hook.slice(hook.indexOf("SCRYDEX_SET_CODES"), hook.indexOf("const supabase"));
  for (const m of block.matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9]+)"/gi)) codes[m[1]] = m[2];
  const porCodigo = {};
  for (const [slug, code] of Object.entries(codes)) porCodigo[code] = slug;
  return porCodigo;
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

const porCodigo = readCodes();
const [tcg, scry] = await Promise.all([leerTodo("tcg_card_prices"), leerTodo("card_prices")]);

const porVersion = new Map();
const porSet = new Map();
let cartasSinNada = 0, variantesSueltas = 0;

for (const [cardId, precios] of scry) {
  const code = cardId.slice(0, cardId.lastIndexOf("-"));
  const enTcg = tcg.get(cardId);
  const faltantes = Object.entries(precios)
    .filter(([v, p]) => Number(p) > 0 && !(Number(enTcg?.[v]) > 0));
  if (!faltantes.length) continue;

  if (!enTcg) cartasSinNada++; else variantesSueltas++;
  porSet.set(code, (porSet.get(code) ?? 0) + faltantes.length);
  for (const [v] of faltantes) porVersion.set(v, (porVersion.get(v) ?? 0) + 1);
}

const total = [...porSet.values()].reduce((a, b) => a + b, 0);
console.log(`Variantes con precio en Scrydex y sin precio en TCGplayer: ${total}`);
console.log(`  en cartas que TCGplayer no tiene en absoluto: ${cartasSinNada}`);
console.log(`  en cartas que si tiene, pero les falta esa variante: ${variantesSueltas}`);

console.log(`\n═══ Por variante ═══`);
[...porVersion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([v, n]) => console.log(`  ${v.padEnd(30)} ${String(n).padStart(5)}`));

console.log(`\n═══ Por set (top 25) ═══`);
[...porSet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  .forEach(([c, n]) => console.log(`  ${(porCodigo[c] ?? c).padEnd(30)} ${String(n).padStart(5)}`));
