import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PostEditor } from "@/components/admin/PostEditor";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export const dynamic = "force-dynamic";

export default async function NuevaPublicacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: perfil } = await admin.from("players").select("role").eq("user_id", user.id).single();
  if (perfil?.role !== "admin") redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#05070d", padding: "40px 24px 90px" }}>
      <div style={{ maxWidth: 860 }}>
        <Link href="/dashboard/admin/feed" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 22,
        }}>
          <ArrowLeft size={13} /> Publicaciones
        </Link>

        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>
            Nueva publicación
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
            Guardala como borrador las veces que quieras; el aviso sale solo al publicar
          </p>
        </div>

        <PostEditor post={null} authorId={user.id} />
      </div>
    </div>
  );
}
