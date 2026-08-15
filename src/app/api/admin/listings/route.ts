import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Moderación del market: lista las publicaciones por estado y las aprueba,
 * rechaza o devuelve a revisión.
 *
 * Va con la llave de servicio porque las publicaciones pendientes no son
 * legibles por RLS para nadie más que su dueño — el admin las ve solo por aquí,
 * y siempre después de comprobar el rol.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

/** Publicaciones de un estado + cuántas esperan revisión. */
export async function GET(req: NextRequest) {
  if (!await adminActual()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pedido = req.nextUrl.searchParams.get("status") ?? "pending";
  const estado = (ESTADOS as readonly string[]).includes(pedido) ? (pedido as Estado) : "pending";

  const [{ data: rows, error }, { count }] = await Promise.all([
    supabaseAdmin
      .from("market_listings")
      .select("id, user_id, card_id, set_id, price_cop, currency, version, language, status, rejection_reason, created_at, reviewed_at")
      .eq("status", estado)
      .order("created_at", { ascending: estado === "pending" }),
    supabaseAdmin
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
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
    pendingCount: count ?? 0,
  });
}

/** Aprobar, rechazar (con motivo) o devolver a revisión una publicación. */
export async function POST(req: NextRequest) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: string; action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, action } = body;
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
