"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserRoundPlus, X } from "lucide-react";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
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
  last_seen?: string;
}

function isOnline(last_seen?: string) {
  if (!last_seen) return false;
  return Date.now() - new Date(last_seen).getTime() < 10 * 60 * 1000;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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
  const router = useRouter();
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm,    setConfirm]    = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [busy,       setBusy]       = useState<string | null>(null);

  /* Verify admin + load + polling */
  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/dashboard"); return; }
      const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
      if (prof?.role !== "admin") { router.replace("/dashboard"); return; }
      await fetchUsers();
    })();

    /* Polling cada 20s — refresca last_seen de todos los usuarios */
    const poll = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("players")
        .select("user_id, last_seen, blocked");
      if (data) {
        setUsers(prev => prev.map(u => {
          const p = data.find((d: any) => d.user_id === u.id);
          return p ? { ...u, last_seen: p.last_seen, blocked: p.blocked } : u;
        }));
      }
    }, 20_000);

    return () => clearInterval(poll);
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }

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

  const cellStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontFamily: MONO, fontSize: "11px", color: INK0,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    whiteSpace: "nowrap",
  };
  const headStyle: React.CSSProperties = {
    ...cellStyle,
    color: INK2, fontSize: "9px", letterSpacing: "0.15em",
    textTransform: "uppercase", background: "rgba(255,255,255,0.02)",
    fontWeight: 600,
  };

  return (
    <div className="adm-wrap" style={{ minHeight: "100vh" }}>
      <style>{`
        .adm-wrap { padding: 24px; }
        @media (min-width: 768px) { .adm-wrap { padding: 48px; } }
        .adm-table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.07); }
        table { border-collapse: collapse; width: 100%; min-width: 860px; }
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

        <button
          onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 22px", borderRadius: "10px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, border: "none", cursor: "pointer", fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: BG0, letterSpacing: "0.08em" }}
        >
          <UserRoundPlus size={15} />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>Cargando usuarios…</p>
      ) : (
        <div className="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={headStyle}>Registro</th>
                <th style={headStyle}>Avatar</th>
                <th style={headStyle}>Usuario</th>
                <th style={headStyle}>Nombre</th>
                <th style={headStyle}>Apellido</th>
                <th style={headStyle}>Correo</th>
                <th style={headStyle}>Estado</th>
                <th style={headStyle}>Bloquear</th>
                <th style={headStyle}>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const online = isOnline(u.last_seen);
                const isBusy = busy === u.id;
                return (
                  <tr key={u.id} style={{ background: u.blocked ? "rgba(209,53,53,0.04)" : "transparent", transition: "background 0.2s" }}
                    onMouseEnter={e => { if (!u.blocked) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = u.blocked ? "rgba(209,53,53,0.04)" : "transparent"; }}
                  >
                    <td style={{ ...cellStyle, color: INK2, fontSize: "10px" }}>{formatDate(u.created_at)}</td>
                    <td style={cellStyle}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: `${COURT}22`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontSize: "12px", fontWeight: 700, color: COURT }}>
                        {u.photo_url
                          ? <Image src={u.photo_url} alt="" fill style={{ objectFit: "cover" }} unoptimized />
                          : `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() || "?"}
                      </div>
                    </td>
                    <td style={{ ...cellStyle, color: COURT }}>
                      {u.username ? <a href={`/${u.username}`} style={{ color: COURT, textDecoration: "none" }}>@{u.username}</a> : <span style={{ color: INK2 }}>—</span>}
                    </td>
                    <td style={cellStyle}>{u.first_name ?? <span style={{ color: INK2 }}>—</span>}</td>
                    <td style={cellStyle}>{u.last_name  ?? <span style={{ color: INK2 }}>—</span>}</td>
                    <td style={{ ...cellStyle, color: INK2, fontSize: "10px" }}>{u.email}</td>
                    <td style={cellStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: MONO, fontSize: "10px", color: online ? "#22c55e" : INK2 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? "#22c55e" : "#374151", display: "inline-block", boxShadow: online ? "0 0 6px #22c55e88" : "none" }} />
                        {online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => handleBlock(u)}
                        disabled={isBusy}
                        style={{ padding: "5px 12px", borderRadius: "6px", border: `1px solid ${u.blocked ? `${COURT}55` : "rgba(209,53,53,0.4)"}`, background: u.blocked ? `${COURT}15` : "rgba(209,53,53,0.08)", color: u.blocked ? COURT : "#d95555", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.5 : 1 }}
                      >
                        {isBusy ? "…" : u.blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={isBusy}
                        style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(209,53,53,0.4)", background: "rgba(209,53,53,0.08)", color: "#d95555", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.5 : 1 }}
                      >
                        {isBusy ? "…" : "Eliminar"}
                      </button>
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
