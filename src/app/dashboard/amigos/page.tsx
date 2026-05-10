import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard3D } from "@/components/PlayerCard3D";

export const revalidate = 120;

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default async function AmigosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let players: {
    username: string;
    first_name: string;
    last_name: string;
    pais: string | null;
    tipo_perfil: string | null;
    energia_favorita: string | null;
    photo_url: string | null;
    set_favorito: string | null;
  }[] = [];

  if (user) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (follows && follows.length > 0) {
      const ids = follows.map((f: { following_id: string }) => f.following_id);
      const { data } = await supabase
        .from("players")
        .select("username, first_name, last_name, pais, tipo_perfil, energia_favorita, photo_url, set_favorito")
        .in("user_id", ids)
        .not("username", "is", null);
      players = data ?? [];
    }
  }

  return (
    <div className="page-container" style={{ minHeight: "100vh" }}>
      <style>{`
        .page-container { padding: 24px; }
        @media (min-width: 768px) { .page-container { padding: 48px; } }

        .amigos-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        /* Each cell controls the real layout dimensions */
        .amigos-item {
          width: 100%;
          aspect-ratio: 260 / 416;
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          text-decoration: none;
          display: block;
        }
        /* Card sits at top-left and scales to fill the cell */
        .amigos-card-wrap {
          position: absolute;
          top: 0;
          left: 0;
          width: 260px;
          height: 416px;
          transform-origin: top left;
          transform: scale(0.82);
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .amigos-card-wrap { transform: scale(0.68); }
        }
        @media (max-width: 1023px) {
          .amigos-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .amigos-card-wrap { transform: scale(0.64); }
        }
        @media (max-width: 390px) {
          .amigos-card-wrap { transform: scale(0.57); }
        }
      `}</style>

      <div style={{ marginBottom: "48px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Comunidad
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>
          Amigos
          <span style={{ fontFamily: MONO, fontSize: "13px", color: INK2, marginLeft: "16px", fontWeight: 400 }}>
            {players.length} siguiendo
          </span>
        </h1>
      </div>

      {players.length === 0 ? (
        <div style={{
          border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px",
          padding: "80px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>⊕</div>
          <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Aún no sigues a nadie — explora jugadores y presiona Seguir
          </p>
        </div>
      ) : (
        <div className="amigos-grid">
          {players.map(p => (
            <Link key={p.username} href={`/${p.username}`} className="amigos-item">
              <div className="amigos-card-wrap">
                <PlayerCard3D
                  username={p.username}
                  firstName={p.first_name ?? ""}
                  lastName={p.last_name ?? ""}
                  category={p.pais ?? "—"}
                  position={p.tipo_perfil ?? "—"}
                  energiaFavorita={p.energia_favorita ?? "—"}
                  photoUrl={p.photo_url || undefined}
                  setFavoritoId={p.set_favorito || undefined}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
