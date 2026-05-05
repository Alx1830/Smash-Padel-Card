"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { SET_CARDS } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Listing {
  id: string;
  card_id: number | string;
  set_id: string;
  price_cop: number;
  version: string;
  created_at: string;
}
interface SetInfo { id: string; name: string; logo: string; }

function formatCOP(n: number) { return n.toLocaleString("es-CO"); }

export function UserMarketPageClient({
  username, pais, ciudad,
  whatsappIndicativo, whatsappNumero,
  listings, allSets,
}: {
  username:            string;
  pais:                string;
  ciudad:              string;
  whatsappIndicativo:  string;
  whatsappNumero:      string;
  listings:            Listing[];
  allSets:             SetInfo[];
}) {
  const [fNombre,    setFNombre]    = useState("");
  const [fSet,       setFSet]       = useState("");
  const [fVariante,  setFVariante]  = useState("");
  const [fPrecioMin, setFPrecioMin] = useState("");
  const [fPrecioMax, setFPrecioMax] = useState("");

  const resolved = useMemo(() => {
    return listings.map(l => {
      const cards = SET_CARDS[l.set_id];
      const card  = cards?.find(c => c.card_number === l.card_id && c.version === l.version);
      const set   = allSets.find(s => s.id === l.set_id);
      return card && set ? { card, set, listing: l } : null;
    }).filter(Boolean) as { card: NonNullable<ReturnType<typeof SET_CARDS[string]["find"]>>; set: SetInfo; listing: Listing }[];
  }, [listings, allSets]);

  const setVersions = useMemo(() => {
    const versions = new Set<string>();
    resolved.forEach(r => versions.add(r.listing.version));
    return [...versions].sort();
  }, [resolved]);

  const filtered = useMemo(() => {
    return resolved.filter(r => {
      if (fNombre.trim()) {
        if (!r.card.name.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
      }
      if (fSet && r.set.id !== fSet) return false;
      if (fVariante && r.listing.version !== fVariante) return false;
      const min = Number(fPrecioMin.replace(/\D/g, ""));
      const max = Number(fPrecioMax.replace(/\D/g, ""));
      if (min > 0 && r.listing.price_cop < min) return false;
      if (max > 0 && r.listing.price_cop > max) return false;
      return true;
    });
  }, [resolved, fNombre, fSet, fVariante, fPrecioMin, fPrecioMax]);

  const hasFilters = fNombre || fSet || fVariante || fPrecioMin || fPrecioMax;
  function clearFilters() { setFNombre(""); setFSet(""); setFVariante(""); setFPrecioMin(""); setFPrecioMax(""); }

  function buildWA(listing: Listing) {
    if (!whatsappNumero) return "#";
    const number = whatsappIndicativo.replace(/\D/g, "") + whatsappNumero.replace(/\D/g, "");
    const cards = SET_CARDS[listing.set_id];
    const card  = cards?.find(c => c.card_number === listing.card_id && c.version === listing.version);
    const set   = allSets.find(s => s.id === listing.set_id);
    const text  = encodeURIComponent(
      `Hola! Vi tu perfil en FaceBinder y me interesa comprar:\n\n` +
      `• ${card?.name ?? ""} ${getVersionLabel(listing.version)}\n` +
      `• Set: ${set?.name ?? listing.set_id}\n` +
      `• $${formatCOP(listing.price_cop)} COP\n\n¿Sigue disponible?`
    );
    return `https://wa.me/${number}?text=${text}`;
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

      {/* ══ HEADER SECTION ══ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px 16px" }} className="um-section-header">
        <style>{`@media (min-width: 1024px) { .um-section-header { padding: 32px 80px 16px !important; } }`}</style>
        <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
          <Link href={`/${username}`} style={{ color: COURT, textDecoration: "none" }}>@{username}</Link>
          <span style={{ color: INK2 }}>›</span>
          Market
        </div>
        <h2 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
          Cartas{" "}
          <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>en venta</em>
        </h2>
        <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>
          {listings.length} {listings.length === 1 ? "carta publicada" : "cartas publicadas"}
          {(pais || ciudad) && ` · ${[ciudad, pais].filter(Boolean).join(", ")}`}
        </p>
      </section>

      {/* ══ BODY ══ */}
      <section style={{ padding: "32px 24px 80px" }} className="um-body">
        <style>{`
          @media (min-width: 1024px) { .um-body { padding: 48px 80px 80px !important; } }
          .um-layout { display: flex; gap: 32px; align-items: flex-start; }
          .um-sidebar { width: 240px; flex-shrink: 0; }
          .um-grid-area { flex: 1; min-width: 0; }
          @media (max-width: 1023px) { .um-layout { flex-direction: column; } .um-sidebar { display: none; } }
        `}</style>

        <div className="um-layout">

          {/* ── Sidebar ── */}
          <aside className="um-sidebar">
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
                <input style={sInput} value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Pikachu..." />
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
                  {allSets.filter(s => resolved.some(r => r.set.id === s.id)).map(s => (
                    <option key={s.id} value={s.id} style={{ background: "#0a0e1a", color: INK0 }}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={sDivider} />

              <div>
                <label style={sLabel}>Precio (COP)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ ...sLabel, marginBottom: "4px", fontSize: "8px" }}>Mínimo</label>
                    <input style={sInput} value={fPrecioMin} onChange={e => setFPrecioMin(e.target.value.replace(/\D/g, ""))} placeholder="0" inputMode="numeric" />
                  </div>
                  <div>
                    <label style={{ ...sLabel, marginBottom: "4px", fontSize: "8px" }}>Máximo</label>
                    <input style={sInput} value={fPrecioMax} onChange={e => setFPrecioMax(e.target.value.replace(/\D/g, ""))} placeholder="∞" inputMode="numeric" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Grid ── */}
          <div className="um-grid-area">
            {listings.length === 0 ? (
              <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◬</div>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  Sin cartas en venta
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Ningún resultado</p>
                <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "10px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="um-cards-grid">
                <style>{`@media (max-width: 767px) { .um-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }`}</style>
                {filtered.map(({ card, set, listing }) => {
                  const color = getVersionColor(listing.version);
                  const label = getVersionLabel(listing.version);
                  const waLink = buildWA(listing);
                  const tcgQuery = encodeURIComponent([card.name, set.name, label].filter(Boolean).join(" "));
                  return (
                    <div key={listing.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                        <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="260px" unoptimized />
                        <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color, border: `1px solid ${color}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>
                          {label}
                        </div>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", alignItems: "center" }}>
                          <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                            #{String(card.card_number).padStart(3, "0")}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {card.name}
                          </span>
                          <div style={{ position: "relative", width: "56px", height: "18px" }}>
                            <Image src={set.logo} alt={set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} unoptimized />
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                            <span style={{ fontFamily: MONO, fontSize: "15px", color: COURT, fontWeight: 700 }}>${formatCOP(listing.price_cop)}</span>
                            <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>COP</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px", marginTop: "auto", paddingTop: "2px" }}>
                          <a
                            href={`https://www.tcgplayer.com/search/pokemon/product?q=${tcgQuery}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#2ee696", background: "#ffffff", borderRadius: "8px", textDecoration: "none", fontWeight: 700, border: "none" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={12} height={12} style={{ flexShrink: 0 }} />
                            TCGPlayer
                          </a>
                          {whatsappNumero ? (
                            <a
                              href={waLink}
                              target="_blank" rel="noopener noreferrer"
                              style={{ flex: 1, textAlign: "center", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: "#25D366", borderRadius: "8px", textDecoration: "none", fontWeight: 700 }}
                            >
                              Comprar
                            </a>
                          ) : (
                            <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: INK2, border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", opacity: 0.4 }}>
                              Sin contacto
                            </div>
                          )}
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
