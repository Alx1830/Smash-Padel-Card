import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export const revalidate = 60;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("players")
    .select("photo_url, username, role")
    .eq("user_id", user.id)
    .single();

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
