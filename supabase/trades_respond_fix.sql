-- Fix: aceptar/rechazar/cancelar fallaba por RLS.
-- La policy de UPDATE solo tenia USING con status = 'pending'; sin WITH CHECK,
-- Postgres reusa el USING para validar la fila NUEVA, y esa ya tiene
-- status = 'accepted', asi que el update era rechazado.
-- Correr despues de supabase/trades_counteroffer.sql

drop policy if exists "Participants update trades" on trades;
create policy "Participants update trades" on trades
  for update
  using (
    (auth.uid() = from_user_id or auth.uid() = to_user_id)
    and status = 'pending'
  )
  with check (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );
