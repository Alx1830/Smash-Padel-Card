/**
 * Listas de mazo en el formato de Pokémon TCG Live / Limitless.
 *
 * Limitless ("Copy to Clipboard") y TCG Live copian el mazo como texto, una
 * carta por línea: `cantidad nombre CÓDIGO número`, por ejemplo
 *
 *   4 Ultra Ball MEG 131
 *   3.59 Mega-Sharpedo ex PFL 61      ← en la "lista promedio" la cantidad lleva decimales
 *   1 Pecharunt PR-SV 149
 *
 * El nombre puede venir en español o en inglés según el idioma elegido en
 * Limitless, así que no se usa para buscar: la carta se identifica solo por el
 * código del set y el número impreso, que son iguales en todos los idiomas.
 */
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import type { PokemonCard } from "@/data/pokemon-cards-meta";

/**
 * Código de Limitless/TCG Live → id del set en Facebinder. Cuando un set tiene
 * dos códigos (Limitless dice SVP, TCG Live dice PR-SV) van los dos; el primero
 * que aparece para cada set es el que se usa al copiar.
 */
const CODIGOS: [string, string][] = [
  // Mega Evolution
  ["DLR", "delta-reign"], ["30C", "30th-celebration"], ["PBL", "pitch-black"],
  ["CRI", "chaos-rising"], ["POR", "perfect-order"], ["ASC", "ascended-heroes"],
  ["PFL", "phantasmal-flames"], ["MEG", "mega-evolution"], ["MEE", "mega-evolution-energies"],
  ["MEP", "mega-evo-promos"], ["PR-ME", "mega-evo-promos"],
  // Scarlet & Violet
  ["BLK", "black-bolt"], ["WHT", "white-flare"], ["DRI", "destined-rivals"],
  ["JTG", "journey-together"], ["PRE", "prismatic-evolutions"], ["SSP", "surging-sparks"],
  ["SCR", "stellar-crown"], ["SFA", "shrouded-fable"], ["TWM", "twilight-masquerade"],
  ["TEF", "temporal-forces"], ["PAF", "paldean-fates"], ["PAR", "paradox-rift"],
  ["MEW", "sv-151"], ["OBF", "obsidian-flames"], ["PAL", "paldea-evolved"],
  ["SVI", "scarlet-violet"], ["SVE", "sv-energies"], ["PR-SV", "sv-promos"], ["SVP", "sv-promos"],
  // Sword & Shield
  ["CRZ", "crown-zenith"], ["SIT", "silver-tempest"], ["LOR", "lost-origin"],
  ["PGO", "pokemon-go"], ["ASR", "astral-radiance"], ["BRS", "brilliant-stars"],
  ["FST", "fusion-strike"], ["CEL", "celebrations"], ["EVS", "evolving-skies"],
  ["CRE", "chilling-reign"], ["BST", "battle-styles"], ["SHF", "shining-fates"],
  ["VIV", "vivid-voltage"], ["CPA", "champions-path"], ["DAA", "darkness-ablaze"],
  ["RCL", "rebel-clash"], ["SSH", "sword-shield"], ["PR-SW", "ss-promos"], ["SP", "ss-promos"],
  // Sun & Moon
  ["CEC", "cosmic-eclipse"], ["HIF", "hidden-fates"], ["UNM", "unified-minds"],
  ["UNB", "unbroken-bonds"], ["DET", "detective-pikachu"], ["TEU", "team-up"],
  ["LOT", "lost-thunder"], ["DRM", "dragon-majesty"], ["CES", "celestial-storm"],
  ["FLI", "forbidden-light"], ["UPR", "ultra-prism"], ["CIN", "crimson-invasion"],
  ["SLG", "shining-legends"], ["BUS", "burning-shadows"], ["GRI", "guardians-rising"],
  ["SUM", "sun-moon"], ["PR-SM", "sm-promos"], ["SMP", "sm-promos"],
  // XY
  ["EVO", "evolutions"], ["STS", "steam-siege"], ["FCO", "fates-collide"],
  ["GEN", "generations"], ["BKP", "breakpoint"], ["BKT", "xy-breakthrough"],
  ["AOR", "ancient-origins"], ["ROS", "roaring-skies"], ["DCR", "double-crisis"],
  ["PRC", "primal-clash"], ["PHF", "phantom-forces"], ["FFI", "furious-fists"],
  ["FLF", "xy-flashfire"], ["XY", "xy"], ["KSS", "kalos-starter"],
  ["PR-XY", "xy-promos"], ["XYP", "xy-promos"],
  // Black & White
  ["LTR", "legendary-treasures"], ["PLB", "plasma-blast"], ["PLF", "plasma-freeze"],
  ["PLS", "plasma-storm"], ["BCR", "boundaries-crossed"], ["DRV", "dragon-vault"],
  ["DRX", "dragons-exalted"], ["DEX", "dark-explorers"], ["NXD", "next-destinies"],
  ["NVI", "noble-victories"], ["EPO", "emerging-powers"], ["BLW", "black-white"],
  ["PR-BLW", "bw-promos"], ["BWP", "bw-promos"],
  // HeartGold SoulSilver, Diamond & Pearl, Platinum
  ["CL", "call-of-legends"], ["TM", "hs-triumphant"], ["UD", "hs-undaunted"],
  ["UL", "hs-unleashed"], ["HS", "heartgold-soulsilver"], ["HSP", "hgss-promos"],
  ["RM", "pokemon-rumble"], ["AR", "platinum-arceus"], ["SV", "platinum-sv"],
  ["RR", "platinum-rr"], ["PL", "platinum"], ["SF", "stormfront"],
  ["LA", "legends-awakened"], ["MD", "majestic-dawn"], ["GE", "great-encounters"],
  ["SW", "secret-wonders"], ["MT", "mysterious-treasures"], ["DP", "diamond-pearl"],
  ["DPP", "dp-promos"],
  ["P1", "pop-1"], ["P2", "pop-2"], ["P3", "pop-3"], ["P4", "pop-4"], ["P5", "pop-5"],
  ["P6", "pop-6"], ["P7", "pop-7"], ["P8", "pop-8"], ["P9", "pop-9"],
  // EX
  ["PK", "ex-power-keepers"], ["DF", "ex-dragon-frontiers"], ["CG", "ex-crystal-guardians"],
  ["HP", "ex-holon-phantoms"], ["LM", "ex-legend-maker"], ["DS", "ex-delta-species"],
  ["UF", "ex-unseen-forces"], ["EM", "ex-emerald"], ["DX", "ex-deoxys"],
  ["TRR", "ex-team-rocket-returns"], ["RG", "ex-firered-leafgreen"], ["HL", "ex-hidden-legends"],
  ["MA", "ex-team-magma-aqua"], ["DR", "ex-dragon"], ["SS", "ex-sandstorm"],
  ["RS", "ex-ruby-sapphire"], ["NP", "nintendo-promos"],
  // WotC
  ["E3", "skyridge"], ["E2", "aquapolis"], ["BG", "best-of-game"], ["E1", "expedition"],
  ["LC", "legendary-collection"], ["N4", "neo-destiny"], ["N3", "neo-revelation"],
  ["SI", "southern-islands"], ["N2", "neo-discovery"], ["N1", "neo-genesis"],
  ["G2", "gym-challenge"], ["G1", "gym-heroes"], ["TR", "team-rocket"],
  ["BS2", "base-set-2"], ["FO", "fossil"], ["JU", "jungle"], ["BS", "base-set"],
  ["WP", "wotc-promos"],
];

