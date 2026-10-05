/**
 * Redes sociales del perfil. lucide ya no trae logos de marcas, así que van
 * dibujados a mano (como en components/post/Compartir.tsx).
 *
 * El WhatsApp nunca se escribe en la página: el icono apunta a
 * /api/whatsapp/[usuario], que exige sesión y recién ahí redirige a wa.me.
 */
import { MONO } from "./tokens";

export type RedSocial = "facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp";

export const REDES: Record<RedSocial, { nombre: string; color: string }> = {
  facebook:  { nombre: "Facebook",  color: "#4c8bf5" },
  instagram: { nombre: "Instagram", color: "#e1478f" },
  tiktok:    { nombre: "TikTok",    color: "#f5f7fb" },
  youtube:   { nombre: "YouTube",   color: "#ff3b3b" },
  whatsapp:  { nombre: "WhatsApp",  color: "#25d366" },
};

export function LogoRed({ red, size = 15 }: { red: RedSocial; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (red) {
    case "facebook":
      return <svg {...p} fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" /></svg>;
    case "instagram":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return <svg {...p} fill="currentColor"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" /></svg>;
    case "youtube":
      return <svg {...p} fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" /></svg>;
    case "whatsapp":
      return <svg {...p} fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.24-8.25Zm-2.6 4.1c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.21.94 2.36c.12.16 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.04.15 1.43.09.44-.07 1.34-.55 1.53-1.08.19-.53.19-.99.13-1.08-.05-.09-.2-.15-.43-.26-.23-.12-1.34-.66-1.55-.74-.21-.08-.36-.11-.51.11-.15.23-.58.74-.72.89-.13.16-.26.18-.49.06-.23-.12-.96-.36-1.84-1.13-.68-.6-1.14-1.35-1.27-1.58-.14-.23-.02-.35.1-.47.1-.1.23-.27.34-.4.12-.14.15-.24.23-.39.08-.16.04-.29-.02-.4-.06-.12-.51-1.23-.7-1.68-.18-.44-.37-.38-.51-.39h-.43Z" /></svg>;
  }
}

/** Acepta el usuario suelto (con o sin @) o el enlace completo y arma la URL. */
export function urlDeRed(red: Exclude<RedSocial, "whatsapp">, valor: string): string | null {
  const v = valor.trim().replace(/^@/, "");
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (red === "tiktok")  return `https://www.tiktok.com/@${v}`;
  if (red === "youtube") return `https://www.youtube.com/@${v}`;
  return `https://www.${red}.com/${v}`;
}

/** Fila de iconos redondos; solo aparecen las redes que el usuario llenó. */
export function FilaRedes({ links }: { links: { red: RedSocial; href: string }[] }) {
  if (links.length === 0) return null;
  return (
    <span className="pf-redes" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {/* El círculo se ve de 26 px, pero con el dedo se toca un área de 40:
          la capa invisible de ::before agranda la zona sin cambiar el dibujo. */}
      <style>{`
        @media (pointer: coarse) {
          .pf-redes { gap: 14px !important; }
          .pf-red::before { content: ""; position: absolute; inset: -7px; border-radius: 50%; }
        }
      `}</style>
      {links.map(({ red, href }) => {
        const { nombre } = REDES[red];
        return (
          <a key={red} href={href} target="_blank" rel="noopener noreferrer nofollow" title={nombre} aria-label={nombre} className="pf-red"
            style={{
              position: "relative", width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#f5f7fb", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.06)", textDecoration: "none", fontFamily: MONO,
            }}>
            <LogoRed red={red} size={13} />
          </a>
        );
      })}
    </span>
  );
}
