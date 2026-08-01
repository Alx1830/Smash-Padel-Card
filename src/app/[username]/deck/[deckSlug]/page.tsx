import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { POKEMON_SERIES, HIDDEN_SETS } from "@/data/pokemon-sets";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { slugifySetName } from "@/lib/slug";
import { DeckViewClient } from "./DeckViewClient";

const ALL_SETS = [...POKEMON_SERIES.flatMap(s => s.sets), ...HIDDEN_SETS];

async function loadDeck(username: string, deckSlug: string) {
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("user_id, username, first_name, last_name, pais, ciudad, photo_url, tipo_perfil, energia_favorita, pokemon_favorito, edad, set_favorito")
    .ilike("username", username)
    .single();
  if (!player?.user_id) return null;

  const { data: decks } = await supabase
    .from("decks")
    .select("id, name, description")
    .eq("user_id", player.user_id)
    .order("created_at", { ascending: false });

  const deck = (decks ?? []).find(d => slugifySetName(d.name) === deckSlug);
  if (!deck) return null;

  const { data: cards } = await supabase
    .from("deck_cards")
    .select("card_id, set_id, version, quantity, position")
    .eq("deck_id", deck.id)
    .order("position", { ascending: true });

  return { player, deck, cards: cards ?? [] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; deckSlug: string }>;
}): Promise<Metadata> {
  const { username, deckSlug } = await params;
  const data = await loadDeck(username, deckSlug);
  if (!data) return { title: "Deck no encontrado · FaceBinder" };

  const display = data.player.first_name
    ? `${data.player.first_name}${data.player.last_name ? " " + data.player.last_name : ""}`
    : data.player.username;

  const title = `${data.deck.name} · Deck de ${display} · FaceBinder`;
  const description = data.deck.description
    ? data.deck.description
    : `Mira "${data.deck.name}", el deck de Pokémon TCG de ${display} en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.com/${username}/deck/${deckSlug}`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function DeckPage({
  params,
}: {
  params: Promise<{ username: string; deckSlug: string }>;
}) {
  const { username, deckSlug } = await params;
  const data = await loadDeck(username, deckSlug);
  if (!data) notFound();

  const { player, deck, cards } = data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    featuredCards:   [] as { card_id: number | string; set_id: string }[],
    inventoryRows:   [] as { card_id: number | string; set_id: string; quantity: number }[],
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <ProfileHeader player={profileHeader} hideMobileDetails showProfileLink />
      <Suspense>
        <DeckViewClient
          username={player.username}
          deckName={deck.name}
          description={deck.description ?? ""}
          rows={cards as { card_id: string; set_id: string; version: string; quantity: number; position: number }[]}
          allSets={ALL_SETS.map(s => ({ id: s.id, name: s.name, logo: s.logo }))}
        />
      </Suspense>
      <Footer />
      <MobileTabBar />
    </main>
  );
}
