-- Contraoferta: las dos partes pueden editar un intercambio pendiente.
-- Correr despues de supabase/trades.sql y supabase/trades_chat.sql

-- ── Quien hizo la ultima propuesta ────────────────────────────
-- null = el emisor original. Le toca responder al que NO figura aqui.
alter table trades add column if not exists last_proposed_by uuid references auth.users(id);

-- ── Permisos de edicion para ambas partes ─────────────────────
drop policy if exists "Sender creates trade cards" on trade_cards;
drop policy if exists "Participants create trade cards" on trade_cards;
create policy "Participants create trade cards" on trade_cards
  for insert with check (
    exists (
      select 1 from trades t
      where t.id = trade_cards.trade_id
        and (auth.uid() = t.from_user_id or auth.uid() = t.to_user_id)
        and t.status = 'pending'
    )
  );

drop policy if exists "Sender deletes trade cards" on trade_cards;
drop policy if exists "Participants delete trade cards" on trade_cards;
create policy "Participants delete trade cards" on trade_cards
  for delete using (
    exists (
      select 1 from trades t
      where t.id = trade_cards.trade_id
        and (auth.uid() = t.from_user_id or auth.uid() = t.to_user_id)
        and t.status = 'pending'
    )
  );
