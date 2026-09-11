/**
 * Panel de publicaciones: la lista de noticias, con sus borradores.
 * El acceso lo corta el servidor — antes se comprobaba en el navegador.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Plus, PenLine, Bell, FileText, ExternalLink, CalendarClock } from "lucide-react";
import { fechaLarga, etiquetaCategoria } from "@/lib/posts";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export const dynamic = "force-dynamic";

export default async function AdminFeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: perfil } = await admin
    .from("players").select("role").eq("user_id", user.id).single();
  if (perfil?.role !== "admin") redirect("/dashboard");

  const { data: posts } = await admin
    .from("admin_posts")
    .select("id, slug, title, excerpt, cover_url, category, status, published_at, scheduled_at, created_at, notified_at")
    .order("created_at", { ascending: false });

  const lista = posts ?? [];

  return (
    <div className="afeed-page">
      <style>{`
        .afeed-page { min-height: 100vh; background: ${BG0}; padding: 40px 24px 90px; }
        .afeed-wrap { max-width: 1400px; }
        .afeed-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1240px) { .afeed-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px), (pointer: coarse) {
          .afeed-page { padding: 28px 16px 90px; }
          .afeed-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
        }
      `}</style>

      <div className="afeed-wrap">
        {/* Cabecera */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>
            Publicaciones
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
            Cada una tiene su propia dirección y puede avisar a todos los usuarios
          </p>
        </div>

        <Link href="/dashboard/admin/feed/nueva" style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px",
          borderRadius: 9, background: COURT, color: BG0, textDecoration: "none",
          fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 26,
        }}>
          <Plus size={15} /> Nueva publicación
        </Link>

        {lista.length === 0 ? (
          <div style={{
            border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 14, padding: "44px 24px",
            textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <FileText size={26} color={INK2} />
            <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, margin: 0 }}>
              Todavía no hay publicaciones. Creá la primera con el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="afeed-grid">
            {lista.map((p) => {
              const publicado = p.status === "published";
              /* Una programada no es un borrador: está escrita, aprobada y con
                 hora puesta. Merece su propia etiqueta o se pierde entre los
                 borradores a medio hacer. */
              const programada = p.status === "scheduled";
              return (
                <div key={p.id} style={{
                  display: "flex", flexDirection: "column", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", overflow: "hidden",
                }}>
                  {p.cover_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.cover_url} alt="" loading="lazy" decoding="async"
                         style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
                  )}

                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                        padding: "3px 8px", borderRadius: 20,
                        color: publicado ? BG0 : programada ? COURT : LIME,
                        background: publicado ? COURT : "transparent",
                        border: publicado ? "none" : `1px solid ${programada ? COURT : LIME}55`,
                      }}>
                        {publicado ? "Publicada" : programada ? "Programada" : "Borrador"}
                      </span>
                      <span style={{
                        fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                        padding: "3px 8px", borderRadius: 20, color: INK2,
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}>
                        {etiquetaCategoria(p.category)}
                      </span>
                      {programada && p.scheduled_at && (
                        <span title="Sale sola a esta hora" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 9, color: COURT }}>
                          <CalendarClock size={10} />
                          {new Date(p.scheduled_at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {p.notified_at && (
                        <span title="Ya se avisó a los usuarios" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 9, color: INK2 }}>
                          <Bell size={10} /> avisada
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontFamily: DISP, fontSize: 16, color: INK0, margin: 0, lineHeight: 1.3 }}>
                      {p.title}
                    </h2>

                    {p.excerpt && (
                      <p style={{
                        fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, lineHeight: 1.6,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {p.excerpt}
                      </p>
                    )}

                    <span style={{ fontFamily: MONO, fontSize: 10, color: "#4a5164" }}>
                      {fechaLarga(p.published_at ?? p.created_at)}
                    </span>

                    <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10 }}>
                      <Link href={`/dashboard/admin/feed/${p.id}`} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                        border: `1px solid ${COURT}55`, color: COURT, textDecoration: "none",
                        fontFamily: MONO, fontSize: 11, flex: 1, justifyContent: "center",
                      }}>
                        <PenLine size={12} /> Editar
                      </Link>
                      {publicado && p.slug && (
                        <a href={`/post/${p.slug}`} target="_blank" rel="noopener noreferrer"
                           title="Ver publicada" aria-label="Ver publicada"
                           style={{
                             display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 34,
                             borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", color: INK2,
                           }}>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
