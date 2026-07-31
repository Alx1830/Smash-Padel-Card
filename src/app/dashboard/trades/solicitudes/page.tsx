"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadManySets, SET_CARDS } from "@/data/pokemon-cards";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { parseProposal } from "@/lib/trade-messages";
import {
  ArrowLeft, Check, X, Clock, Ban, Pencil, MessageCircle,
  MessagesSquare, Send, ChevronDown, ArrowDownLeft, ArrowUpRight, PackageCheck, Trash2,
} from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const RED   = "#ff6b6b";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);
const SET_NAME = (id: string) => ALL_SETS.find(s => s.id === id)?.name ?? id;

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface TradeCard {
  side: "offer" | "request";
  card_id: string; set_id: string; version: string | null; quantity: number;
}

interface Trade {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  cash_amount: number | null;
  cash_currency: string | null;
  cash_payer: "from" | "to" | null;
  message: string | null;
  created_at: string;
  updated_at: string | null;
  /** Quién hizo la última propuesta; null = el emisor original */
  last_proposed_by: string | null;
  /** Cuándo confirmó cada parte que recibió las cartas */
  from_received_at: string | null;
  to_received_at:   string | null;
  /** Cada parte puede sacarlo de su propio historial sin afectar al otro */
  from_hidden: boolean;
  to_hidden:   boolean;
  trade_cards: TradeCard[];
}

interface PlayerLite {
  user_id: string; username: string | null;
  first_name: string | null; photo_url: string | null;
  whatsapp_indicativo: string | null; whatsapp_numero: string | null;
}

interface TradeMessage {
  id: string; trade_id: string; user_id: string; body: string; created_at: string;
}

type PriceMaps = Record<string, Record<string, Record<string, number>>>;

