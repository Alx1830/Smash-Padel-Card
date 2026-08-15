/**
 * Datos estructurados para Google. No se ven en la página: le explican al
 * buscador qué es FaceBinder, dónde opera y qué se puede buscar adentro. Es lo
 * que habilita que el resultado salga con caja de búsqueda propia y que la
 * ficha entienda que el servicio es colombiano.
 */
export function DatosEstructurados({ cartasEnVenta }: { cartasEnVenta: number }) {
  const BASE = "https://facebinder.com";

  const bloques = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FaceBinder",
      url: BASE,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Android, iOS, Web",
      inLanguage: "es-CO",
      description:
        "Plataforma colombiana para coleccionistas de Pokémon TCG: inventario carta por carta, valor del binder en pesos, market de compraventa e intercambios entre coleccionistas.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "COP" },
      areaServed: { "@type": "Country", name: "Colombia" },
      publisher: { "@type": "Organization", name: "FaceBinder", url: BASE },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "FaceBinder",
      url: BASE,
      inLanguage: "es-CO",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE}/market?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Cómo sé cuánto vale mi colección de cartas Pokémon?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Registras tus cartas en FaceBinder y la plataforma calcula el valor total de tu colección. Los precios vienen de TCGplayer y se actualizan cada tres horas, convertidos a pesos colombianos con la tasa del día.",
          },
        },
        {
          "@type": "Question",
          name: "¿Dónde puedo comprar y vender cartas Pokémon en Colombia?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `En el market de FaceBinder hay ${cartasEnVenta > 0 ? `${cartasEnVenta} cartas` : "cartas"} publicadas por coleccionistas, con precios en pesos y filtros por ciudad. Toda publicación pasa por revisión antes de aparecer, y el trato se cierra directamente entre las dos personas.`,
          },
        },
        {
          "@type": "Question",
          name: "¿FaceBinder cobra comisión por vender?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. FaceBinder conecta a comprador y vendedor; el pago y la entrega los acuerdan ustedes directamente, sin intermediarios ni comisión de la plataforma.",
          },
        },
        {
          "@type": "Question",
          name: "¿Cómo instalo FaceBinder en el celular?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No hay que descargarla de ninguna tienda. En Android se abre en Chrome y se elige Instalar aplicación; en iPhone se abre en Safari, se toca Compartir y luego Agregar a inicio. Queda con su ícono en la pantalla.",
          },
        },
        {
          "@type": "Question",
          name: "¿Se pueden intercambiar cartas con otros coleccionistas?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. Armas la propuesta eligiendo qué entregas y qué pides, los dos ven cuánto vale cada lado, negocian por chat y, al confirmar la entrega, el inventario de ambos se actualiza automáticamente.",
          },
        },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      /* El JSON viene de constantes nuestras, no de nada que escriba un usuario */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(bloques) }}
    />
  );
}
