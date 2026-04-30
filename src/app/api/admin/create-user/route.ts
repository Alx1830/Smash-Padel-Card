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

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, username, first_name, last_name } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.user) {
    await supabaseAdmin.from("players").insert({
      user_id: data.user.id,
      username: username || null,
      first_name: first_name || null,
      last_name: last_name || null,
    });
  }

  return NextResponse.json({ user: data.user });
}
