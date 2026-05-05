import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("players")
    .select("photo_url, username, role")
    .eq("user_id", user.id)
    .single();

  return (
    <DashboardLayoutClient
      initialPhotoUrl={data?.photo_url ?? null}
      initialUsername={data?.username ?? null}
      initialUserId={user.id}
      initialIsAdmin={data?.role === "admin"}
    >
      {children}
    </DashboardLayoutClient>
  );
}
