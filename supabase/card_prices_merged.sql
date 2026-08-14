-- Vista que fusiona las dos fuentes de precios.
--
-- TCGplayer (tcg_card_prices) manda, y Scrydex (card_prices) queda de respaldo
-- para lo que TCGplayer no tiene: los sellos de torneo (Play! Pokemon, League,
-- Staff), las variantes viejas de Base Set (1st Edition, Shadowless, Unlimited)
-- y los 10 sets que no estan en su catalogo (Topps, Futsal, McDonald's...).
-- Son ~2.400 variantes que, sin este respaldo, se quedarian sin precio al
-- migrar.
--
-- La fusion es por VARIANTE, no por carta: si TCGplayer tiene el precio normal
-- de una carta y Scrydex ademas tiene su sello de torneo, la vista devuelve los
-- dos. El operador || de jsonb hace que el lado derecho pise al izquierdo, asi
-- que basta poner TCGplayer a la derecha.
--
-- La app consulta esta vista igual que consultaba la tabla: mismo card_id,
-- misma forma de `prices`.

CREATE OR REPLACE VIEW public.card_prices_merged
WITH (security_invoker = true) AS
SELECT
  COALESCE(t.card_id, s.card_id) AS card_id,
  COALESCE(s.prices, '{}'::jsonb) || COALESCE(t.prices, '{}'::jsonb) AS prices,
  GREATEST(
    COALESCE(t.updated_at, s.updated_at),
    COALESCE(s.updated_at, t.updated_at)
  ) AS updated_at,
  (t.card_id IS NOT NULL) AS tiene_tcgplayer
FROM public.tcg_card_prices t
FULL OUTER JOIN public.card_prices s ON s.card_id = t.card_id;

GRANT SELECT ON public.card_prices_merged TO anon, authenticated;
