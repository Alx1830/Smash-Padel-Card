/**
 * Sube al inventario las cartas de los sets personalizados ya creados.
 *
 * Misma regla que el editor: garantiza que el inventario tenga AL MENOS la
 * cantidad que la carta tiene en el set. Nunca resta ni pisa un conteo mayor.
 *
 *   node scripts/backfill-mysets-inventory.mjs           (dry-run)
 *   node scripts/backfill-mysets-inventory.mjs --apply   (escribe)
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const APPLY = process.argv.includes("--apply");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: sets, error } = await db.from("my_sets").select("id, name, user_id");
if (error) { console.error(error); process.exit(1); }

let creadas = 0, subidas = 0, sinCambio = 0;

for (const set of sets) {
  const { data: cards } = await db
    .from("my_set_cards")
    .select("card_id, set_id, version, quantity")
    .eq("my_set_id", set.id);

  if (!cards?.length) continue;

  const { data: player } = await db
    .from("players").select("username").eq("user_id", set.user_id).maybeSingle();
  console.log(`\n${player?.username ?? set.user_id} · "${set.name}" (${cards.length} cartas)`);

  /* Varias filas del set pueden apuntar a la misma carta: nos quedamos con el maximo */
  const need = new Map();
  for (const c of cards) {
    const k = `${c.card_id}|${c.set_id}|${c.version}`;
    need.set(k, { ...c, quantity: Math.max(need.get(k)?.quantity ?? 0, c.quantity) });
  }

  for (const c of need.values()) {
    const { data: inv } = await db.from("card_inventory")
      .select("quantity")
      .eq("user_id", set.user_id).eq("card_id", c.card_id)
      .eq("set_id", c.set_id).eq("version", c.version)
      .maybeSingle();

    const actual = inv?.quantity ?? 0;
    if (actual >= c.quantity) { sinCambio++; continue; }

    console.log(`  ${inv ? "sube" : "crea"}  ${c.set_id}/${c.card_id} (${c.version})  ${actual} -> ${c.quantity}`);
    if (inv) subidas++; else creadas++;

    if (APPLY) {
      const { error: e } = await db.from("card_inventory").upsert(
        { user_id: set.user_id, card_id: c.card_id, set_id: c.set_id, version: c.version, quantity: c.quantity },
        { onConflict: "user_id,card_id,set_id,version" },
      );
      if (e) console.error("    error:", e.message);
    }
  }
}

console.log(`\n${APPLY ? "APLICADO" : "DRY-RUN"}: ${creadas} filas nuevas, ${subidas} cantidades subidas, ${sinCambio} sin cambio`);
if (!APPLY) console.log("Corre con --apply para escribir.");
