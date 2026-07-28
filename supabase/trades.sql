-- Intercambios (trades) entre usuarios.
-- Modelo "solo acuerdo": aceptar NO mueve card_inventory, las partes coordinan el envío.

create table if not exists trades (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references auth.users(id) on delete cascade,
  to_user_id    uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','rejected','cancelled')),
  cash_amount   numeric(12,2),
  cash_currency text,
  -- 'from' = quien envía la solicitud paga; 'to' = quien la recibe paga
  cash_payer    text check (cash_payer in ('from','to')),
  message       text,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (from_user_id <> to_user_id)
);

create table if not exists trade_cards (
  id       uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  -- 'offer'   = cartas que entrega from_user_id
  -- 'request' = cartas que from_user_id pide a to_user_id
  side     text not null check (side in ('offer','request')),
  card_id  text not null,
  set_id   text not null,
  version  text,
  quantity integer not null default 1 check (quantity > 0)
);

create index if not exists trades_to_user_idx   on trades(to_user_id, status, created_at desc);
create index if not exists trades_from_user_idx on trades(from_user_id, status, created_at desc);
create index if not exists trade_cards_trade_idx on trade_cards(trade_id);

alter table trades      enable row level security;
alter table trade_cards enable row level security;

-- ── trades ────────────────────────────────────────────────────
drop policy if exists "Participants read trades" on trades;
create policy "Participants read trades" on trades
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Sender creates trades" on trades;
create policy "Sender creates trades" on trades
  for insert with check (auth.uid() = from_user_id and status = 'pending');

-- El receptor acepta/rechaza; el emisor cancela. La condición fina va en el USING
-- del update y se valida de nuevo en el cliente.
drop policy if exists "Participants update trades" on trades;
create policy "Participants update trades" on trades
  for update using (
    (auth.uid() = to_user_id   and status = 'pending')
    or
    (auth.uid() = from_user_id and status = 'pending')
  );

-- ── trade_cards ───────────────────────────────────────────────
drop policy if exists "Participants read trade cards" on trade_cards;
create policy "Participants read trade cards" on trade_cards
  for select using (
    exists (
      select 1 from trades t
      where t.id = trade_cards.trade_id
        and (auth.uid() = t.from_user_id or auth.uid() = t.to_user_id)
    )
  );

drop policy if exists "Sender creates trade cards" on trade_cards;
create policy "Sender creates trade cards" on trade_cards
  for insert with check (
    exists (
      select 1 from trades t
      where t.id = trade_cards.trade_id
        and auth.uid() = t.from_user_id
        and t.status = 'pending'
    )
  );
