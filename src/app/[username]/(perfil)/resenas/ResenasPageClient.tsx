"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, Flag, MessageSquareQuote, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  cargarResenas, cargarReferencias, cartaDeResena, nombreDeSet, fechaCorta, Estrellas, Etiqueta, Avatar,
  type Resena, type Referencia, type Compradores,
} from "@/components/Resenas";

const BALL  = "#d6ff3d";
const COURT = "#2ee6c1";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/**
 * Reseñas del perfil: las de ventas confirmadas por Facebinder y las
 * referencias que deja cualquier usuario (por un negocio de antes, por
 * ejemplo), juntas y ordenadas por fecha, cada una con su etiqueta. El
 * promedio de arriba es solo de las compras confirmadas, que son las
 * verificadas; las referencias se cuentan aparte.
 */

type Opinion =
  | { tipo: "venta"; fecha: string; r: Resena }
  | { tipo: "referencia"; fecha: string; r: Referencia };

interface Datos { opiniones: Opinion[]; personas: Compradores; ventas: Resena[]; referencias: number }

async function cargarTodo(perfilId: string): Promise<Datos> {
  const [v, ref] = await Promise.all([cargarResenas(perfilId), cargarReferencias(perfilId)]);
  const opiniones: Opinion[] = [
    ...v.resenas.map(r => ({ tipo: "venta" as const, fecha: r.respondida_at, r })),
    ...ref.referencias.map(r => ({ tipo: "referencia" as const, fecha: r.creada, r })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { opiniones, personas: { ...v.compradores, ...ref.autores }, ventas: v.resenas, referencias: ref.referencias.length };
}

export function ResenasPageClient({ vendedorId, username }: { vendedorId: string; username: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  /* undefined: todavía no se sabe; null: sin sesión. */
  const [visitante, setVisitante] = useState<string | null | undefined>(undefined);
  const [reportando, setReportando] = useState<string | null>(null);
  const [reportadas, setReportadas] = useState<Set<string>>(new Set());

  const recargar = useCallback(() => {
    cargarTodo(vendedorId).then(setDatos).catch(() => setError(true));
  }, [vendedorId]);

  useEffect(() => {
    cargarTodo(vendedorId).then(setDatos).catch(() => setError(true));
    createClient().auth.getClaims().then(({ data }) => setVisitante((data?.claims.sub as string | undefined) ?? null));
  }, [vendedorId]);

  const ventas   = datos?.ventas ?? [];
  const promedio = ventas.length ? ventas.reduce((s, r) => s + r.estrellas, 0) / ventas.length : 0;
  const nRef     = datos?.referencias ?? 0;
  const esDueno  = visitante === vendedorId;

  const resumen = [
    ventas.length > 0 && `${promedio.toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} de 5 en ${ventas.length} ${ventas.length === 1 ? "compra confirmada" : "compras confirmadas"}`,
    nRef > 0 && `${nRef} ${nRef === 1 ? "referencia" : "referencias"} de la comunidad`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="rs-page">
      <style>{`
        .rs-page { background: #05070d; padding: 40px 24px; }
        .rs-wrap { max-width: 1400px; }
        .rs-txt  { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ${MONO}; margin: 0; }
        .rs-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .rs-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .rs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .rs-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) {
          .rs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
        .rs-btn { display: inline-flex; align-items: center; gap: 7px; font-family: ${MONO}; font-size: 11px;
          font-weight: 700; letter-spacing: 0.06em; padding: 10px 16px; border-radius: 999px; cursor: pointer;
          border: none; background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; text-decoration: none; }
        .rs-btn:disabled { opacity: 0.5; cursor: default; }
        .rs-btn2 { display: inline-flex; align-items: center; gap: 6px; font-family: ${MONO}; font-size: 11px;
          padding: 9px 14px; border-radius: 999px; cursor: pointer; background: transparent;
          border: 1px solid rgba(255,255,255,0.14); color: ${INK1}; }
        .rs-icono { display: inline-flex; padding: 4px; border-radius: 6px; background: none; border: none;
          color: ${INK2}; cursor: pointer; }
        .rs-icono:hover { color: ${CRIT}; }
        .rs-campo { width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.03); color: ${INK0};
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 12px;
          font-family: ${MONO}; font-size: 12px; line-height: 1.6; resize: vertical; outline: none; }
        .rs-campo:focus { border-color: rgba(46,230,193,0.5); }
        /* Celular y tablet: el marco del perfil ya pone los 16px a los lados, y la
           cabecera y el estado vacío van centrados */
        @media (max-width: 1023px), (pointer: coarse) {
          .rs-page { padding: 24px 0 8px; }
          .rs-cab { text-align: center; }
          .rs-ante { justify-content: center; }
          .rs-vacio, .rs-form { margin-left: auto !important; margin-right: auto !important; }
          .rs-accion { justify-content: center; }
        }
      `}</style>

      <div className="rs-wrap">
        <div className="rs-cab" style={{ marginBottom: "22px" }}>
          <div className="rs-ante" style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Reseñas y referencias
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Reseñas de @{username}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            {resumen || `Compras confirmadas en Facebinder y referencias de quienes ya negociaron con @${username}`}
          </p>
        </div>

        {visitante !== undefined && !esDueno && datos && (
          <FormReferencia perfilId={vendedorId} username={username} visitante={visitante} alGuardar={recargar} />
        )}

        {error ? (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: CRIT }}>No se pudieron cargar las reseñas. Recarga la página.</p>
        ) : !datos ? null : datos.opiniones.length === 0 ? (
          <div className="rs-vacio" style={{ border: "1px dashed rgba(214,255,61,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center", maxWidth: "520px" }}>
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}><Star size={28} color={BALL} strokeWidth={1.6} /></div>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.6, margin: 0 }}>
              {esDueno
                ? "Todavía no tienes reseñas. Salen cuando un comprador confirma una venta o cuando alguien te deja una referencia."
                : `@${username} todavía no tiene reseñas. Si ya negociaste con @${username}, deja la primera referencia.`}
            </p>
          </div>
        ) : (
          <div className="rs-grid">
            {datos.opiniones.map(o => o.tipo === "venta"
              ? <TarjetaVenta key={o.r.id} r={o.r} comprador={datos.personas[o.r.comprador_id]} />
              : <TarjetaReferencia key={o.r.id} r={o.r} autor={datos.personas[o.r.autor_id]}
                  puedeReportar={!!visitante && visitante !== o.r.autor_id}
                  reportada={reportadas.has(o.r.id)}
                  onReportar={() => setReportando(o.r.id)} />)}
          </div>
        )}
      </div>

      {reportando && (
        <Reporte
          referenciaId={reportando}
          onCerrar={() => setReportando(null)}
          onListo={() => { setReportadas(s => new Set(s).add(reportando)); setReportando(null); }}
        />
      )}
    </div>
  );
}

