import Link from "next/link";
import type { Metadata } from "next";
import { PaginaTexto } from "@/components/PaginaTexto";
import { SITIO, DatosJson, EDITOR, migas } from "@/lib/seo";
import { SET_CARD_COUNT } from "@/data/pokemon-cards";
import { SETS_PUBLICOS } from "@/lib/catalogo";

export const revalidate = 86400;

const TOTAL_SETS = SETS_PUBLICOS.length;
const TOTAL_CARTAS = Object.values(SET_CARD_COUNT).reduce((n, c) => n + c, 0);

export const metadata: Metadata = {
  title: "Qué es FaceBinder — el binder digital de los coleccionistas",
  description:
    "FaceBinder es una plataforma colombiana para registrar tu colección de " +
    "Pokémon TCG carta por carta, saber cuánto vale y comprar, vender e " +
    "intercambiar con otros coleccionistas. Quiénes la hacemos y de dónde salen " +
    "los datos.",
  alternates: { canonical: `${SITIO}/acerca` },
};

export default function AcercaPage() {
  return (
    <>
      <DatosJson datos={[
        migas([{ nombre: "Inicio", url: "/" }, { nombre: "Acerca de", url: "/acerca" }]),
        { "@context": "https://schema.org", "@type": "AboutPage", url: `${SITIO}/acerca`, publisher: EDITOR },
      ]} />

      <PaginaTexto
        antetitulo="Acerca de"
        titulo="Qué es FaceBinder"
        bajada="Un binder que no se llena de polvo y que sabe cuánto vale."
      >
        <p>
          <strong>FaceBinder</strong> es una plataforma colombiana para
          coleccionistas de Pokémon TCG. La idea nació de un problema que tiene
          cualquiera con más de tres binders encima: no saber qué se tiene. Ni
          qué falta para cerrar un set, ni cuánto vale lo que ya está guardado,
          ni qué carta está repetida y podría cambiarse por la que hace meses se
          busca.
        </p>

        <h2>Qué se puede hacer</h2>
        <ul>
          <li>
            <strong>Registrar la colección carta por carta.</strong> Están los{" "}
            {TOTAL_SETS} sets del juego, de Base Set en adelante, con sus{" "}
            {TOTAL_CARTAS.toLocaleString("es-CO")} cartas y sus variantes
            (normal, reverse holo, holo, primera edición y las demás).
          </li>
          <li>
            <strong>Saber cuánto vale el binder.</strong> Cada carta tiene su
            precio de mercado y el total se sigue en un gráfico, como una
            cartera de inversión, en dólares y en pesos.
          </li>
          <li>
            <strong>Comprar y vender.</strong> El market muestra lo que publican
            los coleccionistas, filtrado por ciudad: la idea es que el trato se
            cierre entre dos personas de la misma zona.
          </li>
          <li>
            <strong>Intercambiar.</strong> Se arma una propuesta con cartas de
            un lado y del otro, y queda registrada para que las dos partes
            sepan qué se acordó.
          </li>
          <li>
            <strong>Leer y comentar noticias</strong> del juego, en{" "}
            <Link href="/noticias">la sección de noticias</Link>.
          </li>
        </ul>

        <h2>De dónde salen los precios</h2>
        <p>
          De las ventas reales de <strong>TCGplayer</strong>, que es el mercado
          de referencia del Pokémon TCG en el mundo. Un proceso automático
          recorre el catálogo completo cada tres horas y guarda el precio de
          cada variante de cada carta. No son precios inventados ni puestos a
          mano, y tampoco son una oferta nuestra: es lo que se está pagando
          afuera.
        </p>
        <p>
          La conversión a pesos colombianos usa la <strong>TRM</strong> del
          Banco de la República del día. El precio en pesos es una referencia
          para orientarse, no lo que cuesta traer la carta al país: eso depende
          del envío, de los impuestos y de con quién se negocie.
        </p>

        <h2>Las fotos y los datos de las cartas</h2>
        <p>
          Las imágenes y los datos de cada carta provienen de catálogos públicos
          del juego y se guardan en nuestro propio almacenamiento para que
          carguen rápido. Los textos de las noticias y las descripciones del
          sitio están escritos por nosotros.
        </p>

        <h2>Quién lo hace</h2>
        <p>
          Es un proyecto independiente, hecho en Colombia por{" "}
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer">
            Adxmedialab
          </a>
          . No tiene relación con Nintendo, Creatures, GAME FREAK ni The Pokémon
          Company: Pokémon y Pokémon TCG son marcas registradas de sus dueños, y
          acá se mencionan porque el sitio habla de ellas, no porque lo
          respalden.
        </p>
        <p>
          Usar FaceBinder es gratis. Si algo no funciona o falta un set,{" "}
          <Link href="/contacto">escribinos</Link>: la mayor parte de lo que
          tiene el sitio hoy salió de un mensaje de alguien que lo usa.
        </p>

        <h2>Por dónde empezar</h2>
        <ul>
          <li><Link href="/sets">El catálogo de sets</Link>, con todas las cartas y sus precios.</li>
          <li><Link href="/market">El market</Link>, para ver qué hay en venta.</li>
          <li><Link href="/noticias">Las noticias</Link> del juego.</li>
          <li><Link href="/login">Crear una cuenta</Link> y armar el binder.</li>
        </ul>
      </PaginaTexto>
    </>
  );
}
