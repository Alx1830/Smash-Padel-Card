import Link from "next/link";
import type { Metadata } from "next";
import { PaginaTexto } from "@/components/PaginaTexto";
import { SITIO, DatosJson, EDITOR, migas } from "@/lib/seo";
import { CORREO_CONTACTO } from "@/lib/contacto";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Términos y condiciones — FaceBinder",
  description:
    "Las reglas de uso de FaceBinder: qué se puede publicar en el market, " +
    "qué responsabilidad tiene el sitio en una compra entre coleccionistas y " +
    "qué pasa con el contenido que subís.",
  alternates: { canonical: `${SITIO}/terminos` },
};

export default function TerminosPage() {
  return (
    <>
      <DatosJson datos={[
        migas([{ nombre: "Inicio", url: "/" }, { nombre: "Términos", url: "/terminos" }]),
        { "@context": "https://schema.org", "@type": "WebPage", name: "Términos y condiciones", url: `${SITIO}/terminos`, publisher: EDITOR },
      ]} />

      <PaginaTexto
        antetitulo="Legal"
        titulo="Términos y condiciones"
        bajada="Las reglas del sitio, en el idioma en que se hablan."
        actualizado="21 de septiembre de 2026"
      >
        <p>
          Al usar FaceBinder aceptás lo que dice esta página. Es corta a
          propósito: si algo no está acá, escribinos a{" "}
          <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> antes de
          suponerlo.
        </p>

        <h2>Qué es y qué no es este sitio</h2>
        <p>
          FaceBinder es una herramienta para registrar una colección de Pokémon
          TCG, seguir su valor y ponerse en contacto con otros coleccionistas.{" "}
          <strong>No es una tienda.</strong> No compramos, no vendemos, no
          guardamos cartas, no cobramos, no enviamos nada y no somos parte de
          ninguna transacción. Cuando dos personas cierran un trato acá, el
          acuerdo es entre ellas.
        </p>

        <h2>La cuenta</h2>
        <ul>
          <li>Una persona, una cuenta. Los datos que cargues tienen que ser tuyos y ciertos.</li>
          <li>Sos responsable de lo que pase con tu cuenta; no la compartas.</li>
          <li>Podés cerrarla cuando quieras escribiéndonos.</li>
          <li>
            Podemos suspender una cuenta que estafe, que publique cartas falsas
            a sabiendas, que acose a otros o que use el sitio para algo ilegal.
          </li>
        </ul>

        <h2>El market</h2>
        <p>
          Todo lo que se publica pasa por una revisión antes de aparecer, y esa
          revisión es humana y falible: mira que la carta, la foto y el precio
          tengan sentido, no certifica que la carta exista, que esté en el
          estado que dice ni que el vendedor cumpla.
        </p>
        <ul>
          <li>Publicá solo cartas que tenés y describilas como son.</li>
          <li>El precio lo ponés vos; el precio de mercado que muestra el sitio es una referencia, no una regla.</li>
          <li>Las publicaciones vencen a los 30 días y se pueden volver a publicar.</li>
          <li>No se permiten cartas falsificadas, proxies vendidos como originales, ni nada que no sea Pokémon TCG.</li>
        </ul>
        <p>
          <strong>Antes de pagar, revisá con quién estás tratando.</strong> Pedí
          fotos reales, preferí el encuentro en persona cuando sea posible y
          desconfiá de un precio demasiado bueno. Si algo sale mal, contanos:
          podemos sacar la publicación y suspender la cuenta, pero no podemos
          recuperar tu dinero.
        </p>

        <h2>Los precios</h2>
        <p>
          Los precios que muestra el sitio salen de las ventas de TCGplayer y se
          actualizan cada tres horas; la conversión a pesos usa la TRM del día.
          Son información, no una tasación ni un consejo de inversión. El valor
          de una carta cambia todos los días y depende del estado, de la
          edición y de a quién se la vendas.
        </p>

        <h2>Lo que subís</h2>
        <p>
          Las fotos, los textos y los comentarios que publicás siguen siendo
          tuyos. Al subirlos nos das permiso para mostrarlos dentro del sitio,
          que es lo mínimo para que se vean. Podemos borrar contenido que
          insulte, que sea de otro, que no tenga nada que ver o que nos meta en
          un problema legal.
        </p>

        <h2>Disponibilidad</h2>
        <p>
          El sitio se ofrece tal como está. Hacemos lo posible para que ande
          siempre y para que los datos sean correctos, pero puede haber errores,
          cortes y cambios sin aviso. No respondemos por pérdidas derivadas de
          un dato equivocado, de una caída del servicio ni de un trato cerrado
          entre usuarios.
        </p>

        <h2>Marcas de terceros</h2>
        <p>
          Pokémon, Pokémon TCG y los nombres, imágenes y logos relacionados son
          marcas registradas de Nintendo, Creatures, GAME FREAK y The Pokémon
          Company. FaceBinder es un sitio independiente de coleccionistas, sin
          relación ni respaldo de ninguna de esas compañías. Las imágenes de las
          cartas se usan con fines de identificación y catálogo.
        </p>

        <h2>Cambios y ley aplicable</h2>
        <p>
          Estas condiciones se pueden actualizar; la fecha de arriba dice
          cuándo fue la última vez. Se rigen por la ley colombiana. Ver también{" "}
          <Link href="/privacidad">la política de privacidad</Link>.
        </p>
      </PaginaTexto>
    </>
  );
}
