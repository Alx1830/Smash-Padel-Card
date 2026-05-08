import { createClient } from "@/lib/supabase/server";
import { PokemonSetsSection } from "@/components/PokemonSetsSection";
import { ScrollToTop } from "@/components/ScrollToTop";
import { redirect } from "next/navigation";
import Link from "next/link";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default async function AgregarInventarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .agregar-header { padding: 24px 20px 0; }
        @media (min-width: 768px) { .agregar-header { padding: 48px 48px 0; } }
      `}</style>
      <div className="agregar-header">
        <Link href="/dashboard/inventario" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em",
          textTransform: "uppercase", color: INK2, textDecoration: "none",
          marginBottom: "16px",
        }}>
          ← Volver al inventario
        </Link>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi Colección
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: "0 0 0" }}>
          Agregar al inventario
        </h1>
      </div>
      <PokemonSetsSection userId={user.id} />
      <ScrollToTop />
    </div>
  );
}
