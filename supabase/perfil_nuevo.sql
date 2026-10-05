-- Perfil nuevo: corona de verificado y totales para los logros.
-- Aplicada en producción el 04/10/2026 (apply_migration "perfil_nuevo_verificado_y_metricas").
-- Es aditiva: el perfil publicado no la usa todavía.

alter table public.players add column if not exists verificado boolean not null default false;
comment on column public.players.verificado is 'Usuario verificado: muestra la corona en el perfil. Solo lo cambia un admin (proteger_campos_admin).';

-- Un usuario no puede darse la corona: el trigger la devuelve a su valor anterior.
create or replace function public.proteger_campos_admin()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if public.puede_moderar() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role       := 'user';
    new.blocked    := false;
    new.verificado := false;
  else
    new.role       := old.role;
    new.blocked    := old.blocked;
    new.verificado := old.verificado;
  end if;
  return new;
end;
$function$;

-- Totales públicos de un usuario para los logros del perfil. Solo números:
-- nada de intercambios (son privados) ni datos de contacto.
create or replace function public.perfil_metricas(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'cartas_total',   coalesce((select sum(quantity) from card_inventory where user_id = p_user_id and quantity > 0), 0),
    'cartas_unicas',  (select count(distinct (set_id, card_id)) from card_inventory where user_id = p_user_id and quantity > 0),
    'sets_tocados',   (select count(distinct set_id) from card_inventory where user_id = p_user_id and quantity > 0),
    'variantes',      (select count(distinct version) from card_inventory where user_id = p_user_id and quantity > 0),
    'holos',          coalesce((select sum(quantity) from card_inventory where user_id = p_user_id and quantity > 0 and version ilike '%holo%'), 0),
    'idiomas',        (select count(distinct language) from card_inventory where user_id = p_user_id and quantity > 0 and language is not null),
    'copias_max',     coalesce((select max(quantity) from card_inventory where user_id = p_user_id), 0),
    'wishlist',       (select count(*) from card_wishlist where user_id = p_user_id),
    'destacadas',     (select count(*) from featured_cards where user_id = p_user_id),
    'decks',          (select count(*) from decks where user_id = p_user_id and is_public),
    'mis_sets',       (select count(*) from my_sets where user_id = p_user_id),
    'seguidores',     (select count(*) from follows where following_id = p_user_id),
    'siguiendo',      (select count(*) from follows where follower_id = p_user_id),
    'publicaciones',  (select count(*) from market_listings where user_id = p_user_id and status in ('active', 'sold', 'expired')),
    'en_venta',       (select count(*) from market_listings where user_id = p_user_id and status = 'active'),
    'ventas',         (select count(*) from ventas where vendedor_id = p_user_id and estado = 'completada'),
    'resenas_5',      (select count(*) from ventas where vendedor_id = p_user_id and estado = 'completada' and estrellas = 5),
    'compras',        (select count(*) from ventas where comprador_id = p_user_id and estado = 'completada'),
    'juego_mejor',    coalesce((select max(score) from game_scores where user_id = p_user_id), 0),
    'juego_partidas', (select count(*) from game_scores where user_id = p_user_id),
    'comentarios',    (select count(*) from post_comments where user_id = p_user_id)
                    + (select count(*) from feed_comments where user_id = p_user_id),
    'votos',          (select count(*) from post_poll_votes where user_id = p_user_id),
    'dias_cuenta',    coalesce((select extract(day from now() - created_at)::int from players where user_id = p_user_id), 0)
  );
$$;

revoke all on function public.perfil_metricas(uuid) from public;
grant execute on function public.perfil_metricas(uuid) to anon, authenticated;

-- Redes y WhatsApp del perfil (migración "perfil_nuevo_redes_sociales")
alter table public.players
  add column if not exists social_tiktok    text check (char_length(social_tiktok) <= 200),
  add column if not exists social_youtube   text check (char_length(social_youtube) <= 200),
  add column if not exists mostrar_whatsapp boolean not null default false;

-- players tiene permisos de lectura por columna: las nuevas nacieron sin SELECT
-- y Editar perfil fallaba con "No pudimos cargar tu perfil" (migración "perfil_nuevo_permisos_lectura").
grant select (social_tiktok, social_youtube, mostrar_whatsapp, verificado) on public.players to anon, authenticated;

-- Portadas: Energías → Pokémons y Dorsos → 30 Celebration (migración "portadas_pokemons_y_30_celebration")
alter table public.players drop constraint players_cover_url_check;
alter table public.players add constraint players_cover_url_check check (
  cover_url is null or cover_url = any (array[
    '/covers/megaevo.webp', '/covers/30-celebration.webp', '/covers/pikachu.webp', '/covers/pokemons.webp'
  ])
);

-- Encuadre horizontal de la portada en el celular (migración "portada_encuadre_celular")
alter table public.players
  add column if not exists cover_position_movil smallint not null default 50
  check (cover_position_movil between 0 and 100);
grant select (cover_position_movil) on public.players to anon, authenticated;

-- Encuadre vertical de la portada en el celular (migración "portada_encuadre_celular_vertical")
alter table public.players
  add column if not exists cover_position_movil_y smallint not null default 0
  check (cover_position_movil_y between 0 and 100);
grant select (cover_position_movil_y) on public.players to anon, authenticated;
