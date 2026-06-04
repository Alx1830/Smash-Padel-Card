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

// ── Mapeo completo slug local → código Scrydex ────────────────────────────────
const ALL_SETS = [
  // Mega Evolution
  { slug: "chaos-rising",            code: "me4"        },
  { slug: "perfect-order",           code: "me3"        },
  { slug: "ascended-heroes",         code: "me2pt5"     },
  { slug: "phantasmal-flames",       code: "me2"        },
  { slug: "mega-evolution",          code: "me1"        },
  { slug: "mega-evo-promos",         code: "mep"        },
  // Scarlet & Violet
  { slug: "white-flare",             code: "rsv10pt5"   },
  { slug: "black-bolt",              code: "zsv10pt5"   },
  { slug: "destined-rivals",         code: "sv10"       },
  { slug: "journey-together",        code: "sv9"        },
  { slug: "prismatic-evolutions",    code: "sv8pt5"     },
  { slug: "surging-sparks",          code: "sv8"        },
  { slug: "stellar-crown",           code: "sv7"        },
  { slug: "shrouded-fable",          code: "sv6pt5"     },
  { slug: "twilight-masquerade",     code: "sv6"        },
  { slug: "temporal-forces",         code: "sv5"        },
  { slug: "paldean-fates",           code: "sv4pt5"     },
  { slug: "paradox-rift",            code: "sv4"        },
  { slug: "sv-151",                  code: "sv3pt5"     },
  { slug: "obsidian-flames",         code: "sv3"        },
  { slug: "paldea-evolved",          code: "sv2"        },
  { slug: "scarlet-violet",          code: "sv1"        },
  { slug: "sv-energies",             code: "sve"        },
  { slug: "sv-promos",               code: "svp"        },
  // Other
  { slug: "mcd-2024",                code: "mcd24"      },
  { slug: "tcg-classic-venusaur",    code: "clv"        },
  { slug: "tcg-classic-charizard",   code: "clc"        },
  { slug: "tcg-classic-blastoise",   code: "clb"        },
  { slug: "mcd-2023",                code: "mcd23"      },
  { slug: "mcd-2022",                code: "mcd22"      },
  { slug: "mcd-2021",                code: "mcd21"      },
  { slug: "futsal-promos",           code: "fut20"      },
  { slug: "mcd-2019",                code: "mcd19"      },
  { slug: "mcd-2018",                code: "mcd18"      },
  { slug: "mcd-2017",                code: "mcd17"      },
  { slug: "mcd-2016",                code: "mcd16"      },
  { slug: "mcd-2015",                code: "mcd15"      },
  { slug: "mcd-2014",                code: "mcd14"      },
  { slug: "mcd-2012",                code: "mcd12"      },
  { slug: "mcd-2011",                code: "mcd11"      },
  { slug: "pokemon-rumble",          code: "ru1"        },
  { slug: "poke-card-creator",       code: "wb1"        },
  { slug: "best-of-game",            code: "bp"         },
  { slug: "legendary-collection",    code: "base6"      },
  { slug: "southern-islands",        code: "si1"        },
  // Sword & Shield
  { slug: "crown-zenith-gg",         code: "swsh12pt5gg"},
  { slug: "crown-zenith",            code: "swsh12pt5"  },
  { slug: "silver-tempest-tg",       code: "swsh12tg"   },
  { slug: "silver-tempest",          code: "swsh12"     },
  { slug: "lost-origin-tg",          code: "swsh11tg"   },
  { slug: "lost-origin",             code: "swsh11"     },
  { slug: "pokemon-go",              code: "pgo"        },
  { slug: "astral-radiance-tg",      code: "swsh10tg"   },
  { slug: "astral-radiance",         code: "swsh10"     },
  { slug: "brilliant-stars-tg",      code: "swsh9tg"    },
  { slug: "brilliant-stars",         code: "swsh9"      },
  { slug: "fusion-strike",           code: "swsh8"      },
  { slug: "celebrations",            code: "cel25"      },
  { slug: "evolving-skies",          code: "swsh7"      },
  { slug: "chilling-reign",          code: "swsh6"      },
  { slug: "battle-styles",           code: "swsh5"      },
  { slug: "shining-fates",           code: "swsh45"     },
  { slug: "vivid-voltage",           code: "swsh4"      },
  { slug: "champions-path",          code: "swsh35"     },
  { slug: "darkness-ablaze",         code: "swsh3"      },
  { slug: "rebel-clash",             code: "swsh2"      },
  { slug: "sword-shield",            code: "swsh1"      },
  { slug: "ss-promos",               code: "swshp"      },
  // Sun & Moon
  { slug: "cosmic-eclipse",          code: "sm12"       },
  { slug: "hidden-fates",            code: "sm115"      },
  { slug: "unified-minds",           code: "sm11"       },
  { slug: "unbroken-bonds",          code: "sm10"       },
  { slug: "detective-pikachu",       code: "det1"       },
  { slug: "team-up",                 code: "sm9"        },
  { slug: "lost-thunder",            code: "sm8"        },
  { slug: "dragon-majesty",          code: "sm75"       },
  { slug: "celestial-storm",         code: "sm7"        },
  { slug: "forbidden-light",         code: "sm6"        },
  { slug: "ultra-prism",             code: "sm5"        },
  { slug: "crimson-invasion",        code: "sm4"        },
  { slug: "shining-legends",         code: "sm35"       },
  { slug: "burning-shadows",         code: "sm3"        },
  { slug: "guardians-rising",        code: "sm2"        },
  { slug: "sm-promos",               code: "smp"        },
  { slug: "sun-moon",                code: "sm1"        },
  // XY
  { slug: "evolutions",              code: "xy12"       },
  { slug: "steam-siege",             code: "xy11"       },
  { slug: "fates-collide",           code: "xy10"       },
  { slug: "generations",             code: "g1"         },
  { slug: "breakpoint",              code: "xy9"        },
  { slug: "xy-breakthrough",         code: "xy8"        },
  { slug: "ancient-origins",         code: "xy7"        },
  { slug: "roaring-skies",           code: "xy6"        },
  { slug: "double-crisis",           code: "dc1"        },
  { slug: "primal-clash",            code: "xy5"        },
  { slug: "phantom-forces",          code: "xy4"        },
  { slug: "furious-fists",           code: "xy3"        },
  { slug: "xy-flashfire",            code: "xy2"        },
  { slug: "xy",                      code: "xy1"        },
  { slug: "kalos-starter",           code: "xy0"        },
  { slug: "xy-promos",               code: "xyp"        },
  // Black & White
  { slug: "legendary-treasures",     code: "bw11"       },
  { slug: "plasma-blast",            code: "bw10"       },
  { slug: "plasma-freeze",           code: "bw9"        },
  { slug: "plasma-storm",            code: "bw8"        },
  { slug: "boundaries-crossed",      code: "bw7"        },
  { slug: "dragon-vault",            code: "dv1"        },
  { slug: "dragons-exalted",         code: "bw6"        },
  { slug: "dark-explorers",          code: "bw5"        },
  { slug: "next-destinies",          code: "bw4"        },
  { slug: "noble-victories",         code: "bw3"        },
  { slug: "emerging-powers",         code: "bw2"        },
  { slug: "black-white",             code: "bw1"        },
  { slug: "bw-promos",               code: "bwp"        },
  // HeartGold & SoulSilver
  { slug: "call-of-legends",         code: "col1"       },
  { slug: "hs-triumphant",           code: "hgss4"      },
  { slug: "hs-undaunted",            code: "hgss3"      },
  { slug: "hs-unleashed",            code: "hgss2"      },
  { slug: "hgss-promos",             code: "hsp"        },
  { slug: "heartgold-soulsilver",    code: "hgss1"      },
  // Platinum
  { slug: "platinum-arceus",         code: "pl4"        },
  { slug: "platinum-sv",             code: "pl3"        },
  { slug: "platinum-rr",             code: "pl2"        },
  { slug: "platinum",                code: "pl1"        },
  // POP
  { slug: "pop-9",                   code: "pop9"       },
  { slug: "pop-8",                   code: "pop8"       },
  { slug: "pop-7",                   code: "pop7"       },
  { slug: "pop-6",                   code: "pop6"       },
  { slug: "pop-5",                   code: "pop5"       },
  { slug: "pop-4",                   code: "pop4"       },
  { slug: "pop-3",                   code: "pop3"       },
  { slug: "pop-2",                   code: "pop2"       },
  { slug: "pop-1",                   code: "pop1"       },
  // Diamond & Pearl
  { slug: "stormfront",              code: "dp7"        },
  { slug: "legends-awakened",        code: "dp6"        },
  { slug: "majestic-dawn",           code: "dp5"        },
  { slug: "great-encounters",        code: "dp4"        },
  { slug: "secret-wonders",          code: "dp3"        },
  { slug: "mysterious-treasures",    code: "dp2"        },
  { slug: "dp-promos",               code: "dpp"        },
  { slug: "diamond-pearl",           code: "dp1"        },
  // EX
  { slug: "ex-power-keepers",        code: "ex16"       },
  { slug: "ex-dragon-frontiers",     code: "ex15"       },
  { slug: "ex-crystal-guardians",    code: "ex14"       },
  { slug: "ex-holon-phantoms",       code: "ex13"       },
  { slug: "ex-trainer-kit-minun",    code: "tk2b"       },
  { slug: "ex-trainer-kit-plusle",   code: "tk2a"       },
  { slug: "ex-legend-maker",         code: "ex12"       },
  { slug: "ex-delta-species",        code: "ex11"       },
  { slug: "ex-unseen-forces",        code: "ex10"       },
  { slug: "ex-emerald",              code: "ex9"        },
  { slug: "ex-deoxys",               code: "ex8"        },
  { slug: "ex-team-rocket-returns",  code: "ex7"        },
  { slug: "ex-firered-leafgreen",    code: "ex6"        },
  { slug: "ex-hidden-legends",       code: "ex5"        },
  { slug: "ex-trainer-kit-latios",   code: "tk1b"       },
  { slug: "ex-trainer-kit-latias",   code: "tk1a"       },
  { slug: "ex-team-magma-aqua",      code: "ex4"        },
  { slug: "ex-dragon",               code: "ex3"        },
  { slug: "ex-sandstorm",            code: "ex2"        },
  { slug: "ex-ruby-sapphire",        code: "ex1"        },
  // NP
  { slug: "nintendo-promos",         code: "np"         },
  // E-Card
  { slug: "skyridge",                code: "ecard3"     },
  { slug: "aquapolis",               code: "ecard2"     },
  { slug: "expedition",              code: "ecard1"     },
  // Neo
  { slug: "neo-destiny",             code: "neo4"       },
  { slug: "neo-revelation",          code: "neo3"       },
  { slug: "neo-discovery",           code: "neo2"       },
  { slug: "neo-genesis",             code: "neo1"       },
  // Gym
  { slug: "gym-challenge",           code: "gym2"       },
  { slug: "gym-heroes",              code: "gym1"       },
  // Base
  { slug: "team-rocket",             code: "base5"      },
  { slug: "base-set-2",              code: "base4"      },
  { slug: "fossil",                  code: "base3"      },
  { slug: "wotc-promos",             code: "basep"      },
  { slug: "jungle",                  code: "base2"      },
  { slug: "base-set",                code: "base1"      },
];

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const RUN_ALL   = args.includes("--all");
const SET_SLUG  = getArg("--set");
const SET_CODE  = getArg("--code");
const CHUNK_ARG = getArg("--chunk"); // formato "N/TOTAL", ej: "1/5"

