"use client";

import { useState, useEffect, useCallback } from "react";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

interface UsePushPermissionReturn {
  permissionState: PushPermissionState;
  requestPermission: () => Promise<void>;
}

/** Convierte VAPID public key de base64url a Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const DISMISS_KEY = "push_permission_dismissed";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

export function usePushPermission(): UsePushPermissionReturn {
  const [permissionState, setPermissionState] = useState<PushPermissionState>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
      return;
    }
    setPermissionState(Notification.permission as PushPermissionState);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result as PushPermissionState);

      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
      }

      if (result === "denied") {
        // Guardar que fue denegado (no pedir de nuevo)
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      }
    } catch (err) {
      console.error("[Push] Error al solicitar permiso:", err);
    }
  }, []);

  return { permissionState, requestPermission };
}

/** Helper exportado para que PushPermissionBanner pueda chequear el dismiss */
export function isPushDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  return Date.now() - ts < DISMISS_TTL;
}

/** Helper exportado para guardar el dismiss manualmente */
export function savePushDismiss(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
}
