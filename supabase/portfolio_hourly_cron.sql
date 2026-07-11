-- ============================================================
-- Snapshot horario del portafolio — ejecutar en Supabase SQL Editor
-- ============================================================
-- Paso 1: Habilitar pg_cron (solo si no está habilitado)
-- (También se puede hacer desde Dashboard → Database → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- Paso 2: Función que calcula el valor de portafolio de cada
--         usuario y guarda un snapshot por hora en hora Bogotá
-- ============================================================
CREATE OR REPLACE FUNCTION public.snapshot_hourly_portfolios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_codes JSONB;
  v_hour_bucket TIMESTAMPTZ;
  rec RECORD;
  v_total NUMERIC;
  v_card_count INT;
BEGIN
  -- Mapeo set_id → código Scrydex (espejo de SCRYDEX_SET_CODES del frontend)
  v_set_codes := '{
    "mega-evolution":          "me1",
    "phantasmal-flames":       "me2",
    "ascended-heroes":         "me2pt5",
    "perfect-order":           "me3",
    "chaos-rising":            "me4",
    "scarlet-violet":          "sv1",
    "paldea-evolved":          "sv2",
    "obsidian-flames":         "sv3",
    "sv-151":                  "sv3pt5",
    "paradox-rift":            "sv4",
    "paldean-fates":           "sv4pt5",
    "temporal-forces":         "sv5",
    "twilight-masquerade":     "sv6",
    "shrouded-fable":          "sv6pt5",
    "stellar-crown":           "sv7",
    "surging-sparks":          "sv8",
    "prismatic-evolutions":    "sv8pt5",
    "journey-together":        "sv9",
    "destined-rivals":         "sv10",
    "sv-promos":               "svp",
    "mcd-2021":                "mcd21",
    "mcd-2022":                "mcd22",
    "mcd-2023":                "mcd23",
    "mcd-2024":                "mcd24",
    "tcg-classic-venusaur":    "clv",
    "tcg-classic-charizard":   "clc",
    "tcg-classic-blastoise":   "clb",
    "poke-card-creator":       "wb1",
    "sword-shield":            "swsh1",
    "rebel-clash":             "swsh2",
    "darkness-ablaze":         "swsh3",
    "vivid-voltage":           "swsh4",
    "battle-styles":           "swsh5",
    "chilling-reign":          "swsh6",
    "evolving-skies":          "swsh7",
    "fusion-strike":           "swsh8",
    "brilliant-stars":         "swsh9",
    "astral-radiance":         "swsh10",
    "lost-origin":             "swsh11",
    "silver-tempest":          "swsh12",
    "crown-zenith":            "swsh12pt5",
    "champions-path":          "cpa",
    "shining-fates":           "shf",
    "celebrations":            "cel25",
    "pokemon-go":              "pgo",
    "ss-promos":               "swshp",
    "mcd-25th":                "mcd25",
    "sun-moon":                "sm1",
    "guardians-rising":        "sm2",
    "burning-shadows":         "sm3",
    "crimson-invasion":        "sm4",
    "ultra-prism":             "sm5",
    "forbidden-light":         "sm6",
    "celestial-storm":         "sm7",
    "lost-thunder":            "sm8",
    "team-up":                 "sm9",
    "unbroken-bonds":          "sm10",
    "unified-minds":           "sm11",
    "cosmic-eclipse":          "sm12",
    "shining-legends":         "sm35",
    "dragon-majesty":          "sm75",
    "hidden-fates":            "sm115",
    "detective-pikachu":       "det1",
    "sm-promos":               "smp",
    "mcd-2017":                "mcd17",
    "mcd-2018":                "mcd18",
    "mcd-2019":                "mcd19",
    "xy":                      "xy1",
    "xy-flashfire":            "xy2",
    "furious-fists":           "xy3",
    "phantom-forces":          "xy4",
    "primal-clash":            "xy5",
    "roaring-skies":           "xy6",
    "ancient-origins":         "xy7",
    "xy-breakthrough":         "xy8",
    "breakpoint":              "xy9",
    "fates-collide":           "xy10",
    "steam-siege":             "xy11",
    "evolutions":              "xy12",
    "double-crisis":           "dc1",
    "generations":             "g1",
    "kalos-starter":           "xy0",
    "xy-promos":               "xyp",
    "mcd-2014":                "mcd14",
    "mcd-2015":                "mcd15",
    "mcd-2016":                "mcd16",
    "black-white":             "bw1",
    "emerging-powers":         "bw2",
    "noble-victories":         "bw3",
    "next-destinies":          "bw4",
    "dark-explorers":          "bw5",
    "dragons-exalted":         "bw6",
    "boundaries-crossed":      "bw7",
    "plasma-storm":            "bw8",
    "plasma-freeze":           "bw9",
    "plasma-blast":            "bw10",
    "legendary-treasures":     "bw11",
    "radiant-collection":      "rc1",
    "dragon-vault":            "dv1",
    "bw-promos":               "bwp",
    "mcd-2011":                "mcd11",
    "mcd-2012":                "mcd12",
    "mcd-2013":                "mcd13",
    "heartgold-soulsilver":    "hgss1",
    "hs-unleashed":            "hgss2",
    "hs-undaunted":            "hgss3",
    "hs-triumphant":           "hgss4",
    "call-of-legends":         "col1",
    "hgss-promos":             "hsp",
    "platinum":                "pl1",
    "platinum-rr":             "pl2",
    "platinum-sv":             "pl3",
    "platinum-arceus":         "pl4",
    "diamond-pearl":           "dp1",
    "mysterious-treasures":    "dp2",
    "secret-wonders":          "dp3",
    "great-encounters":        "dp4",
    "majestic-dawn":           "dp5",
    "legends-awakened":        "dp6",
    "stormfront":              "dp7",
    "dp-promos":               "dpp",
    "ex-ruby-sapphire":        "ex1",
    "ex-sandstorm":            "ex2",
    "ex-dragon":               "ex3",
    "ex-team-magma-aqua":      "ex4",
    "ex-hidden-legends":       "ex5",
    "ex-firered-leafgreen":    "ex6",
    "ex-team-rocket-returns":  "ex7",
    "ex-deoxys":               "ex8",
    "ex-emerald":              "ex9",
    "ex-unseen-forces":        "ex10",
    "ex-delta-species":        "ex11",
    "ex-legend-maker":         "ex12",
    "ex-holon-phantoms":       "ex13",
    "ex-crystal-guardians":    "ex14",
    "ex-dragon-frontiers":     "ex15",
    "ex-power-keepers":        "ex16",
    "ex-trainer-kit-latias":   "tk1a",
    "ex-trainer-kit-latios":   "tk1b",
    "ex-trainer-kit-plusle":   "tk2a",
    "ex-trainer-kit-minun":    "tk2b",
    "expedition":              "ecard1",
    "aquapolis":               "ecard2",
    "skyridge":                "ecard3",
    "legendary-collection":    "lc",
    "neo-genesis":             "neo1",
    "neo-discovery":           "neo2",
    "neo-revelation":          "neo3",
    "neo-destiny":             "neo4",
    "southern-islands":        "si1",
    "gym-heroes":              "gym1",
    "gym-challenge":           "gym2",
    "base-set":                "base1",
    "jungle":                  "base2",
    "fossil":                  "base3",
    "base-set-2":              "base4",
    "team-rocket":             "base5",
    "pop-1": "pop1",
    "pop-2": "pop2",
    "pop-3": "pop3",
    "pop-4": "pop4",
    "pop-5": "pop5",
    "pop-6": "pop6",
    "pop-7": "pop7",
    "pop-8": "pop8",
    "pop-9": "pop9"
  }'::jsonb;

  -- hour_bucket: hora actual en Bogotá (UTC-5), almacenada como si fuera UTC
  -- Replica exactamente la lógica JS del dashboard
  v_hour_bucket := timezone('UTC', date_trunc('hour', NOW() AT TIME ZONE 'America/Bogota'));

  -- Procesar cada usuario con inventario activo
  FOR rec IN
    SELECT DISTINCT user_id FROM card_inventory WHERE quantity > 0
  LOOP
    SELECT
      COALESCE(SUM(
        COALESCE(
          (cp.prices->>(COALESCE(ci.version, 'normal')))::numeric,
          (cp.prices->>(upper(substr(COALESCE(ci.version, 'normal'), 1, 1)) || substr(COALESCE(ci.version, 'normal'), 2)))::numeric,
          (cp.prices->>'normal')::numeric,
          0
        ) * ci.quantity
      ), 0),
      COALESCE(SUM(ci.quantity), 0)
    INTO v_total, v_card_count
    FROM card_inventory ci
    LEFT JOIN card_prices cp
      ON cp.card_id = (v_set_codes->>(ci.set_id)) || '-' || split_part(ci.card_id::text, ':', 1)::int::text
    WHERE ci.user_id = rec.user_id
      AND ci.quantity > 0
      AND v_set_codes->>(ci.set_id) IS NOT NULL
      AND split_part(ci.card_id::text, ':', 1) ~ '^[0-9]+$';

    -- Solo guardar si hay valor calculado
    IF v_total > 0 THEN
      INSERT INTO portfolio_hourly_snapshots (user_id, hour_bucket, total_usd, card_count)
      VALUES (rec.user_id, v_hour_bucket, v_total, v_card_count)
      ON CONFLICT (user_id, hour_bucket)
      DO UPDATE SET
        total_usd   = EXCLUDED.total_usd,
        card_count  = EXCLUDED.card_count
      WHERE ABS(portfolio_hourly_snapshots.total_usd - EXCLUDED.total_usd) > 0.01;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Paso 3: Programar ejecución cada hora en punto
-- ============================================================
-- Eliminar job anterior si existe (para re-ejecuciones seguras)
SELECT cron.unschedule('hourly-portfolio-snapshot')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'hourly-portfolio-snapshot'
);

SELECT cron.schedule(
  'hourly-portfolio-snapshot',
  '0 * * * *',
  'SELECT public.snapshot_hourly_portfolios()'
);

-- ============================================================
-- Verificación: ver jobs activos
-- ============================================================
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'hourly-portfolio-snapshot';
