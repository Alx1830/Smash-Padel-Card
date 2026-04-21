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
  username: string;
  first_name: string;
  last_name: string;
  category: string;
  position: string;
  photo_url: string | null;
  year: string | null;
}

export default function JugadoresPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("players")
        .select("username, first_name, last_name, category, position, photo_url, year")
        .not("username", "is", null)
        .order("created_at", { ascending: false });
      setPlayers(data ?? []);
      setLoading(false);
    }
    load();

    // Tiempo real
    const channel = supabase
      .channel("players-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
          Jugadores
          <span style={{ fontFamily: MONO, fontSize: "13px", color: INK2, marginLeft: "16px", fontWeight: 400 }}>
            {loading ? "…" : `${players.length} registrados`}
          </span>
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px", fontFamily: MONO, fontSize: "12px", color: INK2 }}>
          Cargando jugadores…
        </div>
      ) : players.length === 0 ? (
        <div style={{
          border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px",
          padding: "80px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>⊕</div>
          <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Aún no hay jugadores registrados
          </p>
        </div>
      ) : (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "32px",
        }}>
          {players.map(p => (
            <Link key={p.username} href={`/jugador/${p.username}`} style={{ textDecoration: "none" }}>
              <PlayerCard3D
                username={p.username}
                firstName={p.first_name ?? ""}
                lastName={p.last_name ?? ""}
                category={p.category ?? "SIN CATEGORÍA"}
                position={(p.position as "Drive" | "Revés") ?? "Drive"}
                year={p.year ?? "2025-26"}
                photoUrl={p.photo_url || undefined}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
