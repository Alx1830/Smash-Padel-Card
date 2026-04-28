import { createClient } from "@/lib/supabase/server";
import { ProfilePage } from "@/components/ProfilePage";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { notFound } from "next/navigation";
import { SET_CARDS } from "@/data/pokemon-cards";

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

  // Fetch inventory for sets that have cards
  const setIds = Object.keys(SET_CARDS);
  const { data: invRows } = data.user_id
    ? await supabase
        .from("card_inventory")
        .select("card_id, set_id, quantity")
        .eq("user_id", data.user_id)
        .in("set_id", setIds)
        .gt("quantity", 0)
    : { data: null };

  // Build per-set stats: { setId → { unique, total, totalQty } }
  type SetStats = { unique: number; total: number; totalQty: number };
  const setStats: Record<string, SetStats> = {};
  if (invRows && invRows.length > 0) {
    for (const setId of setIds) {
      const cards = SET_CARDS[setId];
      const rows  = invRows.filter(r => r.set_id === setId);
      if (rows.length === 0) continue;
      const ownedIds = new Set(rows.map(r => r.card_id));
      setStats[setId] = {
        unique:   cards.filter(c => ownedIds.has(c.id)).length,
        total:    cards.length,
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
    gimnasioPokemon: data.gimnasio_pokemon?.toString() ?? "—",
    ciudad:          data.ciudad ?? "—",
    pokemonFavorito: data.pokemon_favorito ?? "—",
    edad:            data.edad ?? 0,
    energiaFavorita:  data.energia_favorita ?? "—",
    setFavoritoId:    data.set_favorito ?? undefined,
    photoUrl:         data.photo_url || undefined,
    profileUserId:    data.user_id ?? undefined,
    currentUserId:    user?.id ?? null,
    setStats,
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <Navbar />
      <ProfilePage player={player} />
      <Footer />
    </main>
  );
}
