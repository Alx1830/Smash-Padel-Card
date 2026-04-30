import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_USERNAME = "Alx1830";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("players").select("username").eq("user_id", user.id).single();
  return prof?.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase() ? user : null;
}

export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, blocked } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("players")
    .update({ blocked })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
