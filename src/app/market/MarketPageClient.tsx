"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import dynamic from "next/dynamic";
const ModalTiltCard = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.ModalTiltCard })),
  { ssr: false }
);
import { CITIES_BY_COUNTRY } from "@/data/cities";
import { SlidersHorizontal, X } from "lucide-react";
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

import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { FlagIcon } from "@/components/FlagIcon";
import { PieGrande } from "@/components/PieGrande";
import { MobileTabBar } from "@/components/MobileTabBar";
import { tcgCardLink } from "@/lib/tcg-link";
import { CardGridSkeleton } from "@/components/CardGridSkeleton";

interface Listing {
  id: string;
  card_id: number;
  set_id: string;
  price_cop: number;
  currency: string;
  version: string;
  language: string | null;
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
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedPais, setSelectedPaisRaw] = useState(() => searchParams.get("pais") ?? defaultPais);
  const [listings, setListings]         = useState<Listing[]>([]);
  /* Arranca en true: el efecto de carga siempre corre en el primer render.
     Si arrancara en false se pinta el estado vacío ("No hay cartas en venta")
     y al llegar los datos la página entera salta — eso era el CLS del market. */
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [previewCard, setPreviewCard]   = useState<PokemonCard | null>(null);
  const sentinelRef                     = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [authMsg,    setAuthMsg]        = useState<string | null>(null);

  /* Filtros — estado inicial desde la URL */
  const [fNombre,    setFNombreRaw]    = useState(() => searchParams.get("card")     ?? "");
  const [fVariante,  setFVarianteRaw]  = useState(() => searchParams.get("variante") ?? "");
  const [fSet,       setFSetRaw]       = useState(() => searchParams.get("set")      ?? "");
  const [fPrecioMin, setFPrecioMinRaw] = useState(() => searchParams.get("min")      ?? "");
  const [fPrecioMax, setFPrecioMaxRaw] = useState(() => searchParams.get("max")      ?? "");
  const [fCiudad,    setFCiudadRaw]    = useState(() => searchParams.get("ciudad")   ?? "");

  /* Si el país vino en la URL no se pisa con el del perfil */
  const paisFromURL = useRef(!!searchParams.get("pais"));

  const updateURL = useCallback((next: {
    card?: string; variante?: string; set?: string;
    min?: string; max?: string; ciudad?: string; pais?: string;
  }) => {
    const current = {
      card:     fNombre,
      variante: fVariante,
      set:      fSet,
      min:      fPrecioMin,
      max:      fPrecioMax,
      ciudad:   fCiudad,
      pais:     selectedPais,
      ...next,
    };
    const params = new URLSearchParams();
    (Object.keys(current) as (keyof typeof current)[]).forEach(k => {
      if (current[k]) params.set(k, current[k]!);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, fNombre, fVariante, fSet, fPrecioMin, fPrecioMax, fCiudad, selectedPais]);

  function setFNombre(v: string)    { setFNombreRaw(v);    updateURL({ card: v }); }
  function setFVariante(v: string)  { setFVarianteRaw(v);  updateURL({ variante: v }); }
  function setFSet(v: string)       { setFSetRaw(v);       updateURL({ set: v }); }
  function setFPrecioMin(v: string) { setFPrecioMinRaw(v); updateURL({ min: v }); }
  function setFPrecioMax(v: string) { setFPrecioMaxRaw(v); updateURL({ max: v }); }
  function setFCiudad(v: string)    { setFCiudadRaw(v);    updateURL({ ciudad: v }); }
  function setSelectedPais(v: string) {
    paisFromURL.current = true;
    setSelectedPaisRaw(v);
    updateURL({ pais: v });
  }

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
    setFNombreRaw(""); setFVarianteRaw(""); setFSetRaw(""); setFCiudadRaw("");
    setFPrecioMinRaw(""); setFPrecioMaxRaw("");
    updateURL({ card: "", variante: "", set: "", min: "", max: "", ciudad: "" });
  }

  function handleComprar(listing: Listing, e: React.MouseEvent) {
    e.preventDefault();
    // Comprar no requiere registro: se abre directo el WhatsApp del vendedor.
    const waLink = buildWhatsApp(listing);
    if (waLink === "#") { setAuthMsg("Este vendedor no tiene WhatsApp configurado."); return; }
    window.open(waLink, "_blank");
  }

  /* Fetch user's country client-side to avoid cache issues */
  useEffect(() => {
    if (defaultPais || paisFromURL.current) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("players")
        .select("pais")
        .eq("user_id", user.id)
        .single();
      if (data?.pais) setSelectedPaisRaw(data.pais);
    })();
  }, [defaultPais]);

  // Reset on country change
  useEffect(() => { setPage(1); setListings([]); setHasMore(true); }, [selectedPais]);

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
          setListings([]); setHasMore(false); setLoading(false); return;
        }
      }

      let q = supabase
        .from("market_listings")
        .select("id, card_id, set_id, price_cop, currency, version, language, created_at, user_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (userIds) q = (q as any).in("user_id", userIds);

      const { data: rawListings } = await q;
      if (!rawListings || rawListings.length === 0) {
        if (page === 1) setListings([]);
        setHasMore(false); setLoading(false); return;
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
      setListings(prev => page === 1 ? newListings : [...prev, ...newListings]);
      setHasMore(newListings.length === PAGE_SIZE);
      setLoading(false);
    })();
  }, [selectedPais, page]);

  // Infinite scroll — observe sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        setPage(p => p + 1);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, hasMore]);

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
      `• ${CURRENCY_SYMBOL[listing.currency] ?? "$"}${formatPrice(listing.price_cop, listing.currency)} ${listing.currency}\n\n` +
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
          @media (min-width: 768px) and (pointer: fine) {
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
          @media (min-width: 1024px) and (pointer: fine) { .mkt-body-section { padding: 64px 80px 80px !important; } }
          .mkt-layout { display: flex; gap: 32px; align-items: flex-start; }
          .mkt-sidebar { width: 260px; flex-shrink: 0; }
          .mkt-grid-area { flex: 1; min-width: 0; }
          @media (max-width: 1023px), (pointer: coarse) {
            /* align-items: stretch — con flex-start el área se encogía al ancho
               de su contenido y la grilla quedaba pegada a la izquierda */
            .mkt-layout { flex-direction: column; align-items: stretch; }
            .mkt-sidebar { display: none; }
            .mkt-grid-area { width: 100%; }
            .mkt-cards-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 12px !important;
            }
          }
          @media (max-width: 767px), (pointer: coarse) {
            .mkt-cards-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
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
        {loading && listings.length === 0 ? (
          <CardGridSkeleton className="mkt-cards-grid" count={PAGE_SIZE} />
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
                        <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
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
                      {/* Idioma — esquina superior izquierda */}
                      {listing.language && (
                        <div style={{ position: "absolute", top: "8px", left: "8px", lineHeight: 1, background: "rgba(5,7,13,0.85)", borderRadius: "6px", padding: "4px" }} title="Idioma">
                          <FlagIcon code={listing.language} width={20} />
                        </div>
                      )}
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
                          <span style={{ fontFamily: MONO, fontSize: "15px", color: COURT, fontWeight: 700 }}>{CURRENCY_SYMBOL[listing.currency] ?? "$"}{formatPrice(listing.price_cop, listing.currency)}</span>
                          <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>{listing.currency}</span>
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
                        <button
                          onClick={() => { const w=430,h=600,left=screen.availWidth-w-16,top=screen.availHeight-h-16; window.open(tcgCardLink(listing.set_id, listing.card_id, tcgQuery),"tcgplayer",`width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`); }}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            padding: "8px 4px",
                            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase",
                            color: "#2ee696", background: "#ffffff",
                            borderRadius: "8px", fontWeight: 700,
                            border: "none", cursor: "pointer",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={12} height={12} style={{ flexShrink: 0 }} />
                          TCGPlayer
                        </button>

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

            {/* Sentinel para infinite scroll */}
            <div ref={sentinelRef} style={{ height: "1px" }} />
            {/* Pie de la grilla con alto fijo: "Cargando más…" y "Fin del market"
                se alternan, y sin reservar el hueco cada cambio movía el footer. */}
            <div style={{ height: "80px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              {loading ? (
                <span style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>Cargando más...</span>
              ) : !hasMore && listings.length > 0 ? (
                <span style={{ fontFamily: MONO, fontSize: "10px", color: "rgba(122,130,152,0.4)", letterSpacing: "0.12em" }}>· FIN DEL MARKET ·</span>
              ) : null}
            </div>
          </>
        )}
          </div>{/* mkt-grid-area */}
        </div>{/* mkt-layout */}
      </section>

      <PieGrande />

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
        @media (max-width: 1023px), (pointer: coarse) {
          .mkt-filter-btn { display: flex; align-items: center; }
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

      {/* La barra de abajo es la del sitio, no una copia: acá había una propia
          y se quedó vieja — seguía mostrando "Amigos" cuando el resto de la app
          ya tenía "Interactivo". */}
      <MobileTabBar />

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
