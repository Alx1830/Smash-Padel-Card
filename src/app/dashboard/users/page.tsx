"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserRoundPlus, X, ListFilter, ArrowUp, ArrowDown, Download } from "lucide-react";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";

function useOnlineUsers() {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("admin-users-presence");
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state).flat().map((p) => p.user_id)
        );
        setOnlineIds(ids);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return onlineIds;
}
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  blocked?: boolean;
  last_seen?: string | null;
  last_sign_in_at?: string | null;
  last_active?: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/** Fecha + hora, en una sola línea compacta */
function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months === 1 ? "" : "es"}`;
}

/* ── Definición de columnas ── */
type SortKey = "created_at" | "last_active" | "username" | "first_name" | "last_name" | "email" | "estado" | "acceso";

interface Column {
  /** null en columnas sin dato (avatar, acciones) */
  key: SortKey | null;
  label: string;
  width?: number;
  /** Si tiene opciones, el filtro es un selector en vez de texto libre */
  options?: string[];
}

const COLUMNS: Column[] = [
  { key: "created_at",  label: "Registro",        width: 120 },
  { key: "last_active", label: "Última conexión", width: 165 },
  { key: null,          label: "Avatar",          width: 70  },
  { key: "username",    label: "Usuario",         width: 150 },
  { key: "first_name",  label: "Nombre",          width: 130 },
  { key: "last_name",   label: "Apellido",        width: 130 },
  { key: "email",       label: "Correo",          width: 220 },
  { key: "estado",      label: "Estado",          width: 110, options: ["Online", "Offline"] },
  { key: "acceso",      label: "Acceso",          width: 110, options: ["Activo", "Bloqueado"] },
  { key: null,          label: "Acciones",        width: 190 },
];

/* ── Popover de filtro por columna ── */
function ColumnFilter({ column, value, onChange, onClose }: {
  column: Column; value: string;
  onChange: (v: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [onClose]);

  return (
    <div ref={ref} onClick={e => e.stopPropagation()} style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
      width: 190, background: "#0d1520",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
      boxShadow: "0 12px 40px rgba(0,0,0,0.7)", padding: 10,
    }}>
      {column.options ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {["", ...column.options].map(opt => (
            <button key={opt || "todos"} onClick={() => { onChange(opt); onClose(); }} style={{
              textAlign: "left", padding: "7px 9px", borderRadius: 6, cursor: "pointer",
              background: value === opt ? `${COURT}18` : "transparent",
              border: `1px solid ${value === opt ? `${COURT}44` : "transparent"}`,
              color: value === opt ? COURT : INK0,
              fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em",
            }}>
              {opt || "Todos"}
            </button>
          ))}
        </div>
      ) : (
        <>
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") onClose(); }}
            placeholder={`Filtrar ${column.label.toLowerCase()}…`}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
              padding: "7px 9px", color: INK0, fontFamily: MONO, fontSize: 10, outline: "none",
            }}
          />
          {value && (
            <button onClick={() => { onChange(""); onClose(); }} style={{
              marginTop: 7, width: "100%", padding: "6px", borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: INK2, fontFamily: MONO, fontSize: 9,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              Limpiar
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ── Modal crear usuario ── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: AdminUser) => void }) {
  const [form, setForm] = useState({ email: "", password: "", username: "", first_name: "", last_name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleCreate() {
    if (!form.email || !form.password) { setError("Email y contraseña son obligatorios"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al crear usuario"); setSaving(false); return; }
    onCreated({ ...form, id: data.user.id, email: data.user.email, created_at: data.user.created_at });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(5,7,13,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(480px, 95vw)", background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UserRoundPlus size={18} color={COURT} />
            <span style={{ fontFamily: DISP, fontSize: "18px", color: INK0 }}>Nuevo usuario</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: INK2, cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { key: "email",      label: "Email *",       type: "email",    ph: "correo@ejemplo.com" },
            { key: "password",   label: "Contraseña *",  type: "password", ph: "Mínimo 6 caracteres" },
            { key: "username",   label: "Usuario",       type: "text",     ph: "@usuario" },
            { key: "first_name", label: "Nombre",        type: "text",     ph: "Juan" },
            { key: "last_name",  label: "Apellido",      type: "text",     ph: "Pérez" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "6px" }}>{f.label}</label>
              <input
                type={f.type}
                style={inputStyle}
                value={(form as any)[f.key]}
                onChange={e => {
                  const v = (f.key === "first_name" || f.key === "last_name")
                    ? e.target.value.replace(/[^a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ]/g, "")
                    : e.target.value;
                  set(f.key, v);
                }}
                placeholder={f.ph}
              />
            </div>
          ))}

          {error && <p style={{ fontFamily: MONO, fontSize: "11px", color: "#d95555", margin: 0 }}>{error}</p>}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ marginTop: "8px", padding: "12px", borderRadius: "10px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, border: "none", cursor: saving ? "default" : "pointer", fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: BG0, letterSpacing: "0.08em", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Creando…" : "Crear usuario →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm dialog ── */
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 310, background: "rgba(5,7,13,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(380px, 92vw)", background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px 24px" }}>
        <p style={{ fontFamily: MONO, fontSize: "13px", color: INK0, margin: "0 0 24px", lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: INK2, fontFamily: MONO, fontSize: "11px", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#d95555", border: "none", color: "#fff", fontFamily: MONO, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminUsersPage() {
  const router    = useRouter();
  const onlineIds = useOnlineUsers();
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm,    setConfirm]    = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [busy,       setBusy]       = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }, []);

  /* Verify admin + load */
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/dashboard"); return; }
      const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
      if (prof?.role !== "admin") { router.replace("/dashboard"); return; }
      await fetchUsers();
    })();
  }, [router, fetchUsers]);

  async function handleBlock(user: AdminUser) {
    const newBlocked = !user.blocked;
    setBusy(user.id);
    await fetch("/api/admin/block-user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, blocked: newBlocked }),
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, blocked: newBlocked } : u));
    setBusy(null);
  }

  function handleDelete(user: AdminUser) {
    setConfirm({
      message: `¿Eliminar definitivamente la cuenta de ${user.username ?? user.email}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirm(null);
        setBusy(user.id);
        await fetch("/api/admin/delete-user", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setBusy(null);
      },
    });
  }

  /* ── Orden, filtros y búsqueda ─────────────────────────────── */
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const setFilter = (key: string, value: string) =>
    setFilters(prev => {
      const next = { ...prev };
      if (value) next[key] = value; else delete next[key];
      return next;
    });

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { key, dir: key === "created_at" || key === "last_active" ? "desc" : "asc" });

  /** Valor en texto de cada columna — sirve para filtrar, ordenar y exportar */
  const valueOf = (u: AdminUser, key: string, online: boolean): string => {
    switch (key) {
      case "created_at":  return u.created_at ?? "";
      case "last_active": return u.last_active ?? "";
      case "username":    return u.username ?? "";
      case "first_name":  return u.first_name ?? "";
      case "last_name":   return u.last_name ?? "";
      case "email":       return u.email ?? "";
      case "estado":      return online ? "Online" : "Offline";
      case "acceso":      return u.blocked ? "Bloqueado" : "Activo";
      default:            return "";
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = users.filter(u => {
      const online = onlineIds.has(u.id);

      if (q) {
        const hay = [u.username, u.first_name, u.last_name, u.email]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      for (const [key, val] of Object.entries(filters)) {
        const cell = valueOf(u, key, online).toLowerCase();
        if (key === "estado" || key === "acceso") {
          if (cell !== val.toLowerCase()) return false;
        } else if (!cell.includes(val.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a, sort.key, onlineIds.has(a.id));
      const bv = valueOf(b, sort.key, onlineIds.has(b.id));

      // Las columnas de fecha ordenan cronológicamente; los vacíos al final
      if (sort.key === "created_at" || sort.key === "last_active") {
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
      }
      return av.localeCompare(bv, "es", { sensitivity: "base" }) * dir;
    });
  }, [users, onlineIds, filters, search, sort]);

  const activeFilters = Object.keys(filters).length + (search.trim() ? 1 : 0);

  function exportCsv() {
    const header = COLUMNS.filter(c => c.key).map(c => c.label);
    const body = rows.map(u => COLUMNS.filter(c => c.key).map(c => {
      const raw = valueOf(u, c.key!, onlineIds.has(u.id));
      if (c.key === "created_at" || c.key === "last_active") return formatDateTime(raw) ?? "";
      return raw;
    }));
    const csv = [header, ...body]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `facebinder-usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="adm-wrap" style={{ minHeight: "100vh" }}>
      <style>{`
        .adm-wrap { padding: 24px; }
        @media (min-width: 768px) { .adm-wrap { padding: 48px; } }

        /* Rejilla tipo hoja de cálculo */
        .adm-sheet {
          overflow: auto; max-height: calc(100vh - 260px);
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: #070b14;
        }
        .adm-sheet table {
          border-collapse: separate; border-spacing: 0;
          width: 100%; min-width: 1380px;
        }
        .adm-sheet th, .adm-sheet td {
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 12px; height: 40px;
          font-family: ${MONO}; font-size: 11px; color: ${INK0};
          white-space: nowrap; text-align: left;
        }
        .adm-sheet th:last-child, .adm-sheet td:last-child { border-right: none; }

        /* Encabezado congelado */
        .adm-sheet thead th {
          position: sticky; top: 0; z-index: 20;
          background: #101827;
          color: ${INK2}; font-size: 9px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          border-bottom: 1px solid rgba(255,255,255,0.14);
        }

        /* Primera columna congelada al hacer scroll horizontal */
        .adm-sheet th.adm-sticky, .adm-sheet td.adm-sticky {
          position: sticky; left: 0; z-index: 10;
          background: #070b14;
          border-right: 1px solid rgba(255,255,255,0.14);
        }
        .adm-sheet thead th.adm-sticky { z-index: 30; background: #101827; }
        .adm-sheet tbody tr:hover td { background: rgba(46,230,193,0.05); }
        .adm-sheet tbody tr:hover td.adm-sticky { background: #0c1220; }
        .adm-sheet tbody tr.adm-blocked td { background: rgba(209,53,53,0.06); }
        .adm-sheet tbody tr.adm-blocked td.adm-sticky { background: rgba(30,10,14,1); }

        /* Numeración de fila, como en una hoja de cálculo */
        .adm-rownum {
          color: ${INK2}; font-size: 9px; text-align: right;
          user-select: none;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
            Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", color: INK0, margin: 0 }}>
            Usuarios{" "}
            <span style={{ fontFamily: MONO, fontSize: "14px", color: INK2, fontWeight: 400 }}>
              ({loading ? "…" : users.length})
            </span>
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={exportCsv}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 18px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer", fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em" }}
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 22px", borderRadius: "10px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, border: "none", cursor: "pointer", fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: BG0, letterSpacing: "0.08em" }}
          >
            <UserRoundPlus size={15} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Barra de búsqueda + estado de filtros */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "14px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en usuario, nombre o correo…"
          style={{
            flex: "1 1 260px", maxWidth: 360, boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "9px 13px", color: INK0,
            fontFamily: MONO, fontSize: 11, outline: "none",
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 10, color: INK2 }}>
          {rows.length} de {users.length}
        </span>
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilters({}); setSearch(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 13px", borderRadius: 8, cursor: "pointer",
              background: `${COURT}12`, border: `1px solid ${COURT}44`, color: COURT,
              fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <X size={12} /> Limpiar filtros ({activeFilters})
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>Cargando usuarios…</p>
      ) : (
        <div className="adm-sheet">
          <table>
            <thead>
              <tr>
                <th className="adm-sticky" style={{ width: 44, minWidth: 44 }} />
                {COLUMNS.map(col => {
                  const sorted   = col.key && sort.key === col.key;
                  const filtered = col.key && !!filters[col.key];
                  return (
                    <th key={col.label} style={{ width: col.width, minWidth: col.width, position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, height: "100%" }}>
                        <span
                          onClick={() => col.key && toggleSort(col.key)}
                          style={{
                            cursor: col.key ? "pointer" : "default",
                            color: sorted ? COURT : undefined,
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {col.label}
                          {sorted && (sort.dir === "asc"
                            ? <ArrowUp size={10} color={COURT} />
                            : <ArrowDown size={10} color={COURT} />)}
                        </span>

                        {col.key && (
                          <button
                            onClick={() => setOpenFilter(o => o === col.key ? null : col.key!)}
                            title={`Filtrar ${col.label}`}
                            style={{
                              marginLeft: "auto", display: "flex", padding: 2,
                              background: "transparent", border: "none", cursor: "pointer",
                              color: filtered ? COURT : "rgba(122,130,152,0.7)",
                            }}
                          >
                            <ListFilter size={12} strokeWidth={filtered ? 2.4 : 1.8} />
                          </button>
                        )}
                      </div>

                      {col.key && openFilter === col.key && (
                        <ColumnFilter
                          column={col}
                          value={filters[col.key] ?? ""}
                          onChange={v => setFilter(col.key!, v)}
                          onClose={() => setOpenFilter(null)}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ color: INK2, textAlign: "center", height: 80 }}>
                    Ningún usuario coincide con los filtros.
                  </td>
                </tr>
              ) : rows.map((u, i) => {
                const online = onlineIds.has(u.id);
                const isBusy = busy === u.id;
                const lastAbs = formatDateTime(u.last_active);
                const lastRel = relativeTime(u.last_active);

                return (
                  <tr key={u.id} className={u.blocked ? "adm-blocked" : undefined}>
                    <td className="adm-sticky adm-rownum">{i + 1}</td>

                    <td style={{ color: INK2, fontSize: 10 }}>{formatDate(u.created_at)}</td>

                    <td>
                      {online ? (
                        <span style={{ color: "#22c55e", fontSize: 10 }}>En línea ahora</span>
                      ) : lastAbs ? (
                        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                          <span style={{ fontSize: 10.5 }}>{lastAbs}</span>
                          <span style={{ fontSize: 8.5, color: INK2 }}>{lastRel}</span>
                        </span>
                      ) : (
                        <span style={{ color: INK2 }}>Nunca</span>
                      )}
                    </td>

                    <td>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: `${COURT}22`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontSize: "11px", fontWeight: 700, color: COURT }}>
                        {u.photo_url
                          ? <Image src={u.photo_url} alt="" fill style={{ objectFit: "cover" }} unoptimized />
                          : `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() || "?"}
                      </div>
                    </td>

                    <td style={{ color: COURT }}>
                      {u.username
                        ? <a href={`/${u.username}`} style={{ color: COURT, textDecoration: "none" }}>@{u.username}</a>
                        : <span style={{ color: INK2 }}>—</span>}
                    </td>
                    <td>{u.first_name ?? <span style={{ color: INK2 }}>—</span>}</td>
                    <td>{u.last_name  ?? <span style={{ color: INK2 }}>—</span>}</td>
                    <td style={{ color: INK2, fontSize: 10 }}>{u.email}</td>

                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", color: online ? "#22c55e" : INK2 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? "#22c55e" : "#374151", display: "inline-block", boxShadow: online ? "0 0 6px #22c55e88" : "none" }} />
                        {online ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                        padding: "3px 8px", borderRadius: 5,
                        color: u.blocked ? "#d95555" : COURT,
                        border: `1px solid ${u.blocked ? "rgba(209,53,53,0.4)" : `${COURT}44`}`,
                      }}>
                        {u.blocked ? "Bloqueado" : "Activo"}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleBlock(u)}
                          disabled={isBusy}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${u.blocked ? `${COURT}55` : "rgba(209,53,53,0.4)"}`, background: u.blocked ? `${COURT}15` : "rgba(209,53,53,0.08)", color: u.blocked ? COURT : "#d95555", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.5 : 1 }}
                        >
                          {isBusy ? "…" : u.blocked ? "Desbloquear" : "Bloquear"}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isBusy}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(209,53,53,0.4)", background: "rgba(209,53,53,0.08)", color: "#d95555", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.5 : 1 }}
                        >
                          {isBusy ? "…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={u => setUsers(prev => [u, ...prev])}
        />
      )}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
