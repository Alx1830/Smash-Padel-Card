/**
 * Comprueba que card_prices_merged funciona como espera la app:
 * responde con la llave anon, es rapida, y fusiona por variante en vez de
 * dejar que una fuente tape a la otra.
 *
 * Uso: node scripts/tcg-verificar-vista.mjs
 * Variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !ANON) { console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY"); process.exit(1); }

// Con la llave anon a proposito: es la que usa el navegador, y si la vista no
// tiene GRANT o RLS la bloquea, aqui se ve y no en produccion.
const supabase = createClient(URL, ANON, { auth: { persistSession: false } });

let fallos = 0;
const check = (ok, msg, extra = "") => {
  console.log(`  ${ok ? "✅" : "❌"} ${msg}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fallos++;
};

console.log("\n1. Lectura con llave anon");
{
  const { data, error } = await supabase
    .from("card_prices_merged").select("card_id, prices").limit(5);
  check(!error && data?.length > 0, "la vista responde", error?.message ?? `${data?.length} filas`);
}

console.log("\n2. Consulta por lote (como el inventario)");
{
  const ids = ["xy7-1", "base1-4", "sv8-1", "zsv10pt5-1", "swsh35-1"];
  const t0 = Date.now();
  const { data, error } = await supabase
    .from("card_prices_merged").select("card_id, prices").in("card_id", ids);
  const ms = Date.now() - t0;
  check(!error, "responde el .in()", error?.message ?? `${data?.length}/${ids.length} en ${ms} ms`);
  check(ms < 2000, "tarda menos de 2 s", `${ms} ms`);
  (data ?? []).forEach(r => console.log(`     ${r.card_id}: ${JSON.stringify(r.prices).slice(0, 90)}`));
}

console.log("\n3. Consulta por set (como trades)");
{
  const t0 = Date.now();
  const { data, error } = await supabase
    .from("card_prices_merged").select("card_id, prices").like("card_id", "xy7-%");
  const ms = Date.now() - t0;
  check(!error, "responde el .like()", error?.message ?? `${data?.length} filas en ${ms} ms`);
  check(ms < 3000, "tarda menos de 3 s", `${ms} ms`);
}

console.log("\n4. La fusion conserva las dos fuentes");
{
  // Base Set tiene variantes que solo estan en Scrydex (1st Edition, Shadowless)
  // y precios normales que ahora vienen de TCGplayer.
  const { data } = await supabase
    .from("card_prices_merged").select("card_id, prices, tiene_tcgplayer").like("card_id", "base1-%").limit(400);
  const conAmbas = (data ?? []).filter(r => {
    const vs = Object.keys(r.prices ?? {});
    return r.tiene_tcgplayer && vs.some(v => /firstEdition|unlimited|Shadowless|Stamp/i.test(v));
  });
  check(conAmbas.length > 0, "hay cartas con variantes de las dos fuentes", `${conAmbas.length} cartas`);
  if (conAmbas[0]) console.log(`     ej. ${conAmbas[0].card_id}: ${Object.keys(conAmbas[0].prices).join(", ")}`);
}

console.log("\n5. Nadie perdio precio respecto a Scrydex");
{
  const { count: enScrydex } = await supabase
    .from("card_prices").select("card_id", { count: "exact", head: true });
  const { count: enVista } = await supabase
    .from("card_prices_merged").select("card_id", { count: "exact", head: true });
  check(enVista >= enScrydex, "la vista tiene al menos tantas cartas como Scrydex",
    `vista ${enVista} vs scrydex ${enScrydex}`);
}

console.log(fallos ? `\n❌ ${fallos} comprobaciones fallaron\n` : "\n🎉 Todo correcto\n");
process.exit(fallos ? 1 : 0);
