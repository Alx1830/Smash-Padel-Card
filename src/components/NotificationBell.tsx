"use client";

import { Bell } from "lucide-react";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";

interface NotificationBellProps {
  userId: string;
  onOpen: () => void;
  unreadCount: number;
}

export function NotificationBell({ onOpen, unreadCount }: NotificationBellProps) {
  const badgeCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <style>{`
        @keyframes bell-pulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .notif-bell-btn {
          position: relative;
          width: 36px; height: 36px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .notif-bell-btn:hover {
          background: rgba(255,255,255,0.08);
        }
        .notif-bell-badge {
          position: absolute;
          top: -2px; right: -2px;
          min-width: 18px; height: 18px;
          border-radius: 9px;
          background: #ef4444;
          border: 2px solid #0a0e1a;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          animation: bell-pulse 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
      `}</style>
      <button
        className="notif-bell-btn"
        onClick={onOpen}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <Bell size={20} color={unreadCount > 0 ? COURT : "rgba(245,247,251,0.6)"} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge" key={unreadCount}>
            <span style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "9px",
              fontWeight: 700,
              color: INK0,
              letterSpacing: "0",
              lineHeight: 1,
            }}>
              {badgeCount}
            </span>
          </span>
        )}
      </button>
    </>
  );
}
