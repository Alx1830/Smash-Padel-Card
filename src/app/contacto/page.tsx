import Link from "next/link";
import type { Metadata } from "next";
import { PaginaTexto } from "@/components/PaginaTexto";
import { SITIO, DatosJson, EDITOR, migas } from "@/lib/seo";
import { CORREO_CONTACTO } from "@/lib/contacto";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contacto — FaceBinder",
  description:
    "Cómo escribirnos: dudas, una carta con el precio mal, un set que falta, " +
    "un problema con una publicación del market o un pedido sobre tus datos.",
  alternates: { canonical: `${SITIO}/contacto` },
};

export default function ContactoPage() {
  return (
    <>
      <DatosJson datos={[
        migas([{ nombre: "Inicio", url: "/" }, { nombre: "Contacto", url: "/contacto" }]),
        {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: `${SITIO}/contacto`,
          publisher: {
            ...EDITOR,
            contactPoint: {
              "@type": "ContactPoint",
              email: CORREO_CONTACTO,
              contactType: "customer support",
              availableLanguage: ["es"],
            },
          },
        },
      ]} />

      <PaginaTexto
        antetitulo="Contacto"
        titulo="Escribinos"
        bajada="Una sola casilla, atendida por las personas que hacen el sitio."
      >
        <p>
          Para cualquier cosa relacionada con FaceBinder, el correo es{" "}
          <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>. Contestamos
          en español y solemos tardar uno o dos días hábiles.
        </p>

        <h2>Qué conviene contarnos</h2>
        <ul>
          <li>
            <strong>Una carta con el precio raro o sin precio.</strong> Mandá el
            enlace de la carta: con eso vemos si el problema es del mapeo contra
            TCGplayer y lo corregimos para todos.
          </li>
          <li>
            <strong>Falta un set.</strong> Decinos cuál. Agregar una expansión
            es un trabajo de varias horas —imágenes, numeración, precios—, así
            que priorizamos por lo que más nos piden.
          </li>
          <li>
            <strong>Un problema con una publicación del market.</strong> Toda
            publicación pasa por revisión antes de aparecer, pero si algo se
            coló —precio engañoso, foto que no corresponde, alguien que no
            responde— avisanos con el enlace del anuncio.
          </li>
          <li>
            <strong>Tus datos.</strong> Para pedir una copia, una corrección o
            el borrado de tu cuenta, escribí desde el correo con el que te
            registraste. Está todo explicado en{" "}
            <Link href="/privacidad">la política de privacidad</Link>.
          </li>
          <li>
            <strong>Una noticia o una corrección.</strong> Si publicamos algo
            equivocado, lo corregimos y lo dejamos dicho en la nota.
          </li>
        </ul>

        <h2>Lo que no hacemos</h2>
        <p>
          FaceBinder no compra, no vende ni envía cartas. El sitio es el lugar
          donde dos coleccionistas se encuentran; el trato, el pago y la entrega
          corren por cuenta de ellos. Si el problema es con una compra, podemos
          revisar la publicación y la cuenta del vendedor, pero no somos parte
          de la transacción ni podemos devolver dinero.
        </p>

        <h2>Si querés ayudar</h2>
        <p>
          La forma más útil es usar el sitio y contar qué falla. La segunda es
          publicar lo que tenés repetido en el market: entre más cartas haya,
          más sirve para todos.
        </p>
      </PaginaTexto>
    </>
  );
}
