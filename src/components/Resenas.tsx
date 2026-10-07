"use client";

/**
 * Reseñas de ventas confirmadas. Una venta solo cuenta cuando el comprador la
 * confirma desde /dashboard/compras; las completadas son públicas por RLS, así
 * que esto funciona igual para el dueño del perfil y para un visitante.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, BadgeCheck, MessageSquareQuote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";

const BALL = "#d6ff3d";
const INK0 = "#f5f7fb";
const INK1 = "#c9cfdd";
const INK2 = "#7a8298";
const MONO = "var(--font-jetbrains)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

export interface Resena {
  id: string;
  comprador_id: string;
  set_id: string;
  card_id: number;
  version: string;
  estrellas: number;
  comentario: string | null;
  respondida_at: string;
}

export type Compradores = Record<string, { username: string; photo_url: string | null }>;

const COLUMNAS = "id, comprador_id, set_id, card_id, version, estrellas, comentario, respondida_at";

/** Reseñas de un vendedor, de la más nueva a la más vieja. Sin `limite` las trae todas. */
export async function cargarResenas(vendedorId: string, limite?: number) {
  const supabase = createClient();
  let filas: Resena[];
  if (limite) {
    const { data, error } = await supabase.from("ventas").select(COLUMNAS)
      .eq("vendedor_id", vendedorId).eq("estado", "completada")
      .order("respondida_at", { ascending: false }).limit(limite);
    if (error) throw error;
    filas = (data ?? []) as Resena[];
  } else {
    filas = await fetchAllRows<Resena>(() => supabase.from("ventas").select(COLUMNAS)
      .eq("vendedor_id", vendedorId).eq("estado", "completada"));
    filas.sort((a, b) => b.respondida_at.localeCompare(a.respondida_at));
  }

  const ids = [...new Set(filas.map(f => f.comprador_id))];
  const compradores: Compradores = {};
  if (ids.length) {
    const { data } = await supabase.from("players").select("user_id, username, photo_url").in("user_id", ids);
    for (const p of data ?? []) compradores[p.user_id] = { username: p.username ?? "", photo_url: p.photo_url };
  }
  await loadManySets([...new Set(filas.map(f => f.set_id))]);
  return { resenas: filas, compradores };
}

export function cartaDeResena(r: Pick<Resena, "set_id" | "card_id" | "version">) {
  return SET_CARDS[r.set_id]?.find(c => c.card_number === r.card_id && c.version === r.version);
}

export function nombreDeSet(setId: string) {
  return ALL_SETS.find(s => s.id === setId)?.name ?? setId;
}

export function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function Estrellas({ n, size = 11 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", lineHeight: 0 }} aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} strokeWidth={1.6} color={i <= n ? BALL : INK2} fill={i <= n ? BALL : "none"} />
      ))}
    </span>
  );
}

/**
 * "★ 4,8 · 24 ventas · 19 reseñas" para la portada del perfil. No se muestra
 * nada mientras no haya ventas confirmadas: un "0 ventas" solo resta.
 */
export function ResumenVentas({ userId, fontSize = 12 }: { userId: string; fontSize?: number }) {
  const [res, setRes] = useState<{ ventas: number; promedio: number | null; resenas: number } | null>(null);

  useEffect(() => {
    createClient().rpc("resumen_ventas", { p_user_id: userId }).then(({ data }) => {
      const fila = Array.isArray(data) ? data[0] : null;
      if (fila) setRes({ ventas: Number(fila.ventas), promedio: fila.promedio == null ? null : Number(fila.promedio), resenas: Number(fila.resenas) });
    });
  }, [userId]);

  if (!res || res.ventas === 0) return null;

  return (
    <p style={{
      margin: "10px 0 0", fontFamily: MONO, fontSize: `${fontSize}px`, letterSpacing: "0.08em",
      color: INK1, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
    }}>
      <Star size={fontSize + 2} color={BALL} fill={BALL} strokeWidth={1.6} />
      <b style={{ color: INK0 }}>{res.promedio?.toLocaleString("es-CO", { minimumFractionDigits: 1 })}</b>
      <span style={{ color: INK2 }}>·</span>
      {res.ventas} {res.ventas === 1 ? "venta completada" : "ventas completadas"}
      {res.resenas > 0 && (<><span style={{ color: INK2 }}>·</span>{res.resenas} {res.resenas === 1 ? "reseña" : "reseñas"}</>)}
    </p>
  );
}

/* ── Referencias de la comunidad ────────────────────────────────────────────
   Cualquier usuario puede dejarle una a otro, haya comprado por Facebinder o
   no. Se escriben solo con las funciones referencia_* de la base; no suman al
   promedio de la cabecera, que sigue siendo de ventas confirmadas. */

