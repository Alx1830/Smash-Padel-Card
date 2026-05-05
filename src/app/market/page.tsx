import { createClient } from "@/lib/supabase/server";
import { MarketPageClient } from "./MarketPageClient";

export const revalidate = 300;

export default async function MarketPage() {
  const supabase = await createClient();

  /* Parallel: auth + listings count + all countries */
  const [
    { data: { user } },
    { count: totalListings },
    { data: allProfRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("market_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("players").select("pais").not("pais", "is", null).neq("pais", ""),
  ]);

  /* User country — only if logged in (fast, already have user) */
  let userPais = "";
  if (user) {
    const { data: prof } = await supabase
      .from("players").select("pais").eq("user_id", user.id).single();
    userPais = prof?.pais ?? "";
  }
  const uniquePaises: string[] = [...new Set(
    (allProfRows ?? [])
      .map((r: any) => r.pais)
      .filter((p: string) => p && !/\d/.test(p) && p.length <= 50)
  )].sort();

  return (
    <>
      <MarketPageClient
        totalListings={totalListings ?? 0}
        countries={uniquePaises}
        defaultPais={userPais}
        currentUserId={user?.id ?? null}
      />
    </>
  );
}
