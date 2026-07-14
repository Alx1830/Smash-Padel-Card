-- Permite quantity = 0 en deck_cards: carta "en lista" que aún no se consigue.
-- Ejecutar en el SQL Editor de Supabase.
alter table public.deck_cards drop constraint deck_cards_quantity_check;
alter table public.deck_cards add constraint deck_cards_quantity_check check (quantity >= 0);
