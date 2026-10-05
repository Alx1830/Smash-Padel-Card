import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { slugifySetName } from "@/lib/slug";
import { COURT, VIOLET, INK0, INK2, MONO, DISP, PANEL_BG, INNER_BORDER } from "@/components/perfil/tokens";
import { traerPerfil } from "../datos";
import { InventarioPublico } from "./InventarioPublico";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `Colección de @${username} · FaceBinder` };
}

const txt: React.CSSProperties = { margin: 0, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function Cabecera({ ante, titulo, bajada }: { ante: string; titulo: string; bajada: string }) {
  return (
    <div className="iv-cab" style={{ marginBottom: 20 }}>
      <div className="iv-ante" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} /> {ante}
      </div>
      <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>{titulo}</h1>
      <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>{bajada}</p>
    </div>
  );
}

/** El inventario completo, con el aspecto del dashboard, y los sets propios del usuario. */
export default async function InventarioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();
  const { jugador: j, metricas: m } = perfil;

  const supabase = await createClient();
  const { data: misSets } = await supabase.from("my_sets")
    .select("id, name, cover_card_image, my_set_cards(quantity)")
    .eq("user_id", j.userId).order("created_at", { ascending: false });

  return (
    <div>
      <style>{`
        .iv-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .iv-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .iv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .iv-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) { .iv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
        /* En celular y tablet la cabecera va centrada, como la del inventario */
        @media (max-width: 1023px), (pointer: coarse) {
          .iv-cab { text-align: center; }
          .iv-ante { justify-content: center; }
        }
      `}</style>

      <InventarioPublico
        userId={j.userId}
        username={j.username}
        colecciones={perfil.sets.map(({ setId, unique, total }) => ({ setId, unique, total }))}
        resumen={`${m.cartas_total.toLocaleString("es-CO")} cartas · ${m.cartas_unicas.toLocaleString("es-CO")} distintas · ${perfil.sets.length} sets`}
      />

      {!!misSets?.length && (
        <div className="ip-cuerpo" style={{ paddingTop: 0 }}>
          <Cabecera ante="Sets propios" titulo="Colecciones armadas" bajada="Selecciones de cartas que el usuario armó a su gusto" />
          <div className="iv-grid">
            {misSets.map(ms => {
              const cartas = ((ms.my_set_cards ?? []) as { quantity: number }[]).reduce((t, c) => t + (c.quantity ?? 0), 0);
              return (
                <Link key={ms.id} href={`/${j.username}/${slugifySetName(ms.name)}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 12, border: INNER_BORDER, background: PANEL_BG, minWidth: 0 }}>
                  {ms.cover_card_image ? (
                    <img src={ms.cover_card_image} alt={ms.name} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "5 / 7", borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}><FolderHeart size={22} color={VIOLET} /></div>
                  )}
                  <p style={{ ...txt, fontSize: 11, fontWeight: 600, color: INK0 }}>{ms.name}</p>
                  <p style={{ ...txt, fontSize: 9, color: INK2 }}>{cartas} cartas</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
