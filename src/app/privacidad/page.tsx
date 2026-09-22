import Link from "next/link";
import type { Metadata } from "next";
import { PaginaTexto } from "@/components/PaginaTexto";
import { SITIO, DatosJson, EDITOR, migas } from "@/lib/seo";
import { CORREO_CONTACTO } from "@/lib/contacto";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política de privacidad — FaceBinder",
  description:
    "Qué datos guarda FaceBinder, para qué, con quién se comparten, cuánto " +
    "tiempo se conservan y cómo pedir una copia o el borrado de tu cuenta.",
  alternates: { canonical: `${SITIO}/privacidad` },
};

export default function PrivacidadPage() {
  return (
    <>
      <DatosJson datos={[
        migas([{ nombre: "Inicio", url: "/" }, { nombre: "Privacidad", url: "/privacidad" }]),
        { "@context": "https://schema.org", "@type": "WebPage", name: "Política de privacidad", url: `${SITIO}/privacidad`, publisher: EDITOR },
      ]} />

      <PaginaTexto
        antetitulo="Legal"
        titulo="Política de privacidad"
        bajada="Qué guardamos, por qué, y cómo pedir que lo borremos."
        actualizado="21 de septiembre de 2026"
      >
        <p>
          Esta política explica cómo FaceBinder (<a href={SITIO}>facebinder.com</a>)
          trata los datos personales de quienes usan el sitio. Está escrita en
          los términos de la <strong>Ley 1581 de 2012</strong> de Colombia y su
          decreto reglamentario, que son las normas de protección de datos que
          nos aplican.
        </p>
        <p>
          El responsable del tratamiento es el equipo que opera FaceBinder. Para
          cualquier cosa de las que dice esta página, el correo es{" "}
          <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
        </p>

        <h2>Se puede leer el sitio sin dar ningún dato</h2>
        <p>
          El catálogo de <Link href="/sets">sets y cartas</Link>, los precios,{" "}
          <Link href="/noticias">las noticias</Link> y el market se ven sin
          cuenta y sin registrarse. Nada de lo que sigue hace falta para leer.
        </p>

        <h2>Qué datos guardamos cuando abrís una cuenta</h2>
        <ul>
          <li>
            <strong>Tu correo electrónico</strong>, para identificarte y para
            recuperar el acceso. Si entrás con Google, recibimos de Google tu
            correo, tu nombre y tu foto de perfil, nada más.
          </li>
          <li>
            <strong>Lo que ponés en tu perfil</strong>: nombre de usuario,
            nombre, foto y portada, país, ciudad, edad, y opcionalmente tu
            Pokémon y tu set favoritos. El perfil es público: quien entre a{" "}
            <em>facebinder.com/tu-usuario</em> lo va a ver.
          </li>
          <li>
            <strong>Tu número de WhatsApp</strong>, si lo cargás. Sirve para que
            un comprador te escriba por una carta que publicaste. No lo
            mostramos a quien no esté registrado.
          </li>
          <li>
            <strong>Lo que armás en el sitio</strong>: tu inventario, tu lista
            de deseados, tus mazos, tus publicaciones del market, tus
            propuestas de intercambio y tus comentarios.
          </li>
          <li>
            <strong>Datos técnicos mínimos</strong>: la fecha de tu última
            conexión y de tu última actividad, para saber si una cuenta sigue
            viva y para mostrar quién está en línea.
          </li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Para que el sitio funcione: mostrarte tu colección, calcular cuánto
          vale, publicar lo que ponés en venta, avisarte cuando alguien te
          escribe o te propone un intercambio, y moderar el market. No vendemos
          datos a nadie ni los cedemos con fines comerciales.
        </p>

        <h2>Qué es público y qué no</h2>
        <p>
          Son <strong>públicos</strong>: tu nombre de usuario, tu foto, tu
          ciudad y país, tu perfil, las cartas que publicás en el market y tus
          comentarios en las noticias. Son <strong>privados</strong>: tu correo,
          tu WhatsApp (salvo para usuarios registrados que te contacten por una
          publicación) y el detalle de tu inventario que no hayas publicado.
        </p>

        <h2>Con quién se comparten</h2>
        <p>
          Solo con los proveedores que hacen andar el sitio, y solo con lo que
          cada uno necesita:
        </p>
        <ul>
          <li><strong>Supabase</strong> — base de datos y sistema de cuentas.</li>
          <li><strong>Cloudflare</strong> — servidores donde corre el sitio y almacenamiento de las imágenes.</li>
          <li><strong>Google</strong> — si elegís entrar con tu cuenta de Google, y para la medición de audiencia que se describe abajo.</li>
        </ul>

        <h2>Cookies y medición</h2>
        <p>
          Usamos una <strong>cookie de sesión</strong> para mantenerte conectado.
          Sin ella no hay forma de saber que sos vos entre una página y la
          siguiente, así que no se puede desactivar teniendo la sesión abierta.
        </p>
        <p>
          Usamos <strong>Google Analytics</strong> para contar visitas y saber
          qué páginas se leen. Son datos agregados: nos dice cuánta gente entró
          a un set, no quién. Podés bloquearlo desde tu navegador o con
          cualquier extensión de bloqueo sin que el sitio deje de funcionar.
        </p>
        <p>
          <strong>Hoy el sitio no muestra publicidad.</strong> Si en el futuro
          se activan anuncios de Google AdSense, esos anuncios usan cookies
          propias de Google para elegir qué mostrar; se puede desactivar la
          personalización desde la{" "}
          <a href="https://myadcenter.google.com" target="_blank" rel="noopener noreferrer">
            configuración de anuncios de Google
          </a>
          . Esta página se va a actualizar antes de que eso pase.
        </p>

        <h2>Notificaciones</h2>
        <p>
          Si aceptás recibir avisos, tu navegador nos entrega una dirección de
          notificación que guardamos para poder mandarte el aviso. No incluye
          tu identidad ni tu ubicación, y se borra si retirás el permiso desde
          el navegador.
        </p>

        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Mientras tu cuenta exista. Las publicaciones del market vencen solas a
          los 30 días. Si pedís el borrado de tu cuenta, eliminamos tus datos
          personales y tu contenido dentro de los 30 días siguientes; puede
          quedar alguna copia en respaldos técnicos por un tiempo corto más,
          hasta que esos respaldos se sobrescriben.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Podés pedir en cualquier momento: saber qué datos tuyos tenemos,
          obtener una copia, corregirlos, actualizarlos, revocar tu
          autorización o que borremos tu cuenta y todo lo asociado. Escribinos a{" "}
          <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> desde el
          correo con el que te registraste y respondemos dentro de los plazos de
          la ley (diez días hábiles para consultas, quince para reclamos).
        </p>

        <h2>Menores de edad</h2>
        <p>
          El Pokémon TCG lo juega mucha gente menor de 18 años y no se lo
          prohibimos. Pedimos que quienes tengan menos de 14 usen el sitio con
          el permiso de quien esté a su cargo, y recomendamos no cargar el
          número de WhatsApp en ese caso. Si un adulto responsable nos pide
          borrar la cuenta de un menor, lo hacemos sin más trámite.
        </p>

        <h2>Seguridad</h2>
        <p>
          Las contraseñas no las guardamos nosotros: las administra el sistema
          de cuentas de Supabase, cifradas. Todo el tráfico del sitio va por
          HTTPS, y el acceso a cada dato está restringido en la base a su dueño.
          Ningún sistema es infalible; si llegara a haber un incidente que
          afecte tus datos, te avisamos.
        </p>

        <h2>Cambios</h2>
        <p>
          Si esta política cambia, actualizamos la fecha de arriba. Si el cambio
          es de fondo —por ejemplo, si se activa la publicidad— lo avisamos
          dentro del sitio.
        </p>
      </PaginaTexto>
    </>
  );
}