/** Código corto y legible del intercambio, para nombrarlo en el chat o WhatsApp */
const tradeCode = (id: string) => `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const STATUS_META: Record<Trade["status"], { label: string; color: string }> = {
  pending:   { label: "Pendiente", color: LIME  },
  accepted:  { label: "Aceptado",  color: COURT },
  rejected:  { label: "Rechazado", color: RED   },
  cancelled: { label: "Cancelado", color: INK2  },
};

export default function SolicitudesPage() {
  return (
    <Suspense fallback={null}>
      <SolicitudesPageInner />
    </Suspense>
  );
}

function SolicitudesPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const params   = useSearchParams();
  const focusId  = params.get("trade");

  const [meId, setMeId]       = useState<string | null>(null);
  const [trades, setTrades]   = useState<Trade[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerLite>>({});
  const [priceMaps, setPriceMaps] = useState<PriceMaps>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState<string | null>(null);
  const [, setCardsReady]     = useState(0);
  const [zoom, setZoom]       = useState<{ card: PokemonCard; setId: string; price: number | null } | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMeId(user.id);

    const { data } = await supabase
      .from("trades")
      .select("id, from_user_id, to_user_id, status, cash_amount, cash_currency, cash_payer, message, created_at, updated_at, last_proposed_by, from_received_at, to_received_at, from_hidden, to_hidden, trade_cards(side, card_id, set_id, version, quantity)")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const all = (data ?? []) as unknown as Trade[];
    // Los que saqué de mi historial siguen existiendo para el otro jugador
    const rows = all.filter(t => !(t.from_user_id === user.id ? t.from_hidden : t.to_hidden));
    setTrades(rows);
    setLoading(false);

    const otherIds = [...new Set(rows.map(t => t.from_user_id === user.id ? t.to_user_id : t.from_user_id))];
    if (otherIds.length) {
      const { data: pl } = await supabase
        .from("players")
        .select("user_id, username, first_name, photo_url, whatsapp_indicativo, whatsapp_numero")
        .in("user_id", otherIds);
      const map: Record<string, PlayerLite> = {};
      (pl ?? []).forEach((p: PlayerLite) => { map[p.user_id] = p; });
      setPlayers(map);
    }

    const setIds = [...new Set(rows.flatMap(t => (t.trade_cards ?? []).map(c => c.set_id)))];
    for (const setId of setIds) {
      await loadManySets([setId]);
      setCardsReady(n => n + 1);
    }

    await Promise.all(setIds.map(async setId => {
      const sc = SCRYDEX_SET_CODES[setId];
      if (!sc) return;
      const { data: priceRows } = await supabase
        .from("card_prices").select("card_id, prices").like("card_id", `${sc}-%`);
      if (!priceRows) return;
      const map: Record<string, Record<string, number>> = {};
      for (const row of priceRows) map[row.card_id] = row.prices as Record<string, number>;
      setPriceMaps(prev => ({ ...prev, [setId]: map }));
    }));
  }, [supabase]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  /**
   * Con ?trade=<id> se entra a una solicitud concreta (desde el chat, WhatsApp
   * o una notificación): ahí sobra el resto de la lista.
   */
  const focused = focusId ? trades.find(t => t.id === focusId) : undefined;
  const visible = focusId ? (focused ? [focused] : []) : trades;

  const priceOf = useCallback((card: PokemonCard | undefined, setId: string): number | null => {
    if (!card) return null;
    const sc = SCRYDEX_SET_CODES[setId];
    if (!sc) return null;
    const byCard = priceMaps[setId]?.[`${sc}-${card.card_number}`];
    if (!byCard) return null;
    const vk = card.version.toLowerCase().replace(/\s+/g, "");
    return byCard[vk] ?? byCard[card.version] ?? byCard["normal"] ?? null;
  }, [priceMaps]);

  const findCard = useCallback((c: TradeCard): PokemonCard | undefined =>
    SET_CARDS[c.set_id]?.find(pc => String(pc.id) === String(c.card_id))
  , []);

  /** Suma en USD de un lado del trade; ignora cartas sin precio */
  const sideTotal = useCallback((cards: TradeCard[]) =>
    cards.reduce((sum, c) => {
      const p = priceOf(findCard(c), c.set_id);
      return p != null ? sum + p * c.quantity : sum;
    }, 0)
  , [priceOf, findCard]);

  async function respond(trade: Trade, status: "accepted" | "rejected" | "cancelled") {
    if (acting) return;
    setActing(trade.id);
    const { data, error } = await supabase
      .from("trades")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", trade.id)
      .eq("status", "pending")
      .select("id");

    if (error || !data?.length) {
      console.error("[Trades] Error respondiendo:", error);
      alert(error
        ? `No se pudo actualizar la solicitud: ${error.message}`
        : "Esta solicitud ya no está pendiente. Recarga la página.");
      setActing(null);
      return;
    }

    if (status !== "cancelled") {
      await fetch("/api/trades/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_id: trade.id, kind: status }),
      }).catch(() => {});
    }

    setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, status } : t));
    setActing(null);
  }

  /** Lo saca de mi historial; el otro jugador lo sigue viendo */
  async function hideTrade(trade: Trade) {
    if (acting) return;
    if (!confirm("¿Quitar este intercambio de tu historial? El otro jugador lo seguirá viendo en el suyo.")) return;
    setActing(trade.id);
    const { error } = await supabase.rpc("hide_trade", { p_trade_id: trade.id, p_hidden: true });
    if (error) {
      console.error("[Trades] Error ocultando:", error);
      alert("No se pudo quitar del historial. Intenta de nuevo.");
    } else {
      setTrades(prev => prev.filter(t => t.id !== trade.id));
    }
    setActing(null);
  }

  /**
   * Confirma la recepción: descuenta lo entregado, suma lo recibido y limpia
   * la wishlist de esas cartas. Cada parte lo hace sobre su propio inventario.
   */
  async function confirmReceived(trade: Trade) {
    if (acting || !meId) return;
    setActing(trade.id);

    const isReceived = trade.to_user_id === meId;
    const iGive    = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "request" : "offer"));
    const iReceive = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "offer" : "request"));

    try {
      const touched = [...iGive, ...iReceive];
      const { data: rows } = await supabase
        .from("card_inventory")
        .select("card_id, set_id, version, quantity")
        .eq("user_id", meId)
        .in("card_id", [...new Set(touched.map(c => String(c.card_id)))]);

      const key = (c: { card_id: string; set_id: string; version: string | null }) =>
        `${c.card_id}::${c.set_id}::${c.version ?? ""}`;
      const have: Record<string, number> = {};
      for (const r of (rows ?? []) as TradeCard[]) have[key(r)] = r.quantity;

      // Lo entregado se descuenta; lo recibido se suma
      const delta: Record<string, number> = {};
      const meta:  Record<string, TradeCard> = {};
      for (const c of iGive)    { delta[key(c)] = (delta[key(c)] ?? 0) - c.quantity; meta[key(c)] = c; }
      for (const c of iReceive) { delta[key(c)] = (delta[key(c)] ?? 0) + c.quantity; meta[key(c)] = c; }

      for (const [k, d] of Object.entries(delta)) {
        if (d === 0) continue;
        const c = meta[k];
        const next = Math.max(0, (have[k] ?? 0) + d);

        if (next === 0) {
          await supabase.from("card_inventory").delete()
            .eq("user_id", meId).eq("card_id", String(c.card_id))
            .eq("set_id", c.set_id).eq("version", c.version ?? "normal");
        } else if (have[k] != null) {
          await supabase.from("card_inventory").update({ quantity: next })
            .eq("user_id", meId).eq("card_id", String(c.card_id))
            .eq("set_id", c.set_id).eq("version", c.version ?? "normal");
        } else {
          await supabase.from("card_inventory").insert({
            user_id: meId, card_id: String(c.card_id), set_id: c.set_id,
            version: c.version ?? "normal", quantity: next,
          });
        }
      }

      // Lo que llega deja de estar en la wishlist
      if (iReceive.length) {
        await supabase.from("card_wishlist").delete()
          .eq("user_id", meId)
          .in("card_id", [...new Set(iReceive.map(c => String(c.card_id)))]);
      }

      const field = isReceived ? "to_received_at" : "from_received_at";
      const stamp = new Date().toISOString();
      const { error } = await supabase.from("trades")
        .update({ [field]: stamp }).eq("id", trade.id);
      if (error) throw error;

      setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, [field]: stamp } : t));
    } catch (err) {
      console.error("[Trades] Error confirmando recepción:", err);
      alert("No se pudo actualizar tu inventario. Intenta de nuevo.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ padding: "clamp(14px, 2.2vw, 24px)" }}>
      <style>{`
        .sol-scroll::-webkit-scrollbar { width: 7px; }
        .sol-scroll::-webkit-scrollbar-track { background: transparent; }
        .sol-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .sol-cards { display: grid; grid-template-columns: 1fr; gap: 16px; align-content: start; }
        @media (min-width: 640px) { .sol-cards { grid-template-columns: 1fr 1fr; } }
        /* Las miniaturas llenan el ancho de su columna en vez de amontonarse
           a la izquierda dejando el resto vacío. */
        .sol-thumbs {
          display: grid; gap: 8px;
          grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
        }
        /* Propuesta y negociación lado a lado cuando hay ancho */
        .sol-split { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1000px) {
          .sol-split { grid-template-columns: minmax(0, 1fr) minmax(320px, 33%); align-items: stretch; }
        }
        /* Viendo una sola solicitud, las dos tarjetas llenan la pantalla y el
           espacio de sobra se lo reparten las cartas y los mensajes. */
        @media (min-width: 1000px) {
          .sol-split-solo { min-height: calc(100dvh - 108px); }
          .sol-split-solo > * { min-height: 0; }
        }
        .sol-prop { display: flex; flex-direction: column; }
        .sol-split-solo .sol-cards { flex: 1; }
        /* El chat abierto iguala la altura de la propuesta y los mensajes se
           quedan con todo el espacio que sobra; colapsado no se estira. */
        .sol-chat { display: flex; flex-direction: column; align-self: start; min-width: 0; }
        .sol-chat-open { align-self: stretch; }
        .sol-chat-body { display: flex; flex-direction: column; min-height: 0; flex: 1; }
        .sol-chat-msgs { max-height: 230px; overflow-y: auto; }
        @media (min-width: 1000px) {
          .sol-chat-open .sol-chat-msgs { max-height: none; flex: 1; min-height: 120px; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/trades" style={{ display: "flex", color: INK2 }}>
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 style={{ fontFamily: DISP, fontSize: "24px", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
          {focusId ? "Solicitud de intercambio" : "Solicitudes de intercambio"}
        </h1>
        {focusId && (
          <span style={{
            fontFamily: MONO, fontSize: 10, color: COURT, letterSpacing: "0.08em",
            border: `1px solid ${COURT}44`, background: `${COURT}12`,
            borderRadius: 6, padding: "4px 8px",
          }}>
            {tradeCode(focusId)}
          </span>
        )}
        {focusId && !loading && (
          <Link href="/dashboard/trades/solicitudes" style={{
            marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: INK2,
            textDecoration: "none", letterSpacing: "0.06em",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 11px",
          }}>
            Ver todas ({trades.length})
          </Link>
        )}
      </div>

      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>Cargando…</p>
      ) : visible.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>
          {focusId
            ? "Esta solicitud ya no existe o no es tuya."
            : "Todavía no tienes solicitudes de intercambio."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
          {visible.map(trade => (
            <TradeCardRow
              key={trade.id}
              trade={trade}
              meId={meId}
              other={players[trade.to_user_id === meId ? trade.from_user_id : trade.to_user_id]}
              focused={trade.id === focusId}
              solo={visible.length === 1}
              acting={acting === trade.id}
              findCard={findCard}
              priceOf={priceOf}
              sideTotal={sideTotal}
              onRespond={respond}
              onReceived={confirmReceived}
              onHide={hideTrade}
              onZoom={setZoom}
              supabase={supabase}
            />
          ))}
        </div>
      )}

      {zoom && <CardZoom {...zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ── Tarjeta de un intercambio ──────────────────────────────── */
function TradeCardRow({
  trade, meId, other, focused, solo, acting, findCard, priceOf, sideTotal, onRespond, onReceived, onHide, onZoom, supabase,
}: {
  trade: Trade;
  meId: string | null;
  other: PlayerLite | undefined;
  focused: boolean;
  /** Única solicitud en pantalla: las tarjetas pueden llenar el alto */
  solo: boolean;
  acting: boolean;
  findCard: (c: TradeCard) => PokemonCard | undefined;
  priceOf: (card: PokemonCard | undefined, setId: string) => number | null;
  sideTotal: (cards: TradeCard[]) => number;
  onRespond: (t: Trade, s: "accepted" | "rejected" | "cancelled") => void;
  onReceived: (t: Trade) => void;
  onHide: (t: Trade) => void;
  onZoom: (z: { card: PokemonCard; setId: string; price: number | null }) => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Con el chat en su propia columna tiene sentido que arranque abierto
  const [chatOpen, setChatOpen] = useState(true);

  const isReceived = trade.to_user_id === meId;
  const isSender   = trade.from_user_id === meId;
  const meta       = STATUS_META[trade.status];
  /** La pelota está en el campo del otro si la última propuesta es mía */
  const iProposed  = (trade.last_proposed_by ?? trade.from_user_id) === meId;
  const iReceived     = !!(isReceived ? trade.to_received_at : trade.from_received_at);
  const otherReceived = !!(isReceived ? trade.from_received_at : trade.to_received_at);

  // Desde mi punto de vista: si recibí la solicitud, su 'offer' es lo que yo recibo
  const iGive    = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "request" : "offer"));
  const iReceive = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "offer" : "request"));

  const giveTotal    = sideTotal(iGive);
  const receiveTotal = sideTotal(iReceive);
  const diff         = receiveTotal - giveTotal;

  const cashLabel = trade.cash_amount
    ? formatPrice(Number(trade.cash_amount), trade.cash_currency ?? "COP")
    : null;
  // cash_payer se guarda respecto a from_user_id
  const iPayCash = trade.cash_payer === (isReceived ? "to" : "from");

  const waLink = useMemo(() => {
    if (!other?.whatsapp_numero) return null;
    const number = (other.whatsapp_indicativo ?? "").replace(/\D/g, "")
                 + other.whatsapp_numero.replace(/\D/g, "");
    if (!number) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link   = `${origin}/dashboard/trades/solicitudes?trade=${trade.id}`;
    const name   = other.username ?? other.first_name ?? "";
    const text = encodeURIComponent(
      `¡Hola ${name}! 👋\n\n` +
      `Te escribo por la solicitud de intercambio ${tradeCode(trade.id)} que tenemos en FaceBinder: ` +
      `${iGive.length} carta${iGive.length === 1 ? "" : "s"} mía${iGive.length === 1 ? "" : "s"} ` +
      `por ${iReceive.length} tuya${iReceive.length === 1 ? "" : "s"}` +
      (cashLabel ? ` ${iPayCash ? "más" : "y"} ${CURRENCY_SYMBOL[trade.cash_currency ?? "COP"] ?? "$"}${Number(trade.cash_amount).toLocaleString("es-CO")}` : "") +
      `.\n\nPuedes verla y responderme aquí:\n${link}\n\n` +
      `Si quieres negociamos los detalles por el chat del intercambio. 🤝`
    );
    return `https://wa.me/${number}?text=${text}`;
  }, [other, trade.id, trade.cash_amount, trade.cash_currency, iGive.length, iReceive.length, cashLabel, iPayCash]);

  return (
    // La propuesta y la negociación son dos tarjetas hermanas
    <div className={`sol-split${solo ? " sol-split-solo" : ""}`}>
    <div ref={ref} className="sol-prop" style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${focused ? `${COURT}55` : "rgba(255,255,255,0.08)"}`,
      boxShadow: focused ? `0 0 24px ${COURT}22` : "none",
      borderRadius: 14, padding: 18, minWidth: 0,
    }}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {other?.photo_url
          ? <img src={other.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${COURT}22`, border: `1px solid ${COURT}44` }} />}
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontFamily: DISP, fontSize: 15, color: INK0, margin: 0 }}>
            @{other?.username ?? "jugador"}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, margin: 0 }}>
            {tradeCode(trade.id)} · {new Date(trade.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            {trade.updated_at && " · editado"}
            {trade.status === "pending" &&
              (iProposed ? " · esperando su respuesta" : " · te toca responder")}
          </p>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
          color: isReceived ? COURT : INK2,
          border: `1px solid ${isReceived ? `${COURT}44` : "rgba(255,255,255,0.14)"}`,
          background: isReceived ? `${COURT}12` : "transparent",
          borderRadius: 6, padding: "4px 8px", whiteSpace: "nowrap",
        }}>
          {isReceived ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
          {isReceived ? "Recibida" : "Enviada"}
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
          color: meta.color, border: `1px solid ${meta.color}44`,
          background: `${meta.color}12`, borderRadius: 6, padding: "4px 8px",
        }}>
          {trade.status === "pending" ? <Clock size={11} />
            : trade.status === "accepted" ? <Check size={11} />
            : trade.status === "cancelled" ? <Ban size={11} /> : <X size={11} />}
          {meta.label}
        </span>
      </div>

      <div className="sol-cards">
        <CardList label="Tú entregas" accent={RED} cards={iGive} total={giveTotal}
          findCard={findCard} priceOf={priceOf} onZoom={onZoom} />
        <CardList label="Tú recibes" accent={COURT} cards={iReceive} total={receiveTotal}
          findCard={findCard} priceOf={priceOf} onZoom={onZoom} />
      </div>

      {/* Resumen de valor */}
      {(giveTotal > 0 || receiveTotal > 0) && (
        <div style={{
          marginTop: 14, padding: "11px 13px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
        }}>
          <Stat label="Entregas" value={usd(giveTotal)} color={RED} />
          <Stat label="Recibes"  value={usd(receiveTotal)} color={COURT} />
          <Stat
            label="Diferencia"
            value={`${diff >= 0 ? "+" : "−"}${usd(Math.abs(diff))}`}
            color={Math.abs(diff) < 0.005 ? INK2 : diff > 0 ? LIME : RED}
          />
          <span style={{ fontFamily: MONO, fontSize: 9, color: INK2, flex: 1, minWidth: 150, lineHeight: 1.5 }}>
            {Math.abs(diff) < 0.005
              ? "El intercambio está parejo."
              : diff > 0 ? "Recibes más valor del que entregas."
              : "Entregas más valor del que recibes."}
          </span>
        </div>
      )}

      {cashLabel && (
        <p style={{
          fontFamily: MONO, fontSize: 11, color: LIME, margin: "12px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12,
        }}>
          {iPayCash ? `Tú pagas ${cashLabel}` : `Recibes ${cashLabel}`}
        </p>
      )}

      {trade.message && (
        <p style={{
          fontFamily: MONO, fontSize: 11, color: INK2, margin: "10px 0 0",
          lineHeight: 1.6, fontStyle: "italic",
        }}>
          “{trade.message}”
        </p>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {/* Responde quien no hizo la última propuesta */}
        {trade.status === "pending" && !iProposed && (
          <>
            <button onClick={() => onRespond(trade, "accepted")} disabled={acting}
              style={btnStyle(COURT, "#05070d")}>
              <Check size={14} strokeWidth={2.2} /> Aceptar
            </button>
            <button onClick={() => onRespond(trade, "rejected")} disabled={acting}
              style={btnStyle("transparent", RED, RED)}>
              <X size={14} strokeWidth={2.2} /> Rechazar
            </button>
          </>
        )}

        {/* Ambas partes pueden contraproponer */}
        {trade.status === "pending" && (
          <Link href={`/dashboard/trades?edit=${trade.id}`} style={{ ...btnStyle("transparent", LIME, LIME), textDecoration: "none" }}>
            <Pencil size={14} strokeWidth={2} /> Editar
          </Link>
        )}

        {trade.status === "pending" && isSender && (
          <button onClick={() => onRespond(trade, "cancelled")} disabled={acting}
            style={btnStyle("transparent", INK2, "rgba(255,255,255,0.15)")}>
            <Ban size={14} strokeWidth={2} /> Cancelar
          </button>
        )}

        {trade.status === "pending" && waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{ ...btnStyle("#25D366", "#05070d"), textDecoration: "none" }}>
            <MessageCircle size={14} strokeWidth={2.2} /> Avisar por WhatsApp
          </a>
        )}

        {/* Una vez acordado, cada parte confirma cuando le llegan las cartas */}
        {trade.status === "accepted" && !iReceived && (
          <button onClick={() => onReceived(trade)} disabled={acting}
            style={btnStyle(COURT, "#05070d")}>
            <PackageCheck size={14} strokeWidth={2.2} />
            {acting ? "Actualizando…" : "Recibí las cartas"}
          </button>
        )}

        {/* Un intercambio pendiente sigue vivo: primero se cancela o se responde */}
        {trade.status !== "pending" && (
          <button onClick={() => onHide(trade)} disabled={acting}
            style={{ ...btnStyle("transparent", INK2, "rgba(255,255,255,0.15)"), marginLeft: "auto" }}>
            <Trash2 size={14} strokeWidth={2} /> Quitar del historial
          </button>
        )}
      </div>

      {trade.status === "accepted" && (
        <p style={{ fontFamily: MONO, fontSize: 10.5, color: iReceived ? COURT : INK2, margin: "14px 0 0", lineHeight: 1.6 }}>
          {!iReceived
            ? "Intercambio acordado. Cuando tengas las cartas en la mano, confirma aquí y tu inventario se actualiza solo."
            : otherReceived
              ? "Intercambio completado: los dos confirmaron la entrega."
              : `Confirmaste la recepción ✓ — falta que @${other?.username ?? "el otro jugador"} confirme.`}
        </p>
      )}
    </div>

      {/* Negociación, en su propia tarjeta */}
      <TradeChat
        tradeId={trade.id}
        meId={meId}
        other={other}
        open={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
        supabase={supabase}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{ fontFamily: MONO, fontSize: 8.5, color: INK2, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color, margin: "2px 0 0" }}>{value}</p>
    </div>
  );
}

