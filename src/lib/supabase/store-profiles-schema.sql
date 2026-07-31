-- ═══════════════════════════════════════════════════════════════════════════
-- Perfiles de Tienda Pokémon: portada + aprobación por un admin
--
-- Ejecutar en Supabase → SQL Editor. Es idempotente: se puede correr de nuevo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas nuevas ─────────────────────────────────────────────────────
-- store_status solo aplica a las tiendas; en el resto de perfiles queda NULL.
alter table public.players
  add column if not exists store_status text,
  add column if not exists cover_url    text;

-- Encuadre vertical de la portada, en %: 0 = arriba, 50 = centrada, 100 = abajo.
-- Es el object-position de la imagen, igual que el reposicionar de Facebook.
alter table public.players
  add column if not exists cover_position smallint not null default 50;

-- Datos de contacto y ubicación de la tienda
alter table public.players
  add column if not exists store_address    text,
  add column if not exists store_maps_url   text,
  add column if not exists store_hours      jsonb,
  add column if not exists social_facebook  text,
  add column if not exists social_instagram text;

-- Tienda a la que pertenece un jugador, para armar la comunidad de cada tienda
alter table public.players
  add column if not exists my_store_id uuid references auth.users(id) on delete set null;

create index if not exists players_my_store_idx on public.players (my_store_id);

alter table public.players
  drop constraint if exists players_cover_position_check;

alter table public.players
  add constraint players_cover_position_check
  check (cover_position between 0 and 100);

alter table public.players
  drop constraint if exists players_store_status_check;

alter table public.players
  add constraint players_store_status_check
  check (store_status is null or store_status in ('pending', 'approved', 'rejected'));

-- Solo se permiten las 4 portadas autorizadas. El formulario de perfil escribe
-- directo a players desde el navegador, así que sin este CHECK cualquiera
-- podría poner una imagen externa arbitraria como portada.
-- Debe ir en sintonía con src/data/store-covers.ts
alter table public.players
  drop constraint if exists players_cover_url_check;

alter table public.players
  add constraint players_cover_url_check
  check (cover_url is null or cover_url in (
    '/covers/megaevo.webp',
    '/covers/dorsos.webp',
    '/covers/pikachu.webp',
    '/covers/energias.webp'
  ));

-- El panel admin filtra por estado; el índice parcial solo cubre las tiendas.
create index if not exists players_store_status_idx
  on public.players (store_status)
  where store_status is not null;

-- ── 2. El estado lo decide la base de datos, no el cliente ─────────────────
-- Sin esto, cualquiera podría mandar store_status='approved' en el upsert del
-- onboarding y auto-publicarse, porque la fila es suya y RLS se lo permite.
create or replace function public.enforce_store_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_store  boolean := new.tipo_perfil = 'Tienda Pokémon';
  can_moderate boolean;
begin
  -- auth.uid() es NULL cuando corre con service_role (rutas admin) o desde el
  -- SQL Editor: ahí sí se confía en el valor que llega.
  can_moderate := auth.uid() is null
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid() and p.role = 'admin'
    );

  if not is_store then
    new.store_status := null;              -- dejó de ser tienda
    return new;
  end if;

  if can_moderate then
    new.store_status := coalesce(new.store_status, 'pending');
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.store_status := 'pending';         -- toda tienda nueva entra en cola
  elsif old.tipo_perfil = 'Tienda Pokémon' then
    new.store_status := old.store_status;  -- el dueño no puede moverlo
  else
    new.store_status := 'pending';         -- acaba de cambiarse a tienda
  end if;

  return new;
end;
$$;

drop trigger if exists players_enforce_store_status on public.players;

create trigger players_enforce_store_status
  before insert or update on public.players
  for each row execute function public.enforce_store_status();

-- ── 3. Backfill: todas las tiendas actuales quedan pendientes ──────────────
-- Decisión explícita: se revisan todas desde cero, incluidas las que ya
-- estaban publicadas. Sus perfiles quedan ocultos hasta que un admin apruebe.
update public.players
   set store_status = 'pending'
 where tipo_perfil = 'Tienda Pokémon'
   and store_status is distinct from 'pending';

-- Y ningún perfil que no sea tienda arrastra estado.
update public.players
   set store_status = null
 where tipo_perfil is distinct from 'Tienda Pokémon'
   and store_status is not null;
