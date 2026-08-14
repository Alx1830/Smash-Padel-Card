/**
 * Precios de las cartas del catalogo general desde TCGplayer.
 *
 * Es el reemplazo del scraper de Scrydex (bulk_scrape_prices.js): aquel abre un
 * navegador por cada variante de cada carta —unas 30.000 visitas, ~25 h— y este
 * pide los mismos datos por API.
 *
 * Fuente: infinite-api.tcgplayer.com/price/history/{productId}, que devuelve el
 * precio POR VARIANTE con su nombre ("Normal", "Reverse Holofoil", "Holofoil").
 * Es la unica que sirve:
 *   · el endpoint de `pricepoints` dice "Foil" a secas y no distingue variantes.
 *   · filtrar `printing` en mp-search-api solo filtra listings — comprobado: el
 *     marketPrice del producto no cambia, devuelve el mismo para todo printing.
 *
 * Escribe en `tcg_card_prices`, una tabla aparte de `card_prices` (Scrydex), para
 * poder correr las dos fuentes en paralelo y comparar antes de migrar la app.
 * La llave es la misma (`<codigoScrydex>-<numero>`), asi que migrar despues es
 * cambiar el nombre de la tabla en el hook.
 *
 * Uso:
 *   node tcgplayer_card_prices.mjs --plan             (solo imprime el reparto)
 *   node tcgplayer_card_prices.mjs --chunk 1          (1 de 9, como en Actions)
 *   node tcgplayer_card_prices.mjs --set ancient-origins --dry-run
 *   node tcgplayer_card_prices.mjs --set ancient-origins --limit 20 --compare
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT        = path.resolve(__dirname, "..");
const MAPPING_DIR = path.join(ROOT, "scripts", "tcgplayer-mapping", "cards");
const HOOK_TS     = path.join(ROOT, "src", "hooks", "useScrydexPrice.ts");
const BULK_JS     = path.join(__dirname, "bulk_scrape_prices.js");

const HISTORY = id => `https://infinite-api.tcgplayer.com/price/history/${id}?range=month`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const TOTAL_CHUNKS = 9;

/**
 * Cuantos productos se piden a la vez y cuanto se espera entre tandas.
 *
 * Deliberadamente lento: la prioridad es no volver a ver un 403, no terminar
 * rapido. Una peticion cada segundo por worker, tres corriendo a la vez en el
 * lote, da ~3 peticiones/s contra la API — un ritmo que un navegador con varias
 * pestanas abiertas produce sin despeinarse.
 *
 * El limite que importa no es el de un worker sino el de los TRES juntos, que
 * pegan a la misma API. Con 4 en paralelo y 300 ms iban a ~40/s entre todos y
 * TCGplayer corto a la mitad del chunk. No volver a subirlos: el ciclo completo
 * tarda ~2h30 y esta bien que asi sea.
 */
const CONCURRENCY  = 1;
const PAUSA_BASE   = 1000;
const PAUSA_TOPE   = 6000;

/**
 * Los tres workers del lote arrancan a la vez y sin esto pedirian en el mismo
 * instante toda la corrida, concentrando la carga en picos. Cada uno espera un
 * poco distinto segun su chunk para quedar intercalados.
 */
const ESCALONADO = 20_000;

/**
 * Un 403 de TCGplayer es temporal: castiga unos minutos y suelta. Por eso al
 * recibirlo se espera y se baja el ritmo en vez de abortar — abortar tiraba el
 * set que estaba a medias y dejaba el chunk sin terminar.
 */
const ENFRIAMIENTO      = 180_000;
const MAX_ENFRIAMIENTOS = 10;   // seguidos sin lograr nada: ahi si es un bloqueo largo

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Argumentos ──────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const flag    = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const CHUNK   = flag("--chunk") ? Number(flag("--chunk")) : null;
const ONE_SET = flag("--set");
const LIMIT   = flag("--limit") ? Number(flag("--limit")) : Infinity;
const DRY_RUN = args.includes("--dry-run");
const PLAN    = args.includes("--plan");
const COMPARE = args.includes("--compare");

