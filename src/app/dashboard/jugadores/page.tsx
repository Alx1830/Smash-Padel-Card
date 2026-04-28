"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PlayerCard3D } from "@/components/PlayerCard3D";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Player {
  username:         string;
  first_name:       string;
  last_name:        string;
  pais:             string | null;
  tipo_perfil:      string | null;
  energia_favorita: string | null;
  photo_url:        string | null;
  set_favorito:     string | null;
}

export default function AmigosPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) { setLoading(false); return; }

      const ids = follows.map(f => f.following_id);
      const { data } = await supabase
        .from("players")
        .select("username, first_name, last_name, pais, tipo_perfil, energia_favorita, photo_url, set_favorito")
        .in("user_id", ids)
        .not("username", "is", null);

      setPlayers(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page-container" style={{ minHeight: "100vh" }}>
      <style>{`
        .page-container { padding: 24px; }
        @media (min-width: 768px) { .page-container { padding: 48px; } }
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
            {loading ? "…" : `${players.length} siguiendo`}
          </span>
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px", fontFamily: MONO, fontSize: "12px", color: INK2 }}>
          Cargando…
        </div>
      ) : players.length === 0 ? (
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px" }}>
          {players.map(p => (
            <Link key={p.username} href={`/${p.username}`} style={{ textDecoration: "none" }}>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
