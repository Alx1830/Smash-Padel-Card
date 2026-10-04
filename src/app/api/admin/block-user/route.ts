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

export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, blocked } = await req.json();
  if (!userId || typeof blocked !== "boolean") {
    return NextResponse.json({ error: "userId y blocked requeridos" }, { status: 400 });
  }

  /* La casilla `blocked` sola no frenaba a nadie: nada la leía. El bloqueo de
     verdad es suspender la cuenta en Auth — no puede iniciar sesión ni renovar
     su sesión — y el layout del dashboard corta a quien tenga la suspensión. */
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const { error } = await supabaseAdmin
    .from("players")
    .update({ blocked })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
