import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("players")
    .select("photo_url, username, first_name, last_name, pais, tipo_perfil, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Guard: profile must be complete before accessing the dashboard
  const profileComplete =
    profile?.username    && profile.username.trim()    !== "" &&
    profile?.first_name  && profile.first_name.trim()  !== "" &&
    profile?.last_name   && profile.last_name.trim()   !== "" &&
    profile?.pais        && profile.pais.trim()        !== "" &&
    profile?.tipo_perfil && profile.tipo_perfil.trim() !== "";

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
