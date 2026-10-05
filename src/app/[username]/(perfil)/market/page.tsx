import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { UserMarketPageClient } from "./UserMarketPageClient";
import { escaparLike } from "@/lib/escapar-like";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await adminClient
    .from("players")
    .select("username, first_name, last_name")
    .ilike("username", escaparLike(username))
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
      url: `https://facebinder.com/${username}/market`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function UserMarketPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const adminClient2 = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: player }] = await Promise.all([
    adminClient2
      .from("players")
      .select("user_id, username, first_name, last_name, pais, ciudad, photo_url, tipo_perfil, energia_favorita, pokemon_favorito, edad, set_favorito, whatsapp_indicativo, whatsapp_numero, activo")
      .ilike("username", escaparLike(username))
      .single(),
  ]);

  if (!player || player.activo === false) notFound();

  const [{ data: listings }] = player.user_id
    ? await Promise.all([
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, currency, version, language, created_at").eq("user_id", player.user_id).eq("status", "active").order("created_at", { ascending: false })

      ])
    : [{ data: null }];

  const allSets = POKEMON_SERIES.flatMap(s => s.sets);


  return (
    <>
      <UserMarketPageClient
        username={player.username}
        pais={player.pais ?? ""}
        ciudad={player.ciudad ?? ""}
        whatsappIndicativo={player.whatsapp_indicativo ?? ""}
        whatsappNumero={player.whatsapp_numero ?? ""}
        listings={(listings ?? []) as { id: string; card_id: number | string; set_id: string; price_cop: number; currency: string; version: string; language: string | null; created_at: string }[]}
        allSets={allSets.map(s => ({ id: s.id, name: s.name, logo: s.logo }))}
      />
    </>
  );
}
