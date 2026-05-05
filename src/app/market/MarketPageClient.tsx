"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import dynamic from "next/dynamic";
const ModalTiltCard = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.ModalTiltCard })),
  { ssr: false }
);
import { CITIES_BY_COUNTRY } from "@/data/cities";
import { House, UserRoundPen, HeartHandshake, LayoutGrid, Store, SlidersHorizontal, X } from "lucide-react";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

function formatCOP(n: number) {
  return n.toLocaleString("es-CO");
}

interface Listing {
  id: string;
  card_id: number;
  set_id: string;
  price_cop: number;
  version: string;
  created_at: string;
  user_id: string;
  players: {
    username: string;
    pais: string;
    ciudad: string;
    whatsapp_indicativo: string;
    whatsapp_numero: string;
  } | null;
}

const PAGE_SIZE = 20;

/* ── Filter Sidebar ── */
const VARIANTES = [
  { value: "normal",                    label: "Normal" },
  { value: "reverseHolofoil",           label: "Reverse Holo" },
  { value: "holofoil",                  label: "Holofoil" },
  { value: "cosmosHolofoil",            label: "Cosmos Holo" },
  { value: "crackedIceHolofoil",        label: "Cracked Ice" },
  { value: "unlimitedHolofoil",         label: "Unlimited Holo" },
  { value: "firstEditionHolofoil",      label: "1st Ed. Holo" },
  { value: "sheenHolofoil",             label: "Sheen Holo" },
  { value: "sequinHolofoil",            label: "Sequin Holo" },
  { value: "waterWebHolofoil",          label: "Water Web Holo" },
  { value: "tinselHolofoil",            label: "Tinsel Holo" },
  { value: "mirrorReverseHolofoil",     label: "Mirror Reverse Holo" },
  { value: "cosmosReverseHolofoil",     label: "Cosmos Reverse Holo" },
  { value: "energyReverseHolofoil",     label: "Energy Reverse Holo" },
  { value: "pokeBallReverseHolofoil",   label: "Poké Ball Reverse Holo" },
  { value: "masterBallReverseHolofoil", label: "Master Ball Reverse Holo" },
  { value: "friendBallReverseHolofoil", label: "Friend Ball Reverse Holo" },
  { value: "loveBallReverseHolofoil",   label: "Love Ball Reverse Holo" },
  { value: "quickBallReverseHolofoil",  label: "Quick Ball Reverse Holo" },
  { value: "rocketReverseHolofoil",     label: "Rocket Reverse Holo" },
  { value: "duskBallReverseHolofoil",   label: "Dusk Ball Reverse Holo" },
  { value: "firstEdition",             label: "1st Edition" },
  { value: "firstEditionShadowless",   label: "1st Ed. Shadowless" },
  { value: "unlimited",               label: "Unlimited" },
  { value: "unlimitedShadowless",     label: "Unlimited Shadowless" },
  { value: "metal",                   label: "Metal" },
  { value: "nonEreader",              label: "Non E-Reader" },
  { value: "jumbo",                   label: "Jumbo" },
  { value: "goldBorder",              label: "Gold Border" },
];

