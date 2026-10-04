"use client";

/**
 * Reseñas de ventas confirmadas. Una venta solo cuenta cuando el comprador la
 * confirma desde /dashboard/compras; las completadas son públicas por RLS, así
 * que esto funciona igual para el dueño del perfil y para un visitante.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
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
