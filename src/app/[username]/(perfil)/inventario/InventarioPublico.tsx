"use client";

/**
 * Inventario del perfil, visto por cualquiera: el mismo aspecto que el
 * inventario del dashboard (filtros a la izquierda, grilla de cartas con holo,
 * idioma, precio), pero de solo lectura. La cantidad se muestra como "x2" en
 * lugar de los botones de sumar y restar.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Star, X, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { getVersionLabel, type PokemonCard } from "@/data/pokemon-cards-meta";
import { InvTiltCard, INV_CARD_KEYFRAMES } from "@/components/InventoryCard";
import { CARD_LANGUAGES, DEFAULT_CARD_LANGUAGE, languageLabel } from "@/lib/languages";
import { FlagIcon } from "@/components/FlagIcon";
import { Desplegable } from "@/components/ui/Desplegable";
import { COURT, INK0, INK2, MONO, DISP, VIOLET } from "@/components/perfil/tokens";

export interface ColeccionSet { setId: string; unique: number; total: number }

const ModalTiltCard = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.ModalTiltCard })),
  { ssr: false }
);

const SET_META: Record<string, { name: string; logo: string }> = Object.fromEntries(
  POKEMON_SERIES.flatMap(s => s.sets).map(s => [s.id, { name: s.name, logo: s.logo }])
);
/** Primero 18 cartas; el resto llega al hacer scroll */
const PAGINA = 18;

interface Fila { card_id: string; set_id: string; version: string | null; quantity: number; language: string | null }
interface Entrada { card: PokemonCard; setId: string; language: string; qty: number }

