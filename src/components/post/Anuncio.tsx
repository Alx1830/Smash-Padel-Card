"use client";

/**
 * Los anuncios de AdSense de la sección de noticias.
 *
 * Hay dos formas, y cada una vive donde no estorba:
 *
 * - **Columna**: al costado de las secciones de la portada, estirado hasta
 *   donde ellas terminan. Solo en pantallas anchas — un aviso vertical metido
 *   en un celular queda enorme y tapa la lectura, así que ahí no se dibuja.
 * - **Ancho**: una franja entre bloques de contenido. Funciona en cualquier
 *   pantalla y es la única forma que se ve en el celular.
 *
 * Mientras Google esté revisando el sitio no devuelve ningún aviso y el hueco
 * queda vacío. Es esperado; cuando aprueben aparecen solos.
 *
 * Regla al agregar uno nuevo: nunca antes de que el lector vea de qué trata la
 * página, ni dos seguidos sin contenido en medio. Un sitio empapelado rinde
 * menos, no más, y AdSense lo penaliza.
 */
import { useEffect, useRef } from "react";

const CLIENTE = "ca-pub-7135029542920964";

/* Los números de bloque salen de AdSense → Anuncios → Por bloque de anuncios.
   No son secretos: viajan en el HTML de cualquiera que abra la página, igual
   que el identificador de editor que ya está en el layout y en ads.txt. */
const BLOQUES = {
  columna: "5231729031",
  ancho:   "4775212273",
};

export function AnuncioColumna() {
  return (
    <aside className="np-ads">
      <Bloque
        slot={BLOQUES.columna}
        estilo={{ display: "block", width: 300, height: "100%", minHeight: 250 }}
        /* Sin esto el aviso intenta salirse de la columna. */
        anchoCompleto={false}
      />
    </aside>
  );
}

/**
 * Una franja a lo ancho del contenido.
 *
 * `separacion` es el aire de arriba y abajo: los bloques de una nota respiran
 * distinto que los de la portada.
 */
export function AnuncioAncho({ separacion = 34 }: { separacion?: number }) {
  return (
    <div
      className="anuncio-ancho"
      style={{ margin: `${separacion}px 0`, display: "flex", justifyContent: "center" }}
    >
      <Bloque
        slot={BLOQUES.ancho}
        /* Alto mínimo reservado de antemano: sin esto el aviso aparece de golpe
           y empuja el texto que el lector ya estaba leyendo. */
        estilo={{ display: "block", width: "100%", minHeight: 100 }}
        anchoCompleto
      />
    </div>
  );
}

function Bloque({
  slot,
  estilo,
  anchoCompleto,
}: {
  slot: string;
  estilo: React.CSSProperties;
  anchoCompleto: boolean;
}) {
  const pedido = useRef(false);

  useEffect(() => {
    /* En desarrollo React monta dos veces, y AdSense protesta si le piden dos
       avisos para el mismo hueco. Con esto se pide uno solo. */
    if (pedido.current) return;
    pedido.current = true;
    try {
      /* El script que llena estos huecos se carga una sola vez desde el layout;
         acá solo se le avisa que hay un espacio esperando. */
      // @ts-expect-error — window.adsbygoogle lo define Google, no nuestro código
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* Sin conexión, o con un bloqueador de anuncios: la página sigue igual */
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={estilo}
      data-ad-client={CLIENTE}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive={anchoCompleto ? "true" : "false"}
    />
  );
}
