import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Moderación del market: lista las publicaciones por estado y las aprueba,
 * rechaza o devuelve a revisión.
 *
 * Va con la llave de servicio porque las publicaciones pendientes no son
 * legibles por RLS para nadie más que su dueño — el admin las ve solo por aquí,
 * y siempre después de comprobar el rol.
 */

const ESTADOS = ["pending", "active", "rejected"] as const;
type Estado = (typeof ESTADOS)[number];

async function adminActual() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("players").select("role").eq("user_id", user.id).single();
  return data?.role === "admin" ? user : null;
}

/** Cuántas publicaciones esperan revisión, para el contador de la pestaña. */
async function contarPendientes() {
  const { count } = await supabaseAdmin
    .from("market_listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

/** Vendedores de confianza: sus cartas salen al market sin pasar por la cola. */
async function listarConfiables() {
  const { data: filas, error } = await supabaseAdmin
    .from("market_vendedores_confiables")
    .select("user_id, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (filas ?? []).map(f => f.user_id);
  const [{ data: players }, { data: activas }, pendingCount] = await Promise.all([
    ids.length
      ? supabaseAdmin.from("players").select("user_id, username, pais, ciudad").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; username: string; pais: string | null; ciudad: string | null }[] }),
    ids.length
      ? supabaseAdmin.from("market_listings").select("user_id").eq("status", "active").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    contarPendientes(),
  ]);

  const porUsuario = Object.fromEntries((players ?? []).map(p => [p.user_id, p]));
  const cuantas: Record<string, number> = {};
  for (const a of activas ?? []) cuantas[a.user_id] = (cuantas[a.user_id] ?? 0) + 1;

  return NextResponse.json({
    confiables: (filas ?? []).map(f => ({
      ...f,
      player: porUsuario[f.user_id] ?? null,
      activas: cuantas[f.user_id] ?? 0,
    })),
    pendingCount,
  });
}

/**
 * Agrega o quita un vendedor de confianza. Al agregarlo también se aprueba lo
 * que tenía esperando: no tiene sentido que confiar en alguien deje sus cartas
 * de hoy en la cola.
 */
async function cambiarConfianza(adminId: string, userId: string | undefined, username: string | undefined, confiar: boolean) {
  let uid = userId;
  if (!uid && username) {
    const { data } = await supabaseAdmin
      /* ilike para no distinguir mayúsculas, con _ y % escapados: en un
         username son letras, no comodines */
      .from("players").select("user_id")
      .ilike("username", username.replace(/^@/, "").trim().replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    uid = data?.user_id;
    if (!uid) return NextResponse.json({ error: "No existe ese usuario" }, { status: 404 });
  }
  if (!uid) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  if (!confiar) {
    const { error } = await supabaseAdmin.from("market_vendedores_confiables").delete().eq("user_id", uid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin
    .from("market_vendedores_confiables")
    .upsert({ user_id: uid, habilitado_por: adminId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: aprobadas } = await supabaseAdmin
    .from("market_listings")
    .update({ status: "active", rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("user_id", uid)
    .eq("status", "pending")
    .select("id");

  await supabaseAdmin.from("notifications").insert({
    user_id: uid,
    type: "listing_approved",
    title: "Tus cartas ya no necesitan aprobación",
    body: "A partir de ahora lo que publiques sale directo al market.",
    data: { url: "/dashboard/market" },
  });

  return NextResponse.json({ ok: true, aprobadas: aprobadas?.length ?? 0 });
}

/** Publicaciones de un estado + cuántas esperan revisión. */
export async function GET(req: NextRequest) {
  if (!await adminActual()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (req.nextUrl.searchParams.get("status") === "confiables") return listarConfiables();

  const pedido = req.nextUrl.searchParams.get("status") ?? "pending";
  const estado = (ESTADOS as readonly string[]).includes(pedido) ? (pedido as Estado) : "pending";

  const [{ data: rows, error }, count, { data: confiables }] = await Promise.all([
    supabaseAdmin
      .from("market_listings")
      .select("id, user_id, card_id, set_id, price_cop, currency, version, language, status, rejection_reason, created_at, reviewed_at")
      .eq("status", estado)
      .order("created_at", { ascending: estado === "pending" }),
    contarPendientes(),
    supabaseAdmin.from("market_vendedores_confiables").select("user_id"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* El nombre del vendedor en una segunda consulta: no hay relación declarada
     entre market_listings y players que PostgREST pueda seguir */
  const userIds = [...new Set((rows ?? []).map(r => r.user_id).filter(Boolean))];
  const { data: players } = userIds.length
    ? await supabaseAdmin.from("players").select("user_id, username, pais, ciudad").in("user_id", userIds)
    : { data: [] };

  const porUsuario = Object.fromEntries((players ?? []).map(p => [p.user_id, p]));

  return NextResponse.json({
    listings: (rows ?? []).map(r => ({ ...r, player: porUsuario[r.user_id] ?? null })),
    pendingCount: count,
    confiables: (confiables ?? []).map(c => c.user_id),
  });
}

/** Aprobar, rechazar (con motivo) o devolver a revisión una publicación. */
export async function POST(req: NextRequest) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: string; action?: string; reason?: string; user_id?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, action } = body;

  if (action === "trust" || action === "untrust") {
    return cambiarConfianza(admin.id, body.user_id, body.username, action === "trust");
  }
  const reason = (body.reason ?? "").trim().slice(0, 500);

  if (!id || !action) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "El rechazo necesita un motivo" }, { status: 400 });
  }

  const nuevoEstado =
    action === "approve" ? "active"
    : action === "reject" ? "rejected"
    : action === "revert" ? "pending"
    : null;

  if (!nuevoEstado) return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });

  const { data: listing, error } = await supabaseAdmin
    .from("market_listings")
    .update({
      status: nuevoEstado,
      rejection_reason: action === "reject" ? reason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", id)
    .select("user_id, card_id, set_id, price_cop, currency")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Avisar al vendedor. Si la notificación falla, la moderación ya se aplicó:
     no tiene sentido deshacerla ni devolver error */
  if (listing?.user_id) {
    const aviso =
      action === "approve" ? {
        type: "listing_approved",
        title: "Tu carta ya está en el market",
        body: "Aprobamos tu publicación y cualquiera puede verla.",
      }
      : action === "reject" ? {
        type: "listing_rejected",
        title: "Tu publicación no fue aprobada",
        body: reason,
      }
      : {
        type: "listing_pending",
        title: "Tu publicación volvió a revisión",
        body: reason || "La sacamos del market mientras la revisamos.",
      };

    await supabaseAdmin.from("notifications").insert({
      user_id: listing.user_id,
      ...aviso,
      data: { url: "/dashboard/market", listing_id: id },
    });
  }

  return NextResponse.json({ ok: true, status: nuevoEstado });
}
