// Splits pokemon-cards.ts into one file per set in src/data/sets/
// Run: node split-cards.js

const fs   = require("fs");
const path = require("path");

const SRC   = path.join(__dirname, "src/data/pokemon-cards.ts");
const DEST  = path.join(__dirname, "src/data/sets");
const HEADER = `import type { PokemonCard } from "@/data/pokemon-cards-meta";\n\n`;

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const raw = fs.readFileSync(SRC, "utf8");

// Extract the SET_CARDS mapping { "set-id": CONST_NAME, ... }
const setCardsMatch = raw.match(/export const SET_CARDS[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
if (!setCardsMatch) { console.error("Could not find SET_CARDS"); process.exit(1); }

const setCardsBody = setCardsMatch[1];
// Parse lines like:   "set-id": CONST_NAME,
const setEntries = [...setCardsBody.matchAll(/"([^"]+)"\s*:\s*(\w+)/g)]
  .map(m => ({ setId: m[1], constName: m[2] }));

console.log(`Found ${setEntries.length} sets`);

// For each set, extract the const array from the source file
let written = 0;
for (const { setId, constName } of setEntries) {
  // Match: export const CONSTNAME: PokemonCard[] = [ ... ];
  // The array can span many lines; find start and count brackets
  const startPattern = new RegExp(`export const ${constName}[\\s\\S]*?=\\s*\\[`);
  const startMatch = raw.match(startPattern);
  if (!startMatch) {
    console.warn(`  SKIP ${constName} — not found`);
    continue;
  }

  const startIdx = raw.indexOf(startMatch[0]) + startMatch[0].length - 1; // points to '['
  // Walk forward counting brackets
  let depth = 0, i = startIdx;
  while (i < raw.length) {
    if (raw[i] === "[") depth++;
    else if (raw[i] === "]") { depth--; if (depth === 0) break; }
    i++;
  }
  const arrayContent = raw.slice(startIdx, i + 1); // includes [ and ]

  const fileContent = `${HEADER}const cards: PokemonCard[] = ${arrayContent};\nexport default cards;\n`;

  // Filename: set-id → set_id.ts (keep hyphens, valid JS filename)
  const filename = `${setId}.ts`;
  fs.writeFileSync(path.join(DEST, filename), fileContent);
  written++;
}

console.log(`Written ${written} set files to src/data/sets/`);

// Build the new pokemon-cards.ts (thin index)
const setIdToFile = setEntries.map(({ setId }) => `  "${setId}": () => import("./sets/${setId}")`).join(",\n");

const SET_CARD_COUNT_entries = [];
// Re-parse counts from original file
const countMatch = raw.match(/export const SET_CARD_COUNT[\s\S]*?=[\s\S]*?Object\.fromEntries\([\s\S]*?\)\s*\);?/);

// Build count map from what we already parsed (count entries in the array blocks)
for (const { setId, constName } of setEntries) {
  const startPattern = new RegExp(`export const ${constName}[\\s\\S]*?=\\s*\\[`);
  const startMatch = raw.match(startPattern);
  if (!startMatch) continue;
  const startIdx = raw.indexOf(startMatch[0]) + startMatch[0].length - 1;
  let depth = 0, i = startIdx;
  while (i < raw.length) {
    if (raw[i] === "[") depth++;
    else if (raw[i] === "]") { depth--; if (depth === 0) break; }
    i++;
  }
  const arrayContent = raw.slice(startIdx, i + 1);
  // Count entries by counting `{ id:` occurrences
  const count = (arrayContent.match(/\{ id:/g) || []).length;
  SET_CARD_COUNT_entries.push(`  "${setId}": ${count}`);
}

// Extract VERSION_LABEL if present
const versionLabelMatch = raw.match(/export const VERSION_LABEL[\s\S]*?(?=\nexport|\n\/\/|$)/);
const versionLabelStr = versionLabelMatch ? versionLabelMatch[0] : "";

const newIndex = `import type { PokemonCard } from "@/data/pokemon-cards-meta";
export type { PokemonCard };
export type CardVersion = string;

// Per-set dynamic loaders — only load what's needed
const SET_LOADERS: Record<string, () => Promise<{ default: PokemonCard[] }>> = {
${setIdToFile}
};

// In-memory cache populated on demand
const CACHE: Record<string, PokemonCard[]> = {};

/** Sync access — returns [] if set not loaded yet. Call loadSetCards() first. */
export const SET_CARDS: Record<string, PokemonCard[]> = new Proxy(CACHE, {
  get(target, key: string) { return target[key] ?? []; },
});

/** Load a set's cards into memory. Safe to call multiple times. */
export async function loadSetCards(setId: string): Promise<PokemonCard[]> {
  if (CACHE[setId]) return CACHE[setId];
  const loader = SET_LOADERS[setId];
  if (!loader) return [];
  try {
    const mod = await loader();
    CACHE[setId] = mod.default ?? [];
  } catch {
    CACHE[setId] = [];
  }
  return CACHE[setId];
}

/** Load multiple sets in parallel */
export async function loadManySets(setIds: string[]): Promise<void> {
  await Promise.all([...new Set(setIds)].map(loadSetCards));
}

export const SET_CARD_COUNT: Record<string, number> = {
${SET_CARD_COUNT_entries.join(",\n")}
};

${versionLabelStr}
`;

fs.writeFileSync(SRC, newIndex);
console.log("Rewrote src/data/pokemon-cards.ts as thin dynamic loader");
console.log("Done!");
