import { createClient } from "@/lib/supabase/server";
import { PokemonSetsSection } from "@/components/PokemonSetsSection";
import { ScrollToTop } from "@/components/ScrollToTop";
import { redirect } from "next/navigation";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default async function InventarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .inv-header { padding: 24px 20px 0; }
        @media (min-width: 768px) { .inv-header { padding: 48px 48px 0; } }
      `}</style>
      <div className="inv-header">
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi Colección
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: "0 0 0" }}>
          Inventario
        </h1>
      </div>
      <PokemonSetsSection userId={user.id} />
      <ScrollToTop />
    </div>
  );
}