export const SET_POR_CODIGO: Record<string, string> = Object.fromEntries(CODIGOS);

const CODIGO_POR_SET: Record<string, string> = {};
for (const [codigo, setId] of CODIGOS) CODIGO_POR_SET[setId] ??= codigo;

/**
 * Las galerías (Trainer Gallery, Galarian Gallery) en Facebinder son sets
 * aparte, pero en la lista van con el código del set padre y el número con
 * prefijo: "ASR TG05", "CRZ GG30".
 */
const GALERIAS: Record<string, string> = {
  "crown-zenith:GG": "crown-zenith-gg",
  "silver-tempest:TG": "silver-tempest-tg",
  "lost-origin:TG": "lost-origin-tg",
  "astral-radiance:TG": "astral-radiance-tg",
  "brilliant-stars:TG": "brilliant-stars-tg",
};
const GALERIA_PADRE: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(GALERIAS).map(([llave, galeria]) => {
    const [padre, prefijo] = llave.split(":");
    return [galeria, [padre, prefijo]];
  }),
);

/** En las promos el número impreso lleva letras ("SWSH050", "SM210"); el número es lo de atrás. */
const SETS_PROMO = new Set([
  "mega-evo-promos", "sv-promos", "ss-promos", "sm-promos", "xy-promos", "bw-promos",
  "hgss-promos", "dp-promos", "nintendo-promos", "wotc-promos",
]);

