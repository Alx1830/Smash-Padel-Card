/**
 * Comprueba contra TCGplayer los enlaces que se pegaron a mano en el panel de
 * admin, antes de darlos por buenos e integrarlos al mapeo.
 *
 * Uso: node --env-file=.env.local scripts/tcg-verify-fixes.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "tcgplayer-mapping", "fixes.json");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const { NEXT_PUBLIC_SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: K } = process.env;

if (!U || !K) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const fixes = await (await fetch(
  `${U}/rest/v1/tcg_mapping_fixes?select=set_id,card_number,card_name,product_id&order=set_id,card_number`,
  { headers: { apikey: K, Authorization: `Bearer ${K}` } },
)).json();

console.log(`Comprobando ${fixes.length} enlaces pegados a mano...\n`);

/**
 * Los datos del producto salen de la busqueda filtrando por productId. El
 * endpoint /v2/product/{id}/details que se usaba antes ahora responde 404 para
 * todo, incluidos productos que funcionaban.
 */
async function detallesDe(ids) {
  const res = await fetch("https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      algorithm: "sales_synonym_v2", from: 0, size: ids.length,
      filters: { term: { productLineName: ["pokemon"], productId: ids }, range: {}, match: {} },
      listingSearch: {
        context: { cart: {} },
        filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
      },
      context: { cart: {}, shippingCountry: "US", userProfile: {} },
      settings: { useFuzzySearch: false, didYouMean: {} },
    }),
  });
  if (!res.ok) throw new Error(`busqueda HTTP ${res.status}`);
  const items = (await res.json()).results?.[0]?.results ?? [];
  return new Map(items.map(p => [p.productId, p]));
}

const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
let ok = 0, revisar = 0, perdidos = 0;
const verificados = {};   // "<set>:<numero>" → datos para el mapeo

for (let i = 0; i < fixes.length; i += 20) {
  const lote = fixes.slice(i, i + 20);
  const detalles = await detallesDe(lote.map(f => f.product_id));

  for (const f of lote) {
    const p = detalles.get(f.product_id);
    if (!p) {
      console.log(`  ❌ ${f.set_id.padEnd(16)} #${String(f.card_number).padStart(3)} "${f.card_name}" — TCGplayer no reconoce el producto ${f.product_id}`);
      perdidos++;
      continue;
    }
    // El nombre trae el numero impreso y, a veces, la variante entre parentesis
    const base = p.productName
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\[[^\]]*\]\s*$/, "")
      .replace(/\s+-\s+[\dA-Za-z/]+\s*$/, "")
      .trim();
    const casa = norm(base).includes(norm(f.card_name)) || norm(f.card_name).includes(norm(base));

    console.log(`  ${casa ? "✅" : "❓"} ${f.set_id.padEnd(16)} #${String(f.card_number).padStart(3)} "${f.card_name}"`);
    console.log(`       → ${p.productName}  ·  ${p.setName}`);
    if (casa) ok++; else revisar++;

    // Entran al mapeo aunque el nombre no calce exacto: la decision fue humana
    verificados[`${f.set_id}:${f.card_number}`] = {
      product_id: f.product_id,
      tcg_name:   p.productName,
      tcg_set:    p.setName,
      coincide:   casa,
    };
  }
  await new Promise(r => setTimeout(r, 300));
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(verificados, null, 1) + "\n");

console.log(`\n${ok} coinciden por nombre · ${revisar} para mirar · ${perdidos} no existen`);
console.log(`→ ${path.relative(process.cwd(), OUT)}  (${Object.keys(verificados).length} listos para el mapeo)`);
