"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { loadManySets, SET_CARDS } from "@/data/pokemon-cards";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { InvTiltCard, INV_CARD_KEYFRAMES } from "@/components/InventoryCard";
import { CURRENCY_SYMBOL, getCurrencyForCountry } from "@/lib/currency";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { ArrowLeftRight, Inbox, Search, X, Minus, Plus, Send, Heart } from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);
const SET_NAME = (id: string) => ALL_SETS.find(s => s.id === id)?.name ?? id;

interface Player {
  user_id:    string;
  username:   string | null;
  first_name: string | null;
  last_name:  string | null;
  photo_url:  string | null;
  pais:       string | null;
}

interface InvRow  { card_id: string; set_id: string; version: string | null; quantity: number }
interface WishRow { card_id: string; set_id: string }

/** Entrada resuelta: fila de inventario + metadata de la carta */
interface Entry {
  key:      string;
  card:     PokemonCard;
  set_id:   string;
  version:  string;
  quantity: number;
  /** Precio unitario en USD según Scrydex, o null si no hay dato */
  price:    number | null;
}

/** { "me5": { "me5-12": { normal: 0.25, reverseHolofoil: 0.5 } } } */
type PriceMaps = Record<string, Record<string, Record<string, number>>>;

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const rowKey = (r: { card_id: string; set_id: string; version?: string | null }) =>
  `${r.card_id}::${r.set_id}::${r.version ?? ""}`;

export default function TradesPage() {
  return (
    <Suspense fallback={null}>
      <TradesPageInner />
    </Suspense>
  );
}

function TradesPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const router   = useRouter();
  const params   = useSearchParams();

  const [meId, setMeId]       = useState<string | null>(null);
  const [myCurrency, setMyCurrency] = useState("COP");

  /* ── Selección de contraparte ─────────────────────────────── */
  const [search, setSearch]   = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [peer, setPeer]       = useState<Player | null>(null);

  /* ── Datos cargados ───────────────────────────────────────── */
  const [loadingData, setLoadingData] = useState(false);
  const [myInv, setMyInv]         = useState<InvRow[]>([]);
  const [myWish, setMyWish]       = useState<WishRow[]>([]);
  const [peerWish, setPeerWish]   = useState<WishRow[]>([]);
  const [peerInv, setPeerInv]     = useState<InvRow[]>([]);
  const [priceMaps, setPriceMaps] = useState<PriceMaps>({});
  const [cardsReady, setCardsReady] = useState(0); // fuerza re-render al cargar sets
  const [peerTab, setPeerTab]     = useState<"todo" | "wishlist">("todo");

  /* ── Selección del trade ──────────────────────────────────── */
  const [offer, setOffer]     = useState<Record<string, number>>({});
  const [request, setRequest] = useState<Record<string, number>>({});
  const [cash, setCash]       = useState("");
  const [cashPayer, setCashPayer] = useState<"from" | "to">("to");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  /* ── Filtros ──────────────────────────────────────────────── */
  const [fNombre, setFNombre]     = useState("");
  const [fSet, setFSet]           = useState("");
  const [fVariante, setFVariante] = useState("");

  /* ── Usuario actual ───────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMeId(user.id);
      const { data: me } = await supabase
        .from("players").select("pais").eq("user_id", user.id).maybeSingle();
      if (me?.pais) setMyCurrency(getCurrencyForCountry(me.pais));
    })();
  }, [supabase]);

  /* ── Buscador de jugadores (debounce) ─────────────────────── */
  useEffect(() => {
    const q = search.trim();
    const timer = setTimeout(async () => {
      if (q.length < 2) { setResults([]); setSearching(false); return; }
      setSearching(true);
      const safe = q.replace(/[%,()]/g, "");
      const { data } = await supabase
        .from("players")
        .select("user_id, username, first_name, last_name, photo_url, pais")
        .not("username", "is", null)
        .or(`username.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
        .limit(20);
      setResults((data ?? []).filter((p: Player) => p.user_id !== meId));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, supabase, meId]);

  /* ── Preselección por ?u=username ─────────────────────────── */
  const preselect = params.get("u");
  useEffect(() => {
    if (!preselect || peer || !meId) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("user_id, username, first_name, last_name, photo_url, pais")
        .eq("username", preselect).maybeSingle();
      if (data && data.user_id !== meId) setPeer(data as Player);
    })();
  }, [preselect, peer, meId, supabase]);

  /* ── Cargar inventarios al elegir contraparte ─────────────── */
  useEffect(() => {
    if (!peer || !meId) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      setOffer({}); setRequest({}); setCash(""); setMessage(""); setSent(false);
      const [{ data: mine }, { data: myWishData }, { data: wish }, { data: theirs }] = await Promise.all([
        supabase.from("card_inventory").select("card_id, set_id, version, quantity")
          .eq("user_id", meId).gt("quantity", 0),
        supabase.from("card_wishlist").select("card_id, set_id")
          .eq("user_id", meId),
        supabase.from("card_wishlist").select("card_id, set_id")
          .eq("user_id", peer.user_id),
        supabase.from("card_inventory").select("card_id, set_id, version, quantity")
          .eq("user_id", peer.user_id).gt("quantity", 0),
      ]);
      if (cancelled) return;

      const myRows    = (mine       ?? []) as InvRow[];
      const myWishRows= (myWishData ?? []) as WishRow[];
      const wishRows  = (wish       ?? []) as WishRow[];
      const peerRows  = (theirs     ?? []) as InvRow[];

      setMyInv(myRows);
      setMyWish(myWishRows);
      setPeerWish(wishRows);
      setPeerInv(peerRows);
      setLoadingData(false);

      // Solo cargan los sets realmente necesarios: los del cruce y los de su inventario
      const wishKeys = new Set(wishRows.map(w => `${w.card_id}::${w.set_id}`));
      const needed = new Set<string>();
      myRows.forEach(r => { if (wishKeys.has(`${r.card_id}::${r.set_id}`)) needed.add(r.set_id); });
      peerRows.forEach(r => needed.add(r.set_id));

      for (const setId of needed) {
        if (cancelled) return;
        await loadManySets([setId]);
        if (!cancelled) setCardsReady(n => n + 1);
      }

      // Precios Scrydex de los sets involucrados
      await Promise.all([...needed].map(async setId => {
        const sc = SCRYDEX_SET_CODES[setId];
        if (!sc) return;
        const { data: priceRows } = await supabase
          .from("card_prices").select("card_id, prices").like("card_id", `${sc}-%`);
        if (cancelled || !priceRows) return;
        const map: Record<string, Record<string, number>> = {};
        for (const row of priceRows) map[row.card_id] = row.prices as Record<string, number>;
        setPriceMaps(prev => ({ ...prev, [setId]: map }));
      }));
    })();
    return () => { cancelled = true; };
  }, [peer, meId, supabase]);

  /* ── Precio unitario Scrydex (USD) ────────────────────────── */
  const priceOf = useCallback((card: PokemonCard, setId: string): number | null => {
    const sc = SCRYDEX_SET_CODES[setId];
    if (!sc) return null;
    const byCard = priceMaps[setId]?.[`${sc}-${card.card_number}`];
    if (!byCard) return null;
    const vk = card.version.toLowerCase().replace(/\s+/g, "");
    return byCard[vk] ?? byCard[card.version] ?? byCard["normal"] ?? null;
  }, [priceMaps]);

  /* ── Resolución de metadata ───────────────────────────────── */
  const resolve = useCallback((rows: InvRow[]): Entry[] => {
    void cardsReady; // recalcula cuando termina de cargar cada set
    return rows.map(r => {
      const card = SET_CARDS[r.set_id]?.find(c => String(c.id) === String(r.card_id));
      if (!card) return null;
      return {
        key: rowKey(r),
        card,
        set_id: r.set_id,
        version: r.version ?? card.version,
        quantity: r.quantity,
        price: priceOf(card, r.set_id),
      };
    }).filter(Boolean) as Entry[];
  }, [cardsReady, priceOf]);

  /** Mis cartas que él necesita = mi inventario ∩ su wishlist */
  const matches = useMemo(() => {
    const wishKeys = new Set(peerWish.map(w => `${w.card_id}::${w.set_id}`));
    return resolve(myInv.filter(r => wishKeys.has(`${r.card_id}::${r.set_id}`)));
  }, [myInv, peerWish, resolve]);

  const peerEntries = useMemo(() => resolve(peerInv), [peerInv, resolve]);

  /** Su inventario ∩ mi wishlist = lo que yo ando buscando y él tiene */
  const peerWanted = useMemo(() => {
    const mine = new Set(myWish.map(w => `${w.card_id}::${w.set_id}`));
    return peerEntries.filter(e => mine.has(`${e.card.id}::${e.set_id}`));
  }, [peerEntries, myWish]);

  /* ── Filtros aplicados a ambas columnas ───────────────────── */
  const applyFilters = useCallback((entries: Entry[]) => entries.filter(e => {
    if (fNombre.trim() && !e.card.name.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
    if (fSet && e.set_id !== fSet) return false;
    if (fVariante && e.card.version !== fVariante) return false;
    return true;
  }), [fNombre, fSet, fVariante]);

  const filteredMatches = useMemo(() => applyFilters(matches), [matches, applyFilters]);
  const filteredPeerAll = useMemo(() => applyFilters(peerEntries), [peerEntries, applyFilters]);
  const filteredPeerWanted = useMemo(() => applyFilters(peerWanted), [peerWanted, applyFilters]);
  const filteredPeer = peerTab === "todo" ? filteredPeerAll : filteredPeerWanted;

  const setOptions = useMemo(() => {
    const ids = new Set([...matches, ...peerEntries].map(e => e.set_id));
    return [...ids].sort((a, b) => SET_NAME(a).localeCompare(SET_NAME(b)));
  }, [matches, peerEntries]);

  const versionOptions = useMemo(() => {
    const vs = new Set([...matches, ...peerEntries].map(e => e.card.version));
    return [...vs].sort();
  }, [matches, peerEntries]);

  const hasFilters = !!(fNombre || fSet || fVariante);
  const clearFilters = () => { setFNombre(""); setFSet(""); setFVariante(""); };

  /* ── Selección ────────────────────────────────────────────── */
  const bump = (
    set: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    key: string, delta: number, max: number,
  ) => {
    set(prev => {
      const next = Math.min(max, Math.max(0, (prev[key] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[key]; else copy[key] = next;
      return copy;
    });
  };

  const offerCount   = Object.values(offer).reduce((a, b) => a + b, 0);
  const requestCount = Object.values(request).reduce((a, b) => a + b, 0);
  const cashNum      = parseFloat(cash.replace(/[^\d.]/g, "")) || 0;
  const canSend      = !!peer && !!meId && offerCount > 0 && (requestCount > 0 || cashNum > 0);

  const entryByKey = useMemo(() => {
    const m: Record<string, Entry> = {};
    [...matches, ...peerEntries].forEach(e => { m[e.key] = e; });
    return m;
  }, [matches, peerEntries]);

  /** Total USD de una selección; ignora cartas sin precio conocido */
  const totalOf = useCallback((sel: Record<string, number>) =>
    Object.entries(sel).reduce((sum, [key, qty]) => {
      const p = entryByKey[key]?.price;
      return p != null ? sum + p * qty : sum;
    }, 0)
  , [entryByKey]);

  const offerTotal   = useMemo(() => totalOf(offer),   [offer, totalOf]);
  const requestTotal = useMemo(() => totalOf(request), [request, totalOf]);

  /* ── Enviar solicitud ─────────────────────────────────────── */
  async function sendTrade() {
    if (!canSend || !peer || !meId || sending) return;
    setSending(true);
    try {
      const { data: trade, error } = await supabase.from("trades").insert({
        from_user_id: meId,
        to_user_id: peer.user_id,
        status: "pending",
        cash_amount: cashNum > 0 ? cashNum : null,
        cash_currency: cashNum > 0 ? myCurrency : null,
        cash_payer: cashNum > 0 ? cashPayer : null,
        message: message.trim() || null,
      }).select("id").single();

      if (error || !trade) throw error ?? new Error("No se pudo crear el intercambio");

      const rows = [
        ...Object.entries(offer).map(([key, qty]) => ({ key, qty, side: "offer" as const })),
        ...Object.entries(request).map(([key, qty]) => ({ key, qty, side: "request" as const })),
      ].map(({ key, qty, side }) => {
        const e = entryByKey[key];
        return {
          trade_id: trade.id, side,
          card_id: String(e.card.id), set_id: e.set_id,
          version: e.version, quantity: qty,
        };
      });

      const { error: cardsError } = await supabase.from("trade_cards").insert(rows);
      if (cardsError) throw cardsError;

      await fetch("/api/trades/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_id: trade.id, kind: "new" }),
      }).catch(() => {});

      setSent(true);
      setOffer({}); setRequest({}); setCash(""); setMessage("");
    } catch (err) {
      console.error("[Trades] Error enviando solicitud:", err);
      alert("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const peerName = peer ? (peer.username || `${peer.first_name ?? ""} ${peer.last_name ?? ""}`.trim()) : "";

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="trade-page">
      <style>{INV_CARD_KEYFRAMES}{`
        .trade-page { padding: 24px; min-height: 100vh; }
        .trade-cols { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .trade-panel-scroll { overflow: visible; }

        /* Escritorio: la página no scrollea, cada columna sí */
        @media (min-width: 1100px) {
          .trade-page {
            height: 100vh; min-height: 0;
            display: flex; flex-direction: column;
            overflow: hidden;
          }
          .trade-cols {
            grid-template-columns: 1fr 1fr 320px;
            flex: 1; min-height: 0;
          }
          .trade-col {
            display: flex; flex-direction: column;
            min-height: 0; overflow: hidden;
          }
          .trade-panel-scroll {
            flex: 1; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
            padding-right: 6px; margin-right: -6px;
          }
        }

        .trade-panel-scroll::-webkit-scrollbar { width: 8px; }
        .trade-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .trade-panel-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12); border-radius: 4px;
        }
        .trade-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

        .trade-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; }
        .trade-input {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 9px 12px; color: ${INK0};
          font-family: ${MONO}; font-size: 12px; outline: none; width: 100%;
        }
        .trade-input:focus { border-color: ${COURT}66; }
        .trade-panel {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 16px;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ArrowLeftRight size={22} color={COURT} strokeWidth={1.8} />
          <h1 style={{ fontFamily: DISP, fontSize: "26px", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
            Intercambios
          </h1>
        </div>
        <Link href="/dashboard/trades/solicitudes" style={{
          display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
          border: `1px solid ${COURT}44`, background: `${COURT}12`, borderRadius: 10,
          padding: "9px 14px", color: COURT, fontFamily: MONO, fontSize: 11,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          <Inbox size={14} strokeWidth={1.8} /> Mis solicitudes
        </Link>
      </div>

      {/* Selector de contraparte */}
      {!peer ? (
        <div className="trade-panel" style={{ maxWidth: 620 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>
            ¿Con quién quieres intercambiar?
          </p>
          <div style={{ position: "relative" }}>
            <Search size={15} color={INK2} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              className="trade-input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar jugador por usuario o nombre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {searching && <p style={{ fontFamily: MONO, fontSize: 11, color: INK2 }}>Buscando…</p>}
            {!searching && search.trim().length >= 2 && results.length === 0 && (
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK2 }}>Sin resultados.</p>
            )}
            {results.map(p => (
              <button
                key={p.user_id}
                onClick={() => { setPeer(p); router.replace(`/dashboard/trades?u=${p.username ?? ""}`); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, cursor: "pointer", textAlign: "left",
                }}
              >
                <Avatar url={p.photo_url} name={p.username ?? p.first_name ?? "?"} size={34} />
                <div>
                  <p style={{ fontFamily: DISP, fontSize: 14, color: INK0, margin: 0 }}>@{p.username}</p>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>
                    {[p.first_name, p.last_name].filter(Boolean).join(" ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Barra de contraparte */}
          <div className="trade-panel" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap", flexShrink: 0 }}>
            <Avatar url={peer.photo_url} name={peerName} size={44} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                Intercambiando con
              </p>
              <p style={{ fontFamily: DISP, fontSize: 18, color: INK0, margin: 0 }}>@{peer.username}</p>
            </div>
            <button
              onClick={() => { setPeer(null); setSearch(""); router.replace("/dashboard/trades"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px",
                color: INK2, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: "pointer",
              }}
            >
              <X size={13} /> Cambiar
            </button>
          </div>

          {/* Filtros */}
          <div className="trade-panel" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
            <input className="trade-input" style={{ flex: "1 1 180px", maxWidth: 260 }}
              placeholder="Nombre de carta…" value={fNombre} onChange={e => setFNombre(e.target.value)} />
            <select className="trade-input" style={{ flex: "0 1 200px" }} value={fSet} onChange={e => setFSet(e.target.value)}>
              <option value="">Todos los sets</option>
              {setOptions.map(id => <option key={id} value={id}>{SET_NAME(id)}</option>)}
            </select>
            <select className="trade-input" style={{ flex: "0 1 170px" }} value={fVariante} onChange={e => setFVariante(e.target.value)}>
              <option value="">Todas las variantes</option>
              {versionOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
                padding: "9px 12px", color: INK2, fontFamily: MONO, fontSize: 10,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              }}>Limpiar</button>
            )}
          </div>

          <div className="trade-cols">
            {/* Columna izquierda: lo mío que él necesita */}
            <Column
              title="Lo que tengo que él necesita"
              subtitle={`${filteredMatches.length} carta${filteredMatches.length === 1 ? "" : "s"} en común`}
              accent={COURT}
              loading={loadingData}
              empty="No tienes ninguna carta de su wishlist."
              entries={filteredMatches}
              selected={offer}
              onBump={(key, d, max) => bump(setOffer, key, d, max)}
            />

            {/* Columna centro: su inventario, con dos tabs */}
            <Column
              title={`Inventario de @${peer.username}`}
              subtitle="Elige lo que quieres pedirle"
              accent={LIME}
              loading={loadingData}
              empty={peerTab === "todo"
                ? "Este jugador no tiene cartas en su inventario."
                : "Él no tiene ninguna carta de tu wishlist."}
              entries={filteredPeer}
              selected={request}
              onBump={(key, d, max) => bump(setRequest, key, d, max)}
              tabs={
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {([
                    ["todo",     "Todo su inventario", filteredPeerAll.length,    null],
                    ["wishlist", "En mi wishlist",     filteredPeerWanted.length, <Heart key="h" size={11} strokeWidth={2} />],
                  ] as const).map(([val, label, count, icon]) => (
                    <button key={val} onClick={() => setPeerTab(val)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 11px", borderRadius: 8, cursor: "pointer",
                      background: peerTab === val ? `${LIME}18` : "transparent",
                      border: `1px solid ${peerTab === val ? `${LIME}55` : "rgba(255,255,255,0.1)"}`,
                      color: peerTab === val ? LIME : INK2,
                      fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em",
                    }}>
                      {icon}{label} ({count})
                    </button>
                  ))}
                </div>
              }
            />

            {/* Columna derecha: resumen y envío */}
            <div className="trade-panel trade-col">
              <p style={{ fontFamily: DISP, fontSize: 16, color: INK0, margin: "0 0 14px", flexShrink: 0 }}>Tu solicitud</p>

              <div className="trade-panel-scroll">
              <Summary label="Yo entrego" accent={COURT} count={offerCount} total={offerTotal}
                items={Object.entries(offer)} entryByKey={entryByKey}
                onRemove={key => setOffer(p => { const c = { ...p }; delete c[key]; return c; })} />

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />

              <Summary label="Yo recibo" accent={LIME} count={requestCount} total={requestTotal}
                items={Object.entries(request)} entryByKey={entryByKey}
                onRemove={key => setRequest(p => { const c = { ...p }; delete c[key]; return c; })} />

              {(offerTotal > 0 || requestTotal > 0) && (
                <div style={{
                  marginTop: 14, padding: "10px 12px", borderRadius: 9,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: INK2 }}>Diferencia</span>
                    <span style={{
                      fontFamily: MONO, fontSize: 11, fontWeight: 700,
                      color: Math.abs(requestTotal - offerTotal) < 0.005 ? INK2
                        : requestTotal > offerTotal ? LIME : COURT,
                    }}>
                      {requestTotal >= offerTotal ? "+" : "−"}{usd(Math.abs(requestTotal - offerTotal))}
                    </span>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: INK2, margin: "5px 0 0", lineHeight: 1.5 }}>
                    {Math.abs(requestTotal - offerTotal) < 0.005
                      ? "El intercambio está parejo."
                      : requestTotal > offerTotal
                        ? "Recibes más valor del que entregas."
                        : "Entregas más valor del que recibes."}
                  </p>
                </div>
              )}

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />

              <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>
                Dinero (opcional)
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>
                  {CURRENCY_SYMBOL[myCurrency] ?? "$"}
                </span>
                <input className="trade-input" inputMode="decimal" placeholder="0"
                  value={cash} onChange={e => setCash(e.target.value)} />
              </div>
              {cashNum > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {([["to", "Él me paga"], ["from", "Yo pago"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setCashPayer(val)} style={{
                      flex: 1, padding: "7px 6px", borderRadius: 8, cursor: "pointer",
                      background: cashPayer === val ? `${COURT}1c` : "transparent",
                      border: `1px solid ${cashPayer === val ? `${COURT}55` : "rgba(255,255,255,0.12)"}`,
                      color: cashPayer === val ? COURT : INK2,
                      fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em",
                    }}>{label}</button>
                  ))}
                </div>
              )}

              <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "14px 0 8px" }}>
                Mensaje (opcional)
              </p>
              <textarea className="trade-input" rows={3} maxLength={300}
                style={{ resize: "vertical" }}
                placeholder="Cuéntale los detalles del intercambio…"
                value={message} onChange={e => setMessage(e.target.value)} />
              </div>

              <div style={{ flexShrink: 0 }}>
              {sent ? (
                <div style={{
                  marginTop: 14, padding: "12px", borderRadius: 10,
                  background: `${COURT}14`, border: `1px solid ${COURT}44`,
                  fontFamily: MONO, fontSize: 11, color: COURT, textAlign: "center",
                }}>
                  Solicitud enviada ✓
                </div>
              ) : (
                <button
                  onClick={sendTrade}
                  disabled={!canSend || sending}
                  style={{
                    marginTop: 16, width: "100%", padding: "13px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    borderRadius: 10, border: "none",
                    background: canSend && !sending ? COURT : "rgba(255,255,255,0.06)",
                    color: canSend && !sending ? "#05070d" : INK2,
                    fontFamily: MONO, fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: canSend && !sending ? "pointer" : "not-allowed",
                  }}
                >
                  <Send size={14} strokeWidth={2} />
                  {sending ? "Enviando…" : "Enviar solicitud"}
                </button>
              )}
              {!canSend && !sent && (
                <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: "8px 0 0", textAlign: "center", lineHeight: 1.5 }}>
                  Ofrece al menos una carta y pide una carta o un monto.
                </p>
              )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Columna de cartas ──────────────────────────────────────── */
function Column({ title, subtitle, accent, entries, selected, onBump, loading, empty, tabs }: {
  title: string; subtitle: string; accent: string;
  entries: Entry[]; selected: Record<string, number>;
  onBump: (key: string, delta: number, max: number) => void;
  loading: boolean; empty: string; tabs?: React.ReactNode;
}) {
  return (
    <div className="trade-panel trade-col">
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontFamily: DISP, fontSize: 15, color: INK0, margin: 0 }}>{title}</p>
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.08em", margin: "3px 0 14px" }}>
          {subtitle}
        </p>
        {tabs}
      </div>

      <div className="trade-panel-scroll">
        {loading ? (
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2 }}>Cargando…</p>
        ) : entries.length === 0 ? (
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, lineHeight: 1.6 }}>{empty}</p>
        ) : (
          <div className="trade-grid">
            {entries.map(e => {
              const qty = selected[e.key] ?? 0;
              return (
                <div key={e.key}>
                  <div style={{ position: "relative" }}>
                    <InvTiltCard card={e.card} onClick={() => onBump(e.key, qty > 0 ? -qty : 1, e.quantity)} />
                    {qty > 0 && (
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 8, pointerEvents: "none",
                        border: `2px solid ${accent}`, boxShadow: `0 0 14px ${accent}66`,
                      }} />
                    )}
                    <div style={{
                      position: "absolute", top: 6, left: 6, zIndex: 10,
                      background: "rgba(5,7,13,0.85)", backdropFilter: "blur(4px)",
                      borderRadius: 5, padding: "2px 6px",
                      fontFamily: MONO, fontSize: 9, color: INK0, pointerEvents: "none",
                    }}>
                      x{e.quantity}
                    </div>
                  </div>

                  <p style={{
                    fontFamily: MONO, fontSize: 9.5, color: INK2, margin: "6px 0 2px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={e.card.name}>
                    {e.card.name}
                  </p>

                  <p style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 700, margin: "0 0 5px",
                    color: e.price != null ? LIME : INK2,
                  }}>
                    {e.price != null ? usd(e.price) : "—"}
                    {qty > 1 && e.price != null && (
                      <span style={{ color: INK2, fontWeight: 400 }}> · {usd(e.price * qty)}</span>
                    )}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <button className="inv-qty-btn" style={{ color: INK0 }}
                      onClick={() => onBump(e.key, -1, e.quantity)} disabled={qty === 0}>
                      <Minus size={13} />
                    </button>
                    <span className="inv-qty-num" style={{ color: qty > 0 ? accent : INK2 }}>{qty}</span>
                    <button className="inv-qty-btn" style={{ color: INK0 }}
                      onClick={() => onBump(e.key, 1, e.quantity)} disabled={qty >= e.quantity}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Resumen lateral ────────────────────────────────────────── */
function Summary({ label, accent, count, total, items, entryByKey, onRemove }: {
  label: string; accent: string; count: number; total: number;
  items: [string, number][]; entryByKey: Record<string, Entry>;
  onRemove: (key: string) => void;
}) {
  const missingPrice = items.some(([key]) => entryByKey[key]?.price == null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, margin: "0 0 8px" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label} ({count})
        </span>
        {total > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: accent }}>
            {usd(total)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>Nada seleccionado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(([key, qty]) => {
            const e = entryByKey[key];
            if (!e) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={e.card.image} alt="" style={{ width: 26, height: 36, objectFit: "contain", borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: MONO, fontSize: 10, color: INK0, margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {qty}× {e.card.name}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: INK2, margin: 0 }}>
                    {e.price != null ? usd(e.price * qty) : "sin precio"}
                  </p>
                </div>
                <button onClick={() => onRemove(key)} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: INK2, display: "flex", padding: 2,
                }}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {missingPrice && (
            <p style={{ fontFamily: MONO, fontSize: 8.5, color: INK2, margin: "2px 0 0", lineHeight: 1.4 }}>
              El total excluye las cartas sin precio.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────── */
function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${COURT}22`, border: `1px solid ${COURT}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: DISP, fontSize: size * 0.42, color: COURT,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
