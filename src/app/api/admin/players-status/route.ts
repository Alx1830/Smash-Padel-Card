import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
  return prof?.role === "admin";
}

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("players")
    .select("user_id, last_seen, blocked");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ players: data });
}
