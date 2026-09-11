/**
 * Piezas de SEO que se repiten en más de una página.
 *
 * Los datos estructurados son un JSON que no se ve en la pantalla y que le
 * explica a Google qué está leyendo. Sin ellos una noticia es "una página con
 * texto"; con ellos es un artículo con fecha, autor y medio que lo publica, que
 * es lo que Google necesita para mostrarla en Noticias y en Discover.
 */

export const SITIO = "https://facebinder.com";

/** El medio que publica. Va adentro de cada artículo: Google exige un
 *  `publisher` con logo para tomarlo como noticia de verdad. */
export const EDITOR = {
  "@type": "Organization",
  name: "FaceBinder",
  url: SITIO,
  logo: {
    "@type": "ImageObject",
    url: `${SITIO}/favicon.png`,
    width: 48,
    height: 48,
  },
} as const;

/** Las migas de pan que Google dibuja arriba del título en el resultado. */
export function migas(pasos: { nombre: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: `${SITIO}${p.url}`,
    })),
  };
}

/** Dibuja uno o varios bloques de datos estructurados. */
export function DatosJson({ datos }: { datos: unknown }) {
  return (
    <script
      type="application/ld+json"
      /* El JSON se arma con constantes y con campos de la base que nosotros
         escribimos, nunca con texto suelto de un visitante. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }}
    />
  );
}
