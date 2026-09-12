/**
 * La página del minijuego.
 *
 * El ranking se trae acá, en el servidor, y no con un efecto al montar: así
 * llega dibujado en la primera pintura, sin el parpadeo de una tabla vacía que
 * se llena un segundo después. El juego en sí es un componente de cliente,
 * porque necesita reloj y clics.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MasCara, type Puesto } from "@/components/juego/MasCara";

export const metadata: Metadata = {
  title: "Higher Or Lower | Facebinder",
  description: "Dos cartas, diez segundos: señala la más cara y sigue sumando rondas.",
};

/* Cada quien ve su propio ranking del momento, y cambia con cada partida. */
export const dynamic = "force-dynamic";

export default async function JuegoPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("juego_ranking", { limite: 10 });

  return <MasCara rankingInicial={(data ?? []) as Puesto[]} />;
}
