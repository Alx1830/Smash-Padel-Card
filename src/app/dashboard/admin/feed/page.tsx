"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminFeed } from "@/components/AdminFeed";

const MONO = "var(--font-jetbrains)";
const DISP = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0 = "#f5f7fb";
const INK2 = "#7a8298";

export default function AdminFeedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("players")
        .select("role, username")
        .eq("user_id", user.id)
        .single();

      if (data?.role !== "admin") { router.replace("/dashboard"); return; }

      setUserId(user.id);
      setUsername(data?.username ?? null);
      setChecking(false);
    }
    check();
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.12em" }}>Verificando acceso...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#05070d", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "32px", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Feed Post
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Publicaciones visibles para todos los usuarios en el dashboard
          </p>
        </div>

        {/* Feed */}
        {userId && <AdminFeed currentUserId={userId} currentUsername={username} isAdmin={true} />}
      </div>
    </div>
  );
}
