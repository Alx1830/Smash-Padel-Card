import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ProfilePage } from "@/components/ProfilePage";
import { StoreProfilePage, StorePendingScreen } from "@/components/StoreProfilePage";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { notFound } from "next/navigation";
import { SET_CARD_COUNT } from "@/data/pokemon-cards";

export const revalidate = 300;
export const dynamicParams = true;

/** Valor guardado en players.tipo_perfil para las tiendas */
const TIENDA = "Tienda Pokémon";

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
    .select("username, first_name, last_name, tipo_perfil, store_status")
    .ilike("username", username)
    .single();

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const isStore = data?.tipo_perfil === TIENDA;

  const title = isStore
    ? `${display} · Tienda Pokémon en FaceBinder`
    : `Colección de ${display} · FaceBinder`;
  const description = isStore
    ? `Conoce la tienda ${display} en FaceBinder: cartas Pokémon TCG, novedades y contacto directo.`
    : `Mira la colección de cartas Pokémon TCG de ${display}. Descubre sus sets completados, cartas Normal, Reverse Holo y Holofoil en FaceBinder.`;

  return {
    title,
    description,
    // Una tienda sin aprobar no debe llegar a los buscadores
    ...(isStore && data?.store_status !== "approved"
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      title,
      description,
      url: `https://facebinder.com/${username}`,
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

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data }, { data: { user } }] = await Promise.all([
    adminClient.from("players").select("*").ilike("username", username).single(),
    supabase.auth.getUser(),
  ]);

  if (!data || data.activo === false) notFound();

  /* ── Tiendas: perfil propio, tipo fanpage ─────────────────────────────── */
  if (data.tipo_perfil === TIENDA) {
    const isOwner = !!user && user.id === data.user_id;

    // Un admin necesita ver la tienda para poder decidir si la aprueba
    let isAdmin = false;
    if (user && !isOwner) {
      const { data: me } = await supabase
        .from("players").select("role").eq("user_id", user.id).single();
      isAdmin = me?.role === "admin";
    }

    const approved = data.store_status === "approved";

    return (
      <main style={{ background: "#05070d", minHeight: "100vh" }}>
        {approved || isOwner || isAdmin ? (
          <StoreProfilePage
            store={{
              username:      data.username,
              firstName:     data.first_name ?? "",
              lastName:      data.last_name ?? "",
              tipoPerfil:    data.tipo_perfil,
              pais:          data.pais ?? "—",
              ciudad:        data.ciudad ?? "—",
              photoUrl:      data.photo_url || undefined,
              coverUrl:      data.cover_url || undefined,
              coverPosition: data.cover_position ?? 50,
              address:       data.store_address || undefined,
              mapsUrl:       data.store_maps_url || undefined,
              hours:         data.store_hours ?? null,
              facebook:      data.social_facebook || undefined,
              instagram:     data.social_instagram || undefined,
              // El WhatsApp ya existía en el perfil: indicativo + número
              whatsapp:      data.whatsapp_numero
                ? `${data.whatsapp_indicativo ?? ""}${data.whatsapp_numero}`
                : undefined,
              storeStatus:   data.store_status ?? null,
              profileUserId: data.user_id ?? undefined,
              currentUserId: user?.id ?? null,
              isOwner,
            }}
          />
        ) : (
          <StorePendingScreen username={data.username} />
        )}
        <Footer />
        <MobileTabBar />
      </main>
    );
  }

  // Fetch inventory + featured cards + wishlist in parallel
  // NOTE: no .in("set_id", ...) filter — SET_CARDS is a lazy Proxy, empty on server
  const [{ data: invRows }, { data: featuredRows }, { data: wishlistRows }] = data.user_id
    ? await Promise.all([
        supabase
          .from("card_inventory")
          .select("card_id, set_id, quantity, version")
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
    edad:            data.edad ?? 0,
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
