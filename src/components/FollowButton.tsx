"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
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

interface FollowButtonProps {
  profileUserId: string;   // user_id del jugador que se visita
  currentUserId: string | null; // user_id del visitante (null = no autenticado)
}

export function FollowButton({ profileUserId, currentUserId }: FollowButtonProps) {
  const supabase = createClient();
  const [isFollowing, setIsFollowing]   = useState(false);
  const [count, setCount]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [toggling, setToggling]         = useState(false);
  const [showPopup, setShowPopup]       = useState(false);
  const [followers, setFollowers]       = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  /* ── Carga inicial: count + si el usuario actual sigue ── */
  useEffect(() => {
    async function load() {
      const [{ count: cnt }, { data: myFollow }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileUserId),
        currentUserId
          ? supabase
              .from("follows")
              .select("id")
              .eq("following_id", profileUserId)
              .eq("follower_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setCount(cnt ?? 0);
      setIsFollowing(!!myFollow);
      setLoading(false);
    }
    load();
  }, [profileUserId, currentUserId]);

  /* ── Cerrar popup al hacer clic fuera ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    if (showPopup) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPopup]);

  /* ── Toggle seguir / dejar de seguir ── */
  async function handleToggle() {
    if (!currentUserId || toggling) return;
    setToggling(true);
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("following_id", profileUserId)
        .eq("follower_id", currentUserId);
      setIsFollowing(false);
      setCount(c => Math.max(0, c - 1));
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profileUserId });
      setIsFollowing(true);
      setCount(c => c + 1);
    }
    setToggling(false);
  }

  /* ── Abrir popup con lista de seguidores ── */
  async function handleCountClick() {
    if (count === 0) return;
    setShowPopup(v => !v);
    if (!showPopup && followers.length === 0) {
      setLoadingFollowers(true);
      // Obtenemos los follower_id y luego buscamos sus perfiles en players
      const { data: followRows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profileUserId);

      if (followRows && followRows.length > 0) {
        const ids = followRows.map(r => r.follower_id);
        const { data: players } = await supabase
          .from("players")
          .select("username, first_name, last_name, photo_url")
          .in("user_id", ids);
        setFollowers(players ?? []);
      }
      setLoadingFollowers(false);
    }
  }

  if (loading) return null;

  const isOwn = currentUserId === profileUserId;

  return (
    <>
      <style>{`
        .follow-btn {
          display: inline-flex;
          align-items: center;
          gap: 0;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.2s;
          font-family: ${MONO};
        }
        .follow-btn:hover { border-color: rgba(255,255,255,0.28); }

        .follow-main {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: ${INK0};
          font-family: ${MONO};
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .follow-main.active {
          color: ${COURT};
        }
        .follow-main:disabled { opacity: 0.5; cursor: not-allowed; }

        .follow-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border: none;
          border-left: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: ${INK2};
          font-family: ${MONO};
          font-size: 11px;
          font-weight: 500;
          cursor: ${count > 0 ? "pointer" : "default"};
          transition: color 0.2s, background 0.2s;
        }
        .follow-count:hover { color: ${count > 0 ? INK0 : INK2}; background: rgba(255,255,255,0.04); }

        /* Popup */
        .follow-popup {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          z-index: 9999;
          background: #0f1420;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px;
          min-width: 260px;
          max-height: 360px;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .follow-popup-title {
          font-family: ${MONO};
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${INK2};
          margin-bottom: 12px;
        }
        .follower-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .follower-row:last-child { border-bottom: none; }
        .follower-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(46,230,193,0.15);
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ${DISP};
          font-size: 14px;
          font-weight: 700;
          color: ${COURT};
          position: relative;
        }
        .follower-name {
          font-family: ${MONO};
          font-size: 12px;
          color: ${INK0};
          font-weight: 500;
        }
        .follower-username {
          font-family: ${MONO};
          font-size: 10px;
          color: ${INK2};
          margin-top: 2px;
        }
      `}</style>

      <div style={{ position: "relative", display: "inline-flex" }} ref={popupRef}>
        <div className="follow-btn">
          {/* Botón principal: "Seguidores" si es propio, "Seguir/Siguiendo" si es ajeno */}
          {isOwn ? (
            <span className="follow-main" style={{ cursor: "default", pointerEvents: "none" }}>
              Seguidores
            </span>
          ) : (
            <button
              className={`follow-main${isFollowing ? " active" : ""}`}
              onClick={handleToggle}
              disabled={toggling || !currentUserId}
              title={!currentUserId ? "Inicia sesión para seguir" : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          )}

          {/* Contador de seguidores — siempre visible */}
          <button
            className="follow-count"
            onClick={handleCountClick}
            style={{ borderLeft: isOwn ? "none" : undefined }}
            title={count > 0 ? "Ver seguidores" : undefined}
          >
            {count}
          </button>
        </div>

        {/* Popup lista de seguidores */}
        {showPopup && (
          <div className="follow-popup">
            <div className="follow-popup-title">Seguidores · {count}</div>
            {loadingFollowers ? (
              <div style={{ color: INK2, fontFamily: MONO, fontSize: "11px", padding: "12px 0" }}>
                Cargando…
              </div>
            ) : followers.length === 0 ? (
              <div style={{ color: INK2, fontFamily: MONO, fontSize: "11px", padding: "12px 0" }}>
                Sin seguidores aún
              </div>
            ) : (
              followers.map(f => (
                <a
                  key={f.username}
                  href={`/jugador/${f.username}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div className="follower-row">
                    <div className="follower-avatar">
                      {f.photo_url ? (
                        <Image
                          src={f.photo_url}
                          alt={`${f.first_name} ${f.last_name}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        `${f.first_name?.[0] ?? ""}${f.last_name?.[0] ?? ""}`
                      )}
                    </div>
                    <div>
                      <div className="follower-name">{f.first_name} {f.last_name}</div>
                      <div className="follower-username">@{f.username}</div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
