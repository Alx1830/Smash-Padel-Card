"use client";

/**
 * Los números de Seguidores y Siguiendo de la cabecera se pueden tocar: abren
 * una ventana con la lista de personas, con pestañas para pasar de una a otra.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COURT, INK0, INK2, MONO, DISP } from "./tokens";

type Tipo = "seguidores" | "siguiendo";
interface Persona { user_id: string; username: string; first_name: string | null; last_name: string | null; photo_url: string | null }

export function StatSeguidores({ userId, tipo, children }: { userId: string; tipo: Tipo; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState<Tipo | null>(null);
  return (
    <>
      <button type="button" className="pf-stat pf-stat-boton" onClick={() => setAbierta(tipo)}
        title={tipo === "seguidores" ? "Ver seguidores" : "Ver a quién sigue"}>
        {children}
      </button>
      {/* Al body: dentro de la cabecera la ventana quedaba atrapada en su capa
          y las cartas de más abajo (su estrella de destacada) se le montaban encima. */}
      {abierta && createPortal(
        <VentanaSeguidores userId={userId} tipo={abierta} onTipo={setAbierta} onCerrar={() => setAbierta(null)} />,
        document.body,
      )}
    </>
  );
}

function VentanaSeguidores({ userId, tipo, onTipo, onCerrar }: {
  userId: string; tipo: Tipo; onTipo: (t: Tipo) => void; onCerrar: () => void;
}) {
  const [listas, setListas] = useState<Partial<Record<Tipo, Persona[]>>>({});
  const lista = listas[tipo];

  useEffect(() => {
    if (listas[tipo]) return;
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [propia, otra] = tipo === "seguidores" ? ["following_id", "follower_id"] as const : ["follower_id", "following_id"] as const;
      const { data: filas } = await supabase.from("follows").select(otra).eq(propia, userId).order("created_at", { ascending: false });
      const ids = (filas ?? []).map(f => (f as Record<string, string>)[otra]);
      let personas: Persona[] = [];
      if (ids.length) {
        const { data } = await supabase.from("players").select("user_id, username, first_name, last_name, photo_url").in("user_id", ids).eq("activo", true);
        const porId = new Map((data ?? []).map(p => [p.user_id, p as Persona]));
        personas = ids.map(id => porId.get(id)).filter((p): p is Persona => !!p && !!p.username);
      }
      if (vivo) setListas(l => ({ ...l, [tipo]: personas }));
    })();
    return () => { vivo = false; };
  }, [tipo, userId, listas]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onCerrar]);

  const pestana = (t: Tipo, label: string) => (
    <button type="button" onClick={() => onTipo(t)} style={{
      flex: 1, minHeight: 42, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
      borderBottom: `2px solid ${tipo === t ? COURT : "transparent"}`,
      fontFamily: MONO, fontSize: 11, fontWeight: tipo === t ? 700 : 400, color: tipo === t ? INK0 : INK2,
    }}>{label}</button>
  );

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,7,13,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textShadow: "none" }}>
      <div role="dialog" aria-modal="true" className="pf-seg-ventana" style={{ width: "min(400px, 100%)", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.8)", overflow: "hidden", textAlign: "left" }}>
        {/* En el iPhone el 80vh cuenta la barra del navegador aunque esté a la
            vista y la ventana quedaba cortada abajo: dvh mide lo que se ve. */}
        <style>{`@supports (height: 1dvh) { .pf-seg-ventana { max-height: 80dvh !important; } }`}</style>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 0" }}>
          <p style={{ flex: 1, margin: 0, fontFamily: DISP, fontSize: 16, fontWeight: 700, color: INK0 }}>Comunidad</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ width: 40, height: 40, marginRight: -8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 0 }}><X size={18} color={INK2} /></button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 16px" }}>
          {pestana("seguidores", "Seguidores")}
          {pestana("siguiendo", "Siguiendo")}
        </div>
        <div className="fb-scroll" style={{ overflowY: "auto", overscrollBehavior: "contain", padding: 8 }}>
          {!lista ? (
            <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, padding: 16, margin: 0 }}>Cargando…</p>
          ) : lista.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center" }}>
              <UsersRound size={24} color={COURT} strokeWidth={1.6} />
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
                {tipo === "seguidores" ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."}
              </p>
            </div>
          ) : lista.map(p => {
            const nombre = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username;
            return (
              <Link key={p.user_id} href={`/${p.username}`} onClick={onCerrar}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 10, textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" loading="lazy" decoding="async" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(46,230,193,0.15)", color: COURT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontWeight: 700, flexShrink: 0 }}>
                    {nombre.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 12, fontWeight: 600, color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: INK2 }}>@{p.username}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
