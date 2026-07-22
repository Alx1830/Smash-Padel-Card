-- ════════════════════════════════════════════════════════════════
-- Idioma de la carta en cada publicación del marketplace.
-- Valores: 'es' (Español), 'en' (Inglés), 'ja' (Japonés), 'zh' (Chino).
-- Las publicaciones ya existentes quedan con language NULL; la app
-- muestra una alerta en dashboard/market para que el vendedor lo asigne.
-- Pegar en el SQL Editor de Supabase y ejecutar.
-- ════════════════════════════════════════════════════════════════

alter table public.market_listings
  add column if not exists language text;