// Chunks predefinidos (177 sets divididos en 19 grupos de ~9-10 sets)
const CHUNKS = {
  "1": [ // 10 sets — ME + SV inicio
    { slug: "chaos-rising", code: "me4" }, { slug: "perfect-order", code: "me3" },
    { slug: "ascended-heroes", code: "me2pt5" }, { slug: "phantasmal-flames", code: "me2" },
    { slug: "mega-evolution", code: "me1" }, { slug: "mega-evo-promos", code: "mep" },
    { slug: "white-flare", code: "rsv10pt5" }, { slug: "black-bolt", code: "zsv10pt5" },
    { slug: "destined-rivals", code: "sv10" }, { slug: "journey-together", code: "sv9" },
  ],
  "2": [ // 10 sets — SV medio
    { slug: "prismatic-evolutions", code: "sv8pt5" }, { slug: "surging-sparks", code: "sv8" },
    { slug: "stellar-crown", code: "sv7" }, { slug: "shrouded-fable", code: "sv6pt5" },
    { slug: "twilight-masquerade", code: "sv6" }, { slug: "temporal-forces", code: "sv5" },
    { slug: "paldean-fates", code: "sv4pt5" }, { slug: "paradox-rift", code: "sv4" },
    { slug: "sv-151", code: "sv3pt5" }, { slug: "obsidian-flames", code: "sv3" },
  ],
  "3": [ // 10 sets — SV fin + Other inicio
    { slug: "paldea-evolved", code: "sv2" }, { slug: "scarlet-violet", code: "sv1" },
    { slug: "sv-energies", code: "sve" }, { slug: "sv-promos", code: "svp" },
    { slug: "mcd-2024", code: "mcd24" }, { slug: "tcg-classic-venusaur", code: "clv" },
    { slug: "tcg-classic-charizard", code: "clc" }, { slug: "tcg-classic-blastoise", code: "clb" },
    { slug: "mcd-2023", code: "mcd23" }, { slug: "mcd-2022", code: "mcd22" },
  ],
  "4": [ // 10 sets — Other resto
    { slug: "mcd-2021", code: "mcd21" }, { slug: "futsal-promos", code: "fut20" },
    { slug: "mcd-2019", code: "mcd19" }, { slug: "mcd-2018", code: "mcd18" },
    { slug: "mcd-2017", code: "mcd17" }, { slug: "mcd-2016", code: "mcd16" },
    { slug: "mcd-2015", code: "mcd15" }, { slug: "mcd-2014", code: "mcd14" },
    { slug: "mcd-2012", code: "mcd12" }, { slug: "mcd-2011", code: "mcd11" },
  ],
  "5": [ // 10 sets — Other fin + SWSH inicio
    { slug: "pokemon-rumble", code: "ru1" }, { slug: "poke-card-creator", code: "wb1" },
    { slug: "best-of-game", code: "bp" }, { slug: "legendary-collection", code: "base6" },
    { slug: "southern-islands", code: "si1" },
    { slug: "crown-zenith-gg", code: "swsh12pt5gg" }, { slug: "crown-zenith", code: "swsh12pt5" },
    { slug: "silver-tempest-tg", code: "swsh12tg" }, { slug: "silver-tempest", code: "swsh12" },
    { slug: "lost-origin-tg", code: "swsh11tg" },
  ],
  "6": [ // 10 sets — SWSH medio
    { slug: "lost-origin", code: "swsh11" }, { slug: "pokemon-go", code: "pgo" },
    { slug: "astral-radiance-tg", code: "swsh10tg" }, { slug: "astral-radiance", code: "swsh10" },
    { slug: "brilliant-stars-tg", code: "swsh9tg" }, { slug: "brilliant-stars", code: "swsh9" },
    { slug: "fusion-strike", code: "swsh8" }, { slug: "celebrations", code: "cel25" },
    { slug: "evolving-skies", code: "swsh7" }, { slug: "chilling-reign", code: "swsh6" },
  ],
  "7": [ // 9 sets — SWSH fin + SM inicio
    { slug: "battle-styles", code: "swsh5" }, { slug: "shining-fates", code: "swsh45" },
    { slug: "vivid-voltage", code: "swsh4" }, { slug: "champions-path", code: "swsh35" },
    { slug: "darkness-ablaze", code: "swsh3" }, { slug: "rebel-clash", code: "swsh2" },
    { slug: "sword-shield", code: "swsh1" }, { slug: "ss-promos", code: "swshp" },
    { slug: "cosmic-eclipse", code: "sm12" },
  ],
  "8": [ // 9 sets — SM medio
    { slug: "hidden-fates", code: "sm115" }, { slug: "unified-minds", code: "sm11" },
    { slug: "unbroken-bonds", code: "sm10" }, { slug: "detective-pikachu", code: "det1" },
    { slug: "team-up", code: "sm9" }, { slug: "lost-thunder", code: "sm8" },
    { slug: "dragon-majesty", code: "sm75" }, { slug: "celestial-storm", code: "sm7" },
    { slug: "forbidden-light", code: "sm6" },
  ],
  "9": [ // 9 sets — SM fin + XY inicio
    { slug: "ultra-prism", code: "sm5" }, { slug: "crimson-invasion", code: "sm4" },
    { slug: "shining-legends", code: "sm35" }, { slug: "burning-shadows", code: "sm3" },
    { slug: "guardians-rising", code: "sm2" }, { slug: "sm-promos", code: "smp" },
    { slug: "sun-moon", code: "sm1" },
    { slug: "evolutions", code: "xy12" }, { slug: "steam-siege", code: "xy11" },
  ],
  "10": [ // 9 sets — XY medio
    { slug: "fates-collide", code: "xy10" }, { slug: "generations", code: "g1" },
    { slug: "breakpoint", code: "xy9" }, { slug: "xy-breakthrough", code: "xy8" },
    { slug: "ancient-origins", code: "xy7" }, { slug: "roaring-skies", code: "xy6" },
    { slug: "double-crisis", code: "dc1" }, { slug: "primal-clash", code: "xy5" },
    { slug: "phantom-forces", code: "xy4" },
  ],
  "11": [ // 9 sets — XY fin + BW inicio
    { slug: "furious-fists", code: "xy3" }, { slug: "xy-flashfire", code: "xy2" },
    { slug: "xy", code: "xy1" }, { slug: "kalos-starter", code: "xy0" },
    { slug: "xy-promos", code: "xyp" },
    { slug: "legendary-treasures", code: "bw11" }, { slug: "plasma-blast", code: "bw10" },
    { slug: "plasma-freeze", code: "bw9" }, { slug: "plasma-storm", code: "bw8" },
  ],
  "12": [ // 9 sets — BW fin
    { slug: "boundaries-crossed", code: "bw7" }, { slug: "dragon-vault", code: "dv1" },
    { slug: "dragons-exalted", code: "bw6" }, { slug: "dark-explorers", code: "bw5" },
    { slug: "next-destinies", code: "bw4" }, { slug: "noble-victories", code: "bw3" },
    { slug: "emerging-powers", code: "bw2" }, { slug: "black-white", code: "bw1" },
    { slug: "bw-promos", code: "bwp" },
  ],
  "13": [ // 9 sets — HGSS + PL inicio
    { slug: "call-of-legends", code: "col1" }, { slug: "hs-triumphant", code: "hgss4" },
    { slug: "hs-undaunted", code: "hgss3" }, { slug: "hs-unleashed", code: "hgss2" },
    { slug: "hgss-promos", code: "hsp" }, { slug: "heartgold-soulsilver", code: "hgss1" },
    { slug: "platinum-arceus", code: "pl4" }, { slug: "platinum-sv", code: "pl3" },
    { slug: "platinum-rr", code: "pl2" },
  ],
  "14": [ // 9 sets — PL fin + POP
    { slug: "platinum", code: "pl1" },
    { slug: "pop-9", code: "pop9" }, { slug: "pop-8", code: "pop8" },
    { slug: "pop-7", code: "pop7" }, { slug: "pop-6", code: "pop6" },
    { slug: "pop-5", code: "pop5" }, { slug: "pop-4", code: "pop4" },
    { slug: "pop-3", code: "pop3" }, { slug: "pop-2", code: "pop2" },
  ],
  "15": [ // 9 sets — POP fin + DP
    { slug: "pop-1", code: "pop1" },
    { slug: "stormfront", code: "dp7" }, { slug: "legends-awakened", code: "dp6" },
    { slug: "majestic-dawn", code: "dp5" }, { slug: "great-encounters", code: "dp4" },
    { slug: "secret-wonders", code: "dp3" }, { slug: "mysterious-treasures", code: "dp2" },
    { slug: "dp-promos", code: "dpp" }, { slug: "diamond-pearl", code: "dp1" },
  ],
  "16": [ // 9 sets — EX inicio
    { slug: "ex-power-keepers", code: "ex16" }, { slug: "ex-dragon-frontiers", code: "ex15" },
    { slug: "ex-crystal-guardians", code: "ex14" }, { slug: "ex-holon-phantoms", code: "ex13" },
    { slug: "ex-trainer-kit-minun", code: "tk2b" }, { slug: "ex-trainer-kit-plusle", code: "tk2a" },
    { slug: "ex-legend-maker", code: "ex12" }, { slug: "ex-delta-species", code: "ex11" },
    { slug: "ex-unseen-forces", code: "ex10" },
  ],
  "17": [ // 9 sets — EX medio
    { slug: "ex-emerald", code: "ex9" }, { slug: "ex-deoxys", code: "ex8" },
    { slug: "ex-team-rocket-returns", code: "ex7" }, { slug: "ex-firered-leafgreen", code: "ex6" },
    { slug: "ex-hidden-legends", code: "ex5" }, { slug: "ex-trainer-kit-latios", code: "tk1b" },
    { slug: "ex-trainer-kit-latias", code: "tk1a" }, { slug: "ex-team-magma-aqua", code: "ex4" },
    { slug: "ex-dragon", code: "ex3" },
  ],
  "18": [ // 9 sets — EX fin + NP + E-Card + Neo inicio
    { slug: "ex-sandstorm", code: "ex2" }, { slug: "ex-ruby-sapphire", code: "ex1" },
    { slug: "nintendo-promos", code: "np" },
    { slug: "skyridge", code: "ecard3" }, { slug: "aquapolis", code: "ecard2" },
    { slug: "expedition", code: "ecard1" },
    { slug: "neo-destiny", code: "neo4" }, { slug: "neo-revelation", code: "neo3" },
    { slug: "neo-discovery", code: "neo2" },
  ],
  "19": [ // 9 sets — Neo fin + Gym + Base
    { slug: "neo-genesis", code: "neo1" },
    { slug: "gym-challenge", code: "gym2" }, { slug: "gym-heroes", code: "gym1" },
    { slug: "team-rocket", code: "base5" }, { slug: "base-set-2", code: "base4" },
    { slug: "fossil", code: "base3" }, { slug: "wotc-promos", code: "basep" },
    { slug: "jungle", code: "base2" }, { slug: "base-set", code: "base1" },
  ],
};

