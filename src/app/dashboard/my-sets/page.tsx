"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { Plus, WalletCards } from "lucide-react";
import Link from "next/link";

const VIOLET = "#a78bfa";
const INK0   = "#f5f7fb";
const INK2   = "#7a8298";
const MONO   = "var(--font-jetbrains)";
const DISP   = "var(--font-archivo)";

interface MySet {
  id: string;
  name: string;
  description: string | null;
  cover_card_image: string | null;
  created_at: string;
  card_count: number;
  price: number;
}

export default function MySetsPage() {
  const supabase = createClient();
  const [sets,    setSets]    = useState<MySet[]>([]);
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
        .from("my_sets")
        .select("id, name, description, cover_card_image, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const cardQueries = await Promise.all(data.map(set =>
          supabase.from("my_set_cards")
            .select("card_id, set_id, version, quantity, position")
            .eq("my_set_id", set.id)
            .order("position", { ascending: true })
            .then(r => r.data ?? [])
        ));

        const allSetIds = [...new Set(cardQueries.flatMap(c => c.map(r => r.set_id)))];
        if (allSetIds.length > 0) await loadManySets(allSetIds);

        // Precios Scrydex de todas las cartas de todos los sets, en una sola consulta por lotes
        const priceIds = [...new Set(cardQueries.flatMap(rows => rows.map(r => {
          const sc = SCRYDEX_SET_CODES[r.set_id];
          if (!sc) return null;
          const card = (SET_CARDS[r.set_id] ?? []).find(c => c.id === r.card_id && c.version === r.version);
          return card ? `${sc}-${card.card_number}` : null;
        }).filter((id): id is string => !!id)))];
        const priceMap: Record<string, Record<string, number>> = {};
        if (priceIds.length > 0) {
          const chunks: string[][] = [];
          for (let i = 0; i < priceIds.length; i += 200) chunks.push(priceIds.slice(i, i + 200));
          const rows = (await Promise.all(chunks.map(chunk =>
            supabase.from("card_prices").select("card_id, prices").in("card_id", chunk)
          ))).flatMap(res => res.data ?? []);
          for (const row of rows) priceMap[row.card_id] = row.prices as Record<string, number>;
        }

        const setsWithCards = data.map((set, i) => {
          const cardRows = cardQueries[i] ?? [];
          const card_count = cardRows.reduce((s, r) => s + r.quantity, 0);
          const price = cardRows.reduce((sum, r) => {
            const sc = SCRYDEX_SET_CODES[r.set_id];
            const card = (SET_CARDS[r.set_id] ?? []).find(c => c.id === r.card_id && c.version === r.version);
            if (!sc || !card) return sum;
            const map = priceMap[`${sc}-${card.card_number}`];
            if (!map) return sum;
            const vk = card.version.toLowerCase().replace(/\s+/g, "");
            const p = map[vk] ?? map[card.version] ?? map["normal"] ?? null;
            return p !== null ? sum + p * Math.max(r.quantity, 1) : sum;
          }, 0);
          return { ...set, card_count, price };
        });
        setSets(setsWithCards);
      }
      setLoading(false);
    })();
  }, []);

  async function createSet() {
    if (!userId || !newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("my_sets").insert({
      user_id: userId,
      name: newName.trim(),
      description: newDesc.trim() || null,
    }).select("id, name, description, cover_card_image, created_at").single();
    if (!error && data) {
      setSets(prev => [{ ...data, card_count: 0, price: 0 }, ...prev]);
      setCreating(false);
      setNewName("");
      setNewDesc("");
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .msets-header { padding: 24px 20px 0; }
        @media (min-width: 768px) { .msets-header { padding: 48px 48px 0; } }
        .msets-body { padding: 0 20px 80px; }
        @media (min-width: 768px) { .msets-body { padding: 0 48px 80px; } }
        @keyframes mset-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div className="msets-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: VIOLET, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: VIOLET, display: "inline-block" }} />
          Mi Colección
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: "0 0 24px" }}>My Sets</h1>

        <button
          onClick={() => setCreating(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 22px", borderRadius: "10px", background: VIOLET, color: "#05070d",
            fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", border: "none", cursor: "pointer",
            marginBottom: "36px", transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={14} strokeWidth={2.5} />
          Crear Set
        </button>
      </div>

      <div className="msets-body">
        {/* Create modal */}
        {creating && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(5,7,13,0.8)", backdropFilter: "blur(6px)",
          }} onClick={e => { if (e.target === e.currentTarget) { setCreating(false); setNewName(""); setNewDesc(""); } }}>
            <div style={{ width: 360, borderRadius: "20px", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", padding: "28px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
              <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: VIOLET, margin: "0 0 6px" }}>Nuevo Set</p>
              <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, fontWeight: 700, margin: "0 0 20px" }}>¿Cómo se llama?</p>

              <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Nombre del set</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createSet(); }}
                placeholder="Ej: Mis Charizards favoritos"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "16px" }}
              />

              <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Descripción (opcional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="¿De qué trata esta colección?"
                rows={2}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box", resize: "none", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
                <button onClick={createSet} disabled={!newName.trim() || saving} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: VIOLET, color: "#05070d", fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: newName.trim() ? "pointer" : "default", opacity: newName.trim() ? 1 : 0.5 }}>
                  {saving ? "…" : "Crear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: "16px", background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "mset-shimmer 1.4s ease-in-out infinite" }} />)}
          </div>
        ) : sets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <WalletCards size={48} color={INK2} strokeWidth={1} style={{ marginBottom: "16px", opacity: 0.4 }} />
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, marginBottom: "6px" }}>No tienes sets todavía.</p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, opacity: 0.5, margin: 0 }}>Crea tu primer set y arma tu colección con cartas de cualquier expansión.</p>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, marginBottom: "16px" }}>
              {sets.length} {sets.length === 1 ? "set" : "sets"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {sets.map(set => (
              <Link key={set.id} href={`/dashboard/my-sets/${set.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div
                  style={{ position: "relative", width: "100%", aspectRatio: "5/7", borderRadius: "12px", overflow: "hidden", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)"; e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,0.8)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.6)"; }}
                >
                  {set.cover_card_image ? (
                    <img src={set.cover_card_image} alt={set.name} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <WalletCards size={48} color={VIOLET} strokeWidth={1.2} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <p style={{ fontFamily: DISP, fontSize: "15px", color: INK0, fontWeight: 700, margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{set.name}</p>
                  <p style={{ fontFamily: MONO, fontSize: "12px", color: set.price > 0 ? VIOLET : INK2, fontWeight: 700, margin: 0 }}>
                    {set.price > 0 ? <>${set.price.toFixed(2)} <span style={{ fontSize: "9px", color: INK2, fontWeight: 400 }}>USD</span></> : "—"}
                  </p>
                </div>
              </Link>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
