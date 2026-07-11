-- ============================================================
-- Expiración automática de publicaciones del marketplace
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Toda publicación con status 'active' y más de 30 días de
-- antigüedad se marca como 'expired', lo que la saca de todas
-- las vistas del marketplace (que filtran por status = 'active')
-- sin borrar el registro.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_old_market_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE market_listings
  SET status = 'expired'
  WHERE status = 'active'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Job diario a las 2:00 am hora Colombia (7:00 UTC)
SELECT cron.unschedule('expire-market-listings')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-market-listings'
);

SELECT cron.schedule(
  'expire-market-listings',
  '0 7 * * *',
  'SELECT public.expire_old_market_listings()'
);

-- Verificación: ver job activo
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'expire-market-listings';
