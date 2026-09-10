"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, HIDDEN_SETS } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { ArrowLeft, Search, Plus, Minus, Trash2, X, Pencil, Eye, EyeOff } from "lucide-react";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const MAX_CARDS = 60;

const ALL_SETS = [...POKEMON_SERIES.flatMap(s => s.sets), ...HIDDEN_SETS];
// Posición del set = recencia (más reciente primero), igual que en Buscar Carta
const SET_RANK: Record<string, number> = Object.fromEntries(ALL_SETS.map((s, i) => [s.id, i]));

interface DeckCard {
  id: string;
  card_id: string;
  set_id: string;
  version: string;
  /** Cuántas copias pide el deck */
  needed: number;
  /** Cuántas de esas copias ya se consiguieron */
  quantity: number;
  position: number;
  card?: PokemonCard;
}

export default function DeckEditorPage() {
  const params  = useParams();
  const router  = useRouter();
  const deckId  = params.deckId as string;
  const supabase = createClient();

  const [deckName,   setDeckName]   = useState("");
  const [deckDesc,   setDeckDesc]   = useState("");
  const [isPublic,   setIsPublic]   = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName,   setEditName]   = useState("");
  const [editDesc,   setEditDesc]   = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const [deckCards,  setDeckCards]  = useState<DeckCard[]>([]);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIdx,    setDragIdx]    = useState<number | null>(null);
  const [dragOver,   setDragOver]   = useState<number | null>(null);
  const [query,      setQuery]      = useState("");
  const [searchResults, setSearchResults] = useState<{ card: PokemonCard; setId: string; setName: string }[]>([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const searchTokenRef = useRef(0);

  // El tope de 60 se mide contra las copias que el deck pide, no contra las conseguidas
  const totalCards = deckCards.reduce((s, c) => s + c.needed, 0);
  const ownedCards = deckCards.reduce((s, c) => s + Math.min(c.quantity, c.needed), 0);
  const [cardPrices, setCardPrices] = useState<Record<string, Record<string, number>>>({});

  // Precios de mercado de las cartas del deck (por set-número, en lotes)
  useEffect(() => {
    const ids = [...new Set(
      deckCards
        .map(dc => {
          const sc = SCRYDEX_SET_CODES[dc.set_id];
          return sc && dc.card ? `${sc}-${dc.card.card_number}` : null;
        })
        .filter((id): id is string => !!id && !(id in cardPrices))
    )];
    if (ids.length === 0) return;
    (async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
      const rows = (await Promise.all(chunks.map(chunk =>
        supabase.from("card_prices_merged").select("card_id, prices").in("card_id", chunk)
      ))).flatMap(res => res.data ?? []);
      if (rows.length === 0) return;
      setCardPrices(prev => {
        const next = { ...prev };
        for (const row of rows) next[row.card_id] = row.prices as Record<string, number>;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckCards]);

  function priceOf(dc: DeckCard): number | null {
    const sc = SCRYDEX_SET_CODES[dc.set_id];
    if (!sc || !dc.card) return null;
    const map = cardPrices[`${sc}-${dc.card.card_number}`];
    if (!map) return null;
    const vk = dc.card.version.toLowerCase().replace(/\s+/g, "");
    return map[vk] ?? map[dc.card.version] ?? map["normal"] ?? null;
  }

  // Precio total del deck: cada carta × su cantidad (mínimo 1 para las que faltan)
  const deckPrice = deckCards.reduce((sum, dc) => {
    const p = priceOf(dc);
    return p !== null ? sum + p * dc.needed : sum;
  }, 0);
  // Precio de las cartas que ya se tienen (cantidad real)
  const ownedPrice = deckCards.reduce((sum, dc) => {
    const p = priceOf(dc);
    return p !== null ? sum + p * Math.min(dc.quantity, dc.needed) : sum;
  }, 0);

  async function saveDeckInfo() {
    const name = editName.trim();
    if (!name) return;
    await supabase.from("decks").update({ name, description: editDesc.trim() || null, is_public: editPublic }).eq("id", deckId);
    setDeckName(name);
    setDeckDesc(editDesc.trim());
    setIsPublic(editPublic);
    setEditingInfo(false);
  }

  // Load deck info + cards
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/dashboard/decks"); return; }
      setUserId(user.id);

      const [{ data: deck }, { data: cards }] = await Promise.all([
        supabase.from("decks").select("name, description, is_public").eq("id", deckId).eq("user_id", user.id).single(),
        supabase.from("deck_cards").select("id, card_id, set_id, version, needed, quantity, position").eq("deck_id", deckId).order("position", { ascending: true }),
      ]);

      if (!deck) { router.push("/dashboard/decks"); return; }
      setDeckName(deck.name);
      setDeckDesc(deck.description ?? "");
      setIsPublic(deck.is_public ?? true);

      if (cards && cards.length > 0) {
        const setIds = [...new Set(cards.map(c => c.set_id))];
        await loadManySets(setIds);
        const resolved = cards.map(c => {
          const setCards = SET_CARDS[c.set_id] ?? [];
          const card = setCards.find(sc => sc.id === c.card_id && sc.version === c.version);
          return { ...c, needed: c.needed ?? 1, position: c.position ?? 0, card };
        });
        setDeckCards(resolved);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Búsqueda bajo demanda: el índice de nombres dice en qué sets buscar,
  // y solo esos sets se cargan (mismo patrón que BuscarCartaDrawer)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const token = ++searchTokenRef.current;
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { SET_NAME_INDEX } = await import("@/data/card-name-index");
      const matchingSetIds = Object.keys(SET_NAME_INDEX)
        .filter(setId => SET_NAME_INDEX[setId].includes(q));
      await loadManySets(matchingSetIds);
      if (token !== searchTokenRef.current) return;

      const out: { card: PokemonCard; setId: string; setName: string }[] = [];
      for (const setId of matchingSetIds) {
        const cards = SET_CARDS[setId];
        if (!cards.length) continue;
        const setInfo = ALL_SETS.find(s => s.id === setId);
        for (const card of cards) {
          if (card.name.toLowerCase().includes(q))
            out.push({ card: card as PokemonCard, setId, setName: setInfo?.name ?? setId });
        }
      }
      out.sort((a, b) => {
        const rank = (SET_RANK[a.setId] ?? 9999) - (SET_RANK[b.setId] ?? 9999);
        if (rank !== 0) return rank;
        return a.card.card_number - b.card.card_number;
      });
      setSearchResults(out);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function saveOrder(newCards: DeckCard[]) {
    setDeckCards(newCards);
    await Promise.all(
      newCards.map((c, i) =>
        supabase.from("deck_cards").update({ position: i }).eq("id", c.id)
      )
    );
    // Actualizar portada con la primera carta
    if (newCards[0]?.card?.image) {
      await supabase.from("decks").update({ cover_card_image: newCards[0].card.image }).eq("id", deckId);
    }
  }

  function isEnergy(card: PokemonCard) {
    return card.name.toLowerCase().includes("energy");
  }

  async function addCard(card: PokemonCard, setId: string) {
    const existing = deckCards.find(c => c.card_id === card.id && c.set_id === setId && c.version === card.version);

    if (existing) {
      if (totalCards >= MAX_CARDS) return;
      if (!isEnergy(card) && existing.needed >= 4) return;
      const newNeeded = existing.needed + 1;
      await supabase.from("deck_cards").update({ needed: newNeeded }).eq("id", existing.id);
      setDeckCards(prev => prev.map(c => c.id === existing.id ? { ...c, needed: newNeeded } : c));
    } else {
      // Primer clic: el deck pide 1 copia y todavía no se tiene ninguna
      const { data } = await supabase.from("deck_cards").insert({
        deck_id: deckId, card_id: card.id, set_id: setId, version: card.version, needed: 1, quantity: 0,
      }).select("id, card_id, set_id, version, needed, quantity, position").single();
      if (data) {
        setDeckCards(prev => [...prev, { ...data, needed: data.needed ?? 1, position: data.position ?? 0, card }]);
        if (deckCards.length === 0 && card.image) {
          await supabase.from("decks").update({ cover_card_image: card.image }).eq("id", deckId);
        }
      }
    }

    await supabase.from("decks").update({
      updated_at: new Date().toISOString(),
    }).eq("id", deckId);
  }

  async function deleteDeck() {
    await supabase.from("decks").delete().eq("id", deckId);
    router.push("/dashboard/decks");
  }

  /** Cuántas copias ya conseguí: nunca menos de 0 ni más de las que pide el deck */
  async function changeQty(deckCardId: string, delta: number) {
    const entry = deckCards.find(c => c.id === deckCardId);
    if (!entry) return;
    const newQty = entry.quantity + delta;
    if (newQty < 0 || newQty > entry.needed) return;
    await supabase.from("deck_cards").update({ quantity: newQty }).eq("id", deckCardId);
    setDeckCards(prev => prev.map(c => c.id === deckCardId ? { ...c, quantity: newQty } : c));
  }

  /** Cuántas copias pide el deck. Al llegar a 0 la carta sale de la lista. */
  async function changeNeeded(deckCardId: string, delta: number) {
    const entry = deckCards.find(c => c.id === deckCardId);
    if (!entry) return;
    const newNeeded = entry.needed + delta;

    if (newNeeded <= 0) {
      await supabase.from("deck_cards").delete().eq("id", deckCardId);
      const remaining = deckCards.filter(c => c.id !== deckCardId);
      setDeckCards(remaining);
      if (deckCards[0]?.id === deckCardId && remaining[0]?.card?.image) {
        await supabase.from("decks").update({ cover_card_image: remaining[0].card.image }).eq("id", deckId);
      }
      return;
    }
    if (delta > 0 && totalCards >= MAX_CARDS) return;
    if (delta > 0 && !isEnergy(entry.card!) && newNeeded > 4) return;

    // Si el deck pide menos, lo conseguido no puede quedar por encima
    const newQty = Math.min(entry.quantity, newNeeded);
    await supabase.from("deck_cards").update({ needed: newNeeded, quantity: newQty }).eq("id", deckCardId);
    setDeckCards(prev => prev.map(c => c.id === deckCardId ? { ...c, needed: newNeeded, quantity: newQty } : c));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>Cargando deck…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .deck-editor-header { padding: 24px 20px 0; }
        @media (min-width: 768px) and (pointer: fine) { .deck-editor-header { padding: 48px 48px 0; } }
        .deck-editor-body { padding: 0 20px 80px; }
        @media (min-width: 768px) and (pointer: fine) { .deck-editor-body { padding: 0 48px 80px; } }
        .deck-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (min-width: 480px)  { .deck-cards-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 768px) and (pointer: fine)  { .deck-cards-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (min-width: 1200px) and (pointer: fine) { .deck-cards-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
        .picker-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media (min-width: 480px)  { .picker-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 768px) and (pointer: fine)  { .picker-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (min-width: 1200px) and (pointer: fine) { .picker-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
      `}</style>

      {/* Header */}
      <div className="deck-editor-header">
        <button onClick={() => router.push("/dashboard/decks")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
          <ArrowLeft size={14} />
          Mis Decks
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <h1 style={{ fontFamily: DISP, fontSize: "32px", color: INK0, margin: 0 }}>{deckName}</h1>
              <button
                onClick={() => { setEditName(deckName); setEditDesc(deckDesc); setEditPublic(isPublic); setEditingInfo(true); }}
                title="Editar nombre y descripción"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", width: 30, height: 30, color: INK2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = COURT; e.currentTarget.style.borderColor = `${COURT}55`; }}
                onMouseLeave={e => { e.currentTarget.style.color = INK2; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <Pencil size={13} strokeWidth={1.8} />
              </button>
            </div>
            {deckDesc && (
              <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, margin: "0 0 8px", maxWidth: "480px" }}>{deckDesc}</p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ position: "relative", height: "6px", width: "120px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                {/* tenue: las que el deck pide - solido: las que ya se consiguieron */}
                <div style={{ position: "absolute", inset: 0, width: `${(totalCards / MAX_CARDS) * 100}%`, background: "rgba(46,230,193,0.25)", borderRadius: "3px", transition: "width 0.3s" }} />
                <div style={{ position: "absolute", inset: 0, width: `${(ownedCards / MAX_CARDS) * 100}%`, background: COURT, borderRadius: "3px", transition: "width 0.3s" }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: "12px", color: totalCards >= MAX_CARDS ? COURT : INK2, fontWeight: totalCards >= MAX_CARDS ? 700 : 400 }}>
                {totalCards} / {MAX_CARDS} cartas
              </span>
              <span style={{ fontFamily: MONO, fontSize: "11px", color: totalCards > 0 && ownedCards >= totalCards ? COURT : INK2 }}>
                · {ownedCards} conseguidas
              </span>
              <span title={isPublic ? "Este deck se ve en tu perfil" : "Este deck esta oculto en tu perfil"} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: isPublic ? COURT : INK2, border: `1px solid ${isPublic ? COURT + "44" : "rgba(255,255,255,0.12)"}`, borderRadius: "999px", padding: "3px 9px" }}>
                {isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
                {isPublic ? "En el perfil" : "Oculto"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {deckPrice > 0 && (
              <div style={{ display: "flex", gap: "18px", marginRight: "6px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, marginBottom: "2px" }}>
                    Valor del deck
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "18px", color: COURT, fontWeight: 700 }}>
                    ${deckPrice.toFixed(2)} <span style={{ fontSize: "10px", color: INK2, fontWeight: 400 }}>USD</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, marginBottom: "2px" }}>
                    Tengo
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "18px", color: ownedPrice >= deckPrice ? COURT : INK0, fontWeight: 700 }}>
                    ${ownedPrice.toFixed(2)} <span style={{ fontSize: "10px", color: INK2, fontWeight: 400 }}>USD</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setPickerOpen(true)}
              disabled={totalCards >= MAX_CARDS}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "11px 22px", borderRadius: "10px", background: totalCards >= MAX_CARDS ? "rgba(255,255,255,0.05)" : COURT,
                color: totalCards >= MAX_CARDS ? INK2 : "#05070d",
                fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", border: "none",
                cursor: totalCards >= MAX_CARDS ? "default" : "pointer",
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Agregar Carta
            </button>
            <button
              onClick={deleteDeck}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "11px 22px", borderRadius: "10px",
                background: "rgba(209,53,53,0.08)", color: "#d95555",
                border: "1px solid rgba(209,53,53,0.25)",
                fontFamily: MONO, fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(209,53,53,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(209,53,53,0.08)")}
            >
              <Trash2 size={14} strokeWidth={1.8} />
              Eliminar Deck
            </button>
          </div>
        </div>
      </div>

      <div className="deck-editor-body">
        {deckCards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px" }}>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, marginBottom: "16px" }}>El deck está vacío.</p>
            <button onClick={() => setPickerOpen(true)} style={{ fontFamily: MONO, fontSize: "11px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "8px", padding: "8px 20px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              + Agregar primera carta
            </button>
          </div>
        ) : (
          <div className="deck-cards-grid">
            {deckCards.map((dc, index) => {
              const vColor = dc.card ? getVersionColor(dc.card.version) : INK2;
              const vLabel = dc.card ? getVersionLabel(dc.card.version) : dc.version;
              return (
                <div
                  key={dc.id}
                  draggable
                  onDragStart={() => setDragIdx(index)}
                  onDragOver={e => { e.preventDefault(); setDragOver(index); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => {
                    e.preventDefault();
                    if (dragIdx === null || dragIdx === index) { setDragIdx(null); setDragOver(null); return; }
                    const next = [...deckCards];
                    const [moved] = next.splice(dragIdx, 1);
                    next.splice(index, 0, moved);
                    setDragIdx(null);
                    setDragOver(null);
                    saveOrder(next);
                  }}
                  style={{
                    display: "flex", flexDirection: "column", gap: "6px",
                    cursor: "grab",
                    opacity: dragIdx === index ? 0.4 : 1,
                    outline: dragOver === index && dragIdx !== index ? `2px solid #2ee6c1` : "none",
                    outlineOffset: "3px",
                    borderRadius: "10px",
                    transition: "opacity 0.15s, outline 0.1s",
                  }}
                >
                  <div style={{ position: "relative", aspectRatio: "5/7", borderRadius: "8px", overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
                    {dc.card?.image && <img src={dc.card.image} alt={dc.card?.name ?? dc.card_id} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0, filter: dc.quantity === 0 ? "grayscale(1) brightness(0.7)" : dc.quantity < dc.needed ? "grayscale(0.55) brightness(0.9)" : "none", transition: "filter 0.25s" }} />}
                    <div style={{ position: "absolute", bottom: 4, right: 4, fontFamily: MONO, fontSize: "8px", color: vColor, border: `1px solid ${vColor}55`, borderRadius: "4px", padding: "1px 5px", background: "rgba(5,7,13,0.85)" }}>{vLabel}</div>
                    <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(5,7,13,0.85)", borderRadius: "6px", padding: "2px 7px", fontFamily: MONO, fontSize: "11px", color: dc.quantity >= dc.needed ? COURT : dc.quantity === 0 ? INK2 : "#d6ff3d", fontWeight: 700 }}>{dc.quantity} / {dc.needed}</div>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: "10px", color: INK0, margin: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dc.card?.name ?? dc.card_id}</p>
                  {(() => {
                    const canNeedMore = totalCards < MAX_CARDS && (isEnergy(dc.card!) || dc.needed < 4);
                    const row = (label: string, value: number, onLess: () => void, onMore: () => void, canMore: boolean, accent: string) => (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                        <span style={{ fontFamily: MONO, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: INK2 }}>{label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button onClick={onLess} style={{ width: 22, height: 22, borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "none", color: INK0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Minus size={11} />
                          </button>
                          <span style={{ fontFamily: MONO, fontSize: "12px", color: INK0, fontWeight: 700, width: "14px", textAlign: "center" }}>{value}</span>
                          <button onClick={onMore} disabled={!canMore} style={{ width: 22, height: 22, borderRadius: "6px", border: `1px solid ${accent}44`, background: "none", color: accent, cursor: canMore ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: canMore ? 1 : 0.35 }}>
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    );
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "auto" }}>
                        {row("Tengo", dc.quantity, () => changeQty(dc.id, -1), () => changeQty(dc.id, 1), dc.quantity < dc.needed, COURT)}
                        {row("Necesito", dc.needed, () => changeNeeded(dc.id, -1), () => changeNeeded(dc.id, 1), canNeedMore, "#d6ff3d")}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editar nombre y descripción */}
      {editingInfo && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,0.8)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditingInfo(false); }}
        >
          <div style={{ width: 360, borderRadius: "20px", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", padding: "28px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, margin: "0 0 20px" }}>Editar Deck</p>

            <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Nombre del deck</label>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && editName.trim()) saveDeckInfo(); }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "16px" }}
            />

            <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Descripción (opcional)</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Describe tu estrategia..."
              rows={2}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box", resize: "none", marginBottom: "20px" }}
            />

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${editPublic ? COURT + "33" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", marginBottom: "20px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                {editPublic ? <Eye size={14} color={COURT} /> : <EyeOff size={14} color={INK2} />}
                <span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "11px", color: INK0 }}>Mostrar en mi perfil</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "9px", color: INK2, marginTop: "2px" }}>
                    {editPublic ? "Cualquiera puede verlo" : "Solo tu lo ves"}
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={editPublic}
                onChange={e => setEditPublic(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: COURT, cursor: "pointer", flexShrink: 0 }}
              />
            </label>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setEditingInfo(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveDeckInfo} disabled={!editName.trim()} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: COURT, color: "#05070d", fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: editName.trim() ? "pointer" : "default", opacity: editName.trim() ? 1 : 0.5 }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Picker Modal */}
      {pickerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,7,13,0.92)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column" }}>
          {/* Picker header */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "480px" }}>
              <Search size={15} color={INK2} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar carta... (ej: Pikachu, Charizard)"
                style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: totalCards >= MAX_CARDS ? COURT : INK2, flexShrink: 0 }}>
              {totalCards} / {MAX_CARDS}
            </div>
            <button onClick={() => { setPickerOpen(false); setQuery(""); }} style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {query.trim().length < 2 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  Escribe al menos 2 letras para buscar
                </p>
              </div>
            ) : isSearching ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  Buscando cartas...
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0 }}>
                  Sin resultados
                </p>
              </div>
            ) : (
              <div className="picker-grid">
                {searchResults.map((r, i) => {
                  const vColor = getVersionColor(r.card.version);
                  const vLabel = getVersionLabel(r.card.version);
                  const inDeck = deckCards.find(c => c.card_id === r.card.id && c.set_id === r.setId && c.version === r.card.version);
                  const canAdd = totalCards < MAX_CARDS && (isEnergy(r.card) || (inDeck?.needed ?? 0) < 4);
                  return (
                    <div key={`${r.setId}-${r.card.id}-${i}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ position: "relative", aspectRatio: "5/7", borderRadius: "8px", overflow: "hidden", background: "rgba(255,255,255,0.03)", cursor: canAdd ? "pointer" : "default" }} onClick={() => canAdd && addCard(r.card, r.setId)}>
                        <img src={r.card.image} alt={r.card.name} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
                        <div style={{ position: "absolute", bottom: 4, right: 4, fontFamily: MONO, fontSize: "8px", color: vColor, border: `1px solid ${vColor}55`, borderRadius: "4px", padding: "1px 5px", background: "rgba(5,7,13,0.85)" }}>{vLabel}</div>
                        {inDeck && (
                          <div style={{ position: "absolute", top: 6, right: 6, background: inDeck.quantity >= inDeck.needed ? "#00e676" : "rgba(122,130,152,0.92)", borderRadius: "8px", padding: "3px 9px", fontFamily: MONO, fontSize: "12px", color: "#05070d", fontWeight: 800, letterSpacing: "0.02em", boxShadow: inDeck.quantity >= inDeck.needed ? "0 0 10px rgba(0,230,118,0.6)" : "none" }}>
                            {inDeck.quantity} / {inDeck.needed}
                          </div>
                        )}
                        {canAdd && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(46,230,193,0.0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(46,230,193,0.15)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(46,230,193,0.0)")}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(46,230,193,0.9)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                            >
                              <Plus size={18} color="#05070d" strokeWidth={2.5} />
                            </div>
                          </div>
                        )}
                      </div>
                      <p style={{ fontFamily: MONO, fontSize: "12px", color: INK0, margin: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{r.card.name}</p>
                      <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, textAlign: "center" }}>#{String(r.card.card_number).padStart(3,"0")} · {r.setName}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
