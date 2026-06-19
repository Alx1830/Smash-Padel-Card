"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Layers, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  cover_card_image: string | null;
  created_at: string;
  card_count?: number;
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
        // Fetch card counts for each deck
        const decksWithCount = await Promise.all(data.map(async (deck) => {
          const { data: cards } = await supabase
            .from("deck_cards")
            .select("quantity")
            .eq("deck_id", deck.id);
          const count = (cards ?? []).reduce((s, r) => s + r.quantity, 0);
          return { ...deck, card_count: count };
        }));
        setDecks(decksWithCount);
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
      setDecks(prev => [{ ...data, card_count: 0 }, ...prev]);
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
        .deck-card-link { text-decoration: none; }
        .deck-card-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 20px 24px;
          display: flex; align-items: center; gap: 16px;
          transition: border-color 0.2s, background 0.2s;
          cursor: pointer;
        }
        .deck-card-item:hover {
          border-color: rgba(46,230,193,0.3);
          background: rgba(46,230,193,0.04);
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, marginBottom: "8px" }}>
              {decks.length} {decks.length === 1 ? "deck" : "decks"}
            </p>
            {decks.map(deck => (
              <div key={deck.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Link href={`/dashboard/decks/${deck.id}`} className="deck-card-link" style={{ flex: 1 }}>
                  <div className="deck-card-item">
                    {deck.cover_card_image ? (
                      <img src={deck.cover_card_image} alt="" style={{ width: 44, height: 62, objectFit: "contain", borderRadius: "6px", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 62, borderRadius: "6px", background: "rgba(46,230,193,0.08)", border: "1px solid rgba(46,230,193,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Layers size={20} color={COURT} strokeWidth={1.5} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: DISP, fontSize: "15px", color: INK0, fontWeight: 700, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.name}</p>
                      {deck.description && <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.description}</p>}
                      <p style={{ fontFamily: MONO, fontSize: "10px", color: (deck.card_count ?? 0) >= 60 ? COURT : INK2, margin: 0, letterSpacing: "0.06em" }}>
                        {deck.card_count ?? 0} / 60 cartas
                        {(deck.card_count ?? 0) >= 60 && <span style={{ marginLeft: "6px", color: COURT }}>✓ Completo</span>}
                      </p>
                    </div>
                    <ChevronRight size={16} color={INK2} />
                  </div>
                </Link>
                <button
                  onClick={() => deleteDeck(deck.id)}
                  title="Eliminar deck"
                  style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(209,53,53,0.08)", border: "1px solid rgba(209,53,53,0.2)", color: "#d95555", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(209,53,53,0.18)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(209,53,53,0.08)")}
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
