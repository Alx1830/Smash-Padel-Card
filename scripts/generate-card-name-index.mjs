// Genera src/data/card-name-index.ts: nombres únicos (lowercase) por set.
// Permite saber en qué sets buscar sin cargar las cartas completas.
// Ejecutar tras agregar/actualizar sets: node scripts/generate-card-name-index.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const setsDir = join(root, "..", "src", "data", "sets");

const index = {};
for (const file of readdirSync(setsDir)) {
  if (!/\.(ts|tsx|js|mjs)$/.test(file)) continue;
  const setId = basename(file).replace(/\.(ts|tsx|js|mjs)$/, "");
  const src = readFileSync(join(setsDir, file), "utf8");
  const names = new Set();
  for (const m of src.matchAll(/name:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const name = m[1].trim().toLowerCase();
    if (name) names.add(name);
  }
  if (names.size) index[setId] = [...names].sort().join("\n");
}

const out =
  "// AUTOGENERADO por scripts/generate-card-name-index.mjs — no editar a mano.\n" +
  "// Nombres únicos de cartas (lowercase) por set, separados por \\n.\n" +
  "export const SET_NAME_INDEX: Record<string, string> = " +
  JSON.stringify(index) +
  ";\n";

writeFileSync(join(root, "..", "src", "data", "card-name-index.ts"), out);
console.log(`Índice generado: ${Object.keys(index).length} sets`);
