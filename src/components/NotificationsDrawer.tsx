"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Bell } from "lucide-react";
import type { AppNotification } from "@/types/notifications";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface NotificationsDrawerProps {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  onClose: () => void;
}

/** Devuelve timestamp relativo en español */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

function SkeletonRow() {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px",
      padding: "14px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div className="notif-skeleton" style={{
        width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
      }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="notif-skeleton" style={{ height: 12, borderRadius: 6, width: "60%" }} />
        <div className="notif-skeleton" style={{ height: 10, borderRadius: 6, width: "85%" }} />
      </div>
    </div>
  );
}

export function NotificationsDrawer({ notifications, unreadCount, loading, markAllRead, markRead, onClose }: NotificationsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Animate in */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transform = "translateY(100%)";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform  = "translateY(0%)";
      });
    });
  }, []);

  function handleClose() {
    const el = panelRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform 0.28s cubic-bezier(0.4, 0, 1, 1)";
    el.style.transform  = "translateY(100%)";
    setTimeout(onClose, 280);
  }

  async function handleNotifClick(id: string, data: Record<string, unknown>) {
    await markRead(id);
    const url = data?.url as string | undefined;
    if (url) {
      handleClose();
      setTimeout(() => router.push(url), 300);
    }
  }

  return (
    <>
      <style>{`
        .notif-drawer-backdrop {
          animation: notif-fadeIn 0.22s ease forwards;
        }
        @keyframes notif-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .notif-drawer-close {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: ${INK2};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .notif-drawer-close:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,255,255,0.2);
          color: ${INK0};
        }
        .notif-pill {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.18);
          margin: 0 auto;
          flex-shrink: 0;
        }
        .notif-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          transition: background 0.15s;
        }
        .notif-item:hover {
          background: rgba(255,255,255,0.03);
        }
        .notif-item:last-child {
          border-bottom: none;
        }
        .notif-mark-all {
          background: transparent;
          border: 1px solid rgba(46,230,193,0.3);
          border-radius: 8px;
          color: ${COURT};
          cursor: pointer;
          font-family: ${MONO};
          font-size: 10px;
          letter-spacing: 0.08em;
          padding: 6px 12px;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .notif-mark-all:hover {
          background: rgba(46,230,193,0.08);
          border-color: rgba(46,230,193,0.5);
        }
        @keyframes notif-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .notif-skeleton {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: notif-shimmer 1.4s infinite;
        }
        .notif-list {
          overflow-y: auto;
          flex: 1;
        }
        .notif-list::-webkit-scrollbar { width: 4px; }
        .notif-list::-webkit-scrollbar-track { background: transparent; }
        .notif-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div
        className="notif-drawer-backdrop"
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          zIndex: 101,
          height: "92dvh",
          background: "#080f18",
          borderRadius: "20px 20px 0 0",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 60px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Pill */}
        <div style={{ padding: "12px 20px 0" }}>
          <div className="notif-pill" />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <p style={{
              fontFamily: MONO, fontSize: "9px", color: INK2,
              textTransform: "uppercase", letterSpacing: "0.18em",
              margin: 0,
            }}>
              Centro de
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} color={COURT} strokeWidth={1.8} />
              <h2 style={{
                fontFamily: DISP, fontSize: "18px", fontWeight: 700,
                color: INK0, margin: 0, letterSpacing: "0.01em",
              }}>
                Notificaciones
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Marcar todo leído
              </button>
            )}
            <button className="notif-drawer-close" onClick={handleClose}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="notif-list">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : notifications.length === 0 ? (
            /* Estado vacío */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 16, padding: "60px 20px",
              color: INK2,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(46,230,193,0.07)",
                border: "1px solid rgba(46,230,193,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell size={28} color={`${COURT}80`} strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: DISP, fontSize: "15px", color: INK0, margin: "0 0 6px", fontWeight: 600 }}>
                  Sin notificaciones
                </p>
                <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, margin: 0, letterSpacing: "0.05em" }}>
                  Aquí aparecerán tus alertas de wishlist y más
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="notif-item"
                onClick={() => handleNotifClick(notif.id, notif.data)}
                style={{
                  background: notif.read ? "transparent" : "rgba(46,230,193,0.04)",
                }}
              >
                {/* Indicador leída/no leída */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: notif.read ? INK2 : COURT,
                  opacity: notif.read ? 0.4 : 1,
                  boxShadow: notif.read ? "none" : `0 0 6px ${COURT}80`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "baseline",
                    justifyContent: "space-between", gap: 8, marginBottom: 4,
                  }}>
                    <p style={{
                      fontFamily: DISP, fontSize: "13px", fontWeight: notif.read ? 400 : 600,
                      color: notif.read ? "rgba(245,247,251,0.75)" : INK0,
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {notif.title}
                    </p>
                    <span style={{
                      fontFamily: MONO, fontSize: "9px", color: INK2,
                      letterSpacing: "0.06em", flexShrink: 0,
                    }}>
                      {relativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: MONO, fontSize: "11px", color: INK2,
                    margin: 0, letterSpacing: "0.04em", lineHeight: 1.5,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {notif.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
