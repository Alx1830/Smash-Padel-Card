import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { MarketPageClient } from "./MarketPageClient";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  /* Get user's country from profile */
  let userPais = "";
  if (user) {
    const { data: prof } = await supabase
      .from("players")
      .select("pais")
      .eq("user_id", user.id)
      .single();
    userPais = prof?.pais ?? "";
  }

  /* Total active listings count */
  const { count: totalListings } = await supabase
    .from("market_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  /* All countries from all players */
  const { data: allProfRows } = await supabase
    .from("players")
    .select("pais")
    .not("pais", "is", null)
    .neq("pais", "");
  const uniquePaises: string[] = [...new Set(
    (allProfRows ?? [])
      .map((r: any) => r.pais)
      .filter((p: string) => p && !/\d/.test(p) && p.length <= 50)
  )].sort();

  return (
    <>
      <Navbar />
      <MarketPageClient
        totalListings={totalListings ?? 0}
        countries={uniquePaises}
        defaultPais={userPais}
        currentUserId={user?.id ?? null}
      />
    </>
  );
}