/* ── Chat de negociación ────────────────────────────────────── */
function TradeChat({ tradeId, meId, other, open, onToggle, supabase }: {
  tradeId: string;
  meId: string | null;
  other: PlayerLite | undefined;
  open: boolean;
  onToggle: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [count, setCount]       = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* Conteo para el encabezado, aunque el chat esté cerrado */
  useEffect(() => {
    (async () => {
      const { count: n } = await supabase
        .from("trade_messages")
        .select("id", { count: "exact", head: true })
        .eq("trade_id", tradeId);
      setCount(n ?? 0);
    })();
  }, [tradeId, supabase]);

  /* Carga y suscripción en vivo solo cuando el chat está abierto */
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const { data } = await supabase
        .from("trade_messages")
        .select("id, trade_id, user_id, body, created_at")
        .eq("trade_id", tradeId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as TradeMessage[]);
      setLoaded(true);
    })();
  }, [open, loaded, tradeId, supabase]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`trade-chat-${tradeId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `trade_id=eq.${tradeId}` },
        payload => {
          const msg = payload.new as TradeMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          setCount(c => (c ?? 0) + 1);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, tradeId, supabase]);

  useEffect(() => {
    if (open && messages.length) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, open]);

  async function send() {
    const body = draft.trim();
    if (!body || !meId || sending) return;
    setSending(true);

    const { data, error } = await supabase
      .from("trade_messages")
      .insert({ trade_id: tradeId, user_id: meId, body })
      .select("id, trade_id, user_id, body, created_at")
      .single();

    if (error) {
      console.error("[Trades] Error enviando mensaje:", error);
      alert("No se pudo enviar el mensaje.");
      setSending(false);
      return;
    }

    setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as TradeMessage]);
    setCount(c => (c ?? 0) + 1);
    setDraft("");
    setSending(false);

    await fetch("/api/trades/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade_id: tradeId, kind: "message", preview: body }),
    }).catch(() => {});
  }

  return (
    <div className={`sol-chat${open ? " sol-chat-open" : ""}`} style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: 18,
    }}>
      <button onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
        color: INK2, fontFamily: MONO, fontSize: 10,
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <MessagesSquare size={13} strokeWidth={1.9} />
        Negociación{count ? ` (${count})` : ""}
        <ChevronDown size={13} style={{
          marginLeft: "auto",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }} />
      </button>

      {open && (
        <div className="sol-chat-body" style={{ marginTop: 12 }}>
          <div className="sol-scroll sol-chat-msgs" style={{
            display: "flex", flexDirection: "column", gap: 8,
            paddingRight: 4,
          }}>
            {!loaded ? (
              <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>Cargando…</p>
            ) : messages.length === 0 ? (
              <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0, lineHeight: 1.6 }}>
                Todavía no hay mensajes. Escribe para ponerse de acuerdo en los detalles.
              </p>
            ) : messages.map(m => {
              const mine = m.user_id === meId;
              const proposal = parseProposal(m.body);

              if (proposal) return (
                <div key={m.id} style={{
                  alignSelf: "stretch", borderRadius: 10, padding: "9px 12px",
                  background: `${LIME}0e`, border: `1px solid ${LIME}33`,
                }}>
                  <p style={{
                    fontFamily: MONO, fontSize: 9, color: LIME, margin: "0 0 5px",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap",
                  }}>
                    <Pencil size={10} strokeWidth={2} />
                    Nueva propuesta {mine ? "tuya" : `de @${other?.username ?? "jugador"}`}
                    {" · "}
                    {new Date(m.created_at).toLocaleString("es-CO", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <ProposalBody text={proposal} />
                </div>
              );

              return (
                <div key={m.id} style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  background: mine ? `${COURT}18` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${mine ? `${COURT}33` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "8px 11px",
                }}>
                  <p style={{
                    fontFamily: MONO, fontSize: 8.5, color: mine ? COURT : INK2,
                    margin: "0 0 3px", letterSpacing: "0.06em",
                  }}>
                    {mine ? "Tú" : `@${other?.username ?? "jugador"}`}
                    {" · "}
                    {new Date(m.created_at).toLocaleString("es-CO", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <p style={{
                    fontFamily: MONO, fontSize: 11, color: INK0, margin: 0,
                    lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {m.body}
                  </p>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexShrink: 0 }}>
            <input
              value={draft}
              maxLength={1000}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escribe tu propuesta…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "9px 12px", color: INK0, fontFamily: MONO, fontSize: 11, outline: "none",
              }}
            />
            <button onClick={send} disabled={!draft.trim() || sending} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, borderRadius: 8, border: "none", cursor: draft.trim() ? "pointer" : "not-allowed",
              background: draft.trim() && !sending ? COURT : "rgba(255,255,255,0.06)",
              color: draft.trim() && !sending ? "#05070d" : INK2,
            }}>
              <Send size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cuerpo de un mensaje de propuesta ──────────────────────── */
const GREEN = "#4ade80";

/** Cada línea es "etiqueta: item · item"; el signo del item define su color */
function ProposalBody({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {text.split("\n").map((line, i) => {
        const sep   = line.indexOf(": ");
        const label = sep > 0 ? line.slice(0, sep) : "";
        const rest  = sep > 0 ? line.slice(sep + 2) : line;

        return (
          <p key={i} style={{
            fontFamily: MONO, fontSize: 10.5, color: INK0, margin: 0,
            lineHeight: 1.6, wordBreak: "break-word",
          }}>
            {label && (
              <span style={{ color: INK2 }}>{label}: </span>
            )}
            {rest.split(" · ").map((item, j) => {
              const sign  = item.trim().charAt(0);
              const color = sign === "+" ? GREEN : sign === "−" ? RED : sign === "±" ? LIME : INK0;
              return (
                <span key={j} style={{ color }}>
                  {j > 0 && <span style={{ color: INK2 }}> · </span>}
                  {item}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
    borderRadius: 9, cursor: "pointer",
    background: bg, color,
    border: `1px solid ${border ?? bg}`,
    fontFamily: MONO, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.07em", textTransform: "uppercase",
  };
}

/* ── Lista de cartas de un lado ─────────────────────────────── */
function CardList({ label, accent, cards, total, findCard, priceOf, onZoom }: {
  label: string; accent: string; cards: TradeCard[]; total: number;
  findCard: (c: TradeCard) => PokemonCard | undefined;
  priceOf: (card: PokemonCard | undefined, setId: string) => number | null;
  onZoom: (z: { card: PokemonCard; setId: string; price: number | null }) => void;
}) {
  const missing = cards.some(c => priceOf(findCard(c), c.set_id) == null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, margin: "0 0 8px" }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label} ({cards.length})
        </span>
        {total > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: accent }}>
            {usd(total)}
          </span>
        )}
      </div>

      {cards.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>—</p>
      ) : (
        <>
          <div className="sol-thumbs">
            {cards.map((c, i) => {
              const card  = findCard(c);
              const name  = card?.name ?? String(c.card_id).split(":")[1] ?? "Carta";
              const price = priceOf(card, c.set_id);
              return (
                <div key={i} style={{ minWidth: 0, textAlign: "center" }}>
                  <button
                    onClick={() => card && onZoom({ card, setId: c.set_id, price })}
                    disabled={!card}
                    title={card ? `Ver ${name}` : name}
                    style={{
                      position: "relative", width: "100%", aspectRatio: "5/7",
                      padding: 0, border: "none", background: "transparent",
                      cursor: card ? "zoom-in" : "default", display: "block",
                    }}
                  >
                    {card?.image
                      ? <img src={card.image} alt={name} loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }} />
                      : <div style={{ width: "100%", height: "100%", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />}
                    {c.quantity > 1 && (
                      <span style={{
                        position: "absolute", top: 2, right: 2,
                        background: "rgba(5,7,13,0.9)", borderRadius: 4, padding: "1px 4px",
                        fontFamily: MONO, fontSize: 8.5, color: INK0,
                      }}>×{c.quantity}</span>
                    )}
                  </button>
                  <p style={{
                    fontFamily: MONO, fontSize: 8, color: INK2, margin: "4px 0 0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={name}>{name}</p>
                  <p style={{
                    fontFamily: MONO, fontSize: 8.5, fontWeight: 700, margin: "1px 0 0",
                    color: price != null ? LIME : INK2,
                  }}>
                    {price != null ? usd(price * c.quantity) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          {missing && (
            <p style={{ fontFamily: MONO, fontSize: 8, color: INK2, margin: "6px 0 0", lineHeight: 1.4 }}>
              El total excluye las cartas sin precio.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Modal de carta ─────────────────────────────────────────── */
function CardZoom({ card, setId, price, onClose }: {
  card: PokemonCard; setId: string; price: number | null; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(3,5,10,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 340, width: "100%", textAlign: "center" }}>
        <img src={card.image} alt={card.name} style={{
          width: "100%", borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,0.8)",
        }} />

        <p style={{ fontFamily: DISP, fontSize: 20, color: INK0, margin: "16px 0 4px" }}>
          {card.name}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0 }}>
          {SET_NAME(setId)} · #{String(card.card_number).padStart(3, "0")}
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em",
            color: getVersionColor(card.version),
            border: `1px solid ${getVersionColor(card.version)}55`,
            borderRadius: 6, padding: "4px 9px",
          }}>
            {getVersionLabel(card.version)}
          </span>
          {price != null && (
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              color: LIME, border: `1px solid ${LIME}55`, borderRadius: 6, padding: "4px 9px",
            }}>
              {usd(price)} USD
            </span>
          )}
        </div>

        <button onClick={onClose} style={{
          marginTop: 18, padding: "9px 18px", borderRadius: 9, cursor: "pointer",
          background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
          color: INK2, fontFamily: MONO, fontSize: 10,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
