import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { UserMarketPageClient } from "./UserMarketPageClient";

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

  const title = `Cartas en venta de ${display} · FaceBinder`;
  const description = `${display} tiene cartas Pokémon TCG disponibles para venta o intercambio. Revisa su catálogo y contáctalo en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.vercel.app/${username}/market`,
      images: [{ url: "/og-image.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default async function UserMarketPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data: player }, { data: { user } }] = await Promise.all([
    supabase
      .from("players")
      .select("user_id, username, first_name, last_name, pais, ciudad, photo_url, tipo_perfil, energia_favorita, pokemon_favorito, edad, set_favorito, whatsapp_indicativo, whatsapp_numero")
      .ilike("username", username)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!player) notFound();

  const [{ data: listings }, { data: featuredRows }, { data: invRows }] = player.user_id
    ? await Promise.all([
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, version, created_at").eq("user_id", player.user_id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", player.user_id),
        supabase.from("card_inventory").select("card_id, set_id, quantity").eq("user_id", player.user_id).gt("quantity", 0),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const allSets = POKEMON_SERIES.flatMap(s => s.sets);

  const profileHeader = {
    username:        player.username,
    firstName:       player.first_name ?? "",
    lastName:        player.last_name ?? "",
    tipoPerfil:      player.tipo_perfil ?? "",
    pais:            player.pais ?? "",
    ciudad:          player.ciudad ?? "",
    energiaFavorita: player.energia_favorita ?? "",
    pokemonFavorito: player.pokemon_favorito ?? "",
    edad:            player.edad ?? 0,
    setFavoritoId:   player.set_favorito ?? undefined,
    photoUrl:        player.photo_url ?? undefined,
    profileUserId:   player.user_id ?? undefined,
    currentUserId:   user?.id ?? null,
    featuredCards:   (featuredRows ?? []) as { card_id: number | string; set_id: string }[],
    inventoryRows:   (invRows ?? []) as { card_id: number | string; set_id: string; quantity: number }[],
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <ProfileHeader player={profileHeader} />
      <UserMarketPageClient
        username={player.username}
        pais={player.pais ?? ""}
        ciudad={player.ciudad ?? ""}
        whatsappIndicativo={player.whatsapp_indicativo ?? ""}
        whatsappNumero={player.whatsapp_numero ?? ""}
        listings={(listings ?? []) as { id: string; card_id: number | string; set_id: string; price_cop: number; version: string; created_at: string }[]}
        allSets={allSets.map(s => ({ id: s.id, name: s.name, logo: s.logo }))}
      />
      <Footer />
      <MobileTabBar />
    </main>
  );
}
