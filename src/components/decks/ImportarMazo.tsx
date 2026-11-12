"use client";

/**
 * Ventana para crear un deck a partir de una lista copiada en Limitless o en
 * TCG Live. Cada carta entra pidiendo las copias de la lista y con 0
 * conseguidas: el deck queda como una lista de lo que hay que juntar.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, AlertTriangle, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { leerLista, resolverLista, type CartaImportada, type LineaMazo } from "@/lib/decklist";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Props {
  userId: string;
  onClose: () => void;
}

export default function ImportarMazo({ userId, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState("Deck importado");
  const [cartas, setCartas] = useState<CartaImportada[]>([]);
  const [faltantes, setFaltantes] = useState<LineaMazo[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turno = useRef(0);

  const total = cartas.reduce((s, c) => s + c.cantidad, 0);
  const totalFaltantes = faltantes.reduce((s, l) => s + l.cantidad, 0);

  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    const lineas = leerLista(nuevo);
    if (lineas.length === 0) {
      turno.current++;
      setCartas([]);
      setFaltantes([]);
      setLeyendo(false);
      return;
    }
    setLeyendo(true);
    const mio = ++turno.current;
    timer.current = setTimeout(async () => {
      const r = await resolverLista(lineas);
      if (mio !== turno.current) return;
      setCartas(r.cartas);
      setFaltantes(r.faltantes);
      setLeyendo(false);
    }, 300);
  }

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) cambiarTexto(t);
    } catch {
      setError("El navegador no dejó leer el portapapeles. Pega la lista en el cuadro.");
    }
  }

  async function crear() {
    if (cartas.length === 0 || !nombre.trim()) return;
    setGuardando(true);
    setError(null);
    const { data: deck, error: e1 } = await supabase.from("decks").insert({
      user_id: userId,
      name: nombre.trim(),
      cover_card_image: cartas[0].card.image ?? null,
    }).select("id").single();
    if (e1 || !deck) {
      setError("No se pudo crear el deck. Intenta de nuevo.");
      setGuardando(false);
      return;
    }
    const { error: e2 } = await supabase.from("deck_cards").insert(cartas.map((c, i) => ({
      deck_id: deck.id,
      card_id: String(c.card.id),
      set_id: c.setId,
      version: c.card.version,
      needed: c.cantidad,
      quantity: 0,
      position: i,
    })));
    if (e2) {
      await supabase.from("decks").delete().eq("id", deck.id);
      setError("No se pudieron guardar las cartas del deck. Intenta de nuevo.");
      setGuardando(false);
      return;
    }
    router.push(`/dashboard/decks/${deck.id}`);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,0.8)", backdropFilter: "blur(6px)", padding: "16px" }}
      onClick={e => { if (e.target === e.currentTarget && !guardando) onClose(); }}
    >
      <style>{`
        .importar-caja { width: 100%; max-width: 520px; max-height: calc(100dvh - 32px); overflow-y: auto; border-radius: 20px; background: #0d1520; border: 1px solid rgba(255,255,255,0.1); padding: 24px; box-shadow: 0 24px 80px rgba(0,0,0,0.7); box-sizing: border-box; }
        .importar-campo { font-size: 13px; }
        @media (max-width: 767px) { .importar-caja { padding: 18px; } .importar-campo { font-size: 16px; } }
      `}</style>
      <div className="importar-caja">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, margin: "0 0 6px" }}>Importar mazo</p>
            <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, fontWeight: 700, margin: 0 }}>Desde Limitless o TCG Live</p>
          </div>
          <button onClick={onClose} disabled={guardando} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, margin: "0 0 14px", lineHeight: 1.6 }}>
          En Limitless toca <span style={{ color: INK1 }}>Copy to Clipboard</span> y pega la lista aquí. Las cartas entran con 0 conseguidas.
        </p>

        <button
          onClick={pegar}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "999px", background: "rgba(46,230,193,0.08)", border: `1px solid ${COURT}55`, color: COURT, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginBottom: "10px" }}
        >
          <ClipboardPaste size={14} />
          Pegar del portapapeles
        </button>

        <textarea
          className="importar-campo"
          value={texto}
          onChange={e => cambiarTexto(e.target.value)}
          placeholder={"4 Ultra Ball MEG 131\n3 Mega-Sharpedo ex PFL 61\n…"}
          rows={7}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: "12px" }}
        />

        {texto.trim() && (
          <div style={{ fontFamily: MONO, fontSize: "11px", marginBottom: "14px" }}>
            {leyendo ? (
              <span style={{ color: INK2 }}>Buscando cartas…</span>
            ) : cartas.length === 0 && faltantes.length === 0 ? (
              <span style={{ color: INK2 }}>No se reconoció ninguna carta. Cada línea debe verse como «4 Ultra Ball MEG 131».</span>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: total === 60 ? COURT : INK1 }}>
                  <Check size={13} color={COURT} />
                  {total} cartas encontradas ({cartas.length} distintas)
                  {total !== 60 && <span style={{ color: LIME }}> · un mazo lleva 60</span>}
                </div>
                {faltantes.length > 0 && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "8px", border: "1px dashed rgba(255,93,93,0.4)", background: "rgba(255,93,93,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ff5d5d", marginBottom: "6px" }}>
                      <AlertTriangle size={13} />
                      {totalFaltantes} {totalFaltantes === 1 ? "carta no está" : "cartas no están"} en la librería y no se agregan:
                    </div>
                    {faltantes.map((f, i) => (
                      <div key={i} style={{ color: INK2, fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.original}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Nombre del deck</label>
        <input
          className="importar-campo"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, outline: "none", boxSizing: "border-box", marginBottom: "18px" }}
        />

        {error && <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff5d5d", margin: "0 0 12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} disabled={guardando} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
          <button
            onClick={crear}
            disabled={cartas.length === 0 || leyendo || guardando || !nombre.trim()}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", background: COURT, color: "#05070d", fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: cartas.length > 0 && !leyendo ? "pointer" : "default", opacity: cartas.length > 0 && !leyendo && !guardando ? 1 : 0.5 }}
          >
            {guardando ? "Creando…" : "Crear deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
