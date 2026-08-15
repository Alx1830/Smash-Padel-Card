-- La wishlist se limpia sola cuando la carta entra al inventario.
--
-- Antes esto vivía en el cliente, y solo en la pantalla de intercambios: si la
-- carta entraba por el market, por el inventario a mano o por cualquier otro
-- lado, la wishlist quedaba con una carta que el usuario ya tenía.
--
-- La regla que se pidió, en palabras: si la agrego a la wishlist teniendo cero,
-- se borra al tener una. Si la agrego teniendo una (porque quiero una segunda),
-- se borra al tener dos. Y así. Para eso hay que recordar cuántas tenía en el
-- momento de agregarla, que es lo que guarda owned_at_add.
--
-- Identidad de la carta: user_id + set_id + card_id. La columna
-- card_wishlist.version NO sirve para comparar — siempre dice 'normal' porque
-- nadie la llena; la variante real viaja dentro del card_id
-- ("090:Rowlet:Holofoil").

alter table card_wishlist
  add column if not exists owned_at_add integer not null default 0;

comment on column card_wishlist.owned_at_add is
  'Cuántas copias tenía el usuario al agregarla. La wishlist se borra cuando el inventario supera este número.';

/* Al agregar a la wishlist se anota cuántas ya tiene */
create or replace function wishlist_anotar_tenencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(sum(quantity), 0) into new.owned_at_add
  from card_inventory
  where user_id = new.user_id
    and set_id  = new.set_id
    and card_id = new.card_id;
  return new;
end;
$$;

drop trigger if exists trg_wishlist_anotar_tenencia on card_wishlist;
create trigger trg_wishlist_anotar_tenencia
  before insert on card_wishlist
  for each row execute function wishlist_anotar_tenencia();

/* Cuando el inventario sube por encima de esa marca, la carta sale de la wishlist */
create or replace function wishlist_limpiar_por_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from card_wishlist w
  where w.user_id = new.user_id
    and w.set_id  = new.set_id
    and w.card_id = new.card_id
    and new.quantity > w.owned_at_add;
  return null;
end;
$$;

drop trigger if exists trg_wishlist_limpiar_por_inventario on card_inventory;
create trigger trg_wishlist_limpiar_por_inventario
  after insert or update of quantity on card_inventory
  for each row execute function wishlist_limpiar_por_inventario();

/* Arrastre: las que ya estaban en la wishlist teniendo la carta en el
   inventario. Son las que el usuario veía repetidas después de un intercambio. */
delete from card_wishlist w
using card_inventory i
where i.user_id = w.user_id
  and i.set_id  = w.set_id
  and i.card_id = w.card_id
  and i.quantity > w.owned_at_add;
