-- Confirmacion de entrega: cada parte marca "recibi las cartas" y ahi si se
-- mueve el inventario. El *_ack_at recuerda si ya vio el modal de bienvenida
-- en el inventario, para mostrarlo una sola vez por intercambio.
-- Correr despues de supabase/trades_respond_fix.sql

alter table trades add column if not exists from_received_at timestamptz;
alter table trades add column if not exists to_received_at   timestamptz;
alter table trades add column if not exists from_ack_at      timestamptz;
alter table trades add column if not exists to_ack_at        timestamptz;

-- La policy de update solo dejaba tocar trades pendientes; confirmar la
-- recepcion ocurre cuando ya estan aceptados.
drop policy if exists "Participants update trades" on trades;
create policy "Participants update trades" on trades
  for update
  using (
    (auth.uid() = from_user_id or auth.uid() = to_user_id)
    and status in ('pending','accepted')
  )
  with check (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );
