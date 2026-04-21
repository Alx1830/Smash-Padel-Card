import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const results: Record<string, unknown> = {};

  // Test 1: conexión básica — tabla clubs
  const { data: clubs, error: clubsError } = await supabase
    .from("clubs").select("*");
  results.clubs = clubsError
    ? { error: clubsError.message }
    : { ok: true, count: clubs?.length, data: clubs };

  // Test 2: tabla players
  const { data: players, error: playersError } = await supabase
    .from("players").select("id, username").limit(5);
  results.players = playersError
    ? { error: playersError.message }
    : { ok: true, count: players?.length };

  // Test 3: tabla ligas
  const { data: ligas, error: ligasError } = await supabase
    .from("ligas").select("*");
  results.ligas = ligasError
    ? { error: ligasError.message }
    : { ok: true, count: ligas?.length };

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    results,
  }, { status: 200 });
}
