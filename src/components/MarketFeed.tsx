"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { FlagIcon } from "@/components/FlagIcon";

const COURT  = "#2ee6c1";
const BALL   = "#d6ff3d";
const INK0   = "#f5f7fb";
const INK2   = "#7a8298";
const MONO   = "var(--font-jetbrains)";
const DISP   = "var(--font-archivo)";
const PAGE   = 10;

// tint colors
const GREEN_BG     = "rgba(46,230,193,0.06)";
const GREEN_BORDER = "rgba(46,230,193,0.18)";
const YELLOW_BG    = "rgba(214,200,60,0.06)";
const YELLOW_BORDER= "rgba(214,200,60,0.22)";
const YELLOW       = "#d6c83c";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

interface PlayerInfo {
  username: string;
  photo_url: string | null;
  whatsapp_indicativo: string | null;
  whatsapp_numero: string | null;
  pais: string | null;
}

interface FeedItem {
  id: string;
  type: "listing" | "wishlist";
  card_id: number | string;
  set_id: string;
  price_cop: number;
  currency: string;
  version: string;
  language: string | null;
  created_at: string;
  user_id: string;
  player: PlayerInfo | null;
  cardName: string;
  cardImage: string;
  setName: string;
  versionLabel: string;
}

function Avatar({ photo_url, username, size = 36 }: { photo_url: string | null; username: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      overflow: "hidden", border: `1.5px solid ${COURT}40`,
      background: `${COURT}15`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {photo_url ? (
        <Image src={photo_url} alt={username} fill style={{ objectFit: "cover" }} unoptimized />
      ) : (
        <span style={{ fontFamily: DISP, fontSize: size * 0.38, fontWeight: 700, color: COURT }}>
          {username?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

function SkeletonPost({ yellow }: { yellow?: boolean }) {
  return (
    <div style={{
      background: yellow ? YELLOW_BG : GREEN_BG,
      border: `1px solid ${yellow ? YELLOW_BORDER : GREEN_BORDER}`,
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div className="mf-sk" style={{ width: 36, height: 36, borderRadius: "50%" }} />
        <div style={{ flex: 1 }}>
          <div className="mf-sk" style={{ height: 11, width: "40%", borderRadius: 6, marginBottom: 6 }} />
          <div className="mf-sk" style={{ height: 10, width: "65%", borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="mf-sk" style={{ width: 112, height: 180, borderRadius: 8, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="mf-sk" style={{ height: 10, width: "50%", borderRadius: 6 }} />
          <div className="mf-sk" style={{ height: 10, width: "35%", borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

function PostCard({ item }: { item: FeedItem }) {
  const isWishlist = item.type === "wishlist";
  const tcgUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent([item.cardName, item.setName, item.versionLabel].join(" "))}`;
  const displayName = item.player?.username ?? "Usuario";

  // Listing: WhatsApp para comprar
  const waBuy = !isWishlist && item.player?.whatsapp_indicativo && item.player?.whatsapp_numero
    ? `https://wa.me/${item.player.whatsapp_indicativo.replace(/\D/g, "")}${item.player.whatsapp_numero.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, vi en FaceBinder que tienes a la venta ${item.cardName} (${item.versionLabel}) del set ${item.setName} por ${CURRENCY_SYMBOL[item.currency] ?? "$"}${formatPrice(item.price_cop, item.currency)} ${item.currency}. ¿Sigue disponible?`)}`
    : null;

  // Wishlist: WhatsApp para vender
  const waSell = isWishlist && item.player?.whatsapp_indicativo && item.player?.whatsapp_numero
    ? `https://wa.me/${item.player.whatsapp_indicativo.replace(/\D/g, "")}${item.player.whatsapp_numero.replace(/\D/g, "")}?text=${encodeURIComponent(`¡Hola! Vi tu perfil en FaceBinder y vi que estás buscando:\n\n• ${item.cardName} ${item.versionLabel}\n• ${item.setName}\n\nYo la tengo. ¿Estás interesado?`)}`
    : null;

  const bg     = isWishlist ? YELLOW_BG     : GREEN_BG;
  const border = isWishlist ? YELLOW_BORDER : GREEN_BORDER;
  const accent = isWishlist ? YELLOW        : COURT;

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 12, transition: "border-color 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = isWishlist ? "rgba(214,200,60,0.4)" : "rgba(46,230,193,0.35)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar photo_url={item.player?.photo_url ?? null} username={displayName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <a href={`/${displayName}`} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: accent, textDecoration: "none", letterSpacing: "0.06em" }}>
              @{displayName}
            </a>
            <span style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.04em" }}>
              · {relativeTime(item.created_at)}
            </span>
          </div>

          {isWishlist ? (
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: "rgba(245,247,251,0.75)", margin: "3px 0 0", lineHeight: 1.55, letterSpacing: "0.02em" }}>
              Estoy buscando{" "}
              <span style={{ color: INK0, fontWeight: 600 }}>{item.cardName}</span>
              {" "}
              <span style={{ display: "inline-block", fontSize: 9, padding: "1px 6px", borderRadius: 5, background: "rgba(255,255,255,0.07)", color: INK2, letterSpacing: "0.08em", verticalAlign: "middle" }}>
                {item.versionLabel}
              </span>
              {" "}del set{" "}
              <span style={{ color: YELLOW }}>{item.setName}</span>
              {" "}— si tú la tienes dale clic a{" "}
              <span style={{ color: "#25D366", fontWeight: 700 }}>vender</span>.
            </p>
          ) : (
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: "rgba(245,247,251,0.75)", margin: "3px 0 0", lineHeight: 1.55, letterSpacing: "0.02em" }}>
              ha publicado{" "}
              <span style={{ color: INK0, fontWeight: 600 }}>{item.cardName}</span>
              {" "}
              <span style={{ display: "inline-block", fontSize: 9, padding: "1px 6px", borderRadius: 5, background: "rgba(255,255,255,0.07)", color: INK2, letterSpacing: "0.08em", verticalAlign: "middle" }}>
                {item.versionLabel}
              </span>
              {item.language && <span title="Idioma" style={{ marginLeft: 4, verticalAlign: "middle" }}><FlagIcon code={item.language} width={16} /></span>}
              {" "}del set{" "}
              <span style={{ color: COURT }}>{item.setName}</span>
              {" "}por{" "}
              <span style={{ color: BALL, fontWeight: 700 }}>
                {CURRENCY_SYMBOL[item.currency] ?? "$"}{formatPrice(item.price_cop, item.currency)} {item.currency}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Card image + buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 112, height: 180, borderRadius: 8, overflow: "hidden", flexShrink: 0, position: "relative", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {item.cardImage ? (
            <img src={item.cardImage} alt={item.cardName} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 20 }}>🃏</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* TCGPlayer */}
          <button
            onClick={() => {
              const w = 430, h = 600;
              const left = screen.availWidth - w - 16;
              const top  = screen.availHeight - h - 16;
              window.open(tcgUrl, "tcgplayer", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", cursor: "pointer", transition: "background 0.13s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={11} height={11} style={{ flexShrink: 0 }} />
            TCGPlayer
          </button>

          {/* Comprar (listing) o Vender (wishlist) */}
          {isWishlist ? (
            waSell ? (
              <a href={waSell} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.35)", color: "#25D366", fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", transition: "background 0.13s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,211,102,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(37,211,102,0.15)")}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.118 1.528 5.851L.057 23.571a.75.75 0 00.921.921l5.683-1.466A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.127-1.42l-.368-.217-3.812.984.999-3.744-.24-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Vender
              </a>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: INK2, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em" }}>
                Sin contacto
              </span>
            )
          ) : (
            waBuy ? (
              <a href={waBuy} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: `${COURT}18`, border: `1px solid ${COURT}40`, color: COURT, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", transition: "background 0.13s" }}
                onMouseEnter={e => (e.currentTarget.style.background = `${COURT}28`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${COURT}18`)}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.118 1.528 5.851L.057 23.571a.75.75 0 00.921.921l5.683-1.466A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.127-1.42l-.368-.217-3.812.984.999-3.744-.24-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Comprar
              </a>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: INK2, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em" }}>
                Sin contacto
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

async function enrichRows(
  raw: { id: string; card_id: number | string; set_id: string; version: string; created_at: string; user_id: string; price_cop?: number; currency?: string; language?: string | null }[],
  type: "listing" | "wishlist",
  supabase: ReturnType<typeof createClient>
): Promise<FeedItem[]> {
  if (raw.length === 0) return [];

  const uids = [...new Set(raw.map(r => r.user_id))];
  const { data: playerRows } = await supabase
    .from("players")
    .select("user_id, username, photo_url, whatsapp_indicativo, whatsapp_numero, pais")
    .in("user_id", uids);
  const playerMap: Record<string, PlayerInfo> = {};
  (playerRows ?? []).forEach((p: PlayerInfo & { user_id: string }) => { playerMap[p.user_id] = p; });

  const setIds = [...new Set(raw.map(r => r.set_id))];
  await loadManySets(setIds);

  return raw.map(r => {
    const cards = SET_CARDS[r.set_id] ?? [];
    const cardIdStr = String(r.card_id);
    const card  = cards.find(c => String(c.id) === cardIdStr)
                ?? cards.find(c => String(c.card_number) === cardIdStr && c.version === r.version)
                ?? cards.find(c => String(c.card_number) === cardIdStr)
                ?? cards.find(c => cardIdStr.startsWith(String(c.card_number).padStart(3, "0")));
    const setInfo = ALL_SETS.find(s => s.id === r.set_id);
    return {
      id:           `${type}-${r.id}`,
      type,
      card_id:      r.card_id,
      set_id:       r.set_id,
      price_cop:    r.price_cop ?? 0,
      currency:     r.currency ?? "COP",
      version:      r.version,
      language:     r.language ?? null,
      created_at:   r.created_at,
      user_id:      r.user_id,
      player:       playerMap[r.user_id] ?? null,
      cardName:     card?.name ?? `Carta #${r.card_id}`,
      cardImage:    card?.image ?? "",
      setName:      setInfo?.name ?? r.set_id,
      versionLabel: getVersionLabel(card?.version ?? r.version),
    };
  });
}

export function MarketFeed() {
  const supabase    = createClient();
  const [items, setItems]       = useState<FeedItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const cursorRef   = useRef<string>(new Date().toISOString());
  const loadingRef  = useRef(false);
  const hasMoreRef  = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const cursor = cursorRef.current;

    const [{ data: listings }, { data: wishlists }] = await Promise.all([
      supabase
        .from("market_listings")
        .select("id, card_id, set_id, price_cop, currency, version, language, created_at, user_id")
        .eq("status", "active")
        .lt("created_at", cursor)
        .order("created_at", { ascending: false })
        .limit(PAGE),
      supabase
        .from("card_wishlist")
        .select("id, card_id, set_id, version, created_at, user_id")
        .lt("created_at", cursor)
        .order("created_at", { ascending: false })
        .limit(PAGE * 2),
    ]);

    const combined = [
      ...(listings ?? []).map(r => ({ ...r, _type: "listing" as const })),
      ...(wishlists ?? []).map(r => ({ ...r, price_cop: 0, currency: "COP", _type: "wishlist" as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, PAGE);

    if (combined.length === 0) {
      hasMoreRef.current = false;
      setHasMore(false);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    if (combined.length < PAGE) { hasMoreRef.current = false; setHasMore(false); }
    cursorRef.current = combined[combined.length - 1].created_at;

    const listingRaw  = combined.filter(r => r._type === "listing");
    const wishlistRaw = combined.filter(r => r._type === "wishlist");

    const [enrichedListings, enrichedWishlists] = await Promise.all([
      enrichRows(listingRaw,  "listing",  supabase),
      enrichRows(wishlistRaw, "wishlist", supabase),
    ]);

    // Merge back sorted by date
    const merged = [...enrichedListings, ...enrichedWishlists]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setItems(prev => [...prev, ...merged]);
    loadingRef.current = false;
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { loadMore(); }, [loadMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Realtime: new listings
  useEffect(() => {
    const channel = supabase
      .channel(`feed-realtime-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_listings" }, async payload => {
        const r = payload.new as { id: string; card_id: number; set_id: string; price_cop: number; currency: string; version: string; language: string | null; created_at: string; user_id: string; status: string };
        if (r.status !== "active") return;
        const [enriched] = await enrichRows([r], "listing", supabase);
        if (enriched) setItems(prev => [enriched, ...prev]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "card_wishlist" }, async payload => {
        const r = payload.new as { id: string; card_id: number; set_id: string; version: string; created_at: string; user_id: string };
        const [enriched] = await enrichRows([{ ...r, price_cop: 0, currency: "COP" }], "wishlist", supabase);
        if (enriched) setItems(prev => [enriched, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes mf-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .mf-sk {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: mf-shimmer 1.4s infinite;
        }
      `}</style>

      {items.map(item => <PostCard key={item.id} item={item} />)}

      {loading && <><SkeletonPost /><SkeletonPost yellow /></>}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {!hasMore && items.length > 0 && (
        <p style={{ textAlign: "center", fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          · fin del feed ·
        </p>
      )}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            Aún no hay publicaciones en el market
          </p>
        </div>
      )}
    </>
  );
}
