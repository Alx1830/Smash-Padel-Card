/**
 * Enviar un aviso a todos los usuarios.
 *
 * La puerta se cuida acá, en el servidor: quien no sea admin ni siquiera recibe
 * el formulario. Comprobarlo en el navegador dejaba ver la página un instante
 * antes de rebotar, y además obligaba a leer la sesión desde un efecto.
 *
 * La ruta que envía vuelve a comprobarlo por su cuenta: esto es la primera
 * puerta, no la única.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthedPlayer } from "@/lib/supabase/server";
import { EnviarAviso } from "@/components/admin/EnviarAviso";

export const metadata: Metadata = {
  title: "Enviar un aviso | Facebinder",
};

export default async function NotificacionesPage() {
  const { user, profile } = await getAuthedPlayer();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/dashboard");

  return <EnviarAviso />;
}
