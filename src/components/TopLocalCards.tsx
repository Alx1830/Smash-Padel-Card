"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardUser } from "@/app/dashboard/DashboardUserContext";
import { SET_CARDS, SET_CARD_COUNT, loadManySets } from "@/data/pokemon-cards";
import { SCRYDEX_SET_CODES } from "@/data/set-codes";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { ArrowRight, Store, Trophy } from "lucide-react";
import { fotoChica } from "@/lib/foto-carta";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Row {
  card_id: string; set_id: string; version: string | null;
  price_cop: number; currency: string | null;
}

interface TopCard {
  key: string;
  card_id: string; set_id: string; version: string | null;
  listings: number;
  topPrice: number; currency: string;
}

/** Las 5 cartas más caras publicadas en el país del usuario */
export function TopLocalCards({ enFila = false }: {
  /** Las cinco una al lado de la otra, para cuando la caja va a lo ancho. */
  enFila?: boolean;
} = {}) {
  /* Quién es el visitante ya lo averiguó el panel al entrar. Preguntárselo de
     nuevo a Supabase hacía que varios pedidos se pelearan por el mismo
     cerrojo del token, y el que perdía tiraba un error en la consola. */
  const { userId } = useDashboardUser();
  const [cards, setCards]     = useState<TopCard[]>([]);
  const [pais, setPais]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCardsReady]     = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    if (!userId) { setLoading(false); return; }

    (async () => {
      const { data: me } = await supabase
        .from("players").select("pais").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      const myPais = me?.pais ?? null;
      setPais(myPais);

      // "Local" = publicaciones de jugadores del mismo país, igual que /market
      let userIds: string[] | null = null;
      if (myPais) {
        const { data: peers } = await supabase
          .from("players").select("user_id").eq("pais", myPais);
        if (cancelled) return;
        userIds = (peers ?? []).map((p: { user_id: string }) => p.user_id);
        if (userIds.length === 0) { setLoading(false); return; }
      }

      let q = supabase
        .from("market_listings")
        .select("card_id, set_id, version, price_cop, currency")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      if (userIds) q = q.in("user_id", userIds);

      const { data } = await q;
      if (cancelled) return;

      // Se agrupa por carta + variante; el precio que manda es el más alto,
      // porque el top va de la más cara a la más barata.
      const grouped: Record<string, TopCard> = {};
      for (const r of (data ?? []) as Row[]) {
        const key = `${r.card_id}::${r.set_id}::${r.version ?? ""}`;
        const cur = r.currency ?? "COP";
        const g = grouped[key];
        if (g) {
          g.listings += 1;
          if (r.price_cop > g.topPrice) { g.topPrice = r.price_cop; g.currency = cur; }
        } else {
          grouped[key] = {
            key, card_id: r.card_id, set_id: r.set_id, version: r.version,
            listings: 1, topPrice: r.price_cop, currency: cur,
          };
        }
      }

      const top = Object.values(grouped)
        .sort((a, b) => b.topPrice - a.topPrice || b.listings - a.listings)
        .slice(0, 5);

      // Los sets se cargan antes de pintar, si no las miniaturas salen vacías
      try { await loadManySets([...new Set(top.map(c => c.set_id))]); } catch { /* sin metadata se pinta el hueco */ }
      if (cancelled) return;

      setCards(top);
      setCardsReady(n => n + 1);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className={"tl-caja" + (enFila ? " fila" : "")}>
      <div className="tl-cabeza">
        <Trophy size={18} color={LIME} strokeWidth={1.6} />
        <p className="tl-titulo" title={pais ? `Lo más caro publicado en ${pais}` : undefined}>
          Top cartas en venta
        </p>
        <Link href="/market" className="tl-vertodas">
          Ver todas <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="tl-lista">
          <style>{`@keyframes fb-pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 62, borderRadius: 10, background: "rgba(255,255,255,0.05)",
              animation: `fb-pulse 1.4s ease-in-out infinite ${i * 0.1}s`,
            }} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="tl-vacio">
          <Store size={20} color={INK2} strokeWidth={1.5} />
          <p>Todavía no hay cartas publicadas cerca de ti. Publica una desde tu inventario.</p>
        </div>
      ) : (
        <div className="tl-lista">
          {cards.map((c, i) => {
            // Los listings viejos guardan solo el número de carta, los nuevos
            // el id completo "NNN:Nombre:Versión"
            const pool = SET_CARDS[c.set_id] ?? [];
            const card = pool.find(pc => String(pc.id) === String(c.card_id))
              ?? pool.find(pc => String(pc.card_number) === String(c.card_id) && pc.version === c.version)
              ?? pool.find(pc => String(pc.card_number) === String(c.card_id));
            const name = card?.name?.trim() || String(c.card_id).split(":")[1] || "Carta";
            const version = c.version ?? card?.version ?? "";
            /* "SV7 · 104/142": el código del set y el número, como viene impreso en la carta. */
            const codigo = SCRYDEX_SET_CODES[c.set_id]?.toUpperCase();
            const numero = card?.card_number ?? String(c.card_id).split(":")[0];
            const total = SET_CARD_COUNT[c.set_id];
            const linea = codigo
              ? `${codigo} · ${numero}${total ? `/${total}` : ""}`
              : version ? getVersionLabel(version) : `${c.listings} en venta`;
            const precio = `${CURRENCY_SYMBOL[c.currency] ?? "$"}${formatPrice(c.topPrice, c.currency)}`;
            return (
              <Link key={c.key} href="/market" className="tl-fila">
                <span className="tl-puesto">{i + 1}</span>

                {card?.image
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={fotoChica(card.image)} alt="" loading="lazy" decoding="async" className="tl-foto" />
                  : <div className="tl-foto" />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="tl-nombre" title={name}>{name}</p>
                  <p className="tl-set">{linea}</p>
                  {enFila && <p className="tl-precio">{precio}</p>}
                </div>

                {!enFila && <span className="tl-precio">{precio}</span>}
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        .tl-caja { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 20px; display: flex; flex-direction: column; min-width: 0; }
        .tl-cabeza { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .tl-titulo { font-family: ${MONO}; font-size: 10px; color: ${INK2}; letter-spacing: 0.2em;
          text-transform: uppercase; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tl-vertodas { margin-left: auto; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
          font-family: ${MONO}; font-size: 11px; color: ${COURT}; text-decoration: none;
          border: 1px solid ${COURT}44; border-radius: 8px; padding: 6px 12px;
          transition: background 0.15s; }
        .tl-vertodas:hover { background: ${COURT}14; }
        .tl-lista { display: flex; flex-direction: column; }
        .tl-fila { display: flex; align-items: center; gap: 12px; padding: 9px 6px;
          text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px; transition: background 0.15s; }
        .tl-fila:last-child { border-bottom: none; }
        .tl-fila:hover { background: rgba(255,255,255,0.04); }
        .tl-puesto { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: ${DISP}; font-size: 12px; color: ${INK0};
          border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); }
        .tl-fila:first-child .tl-puesto { color: ${LIME}; border-color: ${LIME}66; }
        .tl-foto { width: 38px; aspect-ratio: 5 / 7; object-fit: cover; border-radius: 4px;
          flex-shrink: 0; background: rgba(255,255,255,0.06); }
        .tl-nombre { font-family: ${MONO}; font-size: 12px; font-weight: 600; color: ${INK0}; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tl-set { font-family: ${MONO}; font-size: 10px; color: ${INK2}; margin: 3px 0 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tl-precio { font-family: ${DISP}; font-size: 14px; color: ${COURT}; flex-shrink: 0; white-space: nowrap; }
        /* A lo ancho: cinco tarjetas en fila, con el precio debajo del nombre. */
        .tl-caja.fila .tl-lista { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
        .tl-caja.fila .tl-fila { border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
          background: rgba(255,255,255,0.02); padding: 10px; gap: 10px; }
        .tl-caja.fila .tl-fila:last-child { border-bottom: 1px solid rgba(255,255,255,0.07); }
        .tl-caja.fila .tl-fila:hover { border-color: ${COURT}44; }
        .tl-caja.fila .tl-foto { width: 48px; }
        .tl-caja.fila .tl-precio { margin: 6px 0 0; }
        @media (max-width: 1500px) {
          .tl-caja.fila .tl-puesto { width: 22px; height: 22px; font-size: 11px; }
        }
        @media (max-width: 1023px) {
          .tl-caja.fila .tl-lista { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
        .tl-vacio { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
          border: 1px dashed rgba(255,255,255,0.12); border-radius: 12px; padding: 24px 16px; }
        .tl-vacio p { font-family: ${MONO}; font-size: 11px; color: ${INK2}; margin: 0; line-height: 1.6; }
      `}</style>
    </div>
  );
}
