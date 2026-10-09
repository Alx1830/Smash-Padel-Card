"use client";

/**
 * El buscador del inicio del panel: cartas, usuarios y sets en una sola caja.
 *
 * Las cartas no se buscan acá: el texto se le pasa al buscador de cartas del
 * inventario, que ya sabe cargar los sets, mostrar precios y agregar. Los sets
 * se filtran en memoria (la lista viaja con la app) y los usuarios se le
 * preguntan a la base, con una pausa para no pedir en cada tecla.
 *
 * La tecla "/" lleva el cursor a la caja desde cualquier parte de la página.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, LayoutGrid, UserRound, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";

const BuscarCartaDrawer = dynamic(
  () => import("@/components/BuscarCartaDrawer").then(m => ({ default: m.BuscarCartaDrawer })),
  { ssr: false },
);

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

const SETS = POKEMON_SERIES.flatMap(s => s.sets);

interface Usuario { username: string; first_name: string | null; last_name: string | null; photo_url: string | null }

/** Sin esto un "%" o un "_" escritos por la persona harían de comodín en el ilike. */
function escaparLike(t: string) {
  return t.replace(/[\\%_]/g, m => "\\" + m);
}

export function BuscadorPanel({ userId }: { userId: string | null }) {
  const [texto, setTexto]       = useState("");
  const [abierto, setAbierto]   = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cartas, setCartas]     = useState<string | null>(null);
  const caja  = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const q = texto.trim();
  const largo = q.length >= 2;

  const sets = useMemo(() => {
    if (!largo) return [];
    const t = q.toLowerCase();
    return SETS.filter(s => s.name.toLowerCase().includes(t)).slice(0, 4);
  }, [q, largo]);

  /* Usuarios: se pide un rato después de la última tecla. */
  useEffect(() => {
    if (!largo) return;
    let vivo = true;
    const espera = setTimeout(async () => {
      const { data } = await createClient()
        .from("players")
        .select("username, first_name, last_name, photo_url")
        .ilike("username", `%${escaparLike(q)}%`)
        .not("username", "is", null)
        .order("username")
        .limit(4);
      if (vivo) setUsuarios((data ?? []) as Usuario[]);
    }, 250);
    return () => { vivo = false; clearTimeout(espera); };
  }, [q, largo]);

  /* "/" enfoca la caja, salvo que ya se esté escribiendo en otro lado. */
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  /* Un toque fuera cierra la lista. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  const buscarCartas = () => {
    if (!largo || !userId) return;
    setAbierto(false);
    setCartas(q);
  };

  return (
    <div ref={caja} className="bp-caja">
      <div className="bp-campo">
        <Search size={16} color={INK2} aria-hidden />
        <input
          ref={input}
          value={texto}
          onChange={e => { setTexto(e.target.value); setAbierto(true); if (e.target.value.trim().length < 2) setUsuarios([]); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={e => {
            if (e.key === "Enter") buscarCartas();
            if (e.key === "Escape") { setAbierto(false); input.current?.blur(); }
          }}
          placeholder="Buscar cartas, usuarios, sets…"
          aria-label="Buscar cartas, usuarios o sets"
        />
        <kbd className="bp-tecla">/</kbd>
      </div>

      {abierto && largo && (
        <div className="bp-lista" role="listbox">
          <button className="bp-fila" onClick={buscarCartas}>
            <Search size={14} color={COURT} aria-hidden />
            <span className="bp-txt">Buscar «{q}» en las cartas</span>
            <ChevronRight size={14} color={INK2} aria-hidden />
          </button>

          {sets.length > 0 && <p className="bp-grupo">Sets</p>}
          {sets.map(s => (
            <Link key={s.id} href={`/sets/${s.id}`} className="bp-fila" onClick={() => setAbierto(false)}>
              {s.symbol
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={s.symbol} alt="" className="bp-icono" loading="lazy" decoding="async" />
                : <LayoutGrid size={14} color={COURT} aria-hidden />}
              <span className="bp-txt">{s.name}</span>
            </Link>
          ))}

          {usuarios.length > 0 && <p className="bp-grupo">Usuarios</p>}
          {usuarios.map(u => (
            <Link key={u.username} href={`/${u.username}`} className="bp-fila" onClick={() => setAbierto(false)}>
              {u.photo_url
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={u.photo_url} alt="" className="bp-icono bp-avatar" loading="lazy" decoding="async" />
                : <UserRound size={14} color={COURT} aria-hidden />}
              <span className="bp-txt">@{u.username}</span>
              <span className="bp-sub">{[u.first_name, u.last_name].filter(Boolean).join(" ")}</span>
            </Link>
          ))}
        </div>
      )}

      {cartas !== null && userId && (
        <BuscarCartaDrawer userId={userId} consultaInicial={cartas} onClose={() => setCartas(null)} />
      )}

      <style>{`
        .bp-caja { position: relative; flex: 1; min-width: 0; max-width: 380px; }
        .bp-campo { display: flex; align-items: center; gap: 10px; height: 44px;
          padding: 0 10px 0 14px; border-radius: 12px;
          background: rgba(5,7,13,0.72); border: 1px solid rgba(255,255,255,0.12);
          transition: border-color 0.15s; }
        .bp-campo:focus-within { border-color: ${COURT}88; }
        .bp-campo input { flex: 1; min-width: 0; background: none; border: none; outline: none;
          color: ${INK0}; font-family: ${MONO}; font-size: 12px; }
        .bp-campo input::placeholder { color: ${INK2}; }
        .bp-tecla { font-family: ${MONO}; font-size: 10px; color: ${INK2};
          border: 1px solid rgba(255,255,255,0.14); border-radius: 6px; padding: 2px 7px; }
        @media (pointer: coarse) { .bp-tecla { display: none; } }

        .bp-lista { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 40;
          background: #0a0e1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 6px; box-shadow: 0 18px 40px rgba(0,0,0,0.5); }
        .bp-grupo { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${INK2}; margin: 8px 10px 4px; }
        .bp-fila { display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 8px 10px; border-radius: 8px; border: none; background: none;
          cursor: pointer; text-decoration: none; text-align: left; }
        .bp-fila:hover { background: rgba(255,255,255,0.05); }
        .bp-txt { flex: 1; min-width: 0; font-family: ${MONO}; font-size: 12px; color: ${INK1};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bp-sub { font-family: ${MONO}; font-size: 10px; color: ${INK2}; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
        .bp-icono { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; }
        .bp-avatar { border-radius: 50%; object-fit: cover; }
      `}</style>
    </div>
  );
}