export function InventarioPublico({ userId, username, colecciones, resumen }: {
  userId: string;
  username: string;
  /** Progreso por set, ya ordenado de mayor a menor */
  colecciones: ColeccionSet[];
  resumen: string;
}) {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [destacadas, setDestacadas] = useState<Set<string>>(new Set());
  const [precios, setPrecios] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [error, setError] = useState(false);

  const [fNombre, setFNombre] = useState("");
  const [fNombreQuery, setFNombreQuery] = useState("");
  const [fVariante, setFVariante] = useState("");
  const [fSet, setFSet] = useState("");
  const [fIdioma, setFIdioma] = useState("");
  const [fDestacados, setFDestacados] = useState(false);
  const [fBulk, setFBulk] = useState(false);
  const [fOrden, setFOrden] = useState<"precio-desc" | "precio-asc" | "set">("precio-desc");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [visibles, setVisibles] = useState(PAGINA);
  const centinela = useRef<HTMLDivElement>(null);
  /** Carta abierta en grande, como en la Wishlist */
  const [abierta, setAbierta] = useState<PokemonCard | null>(null);
  const filaColecciones = useRef<HTMLDivElement>(null);
  /** Si la fila puede moverse hacia cada lado: decide flechas y desvanecidos */
  const [bordes, setBordes] = useState({ izq: false, der: false });
  const medirBordes = useCallback(() => {
    const el = filaColecciones.current;
    if (!el) return;
    const izq = el.scrollLeft > 4;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setBordes(b => (b.izq === izq && b.der === der ? b : { izq, der }));
  }, []);
  const moverColecciones = (dir: 1 | -1) => {
    const el = filaColecciones.current;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: "smooth" });
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [filas, { data: feat }] = await Promise.all([
        fetchAllRows<Fila>(() => supabase.from("card_inventory")
          .select("card_id, set_id, version, quantity, language").eq("user_id", userId).gt("quantity", 0)),
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", userId),
      ]);
      const sets = [...new Set(filas.map(f => f.set_id))];
      await loadManySets(sets);

      const lista: Entrada[] = [];
      for (const f of filas) {
        const version = f.version ?? "normal";
        const card = SET_CARDS[f.set_id]?.find(c => c.id === f.card_id && c.version === version)
          ?? SET_CARDS[f.set_id]?.find(c => c.id === f.card_id);
        if (card) lista.push({ card, setId: f.set_id, language: f.language ?? DEFAULT_CARD_LANGUAGE, qty: f.quantity });
      }
      // Las destacadas se guardaron con dos formatos de card_id: número o id completo
      const marcas = new Set<string>();
      for (const d of feat ?? []) { marcas.add(`${d.set_id}::${d.card_id}`); }
      if (!vivo) return;
      setDestacadas(marcas);
      setEntradas(lista);

      // Precios por set, igual que el dashboard
      await Promise.all(sets.map(async setId => {
        const sc = SCRYDEX_SET_CODES[setId];
        if (!sc) return;
        const filasPrecio = await fetchAllRows<{ card_id: string; prices: unknown }>(() => supabase
          .from("card_prices_merged").select("card_id, prices").like("card_id", `${sc}-%`), "card_id");
        const mapa: Record<string, Record<string, number>> = {};
        for (const r of filasPrecio) mapa[r.card_id] = r.prices as Record<string, number>;
        if (vivo) setPrecios(prev => ({ ...prev, [setId]: mapa }));
      }));
    })().catch(() => { if (vivo) setError(true); });
    return () => { vivo = false; };
  }, [userId]);

  useEffect(() => {
    if (fNombre === fNombreQuery) return;
    const t = setTimeout(() => setFNombreQuery(fNombre), 250);
    return () => clearTimeout(t);
  }, [fNombre, fNombreQuery]);

  useEffect(() => {
    const el = filaColecciones.current;
    if (!el) return;
    const ro = new ResizeObserver(medirBordes);
    ro.observe(el);
    return () => ro.disconnect();
  }, [medirBordes, colecciones.length]);

  const precioDe = useCallback((card: PokemonCard, setId: string): number | null => {
    const sc = SCRYDEX_SET_CODES[setId];
    const porCarta = sc ? precios[setId]?.[`${sc}-${card.card_number}`] : undefined;
    if (!porCarta) return null;
    const vk = card.version.toLowerCase().replace(/\s+/g, "");
    return porCarta[vk] ?? porCarta[card.version] ?? porCarta["normal"] ?? null;
  }, [precios]);

  const esDestacada = useCallback((card: PokemonCard, setId: string) =>
    destacadas.has(`${setId}::${card.card_number}`) || destacadas.has(`${setId}::${card.id}`), [destacadas]);

  const todas = useMemo(() => entradas ?? [], [entradas]);
  const variantes = useMemo(() => [...new Set(todas.map(e => e.card.version))].sort(), [todas]);
  const setsDisponibles = useMemo(() => [...new Set(todas.map(e => e.setId))], [todas]);
  const idiomas = useMemo(() => {
    const hay = new Set(todas.map(e => e.language));
    return CARD_LANGUAGES.filter(l => hay.has(l.code));
  }, [todas]);

  const filtradas = useMemo(() => {
    const needle = fNombreQuery.trim().toLowerCase();
    const lista = todas.filter(({ card, setId, language, qty }) => {
      if (needle && !card.name.toLowerCase().includes(needle)) return false;
      if (fVariante && card.version !== fVariante) return false;
      if (fSet && setId !== fSet) return false;
      if (fIdioma && language !== fIdioma) return false;
      if (fDestacados && !esDestacada(card, setId)) return false;
      if (fBulk && qty < 2) return false;
      return true;
    });
    if (fOrden === "set") return lista;
    const dir = fOrden === "precio-asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const pa = precioDe(a.card, a.setId), pb = precioDe(b.card, b.setId);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return (pa - pb) * dir;
    });
  }, [todas, fNombreQuery, fVariante, fSet, fIdioma, fDestacados, fBulk, fOrden, esDestacada, precioDe]);

  // Al cambiar un filtro se vuelve a la primera página (se resetea en el mismo evento)
  const filtrar = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setVisibles(PAGINA); };

  useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) setVisibles(v => v + PAGINA); }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtradas.length, visibles]);

  const hayFiltros = !!(fNombre || fVariante || fSet || fIdioma || fDestacados || fBulk);
  function limpiar() {
    setFNombre(""); setFNombreQuery(""); setFVariante(""); setFSet(""); setFIdioma(""); setFDestacados(false); setFBulk(false); setVisibles(PAGINA);
  }

  const sInput: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 7, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", color: INK0, fontFamily: MONO, fontSize: 12, outline: "none", boxSizing: "border-box",
  };
  const sLabel: React.CSSProperties = { fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: 8 };
  const sDivider: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.06)", margin: "18px 0" };

  return (
    <div>
      <style>{`
        ${INV_CARD_KEYFRAMES}
        @keyframes inv-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .ip-cabecera {
          border-top: 1px solid rgba(255,255,255,0.06); padding: 32px 24px 16px;
          display: flex; align-items: center; gap: 32px;
        }
        .ip-titulo { flex-shrink: 0; }
        /* Las flechas viven en el margen de 36px, no encima de las colecciones */
        .ip-colecciones { position: relative; flex: 1; min-width: 0; padding: 0 36px; }
        .ip-fila-colecciones {
          display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth;
          padding: 2px 4px; scrollbar-width: none; overscroll-behavior-x: contain;
        }
        /* Desvanecido solo del lado hacia el que queda algo por ver */
        .ip-fila-colecciones.fade-der { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); }
        .ip-fila-colecciones.fade-izq { -webkit-mask-image: linear-gradient(90deg, transparent, #000 28px); mask-image: linear-gradient(90deg, transparent, #000 28px); }
        .ip-fila-colecciones.fade-izq.fade-der { -webkit-mask-image: linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent); }
        .ip-fila-colecciones::-webkit-scrollbar { display: none; }
        .ip-coleccion { flex: 0 0 96px; min-width: 0; padding: 0; border: none; background: none; cursor: pointer; text-align: left; scroll-snap-align: start; }
        .ip-flecha {
          position: absolute; top: 34px; z-index: 2; width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: rgba(5,7,13,0.9); border: 1px solid rgba(255,255,255,0.14); color: ${INK0};
        }
        .ip-flecha:hover { border-color: rgba(46,230,193,0.5); }
        .ip-cuerpo { padding: 32px 24px 80px; }
        @media (min-width: 1024px) and (pointer: fine) {
          .ip-cabecera { padding: 32px 80px 16px; }
          .ip-cuerpo { padding: 48px 80px 80px; }
        }
        .ip-layout { display: flex; gap: 32px; align-items: flex-start; }
        .ip-sidebar { width: 240px; flex-shrink: 0; }
        /* Los filtros acompañan el scroll. El sticky va en la columna entera: puesto
           en el panel de adentro no hacía nada, porque la columna medía lo mismo
           que el panel y no le dejaba espacio para moverse. 96px = debajo de la barra de arriba. */
        @media (min-width: 1024px) and (pointer: fine) {
          .ip-sidebar { position: sticky; top: 96px; align-self: flex-start; }
        }
        .ip-grid-area { flex: 1; min-width: 0; }
        .ip-toggle { display: none; }
        /* Igual que la Wishlist: columnas de al menos 200px (4 en una pantalla normal) */
        .ip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }

        /* ── Celular y tablet ──────────────────────────────────────────────
           El marco del perfil ya pone el margen de 16px a los lados: aquí no se
           suma otro. Cabecera centrada, colecciones debajo deslizables con el
           dedo y los filtros plegados detrás de un botón. */
        @media (max-width: 1023px), (pointer: coarse) {
          .ip-cabecera { flex-direction: column; align-items: stretch; gap: 20px; padding: 24px 0 8px; }
          .ip-titulo { text-align: center; }
          .ip-ante { justify-content: center; }
          .ip-flecha { display: none; }
          .ip-colecciones { padding: 0; }
          .ip-cuerpo { padding: 20px 0 32px; }
          .ip-layout { flex-direction: column; gap: 16px; }
          .ip-sidebar { width: 100%; }
          .ip-panel { position: static !important; }
          .ip-toggle {
            display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
            min-height: 46px; padding: 10px 16px; box-sizing: border-box;
            border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); cursor: pointer;
          }
          .ip-panel { display: none; }
          .ip-panel.open { display: block; margin-top: 10px; padding: 16px !important; }
            /* El botón ya dice "Filtros": adentro solo queda "Limpiar" */
            .ip-panel-titulo { display: none; }
            .ip-panel-cab { justify-content: flex-end !important; margin-bottom: 14px !important; }
            .ip-panel-cab:not(:has(button)) { display: none !important; }
          /* Todo lo que se toca en el panel mide al menos 40px */
          .ip-panel button, .ip-panel input:not([type="checkbox"]) { min-height: 40px; }
          .ip-check { min-height: 40px; }
          .ip-check input { width: 20px !important; height: 20px !important; }
          .ip-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
          /* La X de la carta en grande: blanco táctil de 44px, debajo de la muesca */
          .ip-cerrar {
            top: max(12px, env(safe-area-inset-top)) !important; right: 12px !important; width: 44px; height: 44px;
            display: flex; align-items: center; justify-content: center; border-radius: 50%;
            background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important;
          }
        }
        /* Tablet acostada con el dedo (1024px o más): la grilla de escritorio */
        @media (min-width: 1024px) and (pointer: coarse) {
          .ip-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        }
        @media (max-width: 767px) {
          .ip-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .ip-coleccion { flex-basis: 88px; }
        }
      `}</style>

      {abierta && (
        <div onClick={() => setAbierta(null)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(5,7,13,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(300px, 78vw)" }}>
            <ModalTiltCard card={abierta} />
          </div>
          <button type="button" className="ip-cerrar" onClick={() => setAbierta(null)} aria-label="Cerrar" style={{ position: "fixed", top: 20, right: 24, background: "none", border: "none", color: INK0, cursor: "pointer", lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>
      )}

      <section className="ip-cabecera">
        <div className="ip-titulo">
        <div className="ip-ante" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: COURT, display: "inline-block" }} />
          <Link href={`/${username}`} style={{ color: COURT, textDecoration: "none" }}>@{username}</Link>
          <span style={{ color: INK2 }}>›</span>
          Inventario
        </div>
        <h2 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
          Mi{" "}
          <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>colección</em>
        </h2>
        <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.1em" }}>{resumen}</p>
        </div>

        {colecciones.length > 0 && (
          <div className="ip-colecciones">
            {bordes.izq && <button type="button" className="ip-flecha" style={{ left: 0 }} onClick={() => moverColecciones(-1)} aria-label="Colecciones anteriores"><ChevronLeft size={15} /></button>}
            <div ref={filaColecciones} onScroll={medirBordes}
              className={`ip-fila-colecciones${bordes.izq ? " fade-izq" : ""}${bordes.der ? " fade-der" : ""}`}>
              {colecciones.map(c => {
                const pct = Math.min(100, (c.unique / c.total) * 100);
                const activa = fSet === c.setId;
                return (
                  <button key={c.setId} type="button" onClick={() => filtrar(setFSet)(activa ? "" : c.setId)} title={activa ? "Ver todos los sets" : "Ver solo este set"} className="ip-coleccion">
                    <div style={{
                      aspectRatio: "1", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${activa ? COURT : "rgba(255,255,255,0.12)"}`,
                      background: "radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.14), rgba(255,255,255,0.02))",
                    }}>
                      {SET_META[c.setId]?.logo && <img src={SET_META[c.setId].logo} alt="" loading="lazy" decoding="async" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
                    </div>
                    <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SET_META[c.setId]?.name ?? c.setId}</p>
                    <p style={{ margin: 0, fontFamily: MONO, fontSize: 10, color: INK2 }}>{c.unique} / {c.total}</p>
                    <div style={{ height: 2, marginTop: 5, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: VIOLET }} />
                    </div>
                  </button>
                );
              })}
            </div>
            {bordes.der && <button type="button" className="ip-flecha" style={{ right: 0 }} onClick={() => moverColecciones(1)} aria-label="Más colecciones"><ChevronRight size={15} /></button>}
          </div>
        )}
      </section>

      <section className="ip-cuerpo">
      <div className="ip-layout">
        <aside className="ip-sidebar">
          <button type="button" className="ip-toggle" onClick={() => setFiltrosAbiertos(o => !o)} aria-expanded={filtrosAbiertos}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>
              <SlidersHorizontal size={15} />
              Filtros{hayFiltros ? " · activos" : ""}
            </span>
            <ChevronDown size={16} color={INK2} style={{ flexShrink: 0, transition: "transform .2s", transform: filtrosAbiertos ? "rotate(180deg)" : "none" }} />
          </button>

          <div className={`ip-panel${filtrosAbiertos ? " open" : ""}`} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: 20,
          }}>
            <div className="ip-panel-cab" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span className="ip-panel-titulo" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>Filtros</span>
              {hayFiltros && (
                <button type="button" onClick={limpiar} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", background: "none", border: "1px solid rgba(209,53,53,0.3)", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>
                  Limpiar
                </button>
              )}
            </div>

            <label style={sLabel}>Ordenar por</label>
            <Desplegable ariaLabel="Ordenar por" value={fOrden} onChange={v => filtrar(setFOrden)(v as typeof fOrden)} opciones={[
              { value: "precio-desc", label: "Precio: mayor a menor" },
              { value: "precio-asc",  label: "Precio: menor a mayor" },
              { value: "set",         label: "Orden del set" },
            ]} />

            <div style={sDivider} />
            <label style={sLabel}>Nombre de carta</label>
            <input style={sInput} value={fNombre} onChange={e => filtrar(setFNombre)(e.target.value)} placeholder="Ej: Pikachu..." />

            <div style={sDivider} />
            <label style={sLabel}>Variante</label>
            <Desplegable ariaLabel="Variante" value={fVariante} onChange={filtrar(setFVariante)} opciones={[
              { value: "", label: "Todas las variantes" },
              ...variantes.map(v => ({ value: v, label: getVersionLabel(v) })),
            ]} />

            <div style={sDivider} />
            <label style={sLabel}>Set</label>
            <Desplegable ariaLabel="Set" value={fSet} onChange={filtrar(setFSet)} opciones={[
              { value: "", label: "Todos los sets" },
              ...setsDisponibles.map(id => ({ value: id, label: SET_META[id]?.name ?? id, logo: SET_META[id]?.logo })),
            ]} />

            {idiomas.length > 1 && (
              <>
                <div style={sDivider} />
                <label style={sLabel}>Idioma</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => filtrar(setFIdioma)("")} style={{
                    flex: "1 1 auto", padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em",
                    background: fIdioma === "" ? "rgba(46,230,193,0.14)" : "rgba(255,255,255,0.04)",
                    border: fIdioma === "" ? `1px solid ${COURT}` : "1px solid rgba(255,255,255,0.1)", color: fIdioma === "" ? COURT : INK2,
                  }}>Todos</button>
                  {idiomas.map(l => {
                    const on = fIdioma === l.code;
                    return (
                      <button key={l.code} type="button" onClick={() => filtrar(setFIdioma)(on ? "" : l.code)} title={l.label} style={{
                        display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 7, cursor: "pointer",
                        background: on ? "rgba(46,230,193,0.14)" : "rgba(255,255,255,0.04)",
                        border: on ? `1px solid ${COURT}` : "1px solid rgba(255,255,255,0.1)", opacity: on ? 1 : 0.6,
                      }}>
                        <FlagIcon code={l.code} width={22} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div style={sDivider} />
            {([["Destacados", fDestacados, setFDestacados], ["Bulk", fBulk, setFBulk]] as const).map(([label, valor, fijar], i) => (
              <label key={label} className="ip-check" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: i ? 10 : 0 }}>
                <input type="checkbox" checked={valor} onChange={e => filtrar(fijar)(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: COURT, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: valor ? COURT : INK0, letterSpacing: "0.06em", userSelect: "none" }}>{label}</span>
              </label>
            ))}
          </div>

        </aside>

        <div className="ip-grid-area">
          {error ? (
            <p style={{ fontFamily: MONO, fontSize: 11, color: "#ff5d5d" }}>No se pudo cargar el inventario. Recarga la página.</p>
          ) : !entradas ? (
            <div className="ip-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ aspectRatio: "5 / 7", borderRadius: 8, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "inv-shimmer 1.4s ease-in-out infinite" }} />
                  <div style={{ height: 14, borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
                </div>
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
              <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: hayFiltros ? "0 0 12px" : 0 }}>
                {hayFiltros ? "Ningún resultado" : "Todavía no tiene cartas en el inventario"}
              </p>
              {hayFiltros && <button type="button" onClick={limpiar} style={{ fontFamily: MONO, fontSize: 10, color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Limpiar filtros</button>}
            </div>
          ) : (
            <div className="ip-grid">
              {filtradas.slice(0, visibles).map(({ card, setId, language, qty }) => {
                const precio = precioDe(card, setId);
                const destacada = esDestacada(card, setId);
                return (
                  <div key={`${setId}-${card.id}-${card.version}-${language}`} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <div style={{ position: "relative" }}>
                      <InvTiltCard card={card} onClick={() => setAbierta(card)} />
                      <div title={languageLabel(language)} style={{ position: "absolute", bottom: 6, left: 6, zIndex: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 5, background: "rgba(5,7,13,0.85)", pointerEvents: "none" }}>
                        <FlagIcon code={language} width={16} />
                        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", color: INK0, fontWeight: 700 }}>{language.toUpperCase()}</span>
                      </div>
                      {destacada && (
                        <span title="Carta destacada" style={{ position: "absolute", top: 6, left: 6, zIndex: 10, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(46,230,193,0.2)" }}>
                          <Star size={13} color={COURT} fill={COURT} strokeWidth={2.2} />
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: INK2, flexShrink: 0 }}>#{String(card.card_number).padStart(3, "0")}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: precio !== null ? COURT : INK2, fontWeight: 700 }}>{precio !== null ? `$${precio.toFixed(2)}` : "—"}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: INK0, fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)" }}>x{qty}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {entradas && visibles < filtradas.length && <div ref={centinela} style={{ height: 1 }} />}
          {entradas && filtradas.length > 0 && (
            <p style={{ textAlign: "center", padding: "24px 0", margin: 0, fontFamily: MONO, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
              {visibles < filtradas.length ? "Cargando más cartas…" : `${filtradas.length} cartas en total`}
            </p>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}