/* ── Tarjetas ───────────────────────────────────────────────────────────── */

const TARJETA: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "6px", padding: "8px", borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", minWidth: 0,
};

function TarjetaVenta({ r, comprador }: { r: Resena; comprador?: { username: string; photo_url: string | null } }) {
  const carta = cartaDeResena(r);
  return (
    <div style={TARJETA}>
      {carta ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={carta.image} alt={carta.name} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "7px" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "5 / 7", borderRadius: "7px", background: "rgba(255,255,255,0.04)" }} />
      )}
      <p className="rs-txt" style={{ fontSize: "11px", color: INK0, fontWeight: 600 }}>{carta?.name ?? `Carta #${r.card_id}`}</p>
      <p className="rs-txt" style={{ fontSize: "9px", color: INK2 }}>{nombreDeSet(r.set_id)}</p>
      <Estrellas n={r.estrellas} size={12} />
      {r.comentario && (
        <p style={{ margin: 0, fontFamily: MONO, fontSize: "10px", color: INK1, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
          {r.comentario}
        </p>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        <p className="rs-txt" style={{ fontSize: "9px", color: INK2 }}>
          {comprador?.username
            ? <Link href={`/${comprador.username}`} style={{ color: INK1, textDecoration: "none" }}>@{comprador.username}</Link>
            : "Comprador"}
        </p>
        <p className="rs-txt" style={{ fontSize: "8px", color: INK2 }}>{fechaCorta(r.respondida_at)}</p>
        <div><Etiqueta tipo="venta" /></div>
      </div>
    </div>
  );
}

function TarjetaReferencia({ r, autor, puedeReportar, reportada, onReportar }: {
  r: Referencia; autor?: { username: string; photo_url: string | null };
  puedeReportar: boolean; reportada: boolean; onReportar: () => void;
}) {
  return (
    <div style={TARJETA}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Avatar persona={autor} size={30} />
        <div style={{ minWidth: 0 }}>
          <p className="rs-txt" style={{ fontSize: "11px", color: INK0, fontWeight: 600 }}>
            {autor?.username
              ? <Link href={`/${autor.username}`} style={{ color: INK0, textDecoration: "none" }}>@{autor.username}</Link>
              : "Usuario"}
          </p>
          <p className="rs-txt" style={{ fontSize: "8px", color: INK2 }}>
            {fechaCorta(r.creada)}{r.editada ? " · editada" : ""}
          </p>
        </div>
      </div>
      <Estrellas n={r.estrellas} size={12} />
      <p style={{ margin: 0, fontFamily: MONO, fontSize: "10px", color: INK1, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
        {r.comentario}
      </p>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <Etiqueta tipo="referencia" />
        {reportada
          ? <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2 }}>Reportada</span>
          : puedeReportar && (
            <button className="rs-icono" onClick={onReportar} aria-label="Reportar esta referencia" title="Reportar">
              <Flag size={12} />
            </button>
          )}
      </div>
    </div>
  );
}

/* ── Escribir la propia ─────────────────────────────────────────────────── */

function FormReferencia({ perfilId, username, visitante, alGuardar }: {
  perfilId: string; username: string; visitante: string | null; alGuardar: () => void;
}) {
  const [mia, setMia] = useState<Referencia | null | undefined>(undefined);
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!visitante) return;
    createClient().from("referencias").select("id, autor_id, estrellas, comentario, creada, editada")
      .eq("perfil_id", perfilId).eq("autor_id", visitante).maybeSingle()
      .then(({ data }) => setMia((data as Referencia | null) ?? null));
  }, [perfilId, visitante]);

  if (!visitante) {
    return (
      <div className="rs-accion" style={{ display: "flex", marginBottom: 22 }}>
        <Link href="/login" className="rs-btn2"><MessageSquareQuote size={13} /> Inicia sesión para dejar una referencia</Link>
      </div>
    );
  }
  if (mia === undefined) return null;

  const abrir = () => {
    setEstrellas(mia?.estrellas ?? 5);
    setTexto(mia?.comentario ?? "");
    setAviso(null);
    setAbierto(true);
  };

  const guardar = async () => {
    setEnviando(true);
    setAviso(null);
    const { data: referenciaId, error } = await createClient().rpc("referencia_guardar", {
      p_perfil: perfilId, p_estrellas: estrellas, p_comentario: texto,
    });
    setEnviando(false);
    if (error) { setAviso(error.message); return; }
    // Solo la primera vez: editar una referencia no vuelve a avisar
    if (!mia) {
      fetch("/api/referencias/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia_id: referenciaId }),
      }).catch(() => {});
    }
    setMia({ id: mia?.id ?? "", autor_id: visitante, estrellas, comentario: texto.trim(), creada: mia?.creada ?? new Date().toISOString(), editada: mia ? new Date().toISOString() : null });
    setAbierto(false);
    alGuardar();
  };

  const borrar = async () => {
    if (!window.confirm("¿Borrar tu referencia? No se puede deshacer.")) return;
    setEnviando(true);
    await createClient().rpc("referencia_borrar", { p_perfil: perfilId });
    setEnviando(false);
    setMia(null);
    setAbierto(false);
    alGuardar();
  };

  if (!abierto) {
    return (
      <div className="rs-accion" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {mia ? (
          <>
            <button className="rs-btn2" onClick={abrir}><Pencil size={13} /> Editar tu referencia</button>
            <button className="rs-btn2" onClick={borrar} disabled={enviando}><Trash2 size={13} /> Borrar</button>
          </>
        ) : (
          <button className="rs-btn" onClick={abrir}><MessageSquareQuote size={14} /> Dejar una referencia</button>
        )}
      </div>
    );
  }

  const largo = texto.trim().length;
  return (
    <div className="rs-form" style={{ maxWidth: 560, marginBottom: 26, padding: 16, borderRadius: 12, border: "1px solid rgba(46,230,193,0.25)", background: "rgba(46,230,193,0.03)" }}>
      <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: "0 0 12px", lineHeight: 1.6 }}>
        ¿Cómo te fue negociando con @{username}? Sirve aunque no haya sido por Facebinder.
      </p>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }} role="radiogroup" aria-label="Estrellas">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => setEstrellas(i)} role="radio" aria-checked={estrellas === i}
            aria-label={`${i} ${i === 1 ? "estrella" : "estrellas"}`}
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}>
            <Star size={24} strokeWidth={1.6} color={i <= estrellas ? BALL : INK2} fill={i <= estrellas ? BALL : "none"} />
          </button>
        ))}
      </div>
      <textarea className="rs-campo" rows={4} maxLength={600} value={texto} onChange={e => setTexto(e.target.value)}
        placeholder="Ej: Le compré un Charizard en 2023, llegó en perfecto estado y muy rápido." />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: largo > 0 && largo < 10 ? CRIT : INK2 }}>
          {largo < 10 ? `Mínimo 10 caracteres (${largo})` : `${largo} / 600`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="rs-btn2" onClick={() => setAbierto(false)} disabled={enviando}>Cancelar</button>
          <button className="rs-btn" onClick={guardar} disabled={enviando || largo < 10}>
            {mia ? "Guardar cambios" : "Publicar"}
          </button>
        </div>
      </div>
      {aviso && <p style={{ fontFamily: MONO, fontSize: 10, color: CRIT, margin: "10px 0 0" }}>{aviso}</p>}
    </div>
  );
}

/* ── Reportar ───────────────────────────────────────────────────────────── */

function Reporte({ referenciaId, onCerrar, onListo }: { referenciaId: string; onCerrar: () => void; onListo: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const enviar = async () => {
    setEnviando(true);
    const { error } = await createClient().rpc("referencia_reportar", { p_referencia: referenciaId, p_motivo: motivo });
    setEnviando(false);
    if (error) { setAviso(error.message); return; }
    onListo();
  };

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,7,13,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Reportar referencia"
        style={{ width: "100%", maxWidth: 420, background: "#0b0e17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: CRIT, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Flag size={13} /> Reportar
          </span>
          <button className="rs-icono" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, lineHeight: 1.6, margin: "0 0 12px" }}>
          Un admin la revisa y decide si la oculta. Cuéntale qué pasa: es falsa, ofensiva, es spam…
        </p>
        <textarea className="rs-campo" rows={3} maxLength={300} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opcional)" />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="rs-btn2" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          <button className="rs-btn" onClick={enviar} disabled={enviando}>Enviar reporte</button>
        </div>
        {aviso && <p style={{ fontFamily: MONO, fontSize: 10, color: CRIT, margin: "10px 0 0" }}>{aviso}</p>}
      </div>
    </div>
  );
}
