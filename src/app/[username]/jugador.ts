import { cache } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * El jugador, buscado una sola vez por pedido.
 *
 * Lo consultan el layout, `generateMetadata` y la página, y es la misma fila:
 * `cache()` hace que la base se toque una vez sola. La llave de servicio se
 * lee adentro y nunca al importar, que es lo que exige el build de Cloudflare.
 */
export const traerJugador = cache(async (username: string) => {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await adminClient
    .from("players")
    .select("*")
    .ilike("username", username)
    .single();

  return data && data.activo !== false ? data : null;
});
