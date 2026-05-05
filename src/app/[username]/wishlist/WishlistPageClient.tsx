"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import { ModalTiltCard } from "@/components/CardDetailModal";
import type { PokemonCard } from "@/data/pokemon-cards-meta";

const COURT = "#ffd24f";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface WishlistRow { card_id: number | string; set_id: string; }
interface SetInfo     { id: string; name: string; logo: string; }

async function checkUserReady(): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_logged" };
  const { data } = await supabase
    .from("players")
    .select("username, whatsapp_numero")
    .eq("user_id", user.id)
    .single();
  if (!data?.username) return { ok: false, reason: "no_username" };
  if (!data?.whatsapp_numero) return { ok: false, reason: "no_whatsapp" };
  return { ok: true };
}

export function WishlistPageClient({
  username, wishlistRows, allSets, whatsappIndicativo, whatsappNumero,
}: {
  username:            string;
  wishlistRows:        WishlistRow[];
  allSets:             SetInfo[];
  whatsappIndicativo:  string;
  whatsappNumero:      string;
}) {
  const [fNombre,     setFNombre]     = useState("");
  const [fSet,        setFSet]        = useState("");
  const [fVariante,   setFVariante]   = useState("");
  const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
  const [authMsg,     setAuthMsg]     = useState<string | null>(null);
  const [setsLoaded,  setSetsLoaded]  = useState(false);

  useEffect(() => {
    const ids = [...new Set(wishlistRows.map(w => w.set_id))];
    loadManySets(ids).then(() => setSetsLoaded(true));
  }, [wishlistRows]);

  const resolved = useMemo(() => {
    return wishlistRows.map(w => {
      const cards = SET_CARDS[w.set_id];
      const card  = cards?.find(c => c.id === w.card_id);
      const set   = allSets.find(s => s.id === w.set_id);
      return card && set ? { card, set, card_id: w.card_id, set_id: w.set_id } : null;
    }).filter(Boolean) as { card: NonNullable<ReturnType<typeof SET_CARDS[string]["find"]>>; set: SetInfo; card_id: number | string; set_id: string }[];
  }, [wishlistRows, allSets]);

  const setVersions = useMemo(() => {
    const versions = new Set<string>();
    resolved.forEach(r => versions.add(r.card.version));
    return [...versions].sort();
  }, [resolved]);

  const filtered = useMemo(() => {
    return resolved.filter(r => {
      if (fNombre.trim() && !r.card.name.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
      if (fSet && r.set_id !== fSet) return false;
      if (fVariante && r.card.version !== fVariante) return false;
      return true;
    });
  }, [resolved, fNombre, fSet, fVariante]);

  const hasFilters = fNombre || fSet || fVariante;
  function clearFilters() { setFNombre(""); setFSet(""); setFVariante(""); }

  async function handleVender(card: { name: string; version: string }, set: SetInfo, e: React.MouseEvent) {
    e.preventDefault();
    const check = await checkUserReady();
    if (!check.ok) {
      const msgs: Record<string, string> = {
        not_logged:   "Debes registrarte en FaceBinder para poder usar este servicio.",
        no_username:  "Debes completar tu nombre de usuario en tu perfil para usar este servicio.",
        no_whatsapp:  "Debes agregar tu número de WhatsApp en tu perfil para usar este servicio.",
      };
      setAuthMsg(msgs[check.reason!] ?? "Debes completar tu perfil para usar este servicio.");
      return;
    }
    if (!whatsappNumero) { setAuthMsg("El dueño de esta wishlist no tiene WhatsApp configurado."); return; }
    const number = whatsappIndicativo.replace(/\D/g, "") + whatsappNumero.replace(/\D/g, "");
    const text = encodeURIComponent(
      `¡Hola! Vi tu perfil en FaceBinder y vi que estás buscando:\n\n` +
      `• ${card.name} ${getVersionLabel(card.version)}\n` +
      `• ${set.name}\n\n` +
      `Yo la tengo. ¿Estás interesado?`
    );
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
  }

  const sInput: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "7px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box",
  };
  const sLabel: React.CSSProperties = {
    fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em",
    textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px",
  };
  const sDivider: React.CSSProperties = { height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0" };
  const sSelect: React.CSSProperties = { ...sInput, cursor: "pointer", appearance: "none", WebkitAppearance: "none" };

  return (
    <div style={{ width: "100%", background: BG0 }}>

      {/* ══ AUTH POPUP ══ */}
      {authMsg && (
        <div onClick={() => setAuthMsg(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,7,13,0.88)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "36px 32px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔒</div>
            <h3 style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Acceso requerido</h3>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.7, margin: "0 0 24px", letterSpacing: "0.04em" }}>{authMsg}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <Link href="/login" style={{ padding: "10px 24px", borderRadius: "10px", background: COURT, color: "#05070d", fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                Registrarse
              </Link>
              <button onClick={() => setAuthMsg(null)} style={{ padding: "10px 20px", borderRadius: "10px", background: "none", border: "1px solid rgba(255,255,255,0.12)", color: INK2, fontFamily: MONO, fontSize: "11px", cursor: "pointer", letterSpacing: "0.08em" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ LIGHTBOX ══ */}
      {previewCard && (
        <div onClick={() => setPreviewCard(null)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(5,7,13,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(300px, 78vw)" }}>
            <ModalTiltCard card={previewCard} />
          </div>
          <button onClick={() => setPreviewCard(null)} style={{ position: "fixed", top: "20px", right: "24px", background: "none", border: "none", color: INK0, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ══ HEADER SECTION ══ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px 16px" }} className="wl-section-header">
        <style>{`@media (min-width: 1024px) { .wl-section-header { padding: 32px 80px 16px !important; } }`}</style>
        <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
          <Link href={`/${username}`} style={{ color: COURT, textDecoration: "none" }}>@{username}</Link>
          <span style={{ color: INK2 }}>›</span>
          Wishlist
        </div>
        <h2 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
          Cartas que{" "}
          <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #ffd24f, #ff9a3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>necesito</em>
        </h2>
        <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>
          {resolved.length} {resolved.length === 1 ? "carta" : "cartas"} en la lista de deseos
        </p>
      </section>

      {/* ══ BODY ══ */}
      <section style={{ padding: "32px 24px 80px" }} className="wl-body">
        <style>{`
          @media (min-width: 1024px) { .wl-body { padding: 48px 80px 80px !important; } }
          .wl-layout { display: flex; gap: 32px; align-items: flex-start; }
          .wl-sidebar { width: 240px; flex-shrink: 0; }
          .wl-grid-area { flex: 1; min-width: 0; }
          @media (max-width: 1023px) { .wl-layout { flex-direction: column; } .wl-sidebar { display: none; } }
        `}</style>

        <div className="wl-layout">

          {/* ── Sidebar ── */}
          <aside className="wl-sidebar">
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px", position: "sticky", top: "80px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>Filtros</span>
                {hasFilters && (
                  <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", background: "none", border: "1px solid rgba(209,53,53,0.3)", borderRadius: "5px", padding: "3px 10px", cursor: "pointer" }}>
                    Limpiar
                  </button>
                )}
              </div>

              <div>
                <label style={sLabel}>Nombre de carta</label>
                <input style={{ ...sInput, paddingLeft: "10px" }} value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Pikachu..." />
              </div>

              <div style={sDivider} />

              <div>
                <label style={sLabel}>Variante</label>
                <select value={fVariante} onChange={e => setFVariante(e.target.value)} style={sSelect}>
                  <option value="" style={{ background: "#0a0e1a" }}>Todas las variantes</option>
                  {setVersions.map(v => (
                    <option key={v} value={v} style={{ background: "#0a0e1a", color: INK0 }}>{getVersionLabel(v)}</option>
                  ))}
                </select>
              </div>

              <div style={sDivider} />

              <div>
                <label style={sLabel}>Set</label>
                <select value={fSet} onChange={e => setFSet(e.target.value)} style={sSelect}>
                  <option value="" style={{ background: "#0a0e1a" }}>Todos los sets</option>
                  {allSets.filter(s => resolved.some(r => r.set_id === s.id)).map(s => (
                    <option key={s.id} value={s.id} style={{ background: "#0a0e1a", color: INK0 }}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* ── Grid ── */}
          <div className="wl-grid-area">
            {resolved.length === 0 ? (
              <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>🔍</div>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>La wishlist está vacía</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Ningún resultado</p>
                <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "10px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Limpiar filtros</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="wl-cards-grid">
                <style>{`@media (max-width: 767px) { .wl-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }`}</style>
                {filtered.map((item, i) => {
                  const color    = getVersionColor(item.card.version);
                  const label    = getVersionLabel(item.card.version);
                  const tcgQuery = encodeURIComponent([item.card.name, item.set.name, label].filter(Boolean).join(" "));
                  return (
                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div
                        onClick={() => setPreviewCard(item.card as PokemonCard)}
                        style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0, cursor: "pointer" }}
                      >
                        <Image src={item.card.image} alt={item.card.name} fill style={{ objectFit: "cover" }} sizes="260px" unoptimized />
                        <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color, border: `1px solid ${color}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>{label}</div>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", alignItems: "center" }}>
                          <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>#{String(item.card.card_number).padStart(3, "0")}</span>
                          <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.card.name}</span>
                          <div style={{ position: "relative", width: "56px", height: "18px" }}>
                            <Image src={item.set.logo} alt={item.set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} unoptimized />
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.set.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", marginTop: "auto", paddingTop: "2px" }}>
                          <a
                            href={`https://www.tcgplayer.com/search/pokemon/product?q=${tcgQuery}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#2ee696", background: "#ffffff", borderRadius: "8px", textDecoration: "none", fontWeight: 700 }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={12} height={12} style={{ flexShrink: 0 }} />
                            TCGPlayer
                          </a>
                          <button
                            onClick={e => handleVender(item.card, item.set, e)}
                            style={{ flex: 1, textAlign: "center", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: "#25D366", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700 }}
                          >
                            Vender
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
