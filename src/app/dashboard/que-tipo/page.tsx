/**
 * La página de "¿De qué tipo es?". Igual que Higher Or Lower, el ranking se
 * trae acá en el servidor para que llegue dibujado en la primera pintura.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { JuegoTipos } from "@/components/juego-tipos/JuegoTipos";
import type { Puesto } from "@/components/juego/MasCara";
import { PUESTOS_RANKING } from "@/components/juego/ranking";

export const metadata: Metadata = {
  title: "¿De qué tipo es? | Facebinder",
  description: "Un minuto para adivinar el tipo de cada Pokémon: si tiene dos, los dos.",
};

export const dynamic = "force-dynamic";

export default async function QueTipoPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("tipos_ranking", { limite: PUESTOS_RANKING });
  return <JuegoTipos rankingInicial={(data ?? []) as Puesto[]} />;
}