if (CHUNK !== null && (!Number.isInteger(CHUNK) || CHUNK < 1 || CHUNK > TOTAL_CHUNKS)) {
  console.error(`❌ --chunk debe ser un entero entre 1 y ${TOTAL_CHUNKS}`);
  process.exit(1);
}

const NECESITA_DB = !DRY_RUN && !PLAN;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (NECESITA_DB && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = (NECESITA_DB || COMPARE) && SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// ── Codigos de set ──────────────────────────────────────────────────────────
/**
 * El codigo de Scrydex sigue siendo la llave de los precios. No es que se siga
 * usando Scrydex: es que el inventario de todos los usuarios ya apunta a esos
 * ids, y cambiarlos obligaria a migrar los datos de la gente.
 *
 * Los codigos viven en DOS listas que no estan sincronizadas: la del hook (169
 * sets, la que la app consulta) y la del scraper de Scrydex (178, la que decide
 * bajo que llave se guarda). Leer solo la del hook dejaba 13 sets fuera
 * —black-bolt, white-flare, los Trainer Gallery— que si tienen codigo.
 *
 * Cuando un set esta en las dos con codigos distintos manda el del hook: es el
 * que la app va a buscar. Que no coincidan es un bug aparte, senalado abajo.
 */
function readCodes() {
  const codes = {};

  const bulk = fs.readFileSync(BULK_JS, "utf8");
  for (const m of bulk.matchAll(/\{\s*slug:\s*"([^"]+)",\s*code:\s*"([^"]+)"\s*\}/g)) {
    codes[m[1]] = m[2];
  }

  const hook = fs.readFileSync(HOOK_TS, "utf8");
  const block = hook.slice(hook.indexOf("SCRYDEX_SET_CODES"), hook.indexOf("const supabase"));
  const discrepan = [];
  for (const m of block.matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9]+)"/gi)) {
    if (codes[m[1]] && codes[m[1]] !== m[2]) discrepan.push(`${m[1]} (hook ${m[2]} / scraper ${codes[m[1]]})`);
    codes[m[1]] = m[2];
  }
  if (discrepan.length) {
    console.log(`⚠️  ${discrepan.length} sets con codigo distinto en cada lista; se usa el del hook:`);
    discrepan.forEach(d => console.log(`   ${d}`));
  }

  return codes;
}

// ── Trabajo por set ─────────────────────────────────────────────────────────
/**
 * Un set se convierte en: la lista de productos que hay que consultar y, por
 * cada producto, que carta/variante nuestra alimenta.
 *
 * Varias variantes comparten producto (normal y reverse de la misma carta viven
 * en el mismo productId, distinguidas por printing), asi que se agrupa: una
 * peticion por producto, no por variante.
 */
