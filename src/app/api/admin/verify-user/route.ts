import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
  return prof?.role === "admin" ? user : null;
}

/**
 * Da o quita la verificación (la corona del perfil). Solo un admin; la base
 * además impide que un usuario se la ponga a sí mismo (proteger_campos_admin).
 */
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, verificado } = await req.json();
  if (!userId || typeof verificado !== "boolean") {
    return NextResponse.json({ error: "userId y verificado requeridos" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("players").update({ verificado }).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
