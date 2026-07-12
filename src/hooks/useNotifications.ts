"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types/notifications";

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  loading: boolean;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch notifications from DB
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data as AppNotification[]);
  }, [userId, supabase]);

  // Setup Realtime channel
  const setupChannel = useCallback(() => {
    if (!userId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Sufijo único real: Date.now() colisionaba si se creaban dos canales en el
    // mismo milisegundo (StrictMode / doble visibilitychange) y supabase-js
    // devolvía el canal ya suscrito → "cannot add callbacks after subscribe()"
    const channel = supabase
      .channel(`notifications:${userId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();
    channelRef.current = channel;
  }, [userId, supabase]);

  // Initial setup
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    async function init() {
      await supabase.auth.getSession();
      await fetchNotifications();
      setLoading(false);
      setupChannel();
    }

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, supabase, fetchNotifications, setupChannel]);

  // Reconectar cuando el usuario vuelve a la app (iOS suspende WebSockets)
  useEffect(() => {
    if (!userId) return;

    async function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        await fetchNotifications();
        setupChannel();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userId, fetchNotifications, setupChannel]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [userId, supabase]);

  const markRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [supabase]);

  return { notifications, unreadCount, markAllRead, markRead, loading };
}