if (!RUN_ALL && !CHUNK_ARG && (!SET_SLUG || !SET_CODE)) {
  console.error("Uso: node bulk_scrape_prices.js --set chaos-rising --code me4");
  console.error("     node bulk_scrape_prices.js --all");
  console.error("     node bulk_scrape_prices.js --chunk 1");
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
  return name.trim().toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const activeCode = global._SET_CODE || SET_CODE;
  const cardSlug = toCardSlug(cardName);
  const cardId   = `${activeCode}-${cardNumber}`;
  const baseUrl  = `https://scrydex.com/pokemon/cards/${cardSlug}/${cardId}`;

  // Cargar página base
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);

  const title = await page.title();
  if (title.includes("Not Found") || title.includes("404")) {
    return { cardId, prices: null, error: "404" };
  }

  // Detectar variantes leyendo los links con ?variant= en el DOM
  // (más confiable que parsear innerText)
  let variantSlugs = await page.$$eval(
    'a[href*="?variant="]',
    els => [...new Set(
      els.map(el => {
        try { return new URL(el.href).searchParams.get("variant"); } catch { return null; }
      }).filter(Boolean)
    )]
  );

  // Fallback: si no hay links de variante, leer el ?variant= de la URL actual
  // (carta de una sola variante — Scrydex puede redirigir con el param en la URL)
  if (variantSlugs.length === 0) {
    const currentUrl = page.url();
    const currentVariant = new URL(currentUrl).searchParams.get("variant");
    if (currentVariant) {
      variantSlugs = [currentVariant];
    } else {
      // Último recurso: leer la variante activa desde el texto
      const activeVariant = await page.evaluate(() => {
        const lines = document.body.innerText
          .split("\n").map(l => l.trim()).filter(l => l);
        const nmIdx = lines.findIndex(l => l.toUpperCase() === "NEAR MINT");
        return nmIdx > 0 ? lines[nmIdx - 1] : null;
      });
      if (activeVariant) variantSlugs = [normalizeVariantKey(activeVariant)];
    }
  }

  const prices = {};

  for (const variantSlug of variantSlugs) {
    const url = `${baseUrl}?variant=${variantSlug}`;

    // Si la variante es la que ya está cargada, no navegar de nuevo
    if (page.url() !== url) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(600);
    }

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

    if (price !== null) prices[variantSlug] = price;
  }

  return { cardId, prices: Object.keys(prices).length > 0 ? prices : null };
}

