"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Check, X, Clock, ExternalLink, MapPin } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const RED   = "#ff6b6b";
const INK0  = "#f5f7fb";
const INK1  = "#b6bdcc";
const INK2  = "#7a8298";

type Status = "pending" | "approved" | "rejected";

interface StoreRow {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  pais: string | null;
  ciudad: string | null;
  store_status: Status | null;
  created_at: string | null;
}

const TABS: { value: Status; label: string; color: string }[] = [
  { value: "pending",  label: "Pendientes", color: LIME  },
  { value: "approved", label: "Aprobadas",  color: COURT },
  { value: "rejected", label: "Rechazadas", color: RED   },
];

export default function AdminTiendasPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [tab, setTab]           = useState<Status>("pending");
  // null = todavía cargando; así no hace falta un estado de loading aparte
  const [stores, setStores]     = useState<StoreRow[] | null>(null);
  const [acting, setActing]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("players").select("role").eq("user_id", user.id).single();
      if (data?.role !== "admin") { router.replace("/dashboard"); return; }
      setChecking(false);
    })();
  }, [router, supabase]);

  useEffect(() => {
    if (checking) return;
    let cancelled = false;
    (async () => {
      const res  = await fetch(`/api/admin/store-status?status=${tab}`);
      const json = await res.json().catch(() => ({ stores: [] }));
      if (!cancelled) setStores(json.stores ?? []);
    })();
    return () => { cancelled = true; };
  }, [checking, tab]);

  async function moderate(row: StoreRow, status: Status) {
    if (acting) return;
    setActing(row.user_id);
    const res = await fetch("/api/admin/store-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.user_id, status }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Error desconocido" }));
      alert(`No se pudo actualizar: ${error}`);
    } else {
      // Sale de la pestaña actual porque cambió de estado
      setStores(prev => (prev ?? []).filter(s => s.user_id !== row.user_id));
    }
    setActing(null);
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.12em" }}>
          Verificando acceso…
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(14px, 2.2vw, 24px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <Store size={20} strokeWidth={1.8} style={{ color: COURT }} />
        <h1 style={{ fontFamily: DISP, fontSize: 24, color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
          Tiendas Pokémon
        </h1>
      </div>
      <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "0 0 20px", lineHeight: 1.6 }}>
        Una tienda pendiente no es visible para los visitantes: solo la ve su dueño y los admins.
      </p>

      {/* Pestañas por estado */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = tab === t.value;
          return (
            <button key={t.value} onClick={() => { setTab(t.value); setStores(null); }} style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              color: active ? "#05070d" : t.color,
              background: active ? t.color : `${t.color}12`,
              border: `1px solid ${active ? t.color : `${t.color}44`}`,
              fontWeight: 700,
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {stores === null ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>Cargando…</p>
      ) : stores.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>
          {tab === "pending" ? "No hay tiendas por revisar." : `No hay tiendas ${TABS.find(t => t.value === tab)?.label.toLowerCase()}.`}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {stores.map(row => {
            const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.username || "Tienda";
            const busy = acting === row.user_id;
            const place = [row.ciudad, row.pais].filter(v => v && v !== "—").join(" · ");

            return (
              <div key={row.user_id} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: 16,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  {row.photo_url
                    ? <Image src={row.photo_url} alt="" width={44} height={44} unoptimized
                        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${COURT}22`, border: `1px solid ${COURT}44`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: COURT }}>
                        <Store size={18} strokeWidth={1.7} />
                      </div>}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontFamily: DISP, fontSize: 15, color: INK0, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: "2px 0 0" }}>
                      @{row.username ?? "—"}
                    </p>
                  </div>
                </div>

                {place && (
                  <p style={{ fontFamily: MONO, fontSize: 10, color: INK1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={11} strokeWidth={1.9} style={{ color: COURT, flexShrink: 0 }} />
                    {place}
                  </p>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                  {row.username && (
                    <a href={`/${row.username}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...btn("transparent", INK2, "rgba(255,255,255,0.15)"), textDecoration: "none" }}>
                      <ExternalLink size={13} strokeWidth={2} /> Ver
                    </a>
                  )}
                  {row.store_status !== "approved" && (
                    <button onClick={() => moderate(row, "approved")} disabled={busy} style={btn(COURT, "#05070d")}>
                      <Check size={13} strokeWidth={2.2} /> {busy ? "…" : "Aprobar"}
                    </button>
                  )}
                  {row.store_status !== "rejected" && (
                    <button onClick={() => moderate(row, "rejected")} disabled={busy} style={btn("transparent", RED, RED)}>
                      <X size={13} strokeWidth={2.2} /> Rechazar
                    </button>
                  )}
                  {row.store_status !== "pending" && (
                    <button onClick={() => moderate(row, "pending")} disabled={busy} style={btn("transparent", LIME, LIME)}>
                      <Clock size={13} strokeWidth={2} /> A pendiente
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
    borderRadius: 8, cursor: "pointer", background: bg, color,
    border: `1px solid ${border ?? bg}`,
    fontFamily: MONO, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.07em", textTransform: "uppercase",
  };
}
