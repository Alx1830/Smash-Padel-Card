"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Bell, CheckCheck, UserPlus, UserCheck, ShoppingBag } from "lucide-react";
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
  anchorRect?: DOMRect | null;
  isMobile?: boolean;
}

function notifMeta(type: string): { color: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> } {
  if (type === "new_follower")        return { color: "#818cf8", Icon: UserPlus };
  if (type === "new_user_registered") return { color: "#f59e0b", Icon: UserCheck };
  return { color: COURT, Icon: ShoppingBag };
}

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
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="np-skeleton" style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="np-skeleton" style={{ height: 11, borderRadius: 6, width: "55%" }} />
        <div className="np-skeleton" style={{ height: 10, borderRadius: 6, width: "80%" }} />
      </div>
    </div>
  );
}

export function NotificationsDrawer({
  notifications, unreadCount, loading, markAllRead, markRead, onClose, anchorRect, isMobile,
}: NotificationsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  /* Compute popup position */
  const popupStyle: React.CSSProperties = (() => {
    if (isMobile) {
      return {
        position: "fixed",
        top: (anchorRect ? anchorRect.bottom + 8 : 60),
        right: 8,
        left: 8,
        zIndex: 200,
      };
    }
    if (anchorRect) {
      return {
        position: "fixed",
        top: anchorRect.bottom + 8,
        left: anchorRect.left,
        width: 380,
        zIndex: 200,
      };
    }
    return { position: "fixed", top: 64, left: 250, width: 380, zIndex: 200 };
  })();

  /* Animate in */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px) scale(0.97)";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.18s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.opacity    = "1";
        el.style.transform  = "translateY(0) scale(1)";
      });
    });
  }, []);

  /* Click outside to close */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleNotifClick(id: string, data: Record<string, unknown>) {
    await markRead(id);
    const url = data?.url as string | undefined;
    if (url) {
      onClose();
      router.push(url);
    }
  }

  return (
    <>
      <style>{`
        @keyframes np-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .np-skeleton {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: np-shimmer 1.4s infinite;
        }
        .np-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          transition: background 0.13s;
        }
        .np-item:hover { background: rgba(255,255,255,0.04); }
        .np-item:last-child { border-bottom: none; }
        .np-mark-all {
          background: transparent;
          border: none;
          color: ${COURT};
          cursor: pointer;
          font-family: ${MONO};
          font-size: 10px;
          letter-spacing: 0.06em;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.13s;
          display: flex; align-items: center; gap: 5px;
          white-space: nowrap;
        }
        .np-mark-all:hover { background: rgba(46,230,193,0.1); }
        .np-list {
          overflow-y: auto;
          max-height: 420px;
        }
        .np-list::-webkit-scrollbar { width: 3px; }
        .np-list::-webkit-scrollbar-track { background: transparent; }
        .np-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          ...popupStyle,
          background: "#0d1221",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={15} color={COURT} strokeWidth={2} />
            <span style={{ fontFamily: DISP, fontSize: "15px", fontWeight: 700, color: INK0 }}>
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <span style={{
                background: "#ef4444", color: "#fff",
                fontFamily: MONO, fontSize: "10px", fontWeight: 700,
                borderRadius: 10, padding: "1px 6px", lineHeight: 1.4,
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {unreadCount > 0 && (
              <button className="np-mark-all" onClick={markAllRead} title="Marcar todo como leído">
                <CheckCheck size={13} />
                Todo leído
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: INK2, display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 7, transition: "background 0.13s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="np-list">
          {loading ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : notifications.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 12, padding: "32px 20px", color: INK2,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(46,230,193,0.07)",
                border: "1px solid rgba(46,230,193,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell size={22} color={`${COURT}80`} strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: DISP, fontSize: "14px", color: INK0, margin: "0 0 4px", fontWeight: 600 }}>
                  Sin notificaciones
                </p>
                <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, letterSpacing: "0.05em" }}>
                  Aquí aparecerán tus notificaciones
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const { color, Icon } = notifMeta(notif.type);
              return (
              <div
                key={notif.id}
                className="np-item"
                onClick={() => handleNotifClick(notif.id, notif.data)}
                style={{ background: notif.read ? "transparent" : `${color}08` }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: notif.read ? "rgba(255,255,255,0.04)" : `${color}18`,
                  border: `1px solid ${notif.read ? "rgba(255,255,255,0.06)" : color + "40"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: notif.read ? 0.5 : 1,
                }}>
                  <Icon size={13} color={notif.read ? INK2 : color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "baseline",
                    justifyContent: "space-between", gap: 8, marginBottom: 2,
                  }}>
                    <p style={{
                      fontFamily: DISP, fontSize: "12px", fontWeight: notif.read ? 400 : 600,
                      color: notif.read ? "rgba(245,247,251,0.7)" : INK0,
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {notif.title}
                    </p>
                    <span style={{
                      fontFamily: MONO, fontSize: "9px", color: INK2,
                      letterSpacing: "0.05em", flexShrink: 0,
                    }}>
                      {relativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: MONO, fontSize: "10px", color: INK2,
                    margin: 0, letterSpacing: "0.03em", lineHeight: 1.5,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {notif.body}
                  </p>
                </div>
              </div>
            );})
          )}
        </div>
      </div>
    </>
  );
}
