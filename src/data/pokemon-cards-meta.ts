export type CardVersion = string;

export interface PokemonCard {
  id: number | string;
  name: string;
  image: string;
  version: CardVersion;
  card_number: number;
}

export const VERSION_LABEL: Record<string, string> = {
  // Print types
  normal:                      "Normal",
  normalAlternate:             "Normal Alt.",
  reverseHolofoil:             "Reverse Holo",
  holofoil:                    "Holofoil",
  cosmosHolofoil:              "Cosmos Holo",
  crackedIceHolofoil:          "Cracked Ice",
  unlimitedHolofoil:           "Unlimited Holo",
  firstEditionHolofoil:        "1st Ed. Holo",
  sheenHolofoil:               "Sheen Holo",
  sequinHolofoil:              "Sequin Holo",
  waterWebHolofoil:            "Water Web Holo",
  tinselHolofoil:              "Tinsel Holo",
  mirrorReverseHolofoil:       "Mirror Reverse Holo",
  cosmosReverseHolofoil:       "Cosmos Reverse Holo",
  energyReverseHolofoil:       "Energy Reverse Holo",
  pokeBallReverseHolofoil:     "Poké Ball Reverse Holo",
  masterBallReverseHolofoil:   "Master Ball Reverse Holo",
  friendBallReverseHolofoil:   "Friend Ball Reverse Holo",
  loveBallReverseHolofoil:     "Love Ball Reverse Holo",
  quickBallReverseHolofoil:    "Quick Ball Reverse Holo",
  rocketReverseHolofoil:       "Rocket Reverse Holo",
  duskBallReverseHolofoil:     "Dusk Ball Reverse Holo",
  firstEdition:                "1st Edition",
  firstEditionShadowless:      "1st Ed. Shadowless",
  unlimited:                   "Unlimited",
  unlimitedShadowless:         "Unlimited Shadowless",
  metal:                       "Metal",
  nonEreader:                  "Non E-Reader",
  jumbo:                       "Jumbo",
  jumboAlternate:              "Jumbo Alt.",
  // Legacy (kept for backwards compat)
  energySymbol:                "Energy Symbol",
  pokeBall:                    "Poké Ball",
};

