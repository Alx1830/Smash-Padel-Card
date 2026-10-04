import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Salida de una cuenta suspendida. Cierra la sesión antes de mandar al login:
 * con la sesión viva, el proxy la devolvería al dashboard y el layout otra vez
 * aquí, en bucle.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?bloqueado=1", req.url));
}
