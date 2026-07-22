-- ════════════════════════════════════════════════════════════════
-- My Sets: colecciones dinámicas personalizadas
-- (como decks, pero sin reglas de mazo: cualquier nombre, cualquier
--  carta de cualquier set, sin límite de copias ni tamaño)
-- Pegar este bloque completo en el SQL Editor de Supabase y ejecutar.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.my_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_card_image text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.my_set_cards (
  id uuid primary key default gen_random_uuid(),
  my_set_id uuid not null references public.my_sets(id) on delete cascade,
  card_id text not null,
  set_id text not null,
  version text not null,
  quantity integer not null default 1 check (quantity >= 0),
  position integer not null default 0
);

create index if not exists my_sets_user_id_idx on public.my_sets(user_id);
create index if not exists my_set_cards_my_set_id_idx on public.my_set_cards(my_set_id);

alter table public.my_sets enable row level security;
alter table public.my_set_cards enable row level security;

-- my_sets: el dueño gestiona todo; cualquiera puede leer los públicos (para el perfil)
create policy "my_sets_owner_all" on public.my_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "my_sets_public_read" on public.my_sets
  for select using (is_public = true);

-- my_set_cards: acceso ligado al dueño del set padre; lectura pública si el set es público
create policy "my_set_cards_owner_all" on public.my_set_cards
  for all using (
    exists (select 1 from public.my_sets s where s.id = my_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.my_sets s where s.id = my_set_id and s.user_id = auth.uid())
  );
create policy "my_set_cards_public_read" on public.my_set_cards
  for select using (
    exists (select 1 from public.my_sets s where s.id = my_set_id and s.is_public = true)
  );