export interface LineaMazo {
  cantidad: number;
  nombre: string;
  codigo: string;
  numero: string;
  /** La línea tal como venía, para mostrarla si no se encuentra */
  original: string;
}

const LINEA = /^\s*\*?\s*(\d+(?:[.,]\d+)?)\s+(.+?)\s+([A-Z0-9]{1,4}(?:-[A-Z]{2,3})?)\s+([A-Z]{0,4}\d+[a-z]?)\s*$/;

/** Lee el texto pegado. Las cabeceras ("Pokémon (19.44)", "Trainer: 31"…) no tienen forma de carta y se saltan solas. */
export function leerLista(texto: string): LineaMazo[] {
  const out: LineaMazo[] = [];
  for (const original of texto.split(/\r?\n/)) {
    const m = LINEA.exec(original);
    if (!m) continue;
    // La "lista promedio" de Limitless trae decimales (3.59): se redondea y
    // lo que da 0 (cartas que casi nadie juega) se deja afuera.
    const cantidad = Math.round(parseFloat(m[1].replace(",", ".")));
    if (cantidad <= 0) continue;
    out.push({ cantidad, nombre: m[2].trim(), codigo: m[3], numero: m[4], original: original.trim() });
  }
  return out;
}

/** Entre las versiones de una misma carta, la "de juego": normal antes que holo, reverse y sellos al final. */
function versionPreferida(opciones: PokemonCard[]): PokemonCard {
  const orden = ["normal", "holofoil", "unlimited", "unlimitedHolofoil"];
  for (const v of orden) {
    const c = opciones.find(o => o.version === v);
    if (c) return c;
  }
  return opciones.find(o => !/reverse|stamp/i.test(o.version)) ?? opciones[0];
}

function destino(linea: LineaMazo): { setId: string; numero: number; prefijo: string } | null {
  let setId = SET_POR_CODIGO[linea.codigo];
  if (!setId) return null;
  const m = /^([A-Z]*)(\d+)/.exec(linea.numero);
  if (!m) return null;
  const [, prefijo, digitos] = m;
  if (prefijo) {
    const galeria = GALERIAS[`${setId}:${prefijo}`];
    if (galeria) setId = galeria;
    else if (!SETS_PROMO.has(setId)) return null;
  }
  return { setId, numero: parseInt(digitos, 10), prefijo };
}

/**
 * Las cartas de un set con ese número. Las promos de Sun & Moon y XY están
 * numeradas en orden alfabético y el número impreso va en el nombre
 * ("Aipom - SM244"), así que en las promos se busca primero por el nombre; si
 * ninguna lo lleva (SV, Mega, Sword & Shield), el número es el impreso.
 */
