/**
 * bulk_scrape_prices.js
 * Scrapea los precios de TODAS las cartas de un set desde Scrydex
 * y los guarda/actualiza masivamente en Supabase (tabla card_prices).
 *
 * Uso:
 *   node bulk_scrape_prices.js --set chaos-rising --code me4
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const SET_SLUG = getArg("--set");
const SET_CODE = getArg("--code");

if (!SET_SLUG || !SET_CODE) {
  console.error("Uso: node bulk_scrape_prices.js --set chaos-rising --code me4");
  process.exit(1);
}

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toCardSlug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const VARIANT_MAP = {
  "normal":               "normal",
  "reverse holofoil":     "reverseHolofoil",
  "reverse holo":         "reverseHolofoil",
  "holofoil":             "holofoil",
  "holo":                 "holofoil",
  "cosmos holofoil":      "cosmosHolofoil",
  "cracked ice holofoil": "crackedIceHolofoil",
  "energy symbol":        "energySymbol",
  "poke ball":            "pokeBall",
  "pokeball":             "pokeBall",
  "normal alternate":     "normalAlternate",
  "first edition":        "firstEdition",
  "unlimited":            "unlimited",
};

function normalizeVariantKey(raw) {
  const lower = raw.trim().toLowerCase();
  return VARIANT_MAP[lower] ?? lower.replace(/\s+/g, "");
}

// ── Leer cartas del set desde el archivo .ts ──────────────────────────────────
function loadSetCards(setSlug) {
  const filePath = path.join(
    __dirname,
    `../src/data/sets/${setSlug}.ts`
  );
  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");

  // Extraer card_number y name únicos (una entrada por número de carta)
  const seen = new Set();
  const cards = [];
  const regex = /name:\s*"([^"]+)"[^}]+card_number:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    const number = parseInt(match[2], 10);
    if (!seen.has(number)) {
      seen.add(number);
      cards.push({ name, number });
    }
  }

  return cards;
}

// ── Scraping de una carta ─────────────────────────────────────────────────────
async function scrapeCard(page, cardName, cardNumber) {
  const cardSlug = toCardSlug(cardName);
  const cardId   = `${SET_CODE}-${cardNumber}`;
  const baseUrl  = `https://scrydex.com/pokemon/cards/${cardSlug}/${cardId}`;

  // Cargar página base para detectar variantes disponibles
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);

  const title = await page.title();
  if (title.includes("Not Found") || title.includes("404")) {
    return { cardId, prices: null, error: "404" };
  }

  // Leer variantes disponibles
  const availableVariants = await page.evaluate(() => {
    const lines = document.body.innerText
      .split("\n").map(l => l.trim()).filter(l => l);
    const idx = lines.findIndex(l => l.toUpperCase() === "SELECT VARIANT");
    if (idx === -1) return [];
    const variants = [];
    for (let i = idx + 1; i < lines.length && i < idx + 10; i++) {
      if (lines[i].toUpperCase().includes("DATA SOURCE")) break;
      variants.push(lines[i]);
    }
    return variants;
  });

  // Si no hay bloque SELECT VARIANT, asumir variante activa
  const variantsToFetch = availableVariants.length > 0
    ? availableVariants
    : await page.evaluate(() => {
        const lines = document.body.innerText
          .split("\n").map(l => l.trim()).filter(l => l);
        const nmIdx = lines.findIndex(l => l.toUpperCase() === "NEAR MINT");
        return nmIdx > 0 ? [lines[nmIdx - 1]] : [];
      });

  const prices = {};

  for (const variantRaw of variantsToFetch) {
    const variantKey = normalizeVariantKey(variantRaw);
    const url = `${baseUrl}?variant=${variantKey}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(600);

    const price = await page.evaluate(() => {
      const lines = document.body.innerText
        .split("\n").map(l => l.trim()).filter(l => l);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toUpperCase() === "NEAR MINT" && i + 1 < lines.length) {
          const match = lines[i + 1].replace(/,/g, "").match(/\$?([\d.]+)/);
          if (match) return parseFloat(match[1]);
        }
      }
      return null;
    });

    if (price !== null) prices[variantKey] = price;
  }

  return { cardId, prices: Object.keys(prices).length > 0 ? prices : null };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  FaceBinder — Bulk Price Scraper`);
  console.log(`  Set: ${SET_SLUG} (${SET_CODE})`);
  console.log(`${"═".repeat(55)}\n`);

  const cards = loadSetCards(SET_SLUG);
  console.log(`📋 ${cards.length} cartas únicas encontradas en ${SET_SLUG}.ts\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const results = { ok: 0, failed: 0, skipped: 0 };
  const upsertBatch = [];
  const now = new Date().toISOString();

  for (let i = 0; i < cards.length; i++) {
    const { name, number } = cards[i];
    process.stdout.write(`[${i + 1}/${cards.length}] ${name} #${number}... `);

    try {
      const { cardId, prices, error } = await scrapeCard(page, name, number);

      if (error) {
        console.log(`⚠️  ${error}`);
        results.skipped++;
      } else if (!prices) {
        console.log("❌ Sin precios");
        results.failed++;
      } else {
        console.log(`✅ ${JSON.stringify(prices)}`);
        upsertBatch.push({ card_id: cardId, prices, updated_at: now });
        results.ok++;
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.failed++;
    }

    // Guardar en lotes de 20 para no perder datos si hay un error
    if (upsertBatch.length >= 20) {
      const batch = upsertBatch.splice(0, 20);
      const { error: dbErr } = await supabase
        .from("card_prices")
        .upsert(batch, { onConflict: "card_id" });
      if (dbErr) console.error("\n⚠️  Error guardando lote en Supabase:", dbErr.message);
      else process.stdout.write(`   💾 Lote de 20 guardado\n`);
    }

    await sleep(400); // pausa para no saturar Scrydex
  }

  // Guardar el resto
  if (upsertBatch.length > 0) {
    const { error: dbErr } = await supabase
      .from("card_prices")
      .upsert(upsertBatch, { onConflict: "card_id" });
    if (dbErr) console.error("⚠️  Error guardando último lote:", dbErr.message);
    else console.log(`\n💾 Último lote de ${upsertBatch.length} guardado`);
  }

  await browser.close();

  console.log(`\n${"═".repeat(55)}`);
  console.log(`  ✅ OK: ${results.ok}  ❌ Fallidas: ${results.failed}  ⚠️ Saltadas: ${results.skipped}`);
  console.log(`  Fecha: ${now}`);
  console.log(`${"═".repeat(55)}\n`);
})().catch(err => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
