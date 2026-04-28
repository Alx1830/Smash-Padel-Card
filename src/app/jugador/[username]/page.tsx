import { createClient } from "@/lib/supabase/server";
import { ProfilePage } from "@/components/ProfilePage";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { notFound } from "next/navigation";

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
    energiaFavorita: data.energia_favorita ?? "—",
    photoUrl:        data.photo_url || undefined,
    profileUserId:   data.user_id ?? undefined,
    currentUserId:   user?.id ?? null,
  };

  return (
    <main style={{ background: "#05070d", minHeight: "100vh" }}>
      <Navbar />
      <ProfilePage player={player} />
      <Footer />
    </main>
  );
}
