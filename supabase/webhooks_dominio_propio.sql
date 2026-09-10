-- Webhooks: pasar de facebinder.vercel.app al dominio propio.
--
-- Por que ahora y no en el corte: facebinder.com hoy resuelve a Vercel, asi que
-- estos triggers siguen llegando al mismo lugar. El dia que el DNS apunte al
-- Worker, pasan a Cloudflare solos y no hay que tocar la base con el sitio en
-- movimiento.
--
-- De paso arregla 'follow-notification', que mandaba un secreto distinto al que
-- valida la app ('facebinder-webhook-secret-2026' en vez del hexadecimal). Venia
-- devolviendo 401: las notificaciones de nuevo seguidor nunca llegaron.
--
-- <SECRETO> se reemplaza por SUPABASE_WEBHOOK_SECRET al aplicar. No se escribe
-- aca: el repo es publico.

DROP TRIGGER IF EXISTS "follow-notification" ON public.follows;
CREATE TRIGGER "follow-notification"
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://facebinder.com/api/webhooks/follow',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<SECRETO>"}',
    '{}',
    '5000'
  );

DROP TRIGGER IF EXISTS "new-player-notification" ON public.players;
CREATE TRIGGER "new-player-notification"
  AFTER INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://facebinder.com/api/webhooks/new-player',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<SECRETO>"}',
    '{}',
    '5000'
  );

DROP TRIGGER IF EXISTS market_listings_pendiente ON public.market_listings;
CREATE TRIGGER market_listings_pendiente
  AFTER INSERT ON public.market_listings
  FOR EACH ROW
  WHEN (new.status = 'pending')
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://facebinder.com/api/webhooks/listing-pending',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<SECRETO>"}',
    '{}',
    '5000'
  );

DROP TRIGGER IF EXISTS market_listings_aprobada ON public.market_listings;
CREATE TRIGGER market_listings_aprobada
  AFTER UPDATE ON public.market_listings
  FOR EACH ROW
  WHEN (new.status = 'active' AND old.status IS DISTINCT FROM 'active')
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://facebinder.com/api/webhooks/wishlist',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<SECRETO>"}',
    '{}',
    '5000'
  );
