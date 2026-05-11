import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players").select("role").eq("user_id", user.id).single();
  if (player?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  revalidatePath(`/${username}`);
  revalidatePath(`/${username}/market`);

  return NextResponse.json({ ok: true, revalidated: [`/${username}`, `/${username}/market`] });
}