function buildSet(slug, codes) {
  const file = path.join(MAPPING_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const code = codes[slug];
  if (!code) return null;   // set sin codigo: no tiene donde guardar precios

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  /** productId → [{ number, version, printing }] */
  const productos = new Map();

  for (const [number, card] of Object.entries(data.cards ?? {})) {
    for (const [version, v] of Object.entries(card.variants ?? {})) {
      if (!v?.product_id) continue;   // variante que no existe en TCGplayer
      const key = String(v.product_id);
      if (!productos.has(key)) productos.set(key, []);
      productos.get(key).push({ number, version, printing: v.printing ?? null });
    }
  }

  return { slug, code, productos };
}

function loadSets(codes) {
  const slugs = fs.readdirSync(MAPPING_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(/\.json$/, ""))
    .sort();

  return slugs
    .map(s => buildSet(s, codes))
    .filter(s => s && s.productos.size > 0);
}

/**
 * Reparte los sets en 9 chunks equilibrados por cantidad de productos, no por
 * cantidad de sets: un set de 400 cartas y uno de 20 no cuestan lo mismo y con
 * un reparto por conteo un worker terminaria en 30 s y otro en 20 min.
 */
function splitChunks(sets) {
  const chunks = Array.from({ length: TOTAL_CHUNKS }, () => ({ sets: [], productos: 0 }));
  for (const set of [...sets].sort((a, b) => b.productos.size - a.productos.size)) {
    const menor = chunks.reduce((a, b) => (a.productos <= b.productos ? a : b));
    menor.sets.push(set);
    menor.productos += set.productos.size;
  }
  // Dentro del chunk, orden alfabetico para que el log sea legible
  chunks.forEach(c => c.sets.sort((a, b) => a.slug.localeCompare(b.slug)));
  return chunks;
}

// ── Precios ─────────────────────────────────────────────────────────────────
/**
 * Ritmo actual. Sube solo cuando TCGplayer se queja y no vuelve a bajar en toda
 * la corrida: si ya avisó una vez que vamos rapido, insistir con el ritmo viejo
 * es volver al mismo 403 unos cientos de productos despues.
 */
let pausaTanda    = PAUSA_BASE;
let enfriamientos = 0;
let hubo403       = 0;

/** Espera a que se le pase el enojo y baja el ritmo para lo que queda. */
async function enfriar(status) {
  hubo403++;
  enfriamientos++;
  if (enfriamientos > MAX_ENFRIAMIENTOS) {
    throw new Error(
      `TCGplayer sigue devolviendo ${status} despues de ${MAX_ENFRIAMIENTOS} enfriamientos — ` +
      `esto ya no es un limite de ritmo. Revisar antes de volver a correr.`,
    );
  }
  pausaTanda = Math.min(Math.round(pausaTanda * 1.5), PAUSA_TOPE);
  console.log(`\n   ⏸️  HTTP ${status} — pausa de ${ENFRIAMIENTO / 1000}s, sigo a ${pausaTanda} ms por tanda`);
  await sleep(ENFRIAMIENTO);
}

/** Precio de cada variante del producto, con el nombre del printing como llave. */
async function fetchPrecios(productId, attempt = 1) {
  let res;
  try {
    res = await fetch(HISTORY(productId), {
      headers: {
        "User-Agent": UA,
        Origin: "https://www.tcgplayer.com",
        Referer: "https://www.tcgplayer.com/",
      },
    });
  } catch (err) {
    if (attempt <= 3) { await sleep(attempt * 2000); return fetchPrecios(productId, attempt + 1); }
    return { error: err.message };
  }

  if (res.status === 403 || res.status === 429) {
    if (attempt <= 3) { await enfriar(res.status); return fetchPrecios(productId, attempt + 1); }
    return { error: `HTTP ${res.status}` };
  }

  if (!res.ok) {
    if (attempt <= 3) { await sleep(attempt * 2000); return fetchPrecios(productId, attempt + 1); }
    return { error: `HTTP ${res.status}` };
  }

  enfriamientos = 0;   // respondio bien: la racha mala se corto

  let json;
  try { json = await res.json(); } catch { return { error: "respuesta ilegible" }; }

  // result viene del dia mas reciente al mas viejo; el primero es el de hoy
  const dia = json?.result?.[0];
  if (!dia?.variants?.length) return { error: "sin historico" };

  const out = {};
  for (const v of dia.variants) {
    const precio = Number(v.marketPrice);
    if (!v.variant || !Number.isFinite(precio) || precio <= 0) continue;
    out[v.variant] = precio;
  }
  return Object.keys(out).length ? { precios: out, fecha: dia.date } : { error: "sin precio" };
}

/**
 * Elige el precio de una variante nuestra dentro de lo que devolvio el producto.
 *
 * Cuando el mapeo anoto el printing se busca por ese nombre. Cuando no —porque
 * la variante es un producto aparte, como las Cosmos Holo— el producto entero es
 * esa variante y trae un solo precio, asi que se toma el unico que haya.
 */
function pickPrecio(precios, printing) {
  if (printing && precios[printing] != null) return precios[printing];
  const valores = Object.values(precios);
  if (!printing && valores.length === 1) return valores[0];
  if (!printing && precios["Normal"] != null) return precios["Normal"];
  return null;
}

/** Corre `items` de a CONCURRENCY, esperando el ritmo vigente entre tandas. */
async function enTandas(items, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const tanda = items.slice(i, i + CONCURRENCY);
    out.push(...await Promise.all(tanda.map(fn)));
    if (i + CONCURRENCY < items.length) await sleep(pausaTanda);
  }
  return out;
}