function buscarEnSet(d: { setId: string; numero: number; prefijo: string }): PokemonCard[] {
  const cartas = SET_CARDS[d.setId] ?? [];
  if (SETS_PROMO.has(d.setId)) {
    const enNombre = new RegExp(String.raw`\b[A-Z]*0*${d.numero}\b`);
    const porNombre = cartas.filter(c => / - [A-Z]+\d+/.test(c.name) && enNombre.test(c.name.split(" - ").slice(1).join(" - ")));
    if (porNombre.length > 0) {
      // "Celesteela - SM131 (Prerelease)" queda detrás de la versión sin sello
      const limpias = porNombre.filter(c => !/\(/.test(c.name));
      return limpias.length > 0 ? limpias : porNombre;
    }
    if (cartas.some(c => / - [A-Z]+\d+/.test(c.name))) return [];
  }
  return cartas.filter(c => c.card_number === d.numero);
}

export interface CartaImportada {
  setId: string;
  card: PokemonCard;
  cantidad: number;
}

/**
 * Busca cada línea en la librería. Lo que no se encuentra (set que no tenemos,
 * número que no existe) vuelve aparte para mostrárselo al usuario. Si la misma
 * carta aparece dos veces, las cantidades se suman.
 */
export async function resolverLista(lineas: LineaMazo[]): Promise<{ cartas: CartaImportada[]; faltantes: LineaMazo[] }> {
  const destinos = lineas.map(destino);
  await loadManySets([...new Set(destinos.filter(d => d !== null).map(d => d!.setId))]);

  const cartas: CartaImportada[] = [];
  const faltantes: LineaMazo[] = [];
  lineas.forEach((linea, i) => {
    const d = destinos[i];
    const opciones = d ? buscarEnSet(d) : [];
    if (!d || opciones.length === 0) { faltantes.push(linea); return; }
    const card = versionPreferida(opciones);
    const repetida = cartas.find(c => c.setId === d.setId && c.card.id === card.id && c.card.version === card.version);
    if (repetida) repetida.cantidad += linea.cantidad;
    else cartas.push({ setId: d.setId, card, cantidad: linea.cantidad });
  });
  return { cartas, faltantes };
}

/** Código + número de una carta tal como lo espera TCG Live, o null si el set no tiene código. */
function codigoYNumero(setId: string, numero: number): [string, string] | null {
  const galeria = GALERIA_PADRE[setId];
  if (galeria) {
    const codigo = CODIGO_POR_SET[galeria[0]];
    return codigo ? [codigo, `${galeria[1]}${String(numero).padStart(2, "0")}`] : null;
  }
  const codigo = CODIGO_POR_SET[setId];
  return codigo ? [codigo, String(numero)] : null;
}

export interface CartaParaCopiar {
  setId: string;
  card: PokemonCard;
  cantidad: number;
}

/**
 * Arma el texto para pegar en TCG Live o en el builder de Limitless. Los dos
 * leen línea por línea y no necesitan las cabeceras de sección; las energías
 * van al final para que la lista se lea como las de siempre.
 */
export function copiarLista(cartas: CartaParaCopiar[]): { texto: string; sinCodigo: number } {
  let sinCodigo = 0;
  const lineas: { texto: string; energia: boolean }[] = [];
  for (const c of cartas) {
    if (c.cantidad <= 0) continue;
    // Nuestras energías básicas se llaman "Basic Darkness Energy"; Limitless y
    // TCG Live las escriben "Darkness Energy"
    let nombre = c.card.name.trim().replace(/^Basic (\w+ Energy)$/, "$1");
    let cn = codigoYNumero(c.setId, c.card.card_number);
    // Promos con el número impreso en el nombre ("Aipom - SM244"): ese es el
    // número que espera TCG Live, y el nombre queda sin él
    const impreso = / - ([A-Z]+\d+)/.exec(nombre);
    if (impreso && cn) {
      cn = [cn[0], impreso[1]];
      nombre = nombre.split(" - ")[0].trim();
    } else if (cn && c.setId === "ss-promos") {
      cn = [cn[0], `SWSH${String(c.card.card_number).padStart(3, "0")}`];
    }
    if (!cn) sinCodigo++;
    lineas.push({
      texto: cn ? `${c.cantidad} ${nombre} ${cn[0]} ${cn[1]}` : `${c.cantidad} ${nombre}`,
      energia: /energy/i.test(nombre),
    });
  }
  const texto = [...lineas.filter(l => !l.energia), ...lineas.filter(l => l.energia)]
    .map(l => l.texto).join("\n");
  return { texto, sinCodigo };
}

/**
 * Nombre de la carta sacado del card_id del inventario ("176:Team Rocket's
 * Petrel:Normal" → "team rocket's petrel"). Los ids viejos que son solo un
 * número no traen nombre y devuelven null.
 */
export function nombreDeCardId(cardId: string): string | null {
  const partes = cardId.split(":");
  if (partes.length < 3) return null;
  return partes.slice(1, -1).join(":").trim().toLowerCase();
}

/** Número impreso sacado del card_id ("176:Team Rocket's Petrel:Normal" → 176). */
export function numeroDeCardId(cardId: string): number | null {
  const n = parseInt(cardId.split(":")[0], 10);
  return Number.isFinite(n) ? n : null;
}
