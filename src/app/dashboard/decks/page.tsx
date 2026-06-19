"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { Plus, Layers, Trash2 } from "lucide-react";
import Link from "next/link";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface DeckCardSummary {
  name: string;
  quantity: number;
}

interface Deck {
  id: string;
  name: string;
  description: string | null;
  cover_card_image: string | null;
  created_at: string;
  card_count: number;
  cards: DeckCardSummary[];
}

export default function DecksPage() {
  const supabase = createClient();
  const [decks,   setDecks]   = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("decks")
        .select("id, name, description, cover_card_image, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const cardQueries = await Promise.all(data.map(deck =>
          supabase.from("deck_cards")
            .select("card_id, set_id, version, quantity, position")
            .eq("deck_id", deck.id)
            .order("position", { ascending: true })
            .then(r => r.data ?? [])
        ));

        const allSetIds = [...new Set(cardQueries.flatMap(c => c.map(r => r.set_id)))];
        if (allSetIds.length > 0) await loadManySets(allSetIds);

        const decksWithCards = data.map((deck, i) => {
          const deckCardRows = cardQueries[i] ?? [];
          const resolved: DeckCardSummary[] = deckCardRows.map(r => {
            const setCards = SET_CARDS[r.set_id] ?? [];
            const card = setCards.find(c => c.id === r.card_id && c.version === r.version);
            return { name: card?.name ?? r.card_id, quantity: r.quantity };
          });
          const card_count = deckCardRows.reduce((s, r) => s + r.quantity, 0);
          return { ...deck, card_count, cards: resolved };
        });
        setDecks(decksWithCards);
      }
      setLoading(false);
    })();
  }, []);

  async function createDeck() {
    if (!userId || !newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("decks").insert({
      user_id: userId,
      name: newName.trim(),
      description: newDesc.trim() || null,
    }).select("id, name, description, cover_card_image, created_at").single();
    if (!error && data) {
      setDecks(prev => [{ ...data, card_count: 0, cards: [] }, ...prev]);
      setCreating(false);
      setNewName("");
      setNewDesc("");
    }
    setSaving(false);
  }

  async function deleteDeck(deckId: string) {
    await supabase.from("decks").delete().eq("id", deckId);
    setDecks(prev => prev.filter(d => d.id !== deckId));
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .decks-header { padding: 24px 20px 0; }
        @media (min-width: 768px) { .decks-header { padding: 48px 48px 0; } }
        .decks-body { padding: 0 20px 80px; }
        @media (min-width: 768px) { .decks-body { padding: 0 48px 80px; } }
        @keyframes deck-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div className="decks-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi Colección
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: "0 0 24px" }}>Decks</h1>

        <button
          onClick={() => setCreating(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 22px", borderRadius: "10px", background: COURT, color: "#05070d",
            fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", border: "none", cursor: "pointer",
            marginBottom: "36px", transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={14} strokeWidth={2.5} />
          Crear Deck
        </button>
      </div>

      <div className="decks-body">
        {/* Create modal */}
        {creating && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(5,7,13,0.8)", backdropFilter: "blur(6px)",
          }} onClick={e => { if (e.target === e.currentTarget) { setCreating(false); setNewName(""); setNewDesc(""); } }}>
            <div style={{ width: 360, borderRadius: "20px", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", padding: "28px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
              <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, margin: "0 0 6px" }}>Nuevo Deck</p>
              <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, fontWeight: 700, margin: "0 0 20px" }}>¿Cómo se llama?</p>

              <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Nombre del deck</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createDeck(); }}
                placeholder="Ej: Lucario EX Turbo"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "16px" }}
              />

              <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Descripción (opcional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Describe tu estrategia..."
                rows={2}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box", resize: "none", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
                <button onClick={createDeck} disabled={!newName.trim() || saving} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: COURT, color: "#05070d", fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: newName.trim() ? "pointer" : "default", opacity: newName.trim() ? 1 : 0.5 }}>
                  {saving ? "…" : "Crear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: "16px", background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "deck-shimmer 1.4s ease-in-out infinite" }} />)}
          </div>
        ) : decks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <Layers size={48} color={INK2} strokeWidth={1} style={{ marginBottom: "16px", opacity: 0.4 }} />
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, marginBottom: "6px" }}>No tienes decks todavía.</p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, opacity: 0.5, margin: 0 }}>Crea tu primer deck y empieza a construir tu estrategia.</p>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, marginBottom: "16px" }}>
              {decks.length} {decks.length === 1 ? "deck" : "decks"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(560px, 1fr))", gap: "16px" }}>
            {decks.map(deck => (
              <div key={deck.id} style={{ display: "flex", gap: "0", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(46,230,193,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                {/* Carta portada */}
                <Link href={`/dashboard/decks/${deck.id}`} style={{ textDecoration: "none", display: "flex", flexShrink: 0 }}>
                  <div style={{ width: 302, padding: "14px 0 14px 14px", display: "flex", alignItems: "center" }}>
                    {deck.cover_card_image ? (
                      <img
                        src={deck.cover_card_image}
                        alt={deck.name}
                        style={{
                          width: 288, aspectRatio: "5/7", objectFit: "contain",
                          borderRadius: "12px",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5)",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ width: 288, aspectRatio: "5/7", borderRadius: "12px", background: "rgba(46,230,193,0.06)", border: "1px solid rgba(46,230,193,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Layers size={60} color={COURT} strokeWidth={1.2} />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info lateral */}
                <Link href={`/dashboard/decks/${deck.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0, padding: "14px 10px 14px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <p style={{ fontFamily: DISP, fontSize: "16px", color: INK0, fontWeight: 700, margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.name}</p>
                    {deck.description && <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "0 0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.description}</p>}
                    <p style={{ fontFamily: MONO, fontSize: "11px", color: deck.card_count >= 60 ? COURT : INK2, margin: 0, letterSpacing: "0.06em" }}>
                      {deck.card_count} / 60 cartas{deck.card_count >= 60 && <span style={{ marginLeft: "8px", color: COURT }}>✓ Completo</span>}
                    </p>
                  </div>

                  {/* Lista de cartas sin scroll */}
                  {deck.cards.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {deck.cards.slice(0, 10).map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontFamily: MONO, fontSize: "10px", color: COURT, fontWeight: 700, minWidth: "20px" }}>×{c.quantity}</span>
                          <span style={{ fontFamily: MONO, fontSize: "10px", color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                        </div>
                      ))}
                      {deck.cards.length > 10 && (
                        <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, marginTop: "2px" }}>+{deck.cards.length - 10} más…</span>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
