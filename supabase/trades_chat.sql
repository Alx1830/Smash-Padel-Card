-- Chat de negociación dentro de cada intercambio + permisos para editar
-- una solicitud pendiente. Correr despues de supabase/trades.sql

-- ── Marca de última edición ───────────────────────────────────
alter table trades add column if not exists updated_at timestamptz;

-- ── Mensajes del trade ────────────────────────────────────────
create table if not exists trade_messages (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid not null references trades(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists trade_messages_trade_idx
  on trade_messages(trade_id, created_at);

alter table trade_messages enable row level security;

drop policy if exists "Participants read messages" on trade_messages;
create policy "Participants read messages" on trade_messages
  for select using (
    exists (
      select 1 from trades t
      where t.id = trade_messages.trade_id
        and (auth.uid() = t.from_user_id or auth.uid() = t.to_user_id)
    )
  );

drop policy if exists "Participants write messages" on trade_messages;
create policy "Participants write messages" on trade_messages
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from trades t
      where t.id = trade_messages.trade_id
        and (auth.uid() = t.from_user_id or auth.uid() = t.to_user_id)
    )
  );

-- Realtime para que el chat llegue sin recargar
do $$
begin
  alter publication supabase_realtime add table trade_messages;
exception
  when duplicate_object then null;
end $$;

-- ── Edicion de una solicitud pendiente ────────────────────────
-- El emisor puede rehacer las cartas del trade mientras siga pendiente.
drop policy if exists "Sender deletes trade cards" on trade_cards;
create policy "Sender deletes trade cards" on trade_cards
  for delete using (
    exists (
      select 1 from trades t
      where t.id = trade_cards.trade_id
        and auth.uid() = t.from_user_id
        and t.status = 'pending'
    )
  );