export interface Referencia {
  id: string;
  autor_id: string;
  estrellas: number;
  comentario: string;
  creada: string;
  editada: string | null;
}

export type Personas = Compradores;

/** Referencias de un perfil, de la más nueva a la más vieja, con sus autores. */
export async function cargarReferencias(perfilId: string, limite?: number) {
  const supabase = createClient();
  const consulta = () => supabase.from("referencias")
    .select("id, autor_id, estrellas, comentario, creada, editada")
    .eq("perfil_id", perfilId).eq("oculta", false);
  let filas: Referencia[];
  if (limite) {
    const { data, error } = await consulta().order("creada", { ascending: false }).limit(limite);
    if (error) throw error;
    filas = (data ?? []) as Referencia[];
  } else {
    filas = await fetchAllRows<Referencia>(consulta);
    filas.sort((a, b) => b.creada.localeCompare(a.creada));
  }

  const ids = [...new Set(filas.map(f => f.autor_id))];
  const autores: Personas = {};
  if (ids.length) {
    const { data } = await supabase.from("players").select("user_id, username, photo_url").in("user_id", ids);
    for (const p of data ?? []) autores[p.user_id] = { username: p.username ?? "", photo_url: p.photo_url };
  }
  return { referencias: filas, autores };
}

/** La marca que distingue una referencia de una compra confirmada. */
export function Etiqueta({ tipo }: { tipo: "venta" | "referencia" }) {
  const venta = tipo === "venta";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: "8px",
      letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
      color: venta ? "#2ee6c1" : INK1, padding: "2px 6px", borderRadius: 999,
      border: `1px solid ${venta ? "rgba(46,230,193,0.35)" : "rgba(255,255,255,0.14)"}`,
    }}>
      {venta ? <BadgeCheck size={9} /> : <MessageSquareQuote size={9} />}
      {venta ? "Compra confirmada" : "Referencia"}
    </span>
  );
}

export function Avatar({ persona, size = 28 }: { persona?: { username: string; photo_url: string | null }; size?: number }) {
  const estilo = { width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover" as const };
  return persona?.photo_url
    ? <img src={persona.photo_url} alt="" loading="lazy" decoding="async" style={estilo} />
    : (
      <span style={{ ...estilo, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(46,230,193,0.12)", color: "#2ee6c1", fontFamily: "var(--font-archivo)", fontSize: size * 0.42, fontWeight: 700 }}>
        {(persona?.username || "?").charAt(0).toUpperCase()}
      </span>
    );
}

/** Una referencia en formato fila, para el panel del perfil. */
export function ReferenciaFila({ r, autor }: { r: Referencia; autor?: { username: string; photo_url: string | null } }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", minWidth: 0 }}>
      <Avatar persona={autor} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <Estrellas n={r.estrellas} />
          <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, whiteSpace: "nowrap" }}>{fechaCorta(r.creada)}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: "10px", color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
          {autor?.username
            ? <Link href={`/${autor.username}`} style={{ color: INK1, textDecoration: "none" }}>@{autor.username}</Link>
            : "Usuario"}
          <Etiqueta tipo="referencia" />
        </p>
        <p style={{
          margin: "6px 0 0", fontFamily: MONO, fontSize: "11px", color: INK0, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          overflowWrap: "anywhere",
        }}>
          {r.comentario}
        </p>
      </div>
    </div>
  );
}

/** Una reseña en formato fila: miniatura de la carta, estrellas, comprador y comentario. */
export function ResenaFila({ r, comprador }: { r: Resena; comprador?: { username: string; photo_url: string | null } }) {
  const carta = cartaDeResena(r);
  return (
    <div style={{ display: "flex", gap: "12px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", minWidth: 0 }}>
      {carta ? (
        <img src={carta.image} alt={carta.name} loading="lazy" decoding="async" style={{ width: "46px", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "5px", flexShrink: 0 }} />
      ) : (
        <div style={{ width: "46px", aspectRatio: "5 / 7", borderRadius: "5px", background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <Estrellas n={r.estrellas} />
          <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, whiteSpace: "nowrap" }}>{fechaCorta(r.respondida_at)}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: "10px", color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {comprador?.username
            ? <Link href={`/${comprador.username}`} style={{ color: INK1, textDecoration: "none" }}>@{comprador.username}</Link>
            : "Comprador"}
          {" · "}{carta?.name ?? `Carta #${r.card_id}`}
        </p>
        <div style={{ marginTop: 5 }}><Etiqueta tipo="venta" /></div>
        {r.comentario && (
          <p style={{
            margin: "6px 0 0", fontFamily: MONO, fontSize: "11px", color: INK0, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            overflowWrap: "anywhere",
          }}>
            {r.comentario}
          </p>
        )}
      </div>
    </div>
  );
}
