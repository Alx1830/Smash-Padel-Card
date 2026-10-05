import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { PerfilHero } from "@/components/perfil/PerfilHero";
import { PerfilTabs } from "@/components/perfil/PerfilTabs";
import { traerPerfil } from "./datos";

/**
 * Marco del perfil nuevo: la cabecera y las pestañas viven aquí y no se
 * vuelven a pintar al cambiar de pestaña. Cada pestaña es su propia página
 * dentro de este grupo; los decks y los sets propios quedan afuera, con su
 * diseño de siempre.
 */
export default async function PerfilLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();

  return (
    <main style={{ background: "#05070d", minHeight: "100vh", overflowX: "clip" }}>
      <PerfilHero perfil={perfil} />
      <PerfilTabs username={perfil.jugador.username} />
      <div className="pf-contenido">
        <style>{`
          .pf-contenido { max-width: 1400px; margin: 0 auto; padding: 22px clamp(16px, 3vw, 46px) 64px; }
          /* Donde aparece la barra de abajo, el body ya reserva sus 72 px
             (MobileTabBar): aquí solo va el aire de la zona segura del iPhone.
             Antes se sumaban dos reservas y quedaba un hueco vacío al final. */
          @media (max-width: 1023px), (pointer: coarse) {
            .pf-contenido { padding-bottom: calc(28px + env(safe-area-inset-bottom)); }
          }
          @media (max-width: 767px) {
            .pf-contenido { padding-top: 18px; }
          }
          /* "Ver todas" se ve de 28 px de alto; con el dedo la zona que se puede
             tocar llega a 40 gracias a una capa invisible. */
          @media (pointer: coarse) {
            .pf-ver::before { content: ""; position: absolute; inset: -6px -2px; }
          }
        `}</style>
        {children}
      </div>
      <Footer />
      <MobileTabBar />
    </main>
  );
}
