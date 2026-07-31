"use client";

/**
 * Panel de admin: mapeo de nuestras cartas contra el catálogo de TCGplayer.
 *
 * Las cartas que el emparejamiento automático no pudo resolver quedan con un
 * campo para pegar el enlace de TCGplayer. Lo que se pega ahí se guarda en
 * tcg_mapping_fixes y es lo que alimenta el scraper de precios más adelante.
 *
 * Los datos salen de /tcg-mapping.json, que genera
 * `node scripts/tcg-mapping-report.mjs` a partir de scripts/tcgplayer-mapping/.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { Search, ChevronRight, ChevronDown, Check, X, ExternalLink, RefreshCw, Plus, Clock, ImageOff } from "lucide-react";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const WARN  = "#e8a33d";
const CRIT  = "#ff6b74";
const BG0   = "#05070d";
const BG1   = "#0b0f18";
const BG2   = "#121826";
const LINE  = "rgba(255,255,255,0.08)";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

type Flag = 0 | 1 | 2;                        // 0 lista · 1 revisar · 2 sin match
type CardRow = [number, string, number, Flag, number];

interface SetRow {
  id: string;
  nombre: string;
  tcg: string | null;
  code: string | null;
  propio: boolean;
  s: { total: number; ok: number; review: number; missing: number; pct: number };
  cards: CardRow[];
}

interface Pendiente {
  set: string; num: number; name: string;
  status: "review" | "missing"; tcg: string | null; note: string | null;
}

interface Data {
  filas: SetRow[];
  pendientes: Pendiente[];
  sinEquivalente: { id: string; nombre: string; motivo: string }[];
  resumen: { tot: number; ok: number; rev: number; mis: number; sets: number };
}

interface Fix {
  set_id: string; card_number: number; product_id: number;
  tcgplayer_url: string; card_name?: string | null;
}

interface SetRequest {
  id?: string;
  tcg_set_name: string;
  tcg_url: string;
  cover_url: string | null;
  parent_series: string | null;   // null = independiente, sin expansión
  cards_estimadas: number | null;
  status: "pendiente" | "procesado";
  note: string | null;
  created_at?: string;
}

const ESTADO: Record<Flag, { txt: string; color: string }> = {
  0: { txt: "Lista",     color: COURT },
  1: { txt: "Revisar",   color: WARN  },
  2: { txt: "Sin match", color: CRIT  },
};

/** De "https://www.tcgplayer.com/product/676855/pokemon-…" saca 676855. */
function productIdFrom(input: string): number | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return +s;
  const m = s.match(/tcgplayer\.com\/product\/(\d+)/i);
  return m ? +m[1] : null;
}

