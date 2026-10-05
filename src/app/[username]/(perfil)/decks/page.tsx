import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { slugifySetName } from "@/lib/slug";
import { Vacio } from "@/components/perfil/Panel";
import { COURT, VIOLET, INK0, INK2, MONO, DISP, PANEL_BG, INNER_BORDER } from "@/components/perfil/tokens";
import { traerPerfil } from "../datos";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `Decks de @${username} · FaceBinder` };
}

const txt: React.CSSProperties = { margin: 0, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default async function DecksPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();
  const { jugador: j, esDueno } = perfil;

  const supabase = await createClient();
  const { data: decks } = await supabase.from("decks")
    .select("id, name, description, cover_card_image, deck_cards(needed)")
    .eq("user_id", j.userId).eq("is_public", true).order("created_at", { ascending: false });

  return (
    <div>
      <style>{`
        .dk-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .dk-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .dk-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .dk-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) { .dk-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
        /* Celular y tablet: cabecera centrada */
        @media (max-width: 1023px), (pointer: coarse) {
          .dk-cab { text-align: center; padding-top: 8px; }
          .dk-ante { justify-content: center; }
        }
      `}</style>

      <div className="dk-cab" style={{ marginBottom: 20 }}>
        <div className="dk-ante" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} /> Decks
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>Decks públicos</h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>{decks?.length ?? 0} {decks?.length === 1 ? "deck" : "decks"} de @{j.username}</p>
      </div>

      {!decks?.length ? (
        <Vacio icon={Layers} color={VIOLET} texto={esDueno ? "Arma un deck en la sección Decks y márcalo como público." : "No tiene decks públicos."} />
      ) : (
        <div className="dk-grid">
          {decks.map(d => {
            const cartas = ((d.deck_cards ?? []) as { needed: number }[]).reduce((s, c) => s + (c.needed ?? 0), 0);
            return (
              <Link key={d.id} href={`/${j.username}/deck/${slugifySetName(d.name)}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 12, border: INNER_BORDER, background: PANEL_BG, minWidth: 0 }}>
                {d.cover_card_image ? (
                  <img src={d.cover_card_image} alt={d.name} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "5 / 7", borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}><Layers size={22} color={VIOLET} /></div>
                )}
                <p style={{ ...txt, fontSize: 11, fontWeight: 600, color: INK0 }}>{d.name}</p>
                <p style={{ ...txt, fontSize: 9, color: INK2 }}>{cartas} cartas</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
