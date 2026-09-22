import Link from "next/link";

/**
 * Pie chico, el que va en las páginas que se leen sin iniciar sesión.
 *
 * El pie grande (`Footer.tsx`) ocupa varias pantallas de alto y solo se muestra
 * en escritorio, así que en el celular no había forma de llegar a quiénes somos
 * ni a las condiciones del sitio. Este cabe en dos renglones y se ve siempre.
 *
 * No lleva estado ni efectos: es un componente de servidor, y así no le suma un
 * solo byte de JavaScript a páginas que están hechas para que las lea Google.
 */

const MONO = "var(--font-jetbrains)";

const ENLACES = [
  { label: "Acerca de",  href: "/acerca" },
  { label: "Contacto",   href: "/contacto" },
  { label: "Privacidad", href: "/privacidad" },
  { label: "Términos",   href: "/terminos" },
  { label: "Noticias",   href: "/noticias" },
  { label: "Sets",       href: "/sets" },
];

export function PieLegal() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 24px 40px",
        display: "flex", flexWrap: "wrap", alignItems: "center",
        justifyContent: "space-between", gap: "14px",
        fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {ENLACES.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{ color: "#7a8298", textDecoration: "none", textTransform: "uppercase" }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Pokémon es marca de terceros: decirlo es una exigencia de Nintendo y de
          cualquier programa de publicidad que mire el sitio. */}
      <span style={{ color: "rgba(122,130,152,0.7)", maxWidth: "520px", lineHeight: 1.6 }}>
        © 2026 FaceBinder · Sitio independiente de coleccionistas, sin relación
        con Nintendo, Creatures, GAME FREAK ni The Pokémon Company.
      </span>
    </footer>
  );
}