export default function MapeoPage() {
  const supabase = useMemo(() => createClient(), []);
  const router   = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [data, setData]       = useState<Data | null>(null);
  const [fixes, setFixes]     = useState<Record<string, Fix>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busq, setBusq]       = useState("");
  const [filtro, setFiltro]   = useState<"todos" | "pendientes" | "completos">("todos");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [solicitudes, setSolicitudes] = useState<SetRequest[]>([]);

  const keyOf = (setId: string, num: number) => `${setId}:${num}`;

  /* Solo admins, igual que el resto del panel */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: perfil } = await supabase
        .from("players").select("role").eq("user_id", user.id).single();
      if (perfil?.role !== "admin") { router.replace("/dashboard"); return; }
      if (vivo) setVerificando(false);
    })();
    return () => { vivo = false; };
  }, [supabase, router]);

  /* Datos del mapeo + lo que ya se resolvió a mano */
  useEffect(() => {
    if (verificando) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/tcg-mapping.json");
        if (!res.ok) throw new Error("No se pudo cargar el mapeo");
        const json: Data = await res.json();

        const [{ data: rows }, { data: reqs }] = await Promise.all([
          supabase.from("tcg_mapping_fixes")
            .select("set_id, card_number, product_id, tcgplayer_url, card_name"),
          supabase.from("tcg_set_requests")
            .select("*").order("created_at", { ascending: false }),
        ]);

        if (!vivo) return;
        setData(json);
        setFixes(Object.fromEntries((rows ?? []).map(r => [keyOf(r.set_id, r.card_number), r as Fix])));
        setSolicitudes((reqs ?? []) as SetRequest[]);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "Error cargando el mapeo");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [supabase, verificando]);

  const guardarFix = useCallback(async (setId: string, num: number, name: string, url: string) => {
    const pid = productIdFrom(url);
    if (!pid) return { ok: false as const, msg: "Ese enlace no tiene un número de producto de TCGplayer" };

    const fix: Fix = {
      set_id: setId, card_number: num, product_id: pid,
      tcgplayer_url: `https://www.tcgplayer.com/product/${pid}`, card_name: name,
    };
    const { error: err } = await supabase
      .from("tcg_mapping_fixes")
      .upsert(fix, { onConflict: "set_id,card_number" });
    if (err) return { ok: false as const, msg: err.message };

    setFixes(prev => ({ ...prev, [keyOf(setId, num)]: fix }));
    return { ok: true as const };
  }, [supabase]);

  const borrarFix = useCallback(async (setId: string, num: number) => {
    await supabase.from("tcg_mapping_fixes").delete().eq("set_id", setId).eq("card_number", num);
    setFixes(prev => {
      const next = { ...prev };
      delete next[keyOf(setId, num)];
      return next;
    });
  }, [supabase]);

  const visibles = useMemo(() => {
    if (!data) return [];
    const q = busq.trim().toLowerCase();
    return data.filas.filter(f => {
      const pend = f.s.review + f.s.missing;
      if (filtro === "pendientes" && pend === 0) return false;
      if (filtro === "completos"  && pend > 0)   return false;
      if (!q) return true;
      if (f.nombre.toLowerCase().includes(q)) return true;
      if ((f.tcg ?? "").toLowerCase().includes(q)) return true;
      return f.cards.some(c => c[1].toLowerCase().includes(q));
    });
  }, [data, busq, filtro]);

  const resueltas = Object.keys(fixes).length;

  if (verificando) return <Estado texto="Verificando acceso…" />;
  if (cargando) return <Estado texto="Cargando el mapeo…" />;
  if (error)    return <Estado texto={error} tono={CRIT} />;
  if (!data)    return <Estado texto="Sin datos" />;

  const { resumen } = data;
  const pctOk = ((resumen.ok / resumen.tot) * 100).toFixed(2);

  return (
    <div style={{ background: BG0, minHeight: "100vh", padding: "28px 20px 90px" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>

        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "22px", height: "1px", background: COURT }} />
          Administración
        </div>

        <h1 style={{
          fontFamily: DISP, fontSize: "clamp(24px, 3.2vw, 36px)", color: INK0,
          margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.1,
        }}>
          Mapeo con TCGplayer
        </h1>
        <p style={{ color: INK2, fontSize: "14px", margin: "0 0 26px", maxWidth: "62ch", lineHeight: 1.6 }}>
          Qué carta nuestra corresponde a cuál de TCGplayer. Las que no se pudieron emparejar
          solas tienen un espacio para pegar el enlace: búscala en TCGplayer y pégalo ahí.
        </p>

        {/* Resumen */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
          gap: "1px", background: LINE, border: `1px solid ${LINE}`,
          borderRadius: "8px", overflow: "hidden", marginBottom: "34px",
        }}>
          <Stat k="Cartas" v={resumen.tot.toLocaleString("es")} sub={`en ${resumen.sets} sets`} />
          <Stat k="Identificadas" v={`${pctOk}%`} sub={resumen.ok.toLocaleString("es")} color={COURT} />
          <Stat k="Por revisar" v={String(resumen.rev)} sub="ambiguas" color={resumen.rev ? WARN : undefined} />
          <Stat k="Sin match" v={String(resumen.mis)} sub="no están allá" color={resumen.mis ? CRIT : undefined} />
          <Stat k="Resueltas por ti" v={String(resueltas)} sub="enlaces pegados" color={resueltas ? BALL : undefined} />
        </div>

        {/* Encargar un set nuevo */}
        <Seccion
          titulo="Agregar un set nuevo"
          sub="Pega el enlace de la colección en TCGplayer. Yo lo traigo: cartas, imágenes y precios."
        >
          <NuevoSet
            supabase={supabase}
            solicitudes={solicitudes}
            onCreada={s => setSolicitudes(prev => [s, ...prev])}
            onBorrada={id => setSolicitudes(prev => prev.filter(s => s.id !== id))}
          />
        </Seccion>

        {/* Pendientes */}
        <Seccion
          titulo="Cartas que necesitan tu enlace"
          sub={`${data.pendientes.length} en total. Busca la carta en TCGplayer, copia el enlace y pégalo.`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.pendientes.map(p => {
              const setId = data.filas.find(f => f.nombre === p.set)?.id ?? p.set;
              return (
                <FilaPendiente
                  key={`${setId}:${p.num}`}
                  pendiente={p}
                  setId={setId}
                  fix={fixes[keyOf(setId, p.num)]}
                  onGuardar={guardarFix}
                  onBorrar={borrarFix}
                />
              );
            })}
          </div>
        </Seccion>

        {/* Sets sin equivalente */}
        <Seccion
          titulo="Sets que TCGplayer no tiene"
          sub="Sus precios tendrían que seguir saliendo de Scrydex."
        >
          <div style={{ border: `1px solid ${LINE}`, borderRadius: "8px", overflow: "hidden" }}>
            {data.sinEquivalente.map((s, i) => (
              <div key={s.id} style={{
                display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between",
                padding: "11px 14px", background: BG1,
                borderTop: i ? `1px solid ${LINE}` : "none",
              }}>
                <span style={{ color: INK0, fontSize: "14px", fontWeight: 600 }}>{s.nombre}</span>
                <span style={{ color: INK2, fontSize: "12px", fontFamily: MONO }}>{s.motivo}</span>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Todos los sets */}
        <Seccion titulo="Todos los sets" sub="Toca una fila para ver sus cartas.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
              <Search size={15} color={INK2} strokeWidth={1.8}
                style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={busq}
                onChange={e => setBusq(e.target.value)}
                placeholder="Buscar un set o una carta…"
                style={{
                  width: "100%", background: BG1, color: INK0, border: `1px solid ${LINE}`,
                  borderRadius: "6px", padding: "9px 12px 9px 34px", fontSize: "14px", outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: "6px", overflow: "hidden" }}>
              {(["todos", "pendientes", "completos"] as const).map((f, i) => (
                <button key={f} onClick={() => setFiltro(f)} style={{
                  background: filtro === f ? BG2 : BG1,
                  color: filtro === f ? COURT : INK2,
                  border: "none", borderLeft: i ? `1px solid ${LINE}` : "none",
                  padding: "9px 14px", cursor: "pointer",
                  fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {f === "todos" ? "Todos" : f === "pendientes" ? "Con pendientes" : "Completos"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: "8px", overflow: "hidden" }}>
            {visibles.length === 0 && (
              <div style={{ padding: "26px 14px", color: INK2, fontFamily: MONO, fontSize: "13px" }}>
                Ningún set coincide con «{busq}».
              </div>
            )}
            {visibles.map((f, i) => (
              <SetBloque
                key={f.id}
                set={f}
                primero={i === 0}
                abierto={abiertos.has(f.id)}
                fixes={fixes}
                onToggle={() => setAbiertos(prev => {
                  const next = new Set(prev);
                  if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                  return next;
                })}
                onGuardar={guardarFix}
                onBorrar={borrarFix}
              />
            ))}
          </div>
        </Seccion>

        <p style={{ marginTop: "40px", color: INK2, fontFamily: MONO, fontSize: "11px",
          display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={12} strokeWidth={1.8} />
          Los datos se actualizan corriendo scripts/tcg-mapping-report.mjs
        </p>
      </div>
    </div>
  );
}

/* ── Piezas ──────────────────────────────────────────────────────────────── */

function Estado({ texto, tono = INK2 }: { texto: string; tono?: string }) {
  return (
    <div style={{
      background: BG0, minHeight: "70vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      color: tono, fontFamily: MONO, fontSize: "13px",
    }}>
      {texto}
    </div>
  );
}

function Stat({ k, v, sub, color }: { k: string; v: string; sub: string; color?: string }) {
  return (
    <div style={{ background: BG1, padding: "16px 18px" }}>
      <div style={{
        fontFamily: MONO, fontSize: "10px", letterSpacing: "0.16em",
        textTransform: "uppercase", color: INK2, marginBottom: "7px",
      }}>{k}</div>
      <div style={{
        fontFamily: DISP, fontSize: "25px", fontWeight: 700,
        color: color ?? INK0, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
      }}>{v}</div>
      <div style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function Seccion({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "38px" }}>
      <h2 style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 5px", letterSpacing: "-0.01em" }}>
        {titulo}
      </h2>
      <p style={{ color: INK2, fontSize: "13px", margin: "0 0 16px" }}>{sub}</p>
      {children}
    </section>
  );
}

/**
 * Encargar un set nuevo. El formulario no trae las cartas: guarda el pedido con
 * todo lo necesario para traerlas (enlace, portada, dónde va), porque bajar
 * cientos de imágenes, convertirlas y subirlas a R2 tarda minutos y necesita
 * llaves que no viven en el navegador.
 */
function NuevoSet({ supabase, solicitudes, onCreada, onBorrada }: {
  supabase: ReturnType<typeof createClient>;
  solicitudes: SetRequest[];
  onCreada: (s: SetRequest) => void;
  onBorrada: (id: string) => void;
}) {
  const [url, setUrl]         = useState("");
  const [cover, setCover]     = useState("");
  const [donde, setDonde]     = useState<string>("");     // "" = independiente
  const [hallado, setHallado] = useState<{ name: string; cards: number } | null>(null);
  const [candidatos, setCandidatos] = useState<{ name: string; cards: number }[]>([]);
  const [buscando, setBuscando]     = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  const series = useMemo(() => POKEMON_SERIES.filter(s => !s.standalone), []);

  async function buscar() {
    if (!url.trim()) return;
    setBuscando(true); setMsg(null); setHallado(null); setCandidatos([]);
    try {
      const res = await fetch("/api/admin/tcg-set-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg(json.error ?? "No se encontró el set"); return; }
      setHallado(json.set);
      if (!json.exacto) setCandidatos(json.candidatos ?? []);
    } catch {
      setMsg("No se pudo consultar TCGplayer");
    } finally {
      setBuscando(false);
    }
  }

  async function encargar() {
    if (!hallado) return;
    setGuardando(true); setMsg(null);
    const fila: SetRequest = {
      tcg_set_name: hallado.name,
      tcg_url: url.trim(),
      cover_url: cover.trim() || null,
      parent_series: donde || null,
      cards_estimadas: hallado.cards,
      status: "pendiente",
      note: null,
    };
    const { data, error } = await supabase.from("tcg_set_requests").insert(fila).select().single();
    setGuardando(false);
    if (error) { setMsg(error.message); return; }
    onCreada(data as SetRequest);
    setUrl(""); setCover(""); setDonde(""); setHallado(null); setCandidatos([]);
  }

  const campo = {
    width: "100%", background: BG0, color: INK0, border: `1px solid ${LINE}`,
    borderRadius: "6px", padding: "9px 12px", fontSize: "13px",
    fontFamily: MONO, outline: "none",
  } as const;

  const etiqueta = {
    display: "block", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em",
    textTransform: "uppercase", color: INK2, marginBottom: "6px",
  } as const;

  return (
    <>
      <div style={{
        background: BG1, border: `1px solid ${LINE}`, borderRadius: "8px",
        padding: "18px", display: "flex", flexDirection: "column", gap: "16px",
      }}>
        <div>
          <label style={etiqueta} htmlFor="set-url">Enlace de la colección en TCGplayer</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <input
              id="set-url"
              value={url}
              onChange={e => { setUrl(e.target.value); setHallado(null); setMsg(null); }}
              onKeyDown={e => { if (e.key === "Enter") buscar(); }}
              placeholder="https://www.tcgplayer.com/search/pokemon/…"
              style={{ ...campo, flex: "1 1 340px" }}
            />
            <button
              onClick={buscar}
              disabled={!url.trim() || buscando}
              style={{
                background: url.trim() ? BG2 : BG1, color: url.trim() ? COURT : INK2,
                border: `1px solid ${LINE}`, borderRadius: "6px", padding: "9px 16px",
                cursor: url.trim() ? "pointer" : "default",
                fontFamily: MONO, fontSize: "12px", letterSpacing: "0.06em",
              }}
            >
              {buscando ? "Buscando…" : "Comprobar"}
            </button>
          </div>
        </div>

        {hallado && (
          <div style={{
            background: BG0, border: `1px solid ${COURT}44`, borderRadius: "6px",
            padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
          }}>
            <Check size={15} color={COURT} strokeWidth={2.2} />
            <span style={{ color: INK0, fontWeight: 600, fontSize: "14px" }}>{hallado.name}</span>
            <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>
              {hallado.cards} cartas en TCGplayer
            </span>
          </div>
        )}

        {candidatos.length > 1 && (
          <div>
            <span style={etiqueta}>No hubo coincidencia exacta — elige cuál es</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {candidatos.map(c => (
                <button key={c.name} onClick={() => setHallado(c)} style={{
                  background: hallado?.name === c.name ? BG2 : BG0,
                  color: hallado?.name === c.name ? COURT : INK2,
                  border: `1px solid ${hallado?.name === c.name ? COURT : LINE}`,
                  borderRadius: "6px", padding: "6px 10px", cursor: "pointer",
                  fontFamily: MONO, fontSize: "11px",
                }}>
                  {c.name} · {c.cards}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={etiqueta} htmlFor="cover-url">Portada del set (opcional)</label>
          <input
            id="cover-url"
            value={cover}
            onChange={e => setCover(e.target.value)}
            placeholder="Enlace de la imagen del logo"
            style={campo}
          />
          <span style={{
            display: "flex", alignItems: "center", gap: "6px",
            color: INK2, fontSize: "12px", marginTop: "6px",
          }}>
            <ImageOff size={12} strokeWidth={1.8} />
            Si lo dejas vacío se genera un logo con el nombre, como el de Miscellaneous Cards.
          </span>
        </div>

        <div>
          <span style={etiqueta}>¿Dónde va?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <button onClick={() => setDonde("")} style={{
              background: donde === "" ? BG2 : BG0,
              color: donde === "" ? COURT : INK2,
              border: `1px solid ${donde === "" ? COURT : LINE}`,
              borderRadius: "6px", padding: "7px 12px", cursor: "pointer",
              fontFamily: MONO, fontSize: "11px",
            }}>
              Independiente
            </button>
            {series.map(s => (
              <button key={s.id} onClick={() => setDonde(s.id)} style={{
                background: donde === s.id ? BG2 : BG0,
                color: donde === s.id ? COURT : INK2,
                border: `1px solid ${donde === s.id ? COURT : LINE}`,
                borderRadius: "6px", padding: "7px 12px", cursor: "pointer",
                fontFamily: MONO, fontSize: "11px",
              }}>
                {s.name.replace(/ Series$/, "")}
              </button>
            ))}
          </div>
          <span style={{ display: "block", color: INK2, fontSize: "12px", marginTop: "6px" }}>
            Independiente sale con tarjeta propia junto a las expansiones, como Prize Pack Series.
          </span>
        </div>

        {msg && <span style={{ color: CRIT, fontSize: "12px", fontFamily: MONO }}>{msg}</span>}

        <button
          onClick={encargar}
          disabled={!hallado || guardando}
          style={{
            alignSelf: "flex-start",
            background: hallado ? COURT : BG2, color: hallado ? BG0 : INK2,
            border: "none", borderRadius: "6px", padding: "10px 20px",
            cursor: hallado ? "pointer" : "default",
            fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em",
            display: "inline-flex", alignItems: "center", gap: "7px",
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
          {guardando ? "Guardando…" : "Encargar este set"}
        </button>
      </div>

      {solicitudes.length > 0 && (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {solicitudes.map(s => {
            const listo = s.status === "procesado";
            return (
              <div key={s.id} style={{
                background: BG1, border: `1px solid ${listo ? `${COURT}44` : LINE}`,
                borderRadius: "8px", padding: "11px 14px",
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px",
              }}>
                {listo
                  ? <Check size={15} color={COURT} strokeWidth={2.2} />
                  : <Clock size={15} color={WARN} strokeWidth={2} />}
                <span style={{ color: INK0, fontWeight: 600, fontSize: "14px", flex: "1 1 200px" }}>
                  {s.tcg_set_name}
                </span>
                <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>
                  {s.cards_estimadas ?? "?"} cartas
                </span>
                <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>
                  {s.parent_series
                    ? (POKEMON_SERIES.find(x => x.id === s.parent_series)?.name ?? s.parent_series)
                    : "Independiente"}
                </span>
                {s.cover_url && (
                  <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>con portada</span>
                )}
                <span style={{
                  fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase",
                  color: listo ? COURT : WARN, border: `1px solid ${listo ? COURT : WARN}55`,
                  borderRadius: "999px", padding: "2px 9px",
                }}>
                  {listo ? "Listo" : "Pendiente"}
                </span>
                {!listo && s.id && (
                  <button onClick={() => { supabase.from("tcg_set_requests").delete().eq("id", s.id!).then(() => onBorrada(s.id!)); }}
                    title="Cancelar el encargo"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: INK2, display: "inline-flex", padding: 0 }}>
                    <X size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Carta sin match: muestra el campo para pegar el enlace de TCGplayer. */
function FilaPendiente({ pendiente, setId, fix, onGuardar, onBorrar }: {
  pendiente: Pendiente;
  setId: string;
  fix?: Fix;
  onGuardar: (setId: string, num: number, name: string, url: string) => Promise<{ ok: boolean; msg?: string }>;
  onBorrar: (setId: string, num: number) => Promise<void>;
}) {
  const [valor, setValor]   = useState("");
  const [msg, setMsg]       = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    const r = await onGuardar(setId, pendiente.num, pendiente.name, valor);
    setGuardando(false);
    if (r.ok) { setValor(""); } else { setMsg(r.msg ?? "No se pudo guardar"); }
  }

  const tono = pendiente.status === "missing" ? CRIT : WARN;

  return (
    <div style={{
      background: BG1, border: `1px solid ${fix ? `${COURT}55` : LINE}`,
      borderRadius: "8px", padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <span style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase",
          color: tono, border: `1px solid ${tono}`, borderRadius: "999px", padding: "2px 8px",
        }}>
          {pendiente.status === "missing" ? "Sin match" : "Revisar"}
        </span>
        <span style={{ color: INK0, fontWeight: 600, fontSize: "15px" }}>{pendiente.name}</span>
        <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>
          {pendiente.set} · nº {pendiente.num}
        </span>
        {pendiente.tcg && (
          <span style={{ color: INK2, fontFamily: MONO, fontSize: "12px" }}>
            TCGplayer sugiere: {pendiente.tcg}
          </span>
        )}
      </div>

      {fix ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <Check size={15} color={COURT} strokeWidth={2.2} />
          <a href={fix.tcgplayer_url} target="_blank" rel="noopener noreferrer"
            style={{ color: COURT, fontFamily: MONO, fontSize: "13px",
              display: "inline-flex", alignItems: "center", gap: "5px" }}>
            Producto {fix.product_id}
            <ExternalLink size={12} strokeWidth={1.8} />
          </a>
          <button onClick={() => onBorrar(setId, pendiente.num)} style={{
            background: "transparent", border: `1px solid ${LINE}`, borderRadius: "6px",
            color: INK2, cursor: "pointer", padding: "5px 10px",
            fontFamily: MONO, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px",
          }}>
            <X size={12} strokeWidth={1.8} /> Quitar
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <input
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && valor.trim()) guardar(); }}
            placeholder="Pega aquí el enlace de TCGplayer"
            style={{
              flex: "1 1 320px", minWidth: 0, background: BG0, color: INK0,
              border: `1px solid ${LINE}`, borderRadius: "6px",
              padding: "9px 12px", fontSize: "13px", fontFamily: MONO, outline: "none",
            }}
          />
          <button
            onClick={guardar}
            disabled={!valor.trim() || guardando}
            style={{
              background: valor.trim() ? COURT : BG2,
              color: valor.trim() ? BG0 : INK2,
              border: "none", borderRadius: "6px", padding: "9px 16px",
              cursor: valor.trim() ? "pointer" : "default",
              fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em",
            }}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {msg && <span style={{ color: CRIT, fontSize: "12px", fontFamily: MONO }}>{msg}</span>}
    </div>
  );
}

/** Un set en la lista, desplegable carta por carta. */
function SetBloque({ set, primero, abierto, fixes, onToggle, onGuardar, onBorrar }: {
  set: SetRow; primero: boolean; abierto: boolean;
  fixes: Record<string, Fix>;
  onToggle: () => void;
  onGuardar: (setId: string, num: number, name: string, url: string) => Promise<{ ok: boolean; msg?: string }>;
  onBorrar: (setId: string, num: number) => Promise<void>;
}) {
  const pend = set.s.review + set.s.missing;
  const pct  = set.s.total ? Math.round((set.s.ok / set.s.total) * 100) : 0;
  const tono = pend === 0 ? COURT : set.s.missing ? CRIT : WARN;

  return (
    <div style={{ borderTop: primero ? "none" : `1px solid ${LINE}` }}>
      <button
        onClick={onToggle}
        aria-expanded={abierto}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "12px",
          background: abierto ? BG2 : BG1, border: "none", cursor: "pointer",
          padding: "12px 14px", textAlign: "left", color: INK0,
        }}
      >
        {abierto
          ? <ChevronDown size={15} color={INK2} strokeWidth={2} />
          : <ChevronRight size={15} color={INK2} strokeWidth={2} />}

        <span style={{ flex: "1 1 auto", minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 600, fontSize: "14px" }}>{set.nombre}</span>
          {set.tcg && (
            <span style={{ display: "block", color: INK2, fontFamily: MONO, fontSize: "11px", marginTop: "2px" }}>
              {set.tcg}
            </span>
          )}
        </span>

        <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, fontVariantNumeric: "tabular-nums" }}>
          {set.s.ok}/{set.s.total}
        </span>

        <span style={{ width: "72px", height: "5px", background: BG0, borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
          <span style={{ display: "block", height: "100%", width: `${pct}%`, background: tono }} />
        </span>

        <span style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase",
          color: tono, border: `1px solid ${tono}55`, borderRadius: "999px",
          padding: "2px 8px", whiteSpace: "nowrap",
        }}>
          {set.propio ? "Del scraper" : pend === 0 ? "Completo" : `${pend} pendiente${pend > 1 ? "s" : ""}`}
        </span>
      </button>

      {abierto && (
        <div style={{ maxHeight: "420px", overflowY: "auto", background: BG0 }}>
          {set.cards.map(([num, nombre, pid, flag]) => {
            const fix = fixes[`${set.id}:${num}`];
            return (
              <div key={num} style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px",
                padding: "7px 14px 7px 40px", borderTop: `1px solid ${LINE}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, minWidth: "38px",
                  textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num}</span>
                <span style={{ flex: "1 1 180px", minWidth: 0, fontSize: "13px", color: INK0 }}>{nombre}</span>

                {(pid || fix) ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <a href={`https://www.tcgplayer.com/product/${fix?.product_id ?? pid}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: fix ? BALL : COURT, fontFamily: MONO, fontSize: "12px",
                        display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {fix?.product_id ?? pid}
                      <ExternalLink size={11} strokeWidth={1.8} />
                    </a>
                    {fix && (
                      <button
                        onClick={() => onBorrar(set.id, num)}
                        title="Quitar el enlace que pegaste"
                        style={{ background: "transparent", border: "none", cursor: "pointer",
                          color: INK2, display: "inline-flex", padding: 0 }}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    )}
                  </span>
                ) : (
                  <PegarEnlace setId={set.id} num={num} nombre={nombre} onGuardar={onGuardar} />
                )}

                <span style={{
                  fontFamily: MONO, fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase",
                  color: fix ? BALL : ESTADO[flag].color, minWidth: "68px", textAlign: "right",
                }}>
                  {fix ? "Tuya" : ESTADO[flag].txt}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Campo compacto dentro del detalle de un set. */
function PegarEnlace({ setId, num, nombre, onGuardar }: {
  setId: string; num: number; nombre: string;
  onGuardar: (setId: string, num: number, name: string, url: string) => Promise<{ ok: boolean; msg?: string }>;
}) {
  const [valor, setValor] = useState("");
  const [malo, setMalo]   = useState(false);

  return (
    <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
      <input
        value={valor}
        onChange={e => { setValor(e.target.value); setMalo(false); }}
        onKeyDown={async e => {
          if (e.key !== "Enter" || !valor.trim()) return;
          const r = await onGuardar(setId, num, nombre, valor);
          if (r.ok) setValor(""); else setMalo(true);
        }}
        placeholder="Pega el enlace de TCGplayer y da Enter"
        style={{
          background: BG1, color: INK0, border: `1px solid ${malo ? CRIT : LINE}`,
          borderRadius: "5px", padding: "5px 9px", fontSize: "12px",
          fontFamily: MONO, width: "230px", outline: "none",
        }}
      />
    </span>
  );
}
