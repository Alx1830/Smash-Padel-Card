-- ════════════════════════════════════════════════════════════════
-- Lectura pública del historial de portafolio.
-- Antes las políticas RLS solo dejaban a cada usuario ver sus propios
-- snapshots, así que el gráfico salía vacío al visitar otro perfil.
-- Estas políticas permiten que cualquiera (visitante o registrado) lea
-- los snapshots de cualquier usuario, para que el portafolio sea
-- compartible en el perfil público. Solo se exponen valores agregados
-- (total en USD y número de cartas), no el detalle del inventario.
-- Pegar en el SQL Editor de Supabase y ejecutar.
-- ════════════════════════════════════════════════════════════════

-- Aseguramos que RLS esté activo (ya lo estaba, esto es idempotente)
alter table public.portfolio_snapshots        enable row level security;
alter table public.portfolio_hourly_snapshots enable row level security;

-- Historial diario
drop policy if exists "portfolio_snapshots_public_read" on public.portfolio_snapshots;
create policy "portfolio_snapshots_public_read"
  on public.portfolio_snapshots
  for select
  using (true);

-- Historial por hora (vista 1D)
drop policy if exists "portfolio_hourly_snapshots_public_read" on public.portfolio_hourly_snapshots;
create policy "portfolio_hourly_snapshots_public_read"
  on public.portfolio_hourly_snapshots
  for select
  using (true);