/** Convierte camelCase a texto legible para variantes sin etiqueta definida */
export function getVersionLabel(version: string): string {
  if (VERSION_LABEL[version]) return VERSION_LABEL[version];
  return version
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/** Efecto visual de la carta */
export function getVersionEffect(version: string): "holofoil" | "reverseHolofoil" | "metal" | "goldBorder" | "normal" {
  if (version === "metal")      return "metal";
  if (version === "goldBorder") return "goldBorder";
  const v = version.toLowerCase();
  if (v.includes("reverse"))    return "reverseHolofoil";
  if (v.includes("holo"))       return "holofoil";
  return "normal";
}

function isStamp(v: string): boolean {
  return v.toLowerCase().includes("stamp") ||
    v.startsWith("league") || v.startsWith("prerelease") || v.startsWith("staff") ||
    v.startsWith("expansion") || v.startsWith("world") || v.startsWith("national") ||
    v.startsWith("regional") || v.startsWith("international") || v.startsWith("oceania") ||
    v.startsWith("asia") || v.startsWith("latin") || v.startsWith("origins") ||
    v.startsWith("pikachu") || v.startsWith("charizard") || v.startsWith("cinderace") ||
    v.startsWith("armarouge") || v.startsWith("iono") || v.startsWith("pokemon") ||
    v.startsWith("play") || v.startsWith("playPokemon") || v.startsWith("pokeTour");
}

function isPlayer(v: string): boolean {
  // Nombres de campeones: camelCase sin palabras clave conocidas
  return !isStamp(v) &&
    !v.includes("holo") && !v.includes("reverse") &&
    !["normal","normalAlternate","normalUnnumbered","firstEdition","firstEditionShadowless",
      "firstEditionShadowlessRedCheeks","unlimited","unlimitedShadowless","unlimitedShadowlessRedCheeks",
      "metal","nonEreader","jumbo","jumboAlternate","blackStarPromo","peelableDitto",
      "goldBorder","e3Stamp","e3StampRedCheeks","wStamp","stamp","stamp22",
      "movieStamp","holidayStamp","snowflakeStamp","gamestopStamp","buildAbearStamp",
      "toysRusStamp","burgerKingStamp","burgerKingExpansionStamp","ebGamesStamp","ebgamesStamp",
      "genConStamp","comicConStamp","comicConStaffStamp","gamesExpoStamp","rainCityShowcaseStamp",
      "inquestGamerStamp","scryeStamp","sevenElevenStamp","gymChallengeStamp","darkraiStamp",
      "eeveeStamp","mewtwoStamp","legendaryPokemonStamp","anniversaryStamp","winnerStamp",
      "pokemonDayStamp","pokemonHorizonsStamp","pokemonTogetherStamp","pokemonRocksAmericaStamp",
      "playPokemonThankYouStamp",
    ].includes(v);
}

/** Color del texto/badge de la variante */
export function getVersionColor(version: string): string {
  const effect = getVersionEffect(version);
  if (effect === "holofoil")        return "#ffd24f"; // dorado
  if (effect === "reverseHolofoil") return "#2ee6c1"; // cian

  // Normal / base prints
  const normal = ["normal","normalAlternate","normalUnnumbered",
    "firstEdition","firstEditionShadowless","firstEditionShadowlessRedCheeks",
    "unlimited","unlimitedShadowless","unlimitedShadowlessRedCheeks",
    "nonEreader","blackStarPromo","peelableDitto"];
  if (normal.includes(version)) return "#7a8298"; // gris

  if (version === "metal")          return "#94a3b8"; // plateado
  if (version === "jumbo" || version === "jumboAlternate") return "#7a8298";
  if (version === "goldBorder")     return "#fbbf24"; // oro

  if (isStamp(version))             return "#a78bfa"; // violeta
  if (isPlayer(version))            return "#fb923c"; // naranja

  return "#7a8298"; // gris por defecto
}

export const SET_CARD_COUNT: Record<string, number> = {
  "ascended-heroes": 613,
  "phantasmal-flames": 224,
  "mega-evolution": 310,
  "mega-evolution-promo": 59,
  "mega-evo-promos": 59,
  "destined-rivals": 409,
  "black-bolt": 392,
  "white-flare": 405,
  "journey-together": 335,
  "prismatic-evolutions": 445,
  "surging-sparks": 417,
  "shrouded-fable": 154,
  "stellar-crown": 300,
  "twilight-masquerade": 373,
  "temporal-forces": 358,
  "paldean-fates": 326,
  "paradox-rift": 428,
  "obsidian-flames": 406,
  "paldea-evolved": 454,
  "crown-zenith": 272,
  "silver-tempest-tg": 29,
  "crown-zenith-gg": 70,
  "silver-tempest": 357,
  "lost-origin-tg": 29,
  "pokemon-go": 145,
  "lost-origin": 366,
  "astral-radiance-tg": 28,
  "brilliant-stars": 310,
  "astral-radiance": 344,
  "brilliant-stars-tg": 28,
  "celebrations": 25,
  "fusion-strike": 495,
  "battle-styles": 306,
  "evolving-skies": 369,
  "chilling-reign": 369,
  "shining-fates": 119,
  "vivid-voltage": 345,
  "rebel-clash": 361,
  "darkness-ablaze": 356,
  "hidden-fates": 126,
  "ss-promos": 230,
  "cosmic-eclipse": 461,
  "detective-pikachu": 18,
  "unbroken-bonds": 413,
  "unified-minds": 454,
  "dragon-majesty": 136,
  "team-up": 340,
  "lost-thunder": 410,
  "forbidden-light": 256,
  "ultra-prism": 303,
  "celestial-storm": 324,
  "shining-legends": 140,
  "crimson-invasion": 216,
  "burning-shadows": 288,
  "sm-promos": 186,
  "guardians-rising": 289,
  "evolutions": 445,
  "steam-siege": 209,
  "fates-collide": 220,
  "generations": 182,
  "breakpoint": 220,
  "xy-breakthrough": 302,
  "double-crisis": 66,
  "ancient-origins": 172,
  "roaring-skies": 198,
  "furious-fists": 210,
  "phantom-forces": 224,
  "primal-clash": 296,
  "kalos-starter": 48,
  "xy-flashfire": 200,
  "xy-promos": 148,
  "plasma-blast": 190,
  "legendary-treasures": 240,
  "xy": 269,
  "plasma-freeze": 222,
  "plasma-storm": 257,
  "boundaries-crossed": 284,
  "dragon-vault": 21,
  "dark-explorers": 205,
  "dragons-exalted": 238,
  "emerging-powers": 194,
  "next-destinies": 190,
  "noble-victories": 195,
  "bw-promos": 82,
  "hgss-promos": 11,
  "platinum-arceus": 196,
  "platinum-sv": 293,
  "stormfront": 201,
  "platinum-rr": 220,
  "great-encounters": 208,
  "legends-awakened": 277,
  "mysterious-treasures": 244,
  "secret-wonders": 262,
  "dp-promos": 46,
  "ex-dragon-frontiers": 190,
  "ex-power-keepers": 199,
  "ex-legend-maker": 175,
  "ex-holon-phantoms": 209,
  "ex-delta-species": 221,
  "ex-unseen-forces": 218,
  "ex-deoxys": 230,
  "ex-team-rocket-returns": 234,
  "ex-team-magma-aqua": 185,
  "ex-hidden-legends": 194,
  "ex-sandstorm": 193,
  "skyridge": 330,
  "neo-destiny": 225,
  "expedition": 330,
  "aquapolis": 332,
  "southern-islands": 18,
  "neo-revelation": 132,
  "neo-discovery": 150,
  "neo-genesis": 222,
  "gym-challenge": 264,
  "fossil": 124,
  "wotc-promos": 53,
  "jungle": 128,
  "legendary-collection": 220,
  "team-rocket": 166,
  "base-set": 108,
  "ex-dragon": 188,
  "sv-promos": 230,
  "scarlet-violet": 442,
  "ex-emerald": 224,
  "champions-path": 134,
  "sun-moon": 298,
  "sword-shield": 381,
  "hs-undaunted": 171,
  "hs-triumphant": 193,
  "black-white": 227,
  "hs-unleashed": 179,
  "diamond-pearl": 257,
  "heartgold-soulsilver": 236,
  "ex-ruby-sapphire": 210,
  "ex-firered-leafgreen": 247,
  "gym-heroes": 264,
  "perfect-order": 203,
  "base-set-2": 130,
  "majestic-dawn": 168,
  "platinum": 170,
};
