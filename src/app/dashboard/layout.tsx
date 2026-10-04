import { getAuthedPlayer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

/* No hace falta `force-dynamic`: getAuthedPlayer() lee cookies() y eso ya
   marca el árbol como dinámico. */

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthedPlayer();

  if (!user) redirect("/login");

  // Cuenta suspendida desde el panel de usuarios: su sesión vieja puede seguir
  // viva hasta una hora, así que se corta aquí también.
  const suspendida = (user as { banned_until?: string | null }).banned_until;
  if (suspendida && new Date(suspendida) > new Date()) redirect("/auth/bloqueado");

  // Guard: profile must be complete before accessing the dashboard
  const profileComplete =
    profile?.username    && profile.username.trim()    !== "" &&
    profile?.first_name  && profile.first_name.trim()  !== "" &&
    profile?.last_name   && profile.last_name.trim()   !== "" &&
    profile?.pais        && profile.pais.trim()        !== "" &&
    profile?.tipo_perfil && profile.tipo_perfil.trim() !== "" &&
    // La foto es obligatoria: quien no la tenga la sube en el último paso del registro.
    profile?.photo_url   && profile.photo_url.trim()   !== "";

  if (!profileComplete) redirect("/onboarding");

  return (
    <DashboardLayoutClient
      initialPhotoUrl={profile?.photo_url ?? null}
      initialUsername={profile?.username ?? null}
      initialUserId={user.id}
      initialIsAdmin={profile?.role === "admin"}
    >
      {children}
    </DashboardLayoutClient>
  );
}
