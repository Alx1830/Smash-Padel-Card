import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfilePage } from "@/components/ProfilePage";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { notFound } from "next/navigation";
import { SET_CARD_COUNT } from "@/data/pokemon-cards";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("username, first_name, last_name")
    .ilike("username", username)
    .single();

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const title = `Colección de ${display} · FaceBinder`;
  const description = `Mira la colección de cartas Pokémon TCG de ${display}. Descubre sus sets completados, cartas Normal, Reverse Holo y Holofoil en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.vercel.app/${username}`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from("players").select("*").ilike("username", username).single(),
    supabase.auth.getUser(),
  ]);

  if (!data) notFound();

  // Fetch inventory + featured cards + wishlist in parallel
  // NOTE: no .in("set_id", ...) filter — SET_CARDS is a lazy Proxy, empty on server
  const [{ data: invRows }, { data: featuredRows }, { data: wishlistRows }] = data.user_id
    ? await Promise.all([
        supabase
          .from("card_inventory")
          .select("card_id, set_id, quantity")
          .eq("user_id", data.user_id)
          .gt("quantity", 0),
        supabase
          .from("featured_cards")
          .select("card_id, set_id")
          .eq("user_id", data.user_id),
        supabase
          .from("card_wishlist")
          .select("card_id, set_id")
          .eq("user_id", data.user_id),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  // Build per-set stats using SET_CARD_COUNT (static, available server-side)
  type SetStats = { unique: number; total: number; totalQty: number };
  const setStats: Record<string, SetStats> = {};
  if (invRows && invRows.length > 0) {
    const bySet: Record<string, typeof invRows> = {};
    for (const row of invRows) {
      if (!bySet[row.set_id]) bySet[row.set_id] = [];
      bySet[row.set_id].push(row);
    }
    for (const [setId, rows] of Object.entries(bySet)) {
      const total = SET_CARD_COUNT[setId] ?? 0;
      if (total === 0) continue;
      const uniqueIds = new Set(rows.map(r => r.card_id));
      setStats[setId] = {
        unique:   uniqueIds.size,
        total,
        totalQty: rows.reduce((s, r) => s + r.quantity, 0),
      };
    }
  }

  const player = {
    username:        data.username,
    firstName:       data.first_name ?? "",
    lastName:        data.last_name ?? "",
    pais:            data.pais ?? "—",
    tipoPerfil:      data.tipo_perfil ?? "—",
    ciudad:          data.ciudad ?? "—",
    pokemonFavorito: data.pokemon_favorito ?? "—",
    edad:            data.edad ?? 0,
    energiaFavorita:  data.energia_favorita ?? "—",
    setFavoritoId:    data.set_favorito ?? undefined,
    photoUrl:         data.photo_url || undefined,
    profileUserId:    data.user_id ?? undefined,
    currentUserId:    user?.id ?? null,
    setStats,
    inventoryRows:    invRows ?? [],
    featuredCards:    (featuredRows  ?? []) as { card_id: number; set_id: string }[],
    wishlistCards:    (wishlistRows  ?? []) as { card_id: number; set_id: string }[],
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <ProfilePage player={player} />
      <Footer />
      <MobileTabBar />
    </main>
  );
}
