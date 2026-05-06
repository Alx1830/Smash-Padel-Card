import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { WishlistPageClient } from "./WishlistPageClient";

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
    .select("username, first_name, last_name, photo_url")
    .ilike("username", username)
    .single();

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const image = data?.photo_url ?? "/og-image.png";
  const title = `Wishlist de ${display} · FaceBinder`;
  const description = `Descubre las cartas Pokémon TCG que ${display} está buscando. Contacta y ayúdalo a completar su colección en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.vercel.app/${username}/wishlist`,
      images: [{ url: image, width: 400, height: 400, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function WishlistPage({
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

  const [{ data: wishlistRows }, { data: featuredRows }, { data: invRows }] = player.user_id
    ? await Promise.all([
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", player.user_id),
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
      <WishlistPageClient
        username={player.username}
        wishlistRows={(wishlistRows ?? []) as { card_id: number | string; set_id: string }[]}
        allSets={allSets.map(s => ({ id: s.id, name: s.name, logo: s.logo }))}
        whatsappIndicativo={player.whatsapp_indicativo ?? ""}
        whatsappNumero={player.whatsapp_numero ?? ""}
      />
      <Footer />
      <MobileTabBar />
    </main>
  );
}
