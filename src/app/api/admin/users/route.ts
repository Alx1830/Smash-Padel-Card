import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
  return prof?.role === "admin" ? user : null;
}

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: players } = await supabaseAdmin
    .from("players")
    .select("user_id, username, first_name, last_name, photo_url, blocked, last_seen");

  const playerMap: Record<string, any> = {};
  (players ?? []).forEach(p => { playerMap[p.user_id] = p; });

  const users = authUsers.users.map(u => {
    const player = playerMap[u.id] ?? {};
    // "Última conexión" = lo más reciente entre el último login y el último
    // heartbeat del dashboard. last_seen puede ser null en cuentas viejas.
    const candidates = [u.last_sign_in_at, player.last_seen].filter(Boolean) as string[];
    const lastActive = candidates.length
      ? candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
      : null;

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      ...player,
      last_sign_in_at: u.last_sign_in_at ?? null,
      last_active: lastActive,
    };
  });

  return NextResponse.json({ users });
}
