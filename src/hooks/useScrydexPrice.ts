"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export type ScrydexPrices = Record<string, number>; // { normal: 0.25, reverseHolofoil: 0.50 }

interface UseScrydexPriceOptions {
  setSlug: string;   // "chaos-rising"
  setCode: string;   // "me4"
  cardName: string;  // "Weedle"
  cardNumber: number;
  enabled?: boolean;
}

interface UseScrydexPriceResult {
  prices: ScrydexPrices | null;
  loading: boolean;
  error: string | null;
}

// Sets que tienen código de Scrydex conocido
export const SCRYDEX_SET_CODES: Record<string, string> = {
  // ── Mega Evolution Series ─────────────────────────────────────────────────
  "mega-evolution":       "me1",
  "phantasmal-flames":    "me2",
  "ascended-heroes":      "me2pt5",
  "perfect-order":        "me3",
  "chaos-rising":         "me4",
  "pitch-black":          "me5",

  // ── Scarlet & Violet Series ───────────────────────────────────────────────
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

  // ── Sword & Shield Series ─────────────────────────────────────────────────
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

  // ── Sun & Moon Series ─────────────────────────────────────────────────────
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

  // ── XY Series ─────────────────────────────────────────────────────────────
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

  // ── Black & White Series ──────────────────────────────────────────────────
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

  // ── HeartGold SoulSilver Series ───────────────────────────────────────────
  "heartgold-soulsilver": "hgss1",
  "hs-unleashed":         "hgss2",
  "hs-undaunted":         "hgss3",
  "hs-triumphant":        "hgss4",
  "call-of-legends":      "col1",
  "hgss-promos":          "hsp",

  // ── Platinum Series ───────────────────────────────────────────────────────
  "platinum":             "pl1",
  "platinum-rr":          "pl2",
  "platinum-sv":          "pl3",
  "platinum-arceus":      "pl4",

  // ── Diamond & Pearl Series ────────────────────────────────────────────────
  "diamond-pearl":        "dp1",
  "mysterious-treasures": "dp2",
  "secret-wonders":       "dp3",
  "great-encounters":     "dp4",
  "majestic-dawn":        "dp5",
  "legends-awakened":     "dp6",
  "stormfront":           "dp7",
  "dp-promos":            "dpp",

  // ── EX Ruby & Sapphire Series ─────────────────────────────────────────────
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

  // ── e-Card Series ─────────────────────────────────────────────────────────
  "expedition":           "ecard1",
  "aquapolis":            "ecard2",
  "skyridge":             "ecard3",

  // ── Legendary Collection / Neo / Gym / Base ───────────────────────────────
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

  // ── POP Series ────────────────────────────────────────────────────────────
  "pop-1": "pop1",
  "pop-2": "pop2",
  "pop-3": "pop3",
  "pop-4": "pop4",
  "pop-5": "pop5",
  "pop-6": "pop6",
  "pop-7": "pop7",
  "pop-8": "pop8",
  "pop-9": "pop9",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useScrydexPrice({
  setCode,
  cardNumber,
  enabled = true,
}: UseScrydexPriceOptions): UseScrydexPriceResult {
  const [prices, setPrices]   = useState<ScrydexPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !setCode) return;

    let cancelled = false;
    setLoading(true);
    setPrices(null);
    setError(null);

    const cardId = `${setCode}-${cardNumber}`;

    supabase
      .from("card_prices")
      .select("prices")
      .eq("card_id", cardId)
      .single()
      .then(({ data, error: dbErr }) => {
        if (cancelled) return;
        if (dbErr || !data) {
          setError("Sin precio");
        } else {
          setPrices(data.prices as ScrydexPrices);
        }
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [setCode, cardNumber, enabled]);

  return { prices, loading, error };
}
