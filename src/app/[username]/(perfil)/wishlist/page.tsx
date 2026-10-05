import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { WishlistPageClient } from "./WishlistPageClient";
import { escaparLike } from "@/lib/escapar-like";

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
    .ilike("username", escaparLike(username))
    .single();

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const title = `Wishlist de ${display} · FaceBinder`;
  const description = `Descubre las cartas Pokémon TCG que ${display} está buscando. Contacta y ayúdalo a completar su colección en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.com/${username}/wishlist`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // El WhatsApp solo se entrega con sesión: la base ya no se lo da a la llave
  // pública, y contactar desde la wishlist exige estar registrado de todos modos.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: player } = await supabase
    .from("players")
    .select(`user_id, username, first_name, last_name, pais, ciudad, photo_url, tipo_perfil, energia_favorita, pokemon_favorito, edad, set_favorito${user ? ", whatsapp_indicativo, whatsapp_numero" : ""}`)
    .ilike("username", escaparLike(username))
    .single<{
      user_id: string; username: string; first_name: string | null; last_name: string | null;
      pais: string | null; ciudad: string | null; photo_url: string | null; tipo_perfil: string | null;
      energia_favorita: string | null; pokemon_favorito: string | null; edad: number | null;
      set_favorito: string | null; whatsapp_indicativo?: string | null; whatsapp_numero?: string | null;
    }>();

  if (!player) notFound();

  const [wishlistRows] = player.user_id
    ? await Promise.all([
        fetchAllRows<{ card_id: number; set_id: string }>(() => supabase
          .from("card_wishlist").select("card_id, set_id")
          .eq("user_id", player.user_id!))

      ])
    : [[]];

  const allSets = POKEMON_SERIES.flatMap(s => s.sets);


  return (
    <>
      <Suspense>
        <WishlistPageClient
          username={player.username}
          wishlistRows={(wishlistRows ?? []) as { card_id: number | string; set_id: string }[]}
          allSets={allSets.map(s => ({ id: s.id, name: s.name, logo: s.logo }))}
          whatsappIndicativo={player.whatsapp_indicativo ?? ""}
          whatsappNumero={player.whatsapp_numero ?? ""}
        />
      </Suspense>
    </>
  );
}