// ── Scraping de un set completo ───────────────────────────────────────────────
async function scrapeSet(page, setSlug, setCode) {
  const setFilePath = path.join(__dirname, `../src/data/sets/${setSlug}.ts`);
  if (!fs.existsSync(setFilePath)) {
    console.log(`⏭️  Saltando ${setSlug} — archivo .ts no encontrado`);
    return { ok: 0, failed: 0, skipped: 0 };
  }

  // Reasignar SET_CODE para que scrapeCard lo use
  global._SET_CODE = setCode;

  const cards = loadSetCards(setSlug);
  console.log(`\n${"─".repeat(55)}`);
  console.log(`  Set: ${setSlug} (${setCode}) — ${cards.length} cartas`);
  console.log(`${"─".repeat(55)}`);

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

    if (upsertBatch.length >= 20) {
      const batch = upsertBatch.splice(0, 20);
      const { error: dbErr } = await supabase
        .from("card_prices")
        .upsert(batch, { onConflict: "card_id" });
      if (dbErr) console.error("\n⚠️  Error guardando lote en Supabase:", dbErr.message);
      else process.stdout.write(`   💾 Lote de 20 guardado\n`);
    }

    await sleep(400);
  }

  if (upsertBatch.length > 0) {
    const { error: dbErr } = await supabase
      .from("card_prices")
      .upsert(upsertBatch, { onConflict: "card_id" });
    if (dbErr) console.error("⚠️  Error guardando último lote:", dbErr.message);
    else console.log(`\n💾 Último lote de ${upsertBatch.length} guardado`);
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  let setsToRun;
  let modeLabel;
  if (CHUNK_ARG) {
    setsToRun = CHUNKS[CHUNK_ARG];
    if (!setsToRun) { console.error(`Chunk inválido: ${CHUNK_ARG}. Usa 1-5.`); process.exit(1); }
    modeLabel = `Chunk ${CHUNK_ARG}/5 (${setsToRun.length} sets)`;
  } else if (RUN_ALL) {
    setsToRun = ALL_SETS;
    modeLabel = `TODOS los sets (${setsToRun.length})`;
  } else {
    setsToRun = [{ slug: SET_SLUG, code: SET_CODE }];
    modeLabel = `Set: ${SET_SLUG} (${SET_CODE})`;
  }

  console.log(`\n${"═".repeat(55)}`);
  console.log(`  FaceBinder — Bulk Price Scraper`);
  console.log(`  Modo: ${modeLabel}`);
  console.log(`${"═".repeat(55)}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const totals = { ok: 0, failed: 0, skipped: 0 };

  for (const { slug, code } of setsToRun) {
    const res = await scrapeSet(page, slug, code);
    totals.ok      += res.ok;
    totals.failed  += res.failed;
    totals.skipped += res.skipped;
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
