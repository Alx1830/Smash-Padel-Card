"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Check, MessageSquareMore, Ellipsis, Pencil, Link2, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COURT, INK0, INK1, INK2, MONO, BG0 } from "./tokens";

const iconBtn: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center",
  // Fondo oscuro casi opaco: sobre una portada con imagen el botón transparente desaparecía
  background: "rgba(8,17,24,0.82)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0,
};

/** Seguir, mensaje y "más". El dueño ve "Editar perfil" en lugar de Seguir. */
export function PerfilAcciones({ profileUserId, visitanteId, username }: {
  profileUserId: string; visitanteId: string | null; username: string;
}) {
  const esDueno = visitanteId === profileUserId;

  return (
    <div className="pf-acciones" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {esDueno ? (
        <Link href="/dashboard/perfil" className="pf-btn-principal">
          <Pencil size={13} strokeWidth={2.2} /> EDITAR PERFIL
        </Link>
      ) : (
        <SeguirBoton profileUserId={profileUserId} visitanteId={visitanteId} />
      )}
      {!esDueno && (
        <button type="button" className="pf-icon-btn" style={{ ...iconBtn, cursor: "default", opacity: 0.55 }} title="Chat interno: muy pronto" aria-label="Mensaje (muy pronto)">
          <MessageSquareMore size={16} color={INK1} />
        </button>
      )}
      <MasMenu username={username} />
      <style>{`
        .pf-btn-principal {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 38px; padding: 0 20px; border-radius: 9px; border: none; cursor: pointer;
          background: ${COURT}; color: ${BG0}; text-decoration: none;
          font-family: ${MONO}; font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
          box-shadow: 0 0 22px rgba(46,230,193,0.45); transition: box-shadow .2s, opacity .2s;
        }
        .pf-btn-principal:hover { box-shadow: 0 0 30px rgba(46,230,193,0.6); }
        .pf-btn-principal:disabled { opacity: .6; cursor: default; }
        /* Con el dedo, los botones crecen a 42 px: con 38 se tocaba el vecino. */
        @media (max-width: 767px), (pointer: coarse) {
          .pf-btn-principal { height: 42px; padding: 0 22px; }
          .pf-icon-btn { width: 42px !important; height: 42px !important; }
          .pf-mas-menu { top: 48px !important; }
        }
        /* En el celular los botones van centrados: el menú se abre centrado
           debajo del botón para no salirse por un costado. */
        @media (max-width: 767px) {
          .pf-mas-menu { right: auto !important; left: 50%; transform: translateX(-50%); }
        }
        .pf-btn-principal.siguiendo { background: rgba(46,230,193,0.08); color: ${COURT}; border: 1px solid rgba(46,230,193,0.5); box-shadow: none; }
      `}</style>
    </div>
  );
}

function SeguirBoton({ profileUserId, visitanteId }: { profileUserId: string; visitanteId: string | null }) {
  const [sigue, setSigue]   = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!visitanteId) return;
    createClient().from("follows").select("id")
      .eq("following_id", profileUserId).eq("follower_id", visitanteId).maybeSingle()
      .then(({ data }) => setSigue(!!data));
  }, [profileUserId, visitanteId]);

  if (!visitanteId) {
    return (
      <Link href="/login" className="pf-btn-principal">
        <Plus size={14} strokeWidth={2.4} /> SEGUIR
      </Link>
    );
  }

  async function alternar() {
    if (ocupado || sigue === null) return;
    setOcupado(true);
    const supabase = createClient();
    const { error } = sigue
      ? await supabase.from("follows").delete().eq("following_id", profileUserId).eq("follower_id", visitanteId!)
      : await supabase.from("follows").insert({ follower_id: visitanteId, following_id: profileUserId });
    if (!error) setSigue(!sigue);
    setOcupado(false);
  }

  return (
    <button type="button" onClick={alternar} disabled={ocupado || sigue === null}
      className={`pf-btn-principal${sigue ? " siguiendo" : ""}`}>
      {sigue ? <Check size={14} strokeWidth={2.4} /> : <Plus size={14} strokeWidth={2.4} />}
      {sigue ? "SIGUIENDO" : "SEGUIR"}
    </button>
  );
}

function MasMenu({ username }: { username: string }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso]     = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const url = () => `${window.location.origin}/${username}`;

  async function copiar() {
    try { await navigator.clipboard.writeText(url()); setAviso("Enlace copiado"); } catch { setAviso("No se pudo copiar"); }
    setAbierto(false);
    setTimeout(() => setAviso(null), 2000);
  }

  async function compartir() {
    setAbierto(false);
    if (navigator.share) {
      try { await navigator.share({ title: `@${username} en FaceBinder`, url: url() }); } catch { /* cancelado */ }
    } else {
      copiar();
    }
  }

  const item: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, padding: "9px 12px", borderRadius: 7,
    background: "none", border: "none", cursor: "pointer", color: INK0, fontFamily: MONO, fontSize: 11, textAlign: "left",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="pf-icon-btn" onClick={() => setAbierto(v => !v)} style={iconBtn} aria-label="Más opciones" aria-expanded={abierto}>
        <Ellipsis size={16} color={INK1} />
      </button>
      {abierto && (
        <div className="pf-mas-menu" style={{ position: "absolute", top: 44, right: 0, zIndex: 30, minWidth: 190, padding: 6, borderRadius: 10, background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
          <button type="button" style={item} onClick={copiar}><Link2 size={14} color={COURT} /> Copiar enlace</button>
          <button type="button" style={item} onClick={compartir}><Share2 size={14} color={COURT} /> Compartir perfil</button>
        </div>
      )}
      {aviso && (
        <span className="pf-mas-menu" style={{ position: "absolute", top: 44, right: 0, whiteSpace: "nowrap", fontFamily: MONO, fontSize: 10, color: INK2, background: "#0d1520", padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)" }}>{aviso}</span>
      )}
    </div>
  );
}