async function upsert(rows) {
  if (DRY_RUN) { console.log(`   🧪 dry-run: ${rows.length} filas listas, no se guardan`); return; }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from("tcg_card_prices")
      .upsert(rows.slice(i, i + 500), { onConflict: "card_id" });
    if (error) throw new Error(`tcg_card_prices: ${error.message}`);
  }
  console.log(`   💾 ${rows.length} filas guardadas`);
}

// ── Comparacion contra Scrydex ──────────────────────────────────────────────
/** Cuanto se movería el portafolio si se migrara: mediana de la diferencia. */
async function compararConScrydex(rows) {
  if (!supabase) { console.log("\n⚠️  --compare necesita SUPABASE_URL para leer card_prices"); return; }
  const ids = rows.map(r => r.card_id);
  const viejos = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("card_prices").select("card_id, prices").in("card_id", ids.slice(i, i + 200));
    (data ?? []).forEach(r => viejos.set(r.card_id, r.prices));
  }

  const difs = [];
  let soloTCG = 0, soloScrydex = 0;
  for (const row of rows) {
    const antes = viejos.get(row.card_id);
    if (!antes) { soloTCG++; continue; }
    for (const [version, nuevo] of Object.entries(row.prices)) {
      const viejo = antes[version];
      if (viejo == null || viejo <= 0) { soloTCG++; continue; }
      difs.push(((nuevo - viejo) / viejo) * 100);
    }
    for (const version of Object.keys(antes)) {
      if (row.prices[version] == null) soloScrydex++;
    }
  }

  difs.sort((a, b) => a - b);
  const mediana = difs.length ? difs[Math.floor(difs.length / 2)] : null;
  const dentro10 = difs.filter(d => Math.abs(d) <= 10).length;

  console.log("\n📊 Contra Scrydex");
  console.log(`   ${difs.length} variantes comparables`);
  if (mediana !== null) {
    console.log(`   mediana de la diferencia: ${mediana.toFixed(1)} %`);
    console.log(`   dentro de ±10 %: ${dentro10} (${((dentro10 / difs.length) * 100).toFixed(1)} %)`);
  }
  console.log(`   solo en TCGplayer: ${soloTCG} · solo en Scrydex: ${soloScrydex}`);
}

// ── Un set ──────────────────────────────────────────────────────────────────
async function correrSet(set) {
  const productos = [...set.productos.entries()].slice(0, LIMIT);
  console.log(`\n🃏 ${set.slug} (${set.code}) — ${productos.length} productos`);

  /** numero de carta → { version: precio } */
  const porCarta = new Map();
  let ok = 0, sinPrecio = 0, hechos = 0, deLaPasada = productos.length;
  let fallidos = [];

  const pasada = async ([productId, variantes]) => {
    const { precios, error } = await fetchPrecios(productId);
    hechos++;
    if (hechos % 25 === 0) process.stdout.write(`\r   ${hechos}/${deLaPasada} · ${ok} con precio`);
    if (error) { fallidos.push([productId, variantes]); return; }

    for (const { number, version, printing } of variantes) {
      const precio = pickPrecio(precios, printing);
      if (precio == null) { sinPrecio++; continue; }
      if (!porCarta.has(number)) porCarta.set(number, {});
      porCarta.get(number)[version] = precio;
      ok++;
    }
  };

  await enTandas(productos, pasada);

  // Segunda pasada: casi todo lo que falla es un 403 pasajero, y a este ritmo
  // —ya rebajado por los enfriamientos— suele contestar bien.
  if (fallidos.length) {
    const reintentar = fallidos;
    fallidos = [];
    console.log(`\n   ↻ reintentando ${reintentar.length} productos`);
    hechos = 0;
    deLaPasada = reintentar.length;
    await enTandas(reintentar, pasada);
  }
  const fallos = fallidos.length;

  const now = new Date().toISOString();
  const rows = [...porCarta.entries()].map(([number, prices]) => ({
    card_id: `${set.code}-${number}`,
    prices,
    updated_at: now,
  }));

  console.log(`\n   ${rows.length} cartas · ${ok} variantes con precio` +
    `${sinPrecio ? ` · ${sinPrecio} sin precio` : ""}${fallos ? ` · ${fallos} productos fallaron` : ""}`);

  if (rows.length) await upsert(rows);
  return rows;
}

