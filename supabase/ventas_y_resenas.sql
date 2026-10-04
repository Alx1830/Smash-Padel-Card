-- Ventas del market a otro usuario de Facebinder y sus reseñas.
-- Aplicada en producción el 04/10/2026 (apply_migration "ventas_y_resenas").
--
-- Flujo: el vendedor marca "Vendido" y elige al comprador → registrar_venta()
-- deja la venta 'pendiente' y cierra la publicación. El comprador la confirma
-- en /dashboard/compras → responder_compra() la pasa a 'completada' con 1-5
-- estrellas y comentario, o a 'anulada' si no la recibió. Solo las completadas
-- cuentan en el perfil. Las pendientes vencen solas a los 30 días.

create table public.ventas (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid unique references public.market_listings(id) on delete set null,
  vendedor_id   uuid not null references auth.users(id) on delete cascade,
  comprador_id  uuid not null references auth.users(id) on delete cascade,
  set_id        text not null,
  card_id       integer not null,
  version       text not null,
  language      text,
  price         integer,
  currency      text,
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'completada', 'anulada', 'vencida')),
  estrellas     smallint check (estrellas between 1 and 5),
  comentario    text check (char_length(comentario) <= 500),
  created_at    timestamptz not null default now(),
  respondida_at timestamptz,
  check (vendedor_id <> comprador_id),
  check (estado <> 'completada' or estrellas is not null)
);

create index ventas_vendedor_idx  on public.ventas (vendedor_id, estado, respondida_at desc);
create index ventas_comprador_idx on public.ventas (comprador_id, estado, created_at desc);

alter table public.ventas enable row level security;

-- Las completadas son públicas (salen en el perfil); el resto solo lo ven las dos partes.
create policy "ventas completadas publicas" on public.ventas
  for select to anon, authenticated using (estado = 'completada');
create policy "ventas propias" on public.ventas
  for select to authenticated using (auth.uid() in (vendedor_id, comprador_id));

-- Sin políticas de escritura: todo pasa por las funciones de abajo.

create or replace function public.registrar_venta(p_listing_id uuid, p_comprador_username text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_listing   market_listings%rowtype;
  v_comprador uuid;
  v_id        uuid;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;

  -- 'pending' también: la carta pudo venderse antes de que la aprobaran.
  select * into v_listing from market_listings
   where id = p_listing_id and user_id = auth.uid() and status in ('active', 'pending')
   for update;
  if not found then raise exception 'La publicación no existe o ya no está activa'; end if;

  select user_id into v_comprador from players
   where lower(username) = lower(trim(p_comprador_username))
     and activo and coalesce(blocked, false) = false;
  if v_comprador is null then raise exception 'No existe ese usuario en Facebinder'; end if;
  if v_comprador = auth.uid() then raise exception 'No puedes venderte una carta a ti mismo'; end if;

  insert into ventas (listing_id, vendedor_id, comprador_id, set_id, card_id, version, language, price, currency)
  values (v_listing.id, auth.uid(), v_comprador, v_listing.set_id, v_listing.card_id,
          v_listing.version, v_listing.language, v_listing.price_cop, v_listing.currency)
  returning id into v_id;

  update market_listings set status = 'sold' where id = v_listing.id;
  return v_id;
end $$;

create or replace function public.responder_compra(
  p_venta_id uuid, p_recibida boolean, p_estrellas int default null, p_comentario text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_venta      ventas%rowtype;
  v_comentario text := nullif(trim(coalesce(p_comentario, '')), '');
  v_comprador  text;
  v_vendedor   text;
begin
  select * into v_venta from ventas
   where id = p_venta_id and comprador_id = auth.uid() and estado = 'pendiente'
   for update;
  if not found then raise exception 'Esta compra ya fue respondida o no es tuya'; end if;

  select coalesce(username, first_name, 'Tu comprador') into v_comprador
    from players where user_id = auth.uid();
  select username into v_vendedor from players where user_id = v_venta.vendedor_id;

  if p_recibida then
    if p_estrellas is null or p_estrellas not between 1 and 5 then
      raise exception 'La calificación va de 1 a 5 estrellas';
    end if;
    update ventas set estado = 'completada', estrellas = p_estrellas,
           comentario = left(v_comentario, 500), respondida_at = now()
     where id = v_venta.id;
    insert into notifications (user_id, type, title, body, data)
    values (v_venta.vendedor_id, 'venta_completada', 'Venta confirmada',
            v_comprador || ' confirmó la compra y te calificó con ' || p_estrellas || ' de 5 estrellas',
            jsonb_build_object('venta_id', v_venta.id,
                               'url', case when v_vendedor is not null then '/' || v_vendedor || '/resenas' end));
  else
    update ventas set estado = 'anulada', respondida_at = now() where id = v_venta.id;
    insert into notifications (user_id, type, title, body, data)
    values (v_venta.vendedor_id, 'venta_anulada', 'Venta no confirmada',
            v_comprador || ' indicó que no recibió la carta; la venta no cuenta en tu perfil',
            jsonb_build_object('venta_id', v_venta.id, 'url', '/dashboard/market'));
  end if;
end $$;

-- Resumen para el perfil: ventas completadas, promedio y cuántas traen comentario.
create or replace function public.resumen_ventas(p_user_id uuid)
returns table (ventas bigint, promedio numeric, resenas bigint)
language sql stable security invoker set search_path = public
as $$
  select count(*), round(avg(estrellas)::numeric, 1), count(comentario)
    from ventas where vendedor_id = p_user_id and estado = 'completada';
$$;

create or replace function public.vencer_ventas_pendientes()
returns void
language sql security definer set search_path = public
as $$
  update ventas set estado = 'vencida'
   where estado = 'pendiente' and created_at < now() - interval '30 days';
$$;

revoke all on function public.registrar_venta(uuid, text)                 from public, anon;
revoke all on function public.responder_compra(uuid, boolean, int, text)  from public, anon;
revoke all on function public.vencer_ventas_pendientes()                  from public, anon, authenticated;
grant execute on function public.registrar_venta(uuid, text)                to authenticated;
grant execute on function public.responder_compra(uuid, boolean, int, text) to authenticated;
grant execute on function public.resumen_ventas(uuid)                       to anon, authenticated;

select cron.schedule('vencer-ventas-pendientes', '30 7 * * *', 'select public.vencer_ventas_pendientes()');
