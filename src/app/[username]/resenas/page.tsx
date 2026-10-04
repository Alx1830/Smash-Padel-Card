import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { traerJugador } from "../jugador";
import { ResenasPageClient } from "./ResenasPageClient";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await traerJugador(username);

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const title = `Reseñas de ${display} · FaceBinder`;
  const description = `Lo que dicen los compradores de ${display}: ventas de cartas Pokémon TCG confirmadas y calificadas en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.com/${username}/resenas`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function ResenasPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [player, { data: { user } }] = await Promise.all([
    traerJugador(username),
    supabase.auth.getUser(),
  ]);
  if (!player) notFound();

  const [{ data: featuredRows }, invRows] = await Promise.all([
    supabase.from("featured_cards").select("card_id, set_id").eq("user_id", player.user_id),
    fetchAllRows<{ card_id: string; set_id: string; quantity: number }>(() => supabase
      .from("card_inventory").select("card_id, set_id, quantity")
      .eq("user_id", player.user_id).gt("quantity", 0)),
  ]);

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
    inventoryRows:   invRows as { card_id: number | string; set_id: string; quantity: number }[],
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <ProfileHeader player={profileHeader} hideMobileDetails showProfileLink />
      <ResenasPageClient vendedorId={player.user_id} username={player.username} />
      <Footer />
      <MobileTabBar />
    </main>
  );
}
