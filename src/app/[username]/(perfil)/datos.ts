import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { loadSetCards } from "@/data/pokemon-cards";
import { valorDeFilas, type ValorActual } from "@/lib/valor-portafolio";
import { calcularLogros, type Metricas } from "@/data/logros";
import { urlDeRed, type RedSocial } from "@/components/perfil/Redes";
import { traerJugador } from "../jugador";

export type SetStat = { setId: string; unique: number; total: number; totalQty: number };

/**
 * Todo lo que necesitan la cabecera y las pestañas del perfil nuevo. Con
 * `cache()` se calcula una sola vez por pedido aunque lo pidan el layout y la
 * página. El inventario se lee aquí, en el servidor, y solo sale el resumen
 * por set: el perfil viejo mandaba miles de filas al navegador.
 */
export const traerPerfil = cache(async (username: string) => {
  const jugador = await traerJugador(username);
  if (!jugador) return null;

  const supabase = await createClient();
  const uid = jugador.user_id as string;

  const [{ data: { user } }, { data: metricasDb }, { data: resumen }, inventario] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("perfil_metricas", { p_user_id: uid }),
    supabase.rpc("resumen_ventas", { p_user_id: uid }),
    fetchAllRows<{ card_id: string; set_id: string; version: string | null; quantity: number }>(() => supabase
      .from("card_inventory").select("card_id, set_id, version, quantity")
      .eq("user_id", uid).gt("quantity", 0)),
  ]);

  /* Progreso por set contra el MASTER SET: todas las cartas con sus variantes
     (normal, reverse, holo…), que es lo que se colecciona. SET_CARD_COUNT
     cuenta solo las cartas base y daba cosas como "118 / 120" en Pitch Black,
     cuyo master set es de 194. El id de cada carta ya incluye la variante. */
  const porSet: Record<string, { ids: Set<string>; qty: number }> = {};
  for (const r of inventario) {
    (porSet[r.set_id] ??= { ids: new Set(), qty: 0 });
    porSet[r.set_id].ids.add(r.card_id);
    porSet[r.set_id].qty += r.quantity;
  }
  // Valor del portafolio con el mismo inventario: así el navegador no lo vuelve a leer
  const [maestros, valorActual] = await Promise.all([
    Promise.all(Object.keys(porSet).map(async setId => [setId, await loadSetCards(setId)] as const)),
    valorDeFilas(supabase, inventario).catch((): ValorActual | null => null),
  ]);
  const sets: SetStat[] = maestros
    .map(([setId, cartas]) => {
      const validas = new Set(cartas.map(c => c.id));
      const unique = [...porSet[setId].ids].filter(id => validas.has(id)).length;
      return { setId, unique, total: cartas.length, totalQty: porSet[setId].qty };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.unique / b.total - a.unique / a.total || b.unique - a.unique);

  const pct = (s: SetStat) => Math.min(100, (s.unique / s.total) * 100);
  const metricas: Metricas = {
    ...(metricasDb as Omit<Metricas, "sets_completos" | "sets_mitad" | "set_mejor_pct" | "perfil_completo">),
    sets_completos:  sets.filter(s => pct(s) >= 100).length,
    sets_mitad:      sets.filter(s => pct(s) >= 50).length,
    set_mejor_pct:   Math.floor(Math.max(0, ...sets.map(pct))),
    perfil_completo: jugador.photo_url && jugador.cover_url && jugador.ciudad ? 1 : 0,
  };

  const fila = Array.isArray(resumen) ? resumen[0] : null;

  return {
    jugador: {
      userId:        uid,
      username:      jugador.username as string,
      nombre:        `${jugador.first_name ?? ""} ${jugador.last_name ?? ""}`.trim() || (jugador.username as string),
      ciudad:        (jugador.ciudad as string | null) ?? "",
      pais:          (jugador.pais as string | null) ?? "",
      tipoPerfil:    (jugador.tipo_perfil as string | null) ?? "",
      fotoUrl:       (jugador.photo_url as string | null) ?? null,
      portadaUrl:    (jugador.cover_url as string | null) ?? null,
      portadaPos:    (jugador.cover_position as number | null) ?? 50,
      /** Encuadre horizontal de la portada en el celular */
      portadaPosMovil: (jugador.cover_position_movil as number | null) ?? 50,
      portadaPosMovilY: (jugador.cover_position_movil_y as number | null) ?? 0,
      verificado:    jugador.verificado === true,
      tiendaAprobada: jugador.store_status === "approved",
      creado:        jugador.created_at as string,
      pokemonFav:    (jugador.pokemon_favorito as string | null) ?? "",
      setFavorito:   (jugador.set_favorito as string | null) ?? "",
      direccion:     (jugador.store_address as string | null) ?? "",
      mapsUrl:       (jugador.store_maps_url as string | null) ?? "",
      /** Insignia azul junto al @, estilo X o Instagram: por ahora solo admins */
      esAdmin:       jugador.role === "admin",
    },
    /** Solo enlaces públicos: el número de WhatsApp no sale del servidor */
    redes: (() => {
      const links: { red: RedSocial; href: string }[] = [];
      for (const red of ["facebook", "instagram", "tiktok", "youtube"] as const) {
        const href = urlDeRed(red, (jugador[`social_${red}`] as string | null) ?? "");
        if (href) links.push({ red, href });
      }
      if (jugador.mostrar_whatsapp && jugador.whatsapp_numero) {
        links.push({ red: "whatsapp", href: `/api/whatsapp/${encodeURIComponent(jugador.username as string)}` });
      }
      return links;
    })(),
    visitanteId: user?.id ?? null,
    esDueno:     user?.id === uid,
    metricas,
    sets,
    ventas: {
      total:    Number(fila?.ventas ?? 0),
      promedio: fila?.promedio == null ? null : Number(fila.promedio),
      resenas:  Number(fila?.resenas ?? 0),
    },
    logros: calcularLogros(metricas),
    valorActual,
  };
});

export type Perfil = NonNullable<Awaited<ReturnType<typeof traerPerfil>>>;
