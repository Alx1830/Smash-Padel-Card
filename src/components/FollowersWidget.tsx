"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Follower {
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

export function FollowersWidget({ userId }: { userId: string }) {
  const supabase = createClient();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: followRows, count } = await supabase
        .from("follows")
        .select("follower_id", { count: "exact" })
        .eq("following_id", userId)
        .order("created_at", { ascending: false });

      setTotal(count ?? 0);

      if (followRows && followRows.length > 0) {
        const ids = followRows.map(r => r.follower_id);
        const { data: players } = await supabase
          .from("players")
          .select("username, first_name, last_name, photo_url")
          .in("user_id", ids);
        setFollowers(players ?? []);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.02)",
      minWidth: "280px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 16px" }}>
        <p style={{
          fontFamily: MONO, fontSize: "10px", color: INK2,
          letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px",
        }}>
          Últimos seguidores
        </p>
        <p style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: 0 }}>
          {loading ? "…" : total}{" "}
          <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, fontWeight: 400 }}>
            {total === 1 ? "seguidor" : "seguidores"}
          </span>
        </p>
      </div>

      {/* Lista con scroll */}
      <div style={{ maxHeight: "280px", overflowY: "auto", padding: "0 12px 16px" }}>
        {loading ? (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, padding: "8px 16px" }}>Cargando…</p>
        ) : followers.length === 0 ? (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, padding: "8px 16px" }}>
            Aún no tienes seguidores
          </p>
        ) : (
          followers.map(f => (
            <a
              key={f.username}
              href={`/${f.username}`}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", borderRadius: "10px", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
            >
              {/* Avatar */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: `${COURT}22`, overflow: "hidden", position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: DISP, fontSize: "14px", fontWeight: 700, color: COURT,
              }}>
                {f.photo_url ? (
                  <Image src={f.photo_url} alt={`${f.first_name} ${f.last_name}`} fill className="object-cover" unoptimized />
                ) : (
                  `${f.first_name?.[0] ?? ""}${f.last_name?.[0] ?? ""}`
                )}
              </div>
              {/* Nombre */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: "12px", color: INK0, fontWeight: 500 }}>
                  {f.first_name} {f.last_name}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, marginTop: "2px" }}>
                  @{f.username}
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
