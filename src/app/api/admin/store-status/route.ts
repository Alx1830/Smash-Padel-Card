import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const VALID = ["pending", "approved", "rejected"] as const;
type StoreStatus = (typeof VALID)[number];

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
  return prof?.role === "admin" ? user : null;
}

/** Cola de tiendas por revisar */
export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  let query = supabaseAdmin
    .from("players")
    .select("user_id, username, first_name, last_name, photo_url, cover_url, pais, ciudad, store_status, whatsapp_indicativo, whatsapp_numero, created_at")
    .eq("tipo_perfil", "Tienda Pokémon")
    .order("created_at", { ascending: true });

  if (status && (VALID as readonly string[]).includes(status)) {
    query = query.eq("store_status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ stores: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, status } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  if (!(VALID as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `status debe ser uno de: ${VALID.join(", ")}` }, { status: 400 });
  }

  // Solo tiendas: el estado no significa nada en el resto de perfiles
  const { data: player } = await supabaseAdmin
    .from("players")
    .select("username, tipo_perfil")
    .eq("user_id", userId)
    .single();

  if (!player) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  if (player.tipo_perfil !== "Tienda Pokémon") {
    return NextResponse.json({ error: "El perfil no es una Tienda Pokémon" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("players")
    .update({ store_status: status as StoreStatus })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // El perfil público se cachea 300s; al aprobar conviene verlo ya
  if (player.username) revalidatePath(`/${player.username}`);

  return NextResponse.json({ success: true });
}