function FilterSidebar({
  fNombre, setFNombre, fVariante, setFVariante,
  fSet, setFSet, fPrecioMin, setFPrecioMin,
  fPrecioMax, setFPrecioMax, fCiudad, setFCiudad,
  citiesInListings, allSets, hasFilters, onClear, selectedPais,
}: {
  fNombre: string; setFNombre: (v: string) => void;
  fVariante: string; setFVariante: (v: string) => void;
  fSet: string; setFSet: (v: string) => void;
  fPrecioMin: string; setFPrecioMin: (v: string) => void;
  fPrecioMax: string; setFPrecioMax: (v: string) => void;
  fCiudad: string; setFCiudad: (v: string) => void;
  citiesInListings: string[];
  allSets: { id: string; name: string }[];
  hasFilters: boolean;
  onClear: () => void;
  selectedPais: string;
}) {
  const [setSearch, setSetSearch] = useState("");

  const filteredSets = useMemo(() =>
    allSets.filter(s => s.name.toLowerCase().includes(setSearch.toLowerCase())),
    [allSets, setSearch]
  );

  /* Ciudades: las del país seleccionado + las que aparecen en los listings */
  const cityOptions = useMemo(() => {
    const fromCountry = CITIES_BY_COUNTRY[selectedPais] ?? [];
    const merged = [...new Set([...fromCountry, ...citiesInListings])].sort();
    return merged;
  }, [selectedPais, citiesInListings]);

  const sLabel: React.CSSProperties = {
    fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em",
    textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px",
  };
  const sInput: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "7px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box",
  };
  const sSelect: React.CSSProperties = {
    ...sInput, cursor: "pointer", appearance: "none", WebkitAppearance: "none",
  };
  const sDivider: React.CSSProperties = {
    height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px", padding: "20px", position: "sticky", top: "80px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>
          Filtros
        </span>
        {hasFilters && (
          <button onClick={onClear} style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", background: "none", border: "1px solid rgba(209,53,53,0.3)", borderRadius: "5px", padding: "3px 10px", cursor: "pointer" }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Nombre */}
      <div>
        <label style={sLabel}>Nombre de carta</label>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...sInput, paddingLeft: "30px" }}
            value={fNombre}
            onChange={e => setFNombre(e.target.value)}
            placeholder="Ej: Pikachu, Charizard..."
          />
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", opacity: 0.5 }}>🔍</span>
        </div>
      </div>

      <div style={sDivider} />

      {/* Variante */}
      <div>
        <label style={sLabel}>Variante</label>
        <select value={fVariante} onChange={e => setFVariante(e.target.value)} style={sSelect}>
          <option value="" style={{ background: "#0a0e1a" }}>Todas las variantes</option>
          {VARIANTES.map(v => (
            <option key={v.value} value={v.value} style={{ background: "#0a0e1a", color: INK0 }}>{v.label}</option>
          ))}
        </select>
      </div>

      <div style={sDivider} />

      {/* Set */}
      <div>
        <label style={sLabel}>Set</label>
        <input
          style={{ ...sInput, marginBottom: "8px" }}
          value={setSearch}
          onChange={e => setSetSearch(e.target.value)}
          placeholder="Buscar set..."
        />
        <select
          value={fSet}
          onChange={e => setFSet(e.target.value)}
          style={{ ...sSelect, maxHeight: "160px" }}
        >
          <option value="" style={{ background: "#0a0e1a" }}>Todos los sets</option>
          {filteredSets.map(s => (
            <option key={s.id} value={s.id} style={{ background: "#0a0e1a", color: INK0 }}>{s.name}</option>
          ))}
        </select>
      </div>

      <div style={sDivider} />

      {/* Precio */}
      <div>
        <label style={sLabel}>Precio (COP)</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ ...sLabel, marginBottom: "4px", fontSize: "8px" }}>Mínimo</label>
            <input
              style={sInput}
              value={fPrecioMin}
              onChange={e => setFPrecioMin(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
          <div>
            <label style={{ ...sLabel, marginBottom: "4px", fontSize: "8px" }}>Máximo</label>
            <input
              style={sInput}
              value={fPrecioMax}
              onChange={e => setFPrecioMax(e.target.value.replace(/\D/g, ""))}
              placeholder="∞"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div style={sDivider} />

      {/* Ciudad */}
      <div>
        <label style={sLabel}>Ciudad</label>
        <select value={fCiudad} onChange={e => setFCiudad(e.target.value)} style={sSelect}>
          <option value="" style={{ background: "#0a0e1a" }}>Todas las ciudades</option>
          {cityOptions.map(c => (
            <option key={c} value={c} style={{ background: "#0a0e1a", color: INK0 }}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function MarketPageClient({
  totalListings,
  countries,
  defaultPais,
  currentUserId,
}: {
  totalListings: number;
  countries: string[];
  defaultPais: string;
  currentUserId: string | null;
}) {
  const pathname = usePathname();
  const mktMobileRef = useRef<HTMLDivElement>(null);

  const [selectedPais, setSelectedPais] = useState(defaultPais);
  const [listings, setListings]         = useState<Listing[]>([]);
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [previewCard, setPreviewCard]   = useState<PokemonCard | null>(null);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [marketOpen, setMarketOpen]     = useState(false);
  const [authMsg,    setAuthMsg]        = useState<string | null>(null);

  /* Filtros */
  const [fNombre,   setFNombre]   = useState("");
  const [fVariante, setFVariante] = useState("");
  const [fSet,      setFSet]      = useState("");
  const [fPrecioMin, setFPrecioMin] = useState("");
  const [fPrecioMax, setFPrecioMax] = useState("");
  const [fCiudad,   setFCiudad]   = useState("");

  const ALL_SETS_LIST = useMemo(() => POKEMON_SERIES.flatMap(s => s.sets), []);

  /* Todas las ciudades disponibles en los listings actuales */
  const citiesInListings = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => { if (l.players?.ciudad) set.add(l.players.ciudad); });
    return [...set].sort();
  }, [listings]);

  /* Filtrado client-side */
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      const cards = SET_CARDS[listing.set_id];
      const card  = cards?.find(c => c.card_number === listing.card_id && c.version === listing.version);

      if (fNombre.trim()) {
        const q = fNombre.trim().toLowerCase();
        const name = (card?.name ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (fVariante && listing.version !== fVariante) return false;
      if (fSet      && listing.set_id  !== fSet)      return false;
      if (fCiudad   && listing.players?.ciudad !== fCiudad) return false;
      const min = Number(fPrecioMin.replace(/\D/g, ""));
      const max = Number(fPrecioMax.replace(/\D/g, ""));
      if (min > 0 && listing.price_cop < min) return false;
      if (max > 0 && listing.price_cop > max) return false;
      return true;
    });
  }, [listings, fNombre, fVariante, fSet, fCiudad, fPrecioMin, fPrecioMax]);

  const hasFilters = fNombre || fVariante || fSet || fCiudad || fPrecioMin || fPrecioMax;

  function clearFilters() {
    setFNombre(""); setFVariante(""); setFSet(""); setFCiudad("");
    setFPrecioMin(""); setFPrecioMax("");
  }

  async function handleComprar(listing: Listing, e: React.MouseEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAuthMsg("Debes registrarte en FaceBinder para poder usar este servicio."); return; }
    const { data } = await supabase.from("players").select("username, whatsapp_numero").eq("user_id", user.id).single();
    if (!data?.username) { setAuthMsg("Debes completar tu nombre de usuario en tu perfil para usar este servicio."); return; }
    if (!data?.whatsapp_numero) { setAuthMsg("Debes agregar tu número de WhatsApp en tu perfil para usar este servicio."); return; }
    const waLink = buildWhatsApp(listing);
    if (waLink !== "#") window.open(waLink, "_blank");
  }

  /* Close market popup on outside click */
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (!mktMobileRef.current?.contains(e.target as Node)) setMarketOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  /* Fetch user's country client-side to avoid cache issues */
  useEffect(() => {
    if (defaultPais) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("players")
        .select("pais")
        .eq("user_id", user.id)
        .single();
      if (data?.pais) setSelectedPais(data.pais);
    })();
  }, [defaultPais]);

  useEffect(() => { setPage(1); }, [selectedPais]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let userIds: string[] | null = null;
      if (selectedPais) {
        const { data: profRows } = await supabase
          .from("players")
          .select("user_id")
          .eq("pais", selectedPais);
        userIds = (profRows ?? []).map((r: any) => r.user_id);
        if (userIds.length === 0) {
          setListings([]); setTotal(0); setLoading(false); return;
        }
      }

      let q = supabase
        .from("market_listings")
        .select("id, card_id, set_id, price_cop, version, created_at, user_id", { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (userIds) q = (q as any).in("user_id", userIds);

      const { data: rawListings, count } = await q;
      if (!rawListings || rawListings.length === 0) {
        setListings([]); setTotal(count ?? 0); setLoading(false); return;
      }

      const uids = [...new Set(rawListings.map((r: any) => r.user_id))];
      const { data: playerRows } = await supabase
        .from("players")
        .select("user_id, username, pais, ciudad, whatsapp_indicativo, whatsapp_numero")
        .in("user_id", uids);
      const playerMap: Record<string, any> = {};
      (playerRows ?? []).forEach((p: any) => { playerMap[p.user_id] = p; });

      const newListings = rawListings.map((r: any) => ({ ...r, players: playerMap[r.user_id] ?? null })) as Listing[];
      const setIds = [...new Set(newListings.map(l => l.set_id))];
      await loadManySets(setIds);
      setListings(newListings);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [selectedPais, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildWhatsApp(listing: Listing): string {
    const p = listing.players;
    if (!p?.whatsapp_numero) return "#";
    const number = (p.whatsapp_indicativo ?? "").replace(/\D/g, "") + p.whatsapp_numero.replace(/\D/g, "");
    const cards   = SET_CARDS[listing.set_id];
    const card    = cards?.find(c => c.card_number === listing.card_id && c.version === listing.version);
    const setInfo = ALL_SETS.find(s => s.id === listing.set_id);
    const text = encodeURIComponent(
      `Hola! Vi tu publicación en FaceBinder y me interesa comprar la carta:\n\n` +
      `• ${card?.name ?? ""} ${getVersionLabel(listing.version)}\n` +
      `• Set ${setInfo?.name ?? listing.set_id}\n` +
      `• $${formatCOP(listing.price_cop)} COP\n\n` +
      `¿Sigue disponible?`
    );
    return `https://wa.me/${number}?text=${text}`;
  }

  const COVER_H = 260;

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

      {/* ══ COVER ══ */}
      <section style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: -2,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%),
            radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%),
            linear-gradient(180deg, #0a1320 0%, #060912 100%)
          `,
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          animation: "gridPan 6s linear infinite",
        }} />

        {/* Desktop cover */}
        <div className="mkt-cover-desktop" style={{ height: `${COVER_H}px`, display: "none", position: "relative", marginBottom: "48px" }}>
          <div style={{ position: "absolute", top: "38%", left: "80px", transform: "translateY(10%)", maxWidth: "520px", zIndex: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
              Mercado de cartas
            </div>
            <h1 style={{ fontFamily: DISP, fontSize: "clamp(34px, 3.8vw, 52px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
              <span style={{ whiteSpace: "nowrap" }}>
                Market{" "}
                <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>TCG</em>
              </span>
            </h1>
            <p style={{ margin: "14px 0 0", color: INK1, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
              Pokémon TCG
            </p>
          </div>
          <div style={{ position: "absolute", top: "38%", right: "80px", transform: "translateY(50%)", textAlign: "right", fontFamily: MONO, fontSize: "15px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, lineHeight: 2.2, zIndex: 20 }}>
            <div>Cartas en venta / <b style={{ color: INK0 }}>{totalListings}</b></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
              <span>País</span>
              <span style={{ color: INK2 }}>/</span>
              <CountrySelect countries={countries} value={selectedPais} onChange={v => setSelectedPais(v)} />
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", padding: "14px 80px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: INK2 }}>
            <span>POKÉMON CARD MARKETPLACE</span>
          </div>
        </div>

        {/* Mobile cover */}
        <div className="mkt-cover-mobile" style={{ padding: "100px 24px 40px", display: "block" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            Mercado de cartas
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(36px, 10vw, 56px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
            Market{" "}
            <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>TCG</em>
          </h1>
          <p style={{ margin: "12px 0 0", color: INK1, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
            Pokémon TCG
          </p>
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: INK2 }}>
            <span>Cartas en venta / <b style={{ color: INK0 }}>{totalListings}</b></span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              País / <CountrySelect countries={countries} value={selectedPais} onChange={v => setSelectedPais(v)} />
            </span>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .mkt-cover-desktop { display: block !important; }
            .mkt-cover-mobile  { display: none  !important; }
          }
          @keyframes gridPan {
            0%   { background-position: 0 0; }
            100% { background-position: 80px 80px; }
          }
        `}</style>
      </section>

      {/* ══ LISTINGS + SIDEBAR ══ */}
      <section style={{ padding: "48px 24px 80px" }} className="mkt-body-section">
        <style>{`
          @media (min-width: 1024px) { .mkt-body-section { padding: 64px 80px 80px !important; } }
          .mkt-layout { display: flex; gap: 32px; align-items: flex-start; }
          .mkt-sidebar { width: 260px; flex-shrink: 0; }
          .mkt-grid-area { flex: 1; min-width: 0; }
          @media (max-width: 1023px) {
            .mkt-layout { flex-direction: column; }
            .mkt-sidebar { display: none; }
            .mkt-cards-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
              max-width: 480px;
              margin: 0 auto;
              width: 100%;
            }
          }
          @media (max-width: 400px) {
            .mkt-cards-grid {
              grid-template-columns: 1fr !important;
              max-width: 320px;
            }
          }
        `}</style>

        <div className="mkt-layout">

          {/* ── SIDEBAR FILTROS ── */}
          <aside className="mkt-sidebar">
            <FilterSidebar
              fNombre={fNombre}     setFNombre={setFNombre}
              fVariante={fVariante} setFVariante={setFVariante}
              fSet={fSet}           setFSet={setFSet}
              fPrecioMin={fPrecioMin} setFPrecioMin={setFPrecioMin}
              fPrecioMax={fPrecioMax} setFPrecioMax={setFPrecioMax}
              fCiudad={fCiudad}     setFCiudad={setFCiudad}
              citiesInListings={citiesInListings}
              allSets={ALL_SETS_LIST}
              hasFilters={!!hasFilters}
              onClear={clearFilters}
              selectedPais={selectedPais}
            />
          </aside>

          {/* ── GRID CARDS ── */}
          <div className="mkt-grid-area">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>Cargando...</div>
        ) : listings.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◬</div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              No hay cartas en venta{selectedPais ? ` en ${selectedPais}` : ""}
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>⊘</div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Ningún resultado con estos filtros
            </p>
            <button onClick={clearFilters} style={{ marginTop: "14px", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="mkt-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {filteredListings.map(listing => {
                const cards    = SET_CARDS[listing.set_id];
                const card     = cards?.find(c => c.card_number === listing.card_id && c.version === listing.version) as PokemonCard | undefined;
                const setInfo  = ALL_SETS.find(s => s.id === listing.set_id);
                const verColor = getVersionColor(listing.version);
                const verFull  = getVersionLabel(listing.version);
                const waLink   = buildWhatsApp(listing);
                const hasWA    = listing.players?.whatsapp_numero;
                const tcgQuery = [
                  card?.name ?? "",
                  setInfo?.name ?? "",
                  getVersionLabel(listing.version),
                ].filter(Boolean).join(" ");

                return (
                  <div
                    key={listing.id}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "16px", overflow: "hidden",
                      display: "flex", flexDirection: "column",
                    }}
                  >
                    {/* Imagen — full width, aspect 5/7, clickeable */}
                    <div
                      onClick={() => card && setPreviewCard(card)}
                      style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}
                    >
                      {card ? (
                        <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="260px" />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: INK2, fontSize: "24px" }}>?</span>
                        </div>
                      )}
                      {/* Variante — esquina inferior derecha */}
                      <div style={{
                        position: "absolute", bottom: "8px", right: "8px",
                        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
                        color: verColor, border: `1px solid ${verColor}55`,
                        borderRadius: "4px", padding: "2px 7px",
                        background: "rgba(5,7,13,0.85)",
                      }}>
                        {verFull}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                      {/* Grid 2×2 */}
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", alignItems: "center" }}>
                        {/* Fila 1: número | nombre */}
                        <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                          #{String(listing.card_id).padStart(3, "0")}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {card?.name ?? `Carta #${listing.card_id}`}
                        </span>

                        {/* Fila 2: set | precio */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {setInfo ? (
                            <div style={{ position: "relative", width: "56px", height: "18px" }}>
                              <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
                            </div>
                          ) : (
                            <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2 }}>{listing.set_id}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                          <span style={{ fontFamily: MONO, fontSize: "15px", color: COURT, fontWeight: 700 }}>${formatCOP(listing.price_cop)}</span>
                          <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>COP</span>
                        </div>
                      </div>

                      {/* Vendedor */}
                      {listing.players?.username && (
                        <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.06em" }}>
                          <a href={`/${listing.players.username}`} style={{ color: INK1, textDecoration: "none" }}>@{listing.players.username}</a>
                          {(listing.players.pais || listing.players.ciudad) && (
                            <span>
                              {" · "}
                              {[listing.players.pais, listing.players.ciudad].filter(Boolean).join(" / ")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Botones */}
                      <div style={{ display: "flex", gap: "6px", marginTop: "auto", paddingTop: "2px" }}>
                        {/* TCGPlayer */}
                        <a
                          href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(tcgQuery)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            padding: "8px 4px",
                            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase",
                            color: "#2ee696", background: "#ffffff",
                            borderRadius: "8px", textDecoration: "none", fontWeight: 700,
                            border: "none",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={12} height={12} style={{ flexShrink: 0 }} />
                          TCGPlayer
                        </a>

                        {/* Comprar (WhatsApp) */}
                        {hasWA ? (
                          <button
                            onClick={e => handleComprar(listing, e)}
                            style={{
                              flex: 1, textAlign: "center", padding: "8px 4px",
                              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase",
                              color: "#fff", background: "#25D366",
                              borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700,
                            }}
                          >
                            Comprar
                          </button>
                        ) : (
                          <div style={{
                            flex: 1, textAlign: "center", padding: "8px 4px",
                            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase",
                            color: INK2, border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "8px", opacity: 0.4,
                          }}>
                            Sin contacto
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "48px" }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                  style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: page <= 1 ? INK2 : INK0, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
                  ← Anterior
                </button>
                <span style={{ fontFamily: MONO, fontSize: "11px", color: INK2, padding: "8px 12px", letterSpacing: "0.1em" }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                  style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: page >= totalPages ? INK2 : INK0, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
          </div>{/* mkt-grid-area */}
        </div>{/* mkt-layout */}
      </section>

      <MarketFooter />

      {/* ══ FILTRO OVERLAY MÓVIL ══ */}
      <style>{`
        .mkt-filter-btn {
          display: none;
          position: fixed; left: 0; top: 50%; transform: translateY(-50%);
          z-index: 80; writing-mode: vertical-rl; text-orientation: mixed;
          padding: 14px 8px; border-radius: 0 8px 8px 0;
          background: rgba(46,230,193,0.10); border: 1px solid rgba(46,230,193,0.25);
          border-left: none; cursor: pointer;
          font-family: var(--font-jetbrains); font-size: 9px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #2ee6c1;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        }
        .mkt-filter-btn:hover { background: rgba(46,230,193,0.18); }
        .mkt-mob-tabbar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
          align-items: stretch; height: 72px;
          background: rgba(10,14,26,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-bottom: env(safe-area-inset-bottom);
        }
        @media (max-width: 1023px) {
          .mkt-filter-btn { display: flex; align-items: center; }
          .mkt-mob-tabbar { display: flex; }
          .mkt-body-section { padding-bottom: 96px !important; }
        }
      `}</style>

      {/* Botón flotante FILTRO (solo móvil) */}
      <button className="mkt-filter-btn" onClick={() => setFilterOpen(true)}>
        <SlidersHorizontal size={13} color="#2ee6c1" style={{ marginBottom: 6, transform: "rotate(90deg)" }} />
        Filtro
      </button>

      {/* Overlay del filtro (solo móvil) */}
      {filterOpen && (
        <div
          onClick={() => setFilterOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(5,7,13,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "stretch",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(300px, 85vw)", background: "#0a0e1a",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              overflowY: "auto", padding: "20px",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>
                Filtros
              </span>
              <button onClick={() => setFilterOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: INK2, padding: 0 }}>
                <X size={18} />
              </button>
            </div>
            <FilterSidebar
              fNombre={fNombre}     setFNombre={setFNombre}
              fVariante={fVariante} setFVariante={setFVariante}
              fSet={fSet}           setFSet={setFSet}
              fPrecioMin={fPrecioMin} setFPrecioMin={setFPrecioMin}
              fPrecioMax={fPrecioMax} setFPrecioMax={setFPrecioMax}
              fCiudad={fCiudad}     setFCiudad={setFCiudad}
              citiesInListings={citiesInListings}
              allSets={ALL_SETS_LIST}
              hasFilters={!!hasFilters}
              onClear={clearFilters}
              selectedPais={selectedPais}
            />
          </div>
        </div>
      )}

      {/* ══ MOBILE BOTTOM TAB BAR ══ */}
      <nav className="mkt-mob-tabbar">
        {[
          { href: "/dashboard",            label: "Inicio",     Icon: House,          highlight: false },
          { href: "/dashboard/perfil",     label: "Perfil",     Icon: UserRoundPen,   highlight: false },
          { href: "/dashboard/inventario", label: "Inventario", Icon: LayoutGrid,     highlight: true  },
          { href: "/dashboard/amigos",     label: "Amigos",     Icon: HeartHandshake, highlight: false },
          { href: "/market",               label: "Market",     Icon: Store,          highlight: false },
        ].map(({ href, label, Icon, highlight }) => {
          const isMarket = label === "Market";
          const active   = isMarket
            ? pathname === "/dashboard/market" || pathname === "/market"
            : pathname === href;
          const color  = active ? COURT : highlight ? `${COURT}80` : INK2;
          const iconSz = highlight ? 26 : 22;

          if (isMarket) {
            return (
              <div key="market" ref={mktMobileRef} style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {marketOpen && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    width: 180, background: "#0d1520",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", overflow: "hidden",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.6)", zIndex: 200,
                  }}>
                    <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Market</p>
                    </div>
                    <Link href="/dashboard/market" onClick={() => setMarketOpen(false)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", textDecoration: "none", color: "rgba(245,247,251,0.75)" }}>
                      <Store size={14} color={COURT} strokeWidth={1.8} />
                      <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Mi stock</span>
                    </Link>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
                    <Link href="/market" onClick={() => setMarketOpen(false)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", textDecoration: "none", color: "rgba(245,247,251,0.75)" }}>
                      <Store size={14} color="#d6ff3d" strokeWidth={1.8} />
                      <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Market local</span>
                    </Link>
                  </div>
                )}
                <button onClick={() => setMarketOpen(o => !o)} style={{
                  flex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "4px",
                  background: "transparent", border: "none", cursor: "pointer", position: "relative", paddingBottom: "4px",
                }}>
                  {active && <span style={{ position: "absolute", top: 8, width: 4, height: 4, borderRadius: "50%", background: COURT }} />}
                  <Icon size={iconSz} color={color} strokeWidth={active ? 2.2 : 1.7} />
                  <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.06em", textTransform: "uppercase", color, fontWeight: active ? 600 : 400 }}>
                    {label}
                  </span>
                </button>
              </div>
            );
          }

          return (
            <Link key={href} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "4px",
              textDecoration: "none", position: "relative", paddingBottom: "4px",
            }}>
              {active && <span style={{ position: "absolute", top: 8, width: 4, height: 4, borderRadius: "50%", background: COURT }} />}
              <Icon size={iconSz} color={color} strokeWidth={active ? 2.2 : 1.7} style={{ position: "relative" }} />
              <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.06em", textTransform: "uppercase", color, fontWeight: active ? 600 : 400, position: "relative" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ══ LIGHTBOX — ModalTiltCard con efectos 3D ══ */}
      {previewCard && (
        <div
          onClick={() => setPreviewCard(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(5,7,13,0.92)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "min(300px, 78vw)" }}
          >
            <ModalTiltCard card={previewCard} />
          </div>
          <button
            onClick={() => setPreviewCard(null)}
            style={{ position: "fixed", top: "20px", right: "24px", background: "none", border: "none", color: INK0, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Market Footer ── */
function MarketFooter() {
  const STYLES = `
    @keyframes mft-breathe {
      0%   { transform: translate(-50%,-50%) scale(1);    opacity: 0.5; }
      100% { transform: translate(-50%,-50%) scale(1.12); opacity: 0.9; }
    }
    @keyframes mft-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .mft-breathe { animation: mft-breathe 8s ease-in-out infinite alternate; }
    .mft-marquee { animation: mft-marquee 35s linear infinite; }
    .mft-grid {
      background-size: 60px 60px;
      background-image:
        linear-gradient(to right, rgba(46,230,193,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(46,230,193,0.04) 1px, transparent 1px);
      mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
    }
    .mft-pill {
      background: rgba(46,230,193,0.06);
      border: 1px solid rgba(46,230,193,0.15);
      backdrop-filter: blur(12px);
      transition: all 0.3s ease;
    }
    .mft-pill:hover {
      background: rgba(46,230,193,0.12);
      border-color: rgba(46,230,193,0.35);
      color: #2ee6c1;
    }
    .mft-big-text {
      font-size: clamp(80px, 20vw, 220px);
      line-height: 0.75;
      font-weight: 900;
      letter-spacing: -0.05em;
      color: transparent;
      -webkit-text-stroke: 1px rgba(46,230,193,0.08);
      background: linear-gradient(180deg, rgba(46,230,193,0.12) 0%, transparent 60%);
      -webkit-background-clip: text;
      background-clip: text;
      user-select: none;
    }
    .mft-glow-text {
      background: linear-gradient(180deg, #f5f7fb 0%, rgba(245,247,251,0.4) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 24px rgba(46,230,193,0.2));
    }
  `;

  const NAV_LINKS = [
    { label: "Inicio",     href: "/" },
    { label: "Mi binder",  href: "/dashboard" },
    { label: "Inventario", href: "/dashboard/inventario" },
    { label: "Amigos",     href: "/dashboard/amigos" },
  ];

  const MarqueeItem = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "40px", padding: "0 24px", whiteSpace: "nowrap", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.25em", color: "rgba(46,230,193,0.5)", textTransform: "uppercase" }}>
      <span>Facebinder Market</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
      <span>Vende tus cartas</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
      <span>Pokémon TCG</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
      <span>Coleccionistas</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <footer style={{ position: "relative", background: "#05070d", overflow: "hidden", maxWidth: "100%", paddingTop: "80px" }}>

        {/* Aurora glow */}
        <div className="mft-breathe" style={{ position: "absolute", left: "50%", top: "50%", width: "70vw", height: "50vh", borderRadius: "50%", background: "radial-gradient(circle, rgba(46,230,193,0.1) 0%, rgba(214,255,61,0.04) 50%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

        {/* Grid */}
        <div className="mft-grid" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* Giant bg text */}
        <div className="mft-big-text" style={{ position: "absolute", bottom: "-2vh", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", zIndex: 0, pointerEvents: "none", fontFamily: "var(--font-archivo)" }}>
          MARKET
        </div>

        {/* Marquee */}
        <div style={{ position: "relative", zIndex: 10, overflow: "hidden", borderTop: "1px solid rgba(46,230,193,0.08)", borderBottom: "1px solid rgba(46,230,193,0.08)", padding: "14px 0", marginBottom: "72px", background: "rgba(5,7,13,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="mft-marquee" style={{ display: "flex", width: "max-content" }}>
            <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
          </div>
        </div>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: "860px", margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>
          <h2 className="mft-glow-text" style={{ fontFamily: "var(--font-archivo)", fontSize: "clamp(36px, 8vw, 80px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 48px" }}>
            ¿Tienes cartas<br />que no usas?
          </h2>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 36px", borderRadius: "999px", background: "linear-gradient(90deg, #2ee6c1, #d6ff3d)", color: "#05070d", fontFamily: "var(--font-jetbrains)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: "0 0 40px rgba(46,230,193,0.25)" }}>
              → Publica tus cartas gratis
            </Link>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="mft-pill" style={{ padding: "8px 20px", borderRadius: "999px", color: "rgba(201,207,221,0.7)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.1em", textDecoration: "none" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontFamily: "var(--font-archivo)", fontSize: "16px", fontWeight: 900, letterSpacing: "0.02em", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", userSelect: "none" }}>
            FaceBinder
          </span>
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer" className="mft-pill" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 20px", borderRadius: "999px", fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(201,207,221,0.5)", textTransform: "uppercase", textDecoration: "none" }}>
            Hecho por <span style={{ color: "#2ee6c1" }}>Adxmedialab</span>
          </a>
          <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "10px", color: "rgba(122,130,152,0.7)", letterSpacing: "0.12em" }}>
            © 2026 FACEBINDER · Pokémon TCG
          </span>
        </div>
      </footer>
    </>
  );
}

/* ── Country selector ── */
function CountrySelect({ countries, value, onChange }: { countries: string[]; value: string; onChange: (v: string) => void }) {
  const allOptions = ["Todos", ...countries];
  return (
    <select
      value={value || "Todos"}
      onChange={e => onChange(e.target.value === "Todos" ? "" : e.target.value)}
      style={{
        fontFamily: MONO, fontSize: "13px", letterSpacing: "0.1em",
        color: INK0, background: "rgba(46,230,193,0.08)",
        border: "1px solid rgba(46,230,193,0.3)", borderRadius: "6px",
        padding: "4px 10px", cursor: "pointer", outline: "none",
        textTransform: "uppercase",
      }}
    >
      {allOptions.map(c => (
        <option key={c} value={c} style={{ background: "#0a0e1a", color: INK0 }}>{c}</option>
      ))}
    </select>
  );
}
