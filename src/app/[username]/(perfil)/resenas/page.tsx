import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { traerJugador } from "../../jugador";
import { ResenasPageClient } from "./ResenasPageClient";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await traerJugador(username);

  const display = data?.first_name
    ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
    : data?.username ?? username;

  const title = `Reseñas de ${display} · FaceBinder`;
  const description = `Lo que dicen de ${display} sus compradores y la comunidad: ventas de cartas Pokémon TCG confirmadas y referencias en FaceBinder.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://facebinder.com/${username}/resenas`,
      images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

export default async function ResenasPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const player = await traerJugador(username);
  if (!player) notFound();



  return (
    <>
      <ResenasPageClient vendedorId={player.user_id} username={player.username} />
    </>
  );
}
