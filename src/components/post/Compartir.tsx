"use client";

import { useState, useSyncExternalStore } from "react";
import { Link2, Check, Share2 } from "lucide-react";

/**
 * Los botones para pasar la nota a otro lado.
 *
 * Son enlaces de verdad y no ventanitas armadas con JavaScript: así funcionan
 * con el clic del medio, con "abrir en pestaña nueva" y con el teclado, que es
 * como mucha gente comparte en el computador.
 *
 * Los logos van dibujados acá adentro porque lucide no trae marcas, y una
 * cadena de redes sin sus logos no se reconoce de un vistazo.
 */

const COURT = "#2ee6c1";

/** Cada red con su color, para que el botón se pinte del suyo al pasar encima. */
const REDES = [
  {
    id: "whatsapp",
    nombre: "WhatsApp",
    color: "#25d366",
    /* El enlace de wa.me abre la app en el celular y WhatsApp Web en el
       computador, sin que haya que elegir. */
    enlace: (url: string, titulo: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`,
    icono: (
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.24-8.25Zm-2.6 4.1c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.21.94 2.36c.12.16 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.04.15 1.43.09.44-.07 1.34-.55 1.53-1.08.19-.53.19-.99.13-1.08-.05-.09-.2-.15-.43-.26-.23-.12-1.34-.66-1.55-.74-.21-.08-.36-.11-.51.11-.15.23-.58.74-.72.89-.13.16-.26.18-.49.06-.23-.12-.96-.36-1.84-1.13-.68-.6-1.14-1.35-1.27-1.58-.14-.23-.02-.35.1-.47.1-.1.23-.27.34-.4.12-.14.15-.24.23-.39.08-.16.04-.29-.02-.4-.06-.12-.51-1.23-.7-1.68-.18-.44-.37-.38-.51-.39h-.43Z" />
    ),
  },
  {
    id: "x",
    nombre: "X",
    color: "#f5f7fb",
    enlace: (url: string, titulo: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(titulo)}&url=${encodeURIComponent(url)}`,
    icono: (
      <path d="M17.53 3h3.04l-6.64 7.59L21.75 21h-6.12l-4.79-6.27L5.34 21H2.3l7.1-8.12L2.25 3h6.27l4.33 5.73L17.53 3Zm-1.07 16.17h1.69L7.62 4.74H5.81l10.65 14.43Z" />
    ),
  },
  {
    id: "facebook",
    nombre: "Facebook",
    color: "#1877f2",
    enlace: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icono: (
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    ),
  },
  {
    id: "telegram",
    nombre: "Telegram",
    color: "#2aabee",
    enlace: (url: string, titulo: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titulo)}`,
    icono: (
      <path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.95.46l.34-4.8 8.74-7.9c.38-.34-.08-.53-.59-.19l-10.8 6.8-4.65-1.46c-1.01-.32-1.03-1.01.21-1.5l18.18-7c.84-.31 1.58.2 1.3 1.49Z" />
    ),
  },
] as const;

/**
 * Si el equipo tiene el botón de compartir del sistema, que es el que abre la
 * lista de apps del teléfono. En el computador casi nunca existe.
 *
 * Se pregunta con `useSyncExternalStore` y no con un estado: el servidor dibuja
 * el HTML sin `navigator`, y cualquier otra forma de averiguarlo hace que el
 * primer dibujado del navegador no coincida con lo que vino del servidor.
 * Acá el servidor responde "no hay" y el navegador contesta lo suyo después,
 * que es justo lo que esta función está hecha para resolver.
 */
function hayCompartirNativo(): boolean {
  return typeof navigator !== "undefined" && "share" in navigator;
}

/** La respuesta no cambia durante la vida de la página: no hay a qué suscribirse. */
function sinCambios(): () => void {
  return () => {};
}

export function Compartir({ url, titulo }: { url: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const hayNativo = useSyncExternalStore(sinCambios, hayCompartirNativo, () => false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sin permiso para el portapapeles: queda el enlace en la barra igual */
    }
  }

  return (
    <div className="pd-compartir">
      <span className="pd-compartir-tit">Compartir</span>

      <div className="pd-compartir-fila">
        {REDES.map((red) => (
          <a
            key={red.id}
            href={red.enlace(url, titulo)}
            target="_blank"
            rel="noopener noreferrer"
            className="pd-share"
            style={{ "--color": red.color } as React.CSSProperties}
            aria-label={`Compartir en ${red.nombre}`}
            title={`Compartir en ${red.nombre}`}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
              {red.icono}
            </svg>
          </a>
        ))}

        <button
          type="button"
          onClick={copiar}
          className="pd-share pd-share-texto"
          style={{ "--color": COURT } as React.CSSProperties}
          aria-label="Copiar el enlace de la noticia"
        >
          {copiado ? <Check size={14} /> : <Link2 size={14} />}
          <span>{copiado ? "Copiado" : "Copiar enlace"}</span>
        </button>

        {hayNativo && (
          <button
            type="button"
            onClick={() => navigator.share({ title: titulo, url }).catch(() => {})}
            className="pd-share"
            style={{ "--color": COURT } as React.CSSProperties}
            aria-label="Compartir con otra aplicación"
            title="Compartir con otra aplicación"
          >
            <Share2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
