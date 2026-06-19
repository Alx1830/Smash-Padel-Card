"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { ArrowLeft, Search, Plus, Minus, Trash2, X } from "lucide-react";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const MAX_CARDS = 60;

const ALL_SETS    = POKEMON_SERIES.flatMap(s => s.sets);
const ALL_SET_IDS = ALL_SETS.map(s => s.id);
const BATCH_SIZE  = 10;

interface DeckCard {
  id: string;
  card_id: string;
  set_id: string;
  version: string;
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
  const [deckCards,  setDeckCards]  = useState<DeckCard[]>([]);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIdx,    setDragIdx]    = useState<number | null>(null);
  const [dragOver,   setDragOver]   = useState<number | null>(null);
  const [query,      setQuery]      = useState("");
  const [loadedSets, setLoadedSets] = useState<Set<string>>(new Set());
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [loadProgress,   setLoadProgress]   = useState(0);

  const totalCards = deckCards.reduce((s, c) => s + c.quantity, 0);

  // Load deck info + cards
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/dashboard/decks"); return; }
      setUserId(user.id);

      const [{ data: deck }, { data: cards }] = await Promise.all([
        supabase.from("decks").select("name").eq("id", deckId).eq("user_id", user.id).single(),
        supabase.from("deck_cards").select("id, card_id, set_id, version, quantity, position").eq("deck_id", deckId).order("position", { ascending: true }),
      ]);

      if (!deck) { router.push("/dashboard/decks"); return; }
      setDeckName(deck.name);

      if (cards && cards.length > 0) {
        const setIds = [...new Set(cards.map(c => c.set_id))];
        await loadManySets(setIds);
        const resolved = cards.map(c => {
          const setCards = SET_CARDS[c.set_id] ?? [];
          const card = setCards.find(sc => sc.id === c.card_id && sc.version === c.version);
          return { ...c, position: c.position ?? 0, card };
        });
        setDeckCards(resolved);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Load all sets progressively for the picker
  const startLoadingAllSets = useCallback(async () => {
    if (isLoadingCards) return;
    setIsLoadingCards(true);
    const total = ALL_SET_IDS.length;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = ALL_SET_IDS.slice(i, i + BATCH_SIZE);
      await loadManySets(batch);
      setLoadedSets(prev => {
        const next = new Set(prev);
        batch.forEach(id => next.add(id));
        return next;
      });
      setLoadProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)));
    }
    setIsLoadingCards(false);
  }, [isLoadingCards]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: { card: PokemonCard; setId: string; setName: string }[] = [];
    for (const setId of loadedSets) {
      const cards = SET_CARDS[setId];
      if (!cards) continue;
      const setInfo = ALL_SETS.find(s => s.id === setId);
      for (const card of cards) {
        if (card.name.toLowerCase().includes(q)) {
          out.push({ card: card as PokemonCard, setId, setName: setInfo?.name ?? setId });
        }
      }
    }
    return out.slice(0, 80).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [query, loadedSets]);

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
    if (totalCards >= MAX_CARDS) return;
    const existing = deckCards.find(c => c.card_id === card.id && c.set_id === setId && c.version === card.version);

    if (existing) {
      if (totalCards >= MAX_CARDS) return;
      if (!isEnergy(card) && existing.quantity >= 4) return;
      const newQty = existing.quantity + 1;
      await supabase.from("deck_cards").update({ quantity: newQty }).eq("id", existing.id);
      setDeckCards(prev => prev.map(c => c.id === existing.id ? { ...c, quantity: newQty } : c));
    } else {
      const { data } = await supabase.from("deck_cards").insert({
        deck_id: deckId, card_id: card.id, set_id: setId, version: card.version, quantity: 1,
      }).select("id, card_id, set_id, version, quantity, position").single();
      if (data) {
        setDeckCards(prev => [...prev, { ...data, position: data.position ?? 0, card }]);
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

  async function changeQty(deckCardId: string, delta: number) {
    const entry = deckCards.find(c => c.id === deckCardId);
    if (!entry) return;
    const newQty = entry.quantity + delta;
    if (newQty <= 0) {
      await supabase.from("deck_cards").delete().eq("id", deckCardId);
      const remaining = deckCards.filter(c => c.id !== deckCardId);
      setDeckCards(remaining);
      if (deckCards[0]?.id === deckCardId && remaining[0]?.card?.image) {
        await supabase.from("decks").update({ cover_card_image: remaining[0].card.image }).eq("id", deckId);
      }
    } else if (!isEnergy(entry.card!) && newQty > 4) {
      return;
    } else {
      await supabase.from("deck_cards").update({ quantity: newQty }).eq("id", deckCardId);
      setDeckCards(prev => prev.map(c => c.id === deckCardId ? { ...c, quantity: newQty } : c));
    }
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
        @media (min-width: 768px) { .deck-editor-header { padding: 48px 48px 0; } }
        .deck-editor-body { padding: 0 20px 80px; }
        @media (min-width: 768px) { .deck-editor-body { padding: 0 48px 80px; } }
        .deck-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 480px)  { .deck-cards-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px)  { .deck-cards-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1200px) { .deck-cards-grid { grid-template-columns: repeat(6, 1fr); } }
        .picker-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 480px)  { .picker-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px)  { .picker-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1200px) { .picker-grid { grid-template-columns: repeat(7, 1fr); } }
      `}</style>

      {/* Header */}
      <div className="deck-editor-header">
        <button onClick={() => router.push("/dashboard/decks")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
          <ArrowLeft size={14} />
          Mis Decks
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontFamily: DISP, fontSize: "32px", color: INK0, margin: "0 0 6px" }}>{deckName}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ height: "6px", width: "120px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(totalCards / MAX_CARDS) * 100}%`, background: totalCards >= MAX_CARDS ? COURT : "rgba(46,230,193,0.6)", borderRadius: "3px", transition: "width 0.3s" }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: "12px", color: totalCards >= MAX_CARDS ? COURT : INK2, fontWeight: totalCards >= MAX_CARDS ? 700 : 400 }}>
                {totalCards} / {MAX_CARDS} cartas
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => { setPickerOpen(true); startLoadingAllSets(); }}
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
            <button onClick={() => { setPickerOpen(true); startLoadingAllSets(); }} style={{ fontFamily: MONO, fontSize: "11px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "8px", padding: "8px 20px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
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
                    {dc.card?.image && <img src={dc.card.image} alt={dc.card?.name ?? dc.card_id} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />}
                    <div style={{ position: "absolute", bottom: 4, right: 4, fontFamily: MONO, fontSize: "8px", color: vColor, border: `1px solid ${vColor}55`, borderRadius: "4px", padding: "1px 5px", background: "rgba(5,7,13,0.85)" }}>{vLabel}</div>
                    <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(5,7,13,0.85)", borderRadius: "6px", padding: "2px 7px", fontFamily: MONO, fontSize: "11px", color: COURT, fontWeight: 700 }}>×{dc.quantity}</div>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: "10px", color: INK0, margin: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dc.card?.name ?? dc.card_id}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <button onClick={() => changeQty(dc.id, -1)} style={{ width: 28, height: 28, borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "none", color: INK0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontFamily: MONO, fontSize: "13px", color: INK0, fontWeight: 700, width: "20px", textAlign: "center" }}>{dc.quantity}</span>
                    <button onClick={() => changeQty(dc.id, 1)} disabled={totalCards >= MAX_CARDS || (!isEnergy(dc.card!) && dc.quantity >= 4)} style={{ width: 28, height: 28, borderRadius: "6px", border: `1px solid ${COURT}44`, background: "none", color: COURT, cursor: (totalCards >= MAX_CARDS || (!isEnergy(dc.card!) && dc.quantity >= 4)) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (totalCards >= MAX_CARDS || (!isEnergy(dc.card!) && dc.quantity >= 4)) ? 0.4 : 1 }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

          {/* Progress */}
          {isLoadingCards && (
            <div style={{ padding: "8px 24px", flexShrink: 0 }}>
              <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${loadProgress}%`, background: COURT, transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {/* Results */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {query.trim().length < 2 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  {isLoadingCards ? `Cargando cartas... ${loadProgress}%` : "Escribe al menos 2 letras para buscar"}
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0 }}>
                  {isLoadingCards ? "Buscando en sets cargados..." : "Sin resultados"}
                </p>
              </div>
            ) : (
              <div className="picker-grid">
                {searchResults.map((r, i) => {
                  const vColor = getVersionColor(r.card.version);
                  const vLabel = getVersionLabel(r.card.version);
                  const inDeck = deckCards.find(c => c.card_id === r.card.id && c.set_id === r.setId && c.version === r.card.version);
                  const canAdd = totalCards < MAX_CARDS && (isEnergy(r.card) || (inDeck?.quantity ?? 0) < 4);
                  return (
                    <div key={`${r.setId}-${r.card.id}-${i}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ position: "relative", aspectRatio: "5/7", borderRadius: "8px", overflow: "hidden", background: "rgba(255,255,255,0.03)", cursor: canAdd ? "pointer" : "default" }} onClick={() => canAdd && addCard(r.card, r.setId)}>
                        <img src={r.card.image} alt={r.card.name} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
                        <div style={{ position: "absolute", bottom: 4, right: 4, fontFamily: MONO, fontSize: "8px", color: vColor, border: `1px solid ${vColor}55`, borderRadius: "4px", padding: "1px 5px", background: "rgba(5,7,13,0.85)" }}>{vLabel}</div>
                        {inDeck && <div style={{ position: "absolute", top: 6, right: 6, background: "#00e676", borderRadius: "8px", padding: "3px 9px", fontFamily: MONO, fontSize: "14px", color: "#05070d", fontWeight: 800, letterSpacing: "0.02em", boxShadow: "0 0 10px rgba(0,230,118,0.6)" }}>×{inDeck.quantity}</div>}
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
