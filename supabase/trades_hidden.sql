-- Ocultar un intercambio del historial propio.
-- Es por lado: cada participante decide si lo sigue viendo. Borrarlo de verdad
-- se lo quitaría también al otro, que puede necesitarlo como constancia.

alter table trades add column if not exists from_hidden boolean not null default false;
alter table trades add column if not exists to_hidden   boolean not null default false;

-- La policy de update solo cubre trades pendientes, y esto se usa sobre trades
-- ya cerrados: va por función para no abrir el update de un trade terminado.
create or replace function hide_trade(p_trade_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update trades
     set from_hidden = case when from_user_id = auth.uid() then p_hidden else from_hidden end,
         to_hidden   = case when to_user_id   = auth.uid() then p_hidden else to_hidden   end
   where id = p_trade_id
     and (from_user_id = auth.uid() or to_user_id = auth.uid())
     -- Un intercambio pendiente sigue vivo: primero se cancela o se responde
     and status <> 'pending';

  if not found then
    raise exception 'No se puede ocultar este intercambio';
  end if;
end;
$$;

revoke all on function hide_trade(uuid, boolean) from public;
grant execute on function hide_trade(uuid, boolean) to authenticated;
