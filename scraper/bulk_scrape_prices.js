/**
 * bulk_scrape_prices.js
 * Scrapea los precios de TODAS las cartas de un set desde Scrydex
 * y los guarda/actualiza masivamente en Supabase (tabla card_prices).
 *
 * Uso:
 *   node bulk_scrape_prices.js --set chaos-rising --code me4
 *   node bulk_scrape_prices.js --all
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// ── Mapa completo de sets → códigos Scrydex ───────────────────────────────────
const ALL_SET_CODES = {
  // Mega Evolution Series
  "mega-evolution":       "me1",
  "phantasmal-flames":    "me2",
  "ascended-heroes":      "me3",
  "chaos-rising":         "me4",
  "perfect-order":        "me5",
  // Scarlet & Violet
  "scarlet-violet":       "sv1",
  "paldea-evolved":       "sv2",
  "obsidian-flames":      "sv3",
  "sv-151":               "sv3pt5",
  "paradox-rift":         "sv4",
  "paldean-fates":        "sv4pt5",
  "temporal-forces":      "sv5",
  "twilight-masquerade":  "sv6",
  "shrouded-fable":       "sv6pt5",
  "stellar-crown":        "sv7",
  "surging-sparks":       "sv8",
  "prismatic-evolutions": "sv8pt5",
  "journey-together":     "sv9",
  "destined-rivals":      "sv10",
  "sv-promos":            "svp",
  "mcd-2021":             "mcd21",
  "mcd-2022":             "mcd22",
  "mcd-2023":             "mcd23",
  "mcd-2024":             "mcd24",
  "tcg-classic-venusaur":  "clv",
  "tcg-classic-charizard": "clc",
  "tcg-classic-blastoise": "clb",
  "poke-card-creator":    "wb1",
  // Sword & Shield
  "sword-shield":         "swsh1",
  "rebel-clash":          "swsh2",
  "darkness-ablaze":      "swsh3",
  "vivid-voltage":        "swsh4",
  "battle-styles":        "swsh5",
  "chilling-reign":       "swsh6",
  "evolving-skies":       "swsh7",
  "fusion-strike":        "swsh8",
  "brilliant-stars":      "swsh9",
  "astral-radiance":      "swsh10",
  "lost-origin":          "swsh11",
  "silver-tempest":       "swsh12",
  "crown-zenith":         "swsh12pt5",
  "champions-path":       "cpa",
  "shining-fates":        "shf",
  "celebrations":         "cel25",
  "pokemon-go":           "pgo",
  "ss-promos":            "swshp",
  "mcd-25th":             "mcd25",
  // Sun & Moon
  "sun-moon":             "sm1",
  "guardians-rising":     "sm2",
  "burning-shadows":      "sm3",
  "crimson-invasion":     "sm4",
  "ultra-prism":          "sm5",
  "forbidden-light":      "sm6",
  "celestial-storm":      "sm7",
  "lost-thunder":         "sm8",
  "team-up":              "sm9",
  "unbroken-bonds":       "sm10",
  "unified-minds":        "sm11",
  "cosmic-eclipse":       "sm12",
  "shining-legends":      "sm35",
  "dragon-majesty":       "sm75",
  "hidden-fates":         "sm115",
  "detective-pikachu":    "det1",
  "sm-promos":            "smp",
  "mcd-2017":             "mcd17",
  "mcd-2018":             "mcd18",
  "mcd-2019":             "mcd19",
  // XY
  "xy":                   "xy1",
  "xy-flashfire":         "xy2",
  "furious-fists":        "xy3",
  "phantom-forces":       "xy4",
  "primal-clash":         "xy5",
  "roaring-skies":        "xy6",
  "ancient-origins":      "xy7",
  "xy-breakthrough":      "xy8",
  "breakpoint":           "xy9",
  "fates-collide":        "xy10",
  "steam-siege":          "xy11",
  "evolutions":           "xy12",
  "double-crisis":        "dc1",
  "generations":          "g1",
  "kalos-starter":        "xy0",
  "xy-promos":            "xyp",
  "mcd-2014":             "mcd14",
  "mcd-2015":             "mcd15",
  "mcd-2016":             "mcd16",
  // Black & White
  "black-white":          "bw1",
  "emerging-powers":      "bw2",
  "noble-victories":      "bw3",
  "next-destinies":       "bw4",
  "dark-explorers":       "bw5",
  "dragons-exalted":      "bw6",
  "boundaries-crossed":   "bw7",
  "plasma-storm":         "bw8",
  "plasma-freeze":        "bw9",
  "plasma-blast":         "bw10",
  "legendary-treasures":  "bw11",
  "radiant-collection":   "rc1",
  "dragon-vault":         "dv1",
  "bw-promos":            "bwp",
  "mcd-2011":             "mcd11",
  "mcd-2012":             "mcd12",
  "mcd-2013":             "mcd13",
  // HeartGold SoulSilver
  "heartgold-soulsilver": "hgss1",
  "hs-unleashed":         "hgss2",
  "hs-undaunted":         "hgss3",
  "hs-triumphant":        "hgss4",
  "call-of-legends":      "col1",
  "hgss-promos":          "hsp",
  // Platinum
  "platinum":             "pl1",
  "platinum-rr":          "pl2",
  "platinum-sv":          "pl3",
  "platinum-arceus":      "pl4",
  // Diamond & Pearl
  "diamond-pearl":        "dp1",
  "mysterious-treasures": "dp2",
  "secret-wonders":       "dp3",
  "great-encounters":     "dp4",
  "majestic-dawn":        "dp5",
  "legends-awakened":     "dp6",
  "stormfront":           "dp7",
  "dp-promos":            "dpp",
  // EX Ruby & Sapphire
  "ex-ruby-sapphire":       "ex1",
  "ex-sandstorm":           "ex2",
  "ex-dragon":              "ex3",
  "ex-team-magma-aqua":     "ex4",
  "ex-hidden-legends":      "ex5",
  "ex-firered-leafgreen":   "ex6",
  "ex-team-rocket-returns": "ex7",
  "ex-deoxys":              "ex8",
  "ex-emerald":             "ex9",
  "ex-unseen-forces":       "ex10",
  "ex-delta-species":       "ex11",
  "ex-legend-maker":        "ex12",
  "ex-holon-phantoms":      "ex13",
  "ex-crystal-guardians":   "ex14",
  "ex-dragon-frontiers":    "ex15",
  "ex-power-keepers":       "ex16",
  "ex-trainer-kit-latias":  "tk1a",
  "ex-trainer-kit-latios":  "tk1b",
  "ex-trainer-kit-plusle":  "tk2a",
  "ex-trainer-kit-minun":   "tk2b",
  // e-Card
  "expedition":           "ecard1",
  "aquapolis":            "ecard2",
  "skyridge":             "ecard3",
  // Legendary / Neo / Gym / Base
  "legendary-collection": "lc",
  "neo-genesis":          "neo1",
  "neo-discovery":        "neo2",
  "neo-revelation":       "neo3",
  "neo-destiny":          "neo4",
  "southern-islands":     "si1",
  "gym-heroes":           "gym1",
  "gym-challenge":        "gym2",
  "base-set":             "base1",
  "jungle":               "base2",
  "fossil":               "base3",
  "base-set-2":           "base4",
  "team-rocket":          "base5",
  // POP Series
  "pop-1": "pop1", "pop-2": "pop2", "pop-3": "pop3",
  "pop-4": "pop4", "pop-5": "pop5", "pop-6": "pop6",
  "pop-7": "pop7", "pop-8": "pop8", "pop-9": "pop9",
};

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const RUN_ALL = args.includes("--all");

const SET_SLUG = getArg("--set");
const SET_CODE = getArg("--code");

if (!RUN_ALL && (!SET_SLUG || !SET_CODE)) {
  console.error("Uso: node bulk_scrape_prices.js --set chaos-rising --code me4");
  console.error("     node bulk_scrape_prices.js --all");
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
async function scrapeCard(page, cardName, cardNumber, setCode) {
  const cardSlug = toCardSlug(cardName);
  const cardId   = `${setCode}-${cardNumber}`;
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

// ── Scrape de un set completo ─────────────────────────────────────────────────
async function scrapeSet(page, setSlug, setCode) {
  const setFilePath = path.join(__dirname, `../src/data/sets/${setSlug}.ts`);
  if (!fs.existsSync(setFilePath)) {
    console.log(`  ⏭️  Sin archivo de cartas: ${setSlug}.ts — omitido`);
    return { ok: 0, failed: 0, skipped: 0 };
  }

  const cards = loadSetCards(setSlug);
  if (cards.length === 0) {
    console.log(`  ⏭️  Sin cartas encontradas en ${setSlug}.ts — omitido`);
    return { ok: 0, failed: 0, skipped: 0 };
  }

  console.log(`\n  📋 ${cards.length} cartas en ${setSlug} (${setCode})`);

  const results = { ok: 0, failed: 0, skipped: 0 };
  const upsertBatch = [];
  const now = new Date().toISOString();

  for (let i = 0; i < cards.length; i++) {
    const { name, number } = cards[i];
    process.stdout.write(`  [${i + 1}/${cards.length}] ${name} #${number}... `);

    try {
      const { cardId, prices, error } = await scrapeCard(page, name, number, setCode);

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

    if (upsertBatch.length >= 20) {
      const batch = upsertBatch.splice(0, 20);
      const { error: dbErr } = await supabase
        .from("card_prices")
        .upsert(batch, { onConflict: "card_id" });
      if (dbErr) console.error("\n  ⚠️  Error guardando lote:", dbErr.message);
    }

    await sleep(400);
  }

  if (upsertBatch.length > 0) {
    const { error: dbErr } = await supabase
      .from("card_prices")
      .upsert(upsertBatch, { onConflict: "card_id" });
    if (dbErr) console.error(`  ⚠️  Error guardando último lote de ${setSlug}:`, dbErr.message);
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const setsToRun = RUN_ALL
    ? Object.entries(ALL_SET_CODES)
    : [[SET_SLUG, SET_CODE]];

  console.log(`\n${"═".repeat(55)}`);
  console.log(`  FaceBinder — Bulk Price Scraper`);
  if (RUN_ALL) console.log(`  Modo: TODOS LOS SETS (${setsToRun.length} sets)`);
  else         console.log(`  Set: ${SET_SLUG} (${SET_CODE})`);
  console.log(`${"═".repeat(55)}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const totals = { ok: 0, failed: 0, skipped: 0 };

  for (const [slug, code] of setsToRun) {
    const r = await scrapeSet(page, slug, code);
    totals.ok      += r.ok;
    totals.failed  += r.failed;
    totals.skipped += r.skipped;
  }

  await browser.close();

  console.log(`\n${"═".repeat(55)}`);
  console.log(`  ✅ OK: ${totals.ok}  ❌ Fallidas: ${totals.failed}  ⚠️ Saltadas: ${totals.skipped}`);
  console.log(`  Fecha: ${new Date().toISOString()}`);
  console.log(`${"═".repeat(55)}\n`);
})().catch(err => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
