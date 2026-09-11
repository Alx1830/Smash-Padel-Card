import { notFound } from "next/navigation";
import { traerJugador } from "./jugador";

/**
 * Portero de todo lo que cuelga de un nombre de usuario.
 *
 * Existe para una sola cosa: responder 404 de verdad cuando el usuario no
 * existe. La página no puede hacerlo sola, porque `loading.tsx` la envuelve y
 * Next empieza a mandar la respuesta —con su "200, acá está"— antes de que la
 * página termine. El layout, en cambio, se resuelve antes de ese arranque: si
 * acá se llama `notFound()`, el visitante y Google reciben el mismo "no
 * existe". Sin esto, `facebinder.com/loquesea` respondía como página válida.
 *
 * La consulta está memoizada, así que la página no la repite.
 */
export default async function JugadorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!(await traerJugador(username))) notFound();
  return <>{children}</>;
}