// ── Main ────────────────────────────────────────────────────────────────────
const codes = readCodes();
const todos = loadSets(codes);

if (PLAN) {
  const chunks = splitChunks(todos);
  const totalProd = todos.reduce((n, s) => n + s.productos.size, 0);
  console.log(`\n${todos.length} sets con mapeo y codigo · ${totalProd} productos a consultar`);
  console.log(`Reparto en ${TOTAL_CHUNKS} chunks:\n`);
  chunks.forEach((c, i) => {
    console.log(` chunk ${i + 1}: ${String(c.productos).padStart(5)} productos · ${String(c.sets.length).padStart(3)} sets`);
  });
  const porWorker = Math.max(...chunks.map(c => c.productos));
  const seg = (porWorker / CONCURRENCY) * (PAUSA_BASE / 1000 + 0.15);
  console.log(`\nEl chunk mas pesado tiene ${porWorker} productos → ~${(seg / 60).toFixed(1)} min.`);
  const sinCodigo = fs.readdirSync(MAPPING_DIR).filter(f => f.endsWith(".json")).length - todos.length;
  if (sinCodigo > 0) console.log(`⚠️  ${sinCodigo} sets del mapeo se saltan por no tener codigo en SCRYDEX_SET_CODES.`);
  process.exit(0);
}

let objetivo;
if (ONE_SET) {
  const set = todos.find(s => s.slug === ONE_SET);
  if (!set) { console.error(`❌ Set desconocido o sin mapeo: ${ONE_SET}`); process.exit(1); }
  objetivo = [set];
  console.log(`▶️  Set suelto: ${ONE_SET}${DRY_RUN ? " (dry-run)" : ""}`);
} else if (CHUNK !== null) {
  const chunk = splitChunks(todos)[CHUNK - 1];
  objetivo = chunk.sets;
  console.log(`▶️  Chunk ${CHUNK}/${TOTAL_CHUNKS} — ${chunk.sets.length} sets, ${chunk.productos} productos`);
  // Los tres chunks de un lote son consecutivos, asi que el resto los separa
  const espera = ((CHUNK - 1) % 3) * ESCALONADO;
  if (espera) {
    console.log(`   ⏳ arranque escalonado: ${espera / 1000}s para no coincidir con los otros del lote`);
    await sleep(espera);
  }
} else {
  objetivo = todos;
  console.log(`▶️  Todos los sets (${todos.length}) — considera --chunk para repartirlo`);
}

const t0 = Date.now();
const todasLasFilas = [];
for (const set of objetivo) {
  todasLasFilas.push(...await correrSet(set));
}
if (COMPARE) await compararConScrydex(todasLasFilas);
if (hubo403) {
  console.log(`\n⚠️  TCGplayer corto ${hubo403} veces; el ritmo termino en ${pausaTanda} ms por tanda.`);
  console.log("   Si se repite todas las corridas, bajar CONCURRENCY o subir PAUSA_BASE.");
}
console.log(`\n🎉 ${todasLasFilas.length} cartas en ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
