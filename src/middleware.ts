import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiting in-memory ───────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter % 100 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

// ── Rate limit config ─────────────────────────────────────────────────────────
const RATE_LIMITED: Record<string, { limit: number; windowMs: number }> = {
  "/login":              { limit: 15,  windowMs: 60_000 },
  "/api/auth":           { limit: 15,  windowMs: 60_000 },
  "/api/push/subscribe": { limit: 5,   windowMs: 60_000 },
  "/api/webhooks":       { limit: 30,  windowMs: 60_000 },
  "/api/admin":          { limit: 20,  windowMs: 60_000 },
};

// ── Protected routes ──────────────────────────────────────────────────────────
const PROTECTED = ["/dashboard", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting
  maybeCleanup();
  for (const [path, cfg] of Object.entries(RATE_LIMITED)) {
    if (pathname.startsWith(path)) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
      if (!rateLimit(`${ip}:${path}`, cfg.limit, cfg.windowMs)) {
        return new NextResponse(
          JSON.stringify({ error: "Too Many Requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil(cfg.windowMs / 1000)),
            },
          }
        );
      }
      break;
    }
  }

  // 2. Supabase session refresh
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifica la firma del JWT en el propio edge usando el JWKS
  // (el proyecto usa llaves asimétricas ES256), sin ir por red a Supabase Auth
  // en cada request. Es una verificación criptográfica real, no getSession().
  // Si el token fuera legacy HS256, la librería cae sola a la verificación
  // remota, así que el guard nunca se debilita.
  // La verificación fuerte con getUser() sigue viva en el layout de servidor.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;

  // 3. Protect private routes
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!userId && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 4. Redirect logged-in users away from login
  if (userId && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // El guard de onboarding NO vive aquí: hacía una query a `players` en cada
  // request al dashboard, duplicando la que ya hace el layout de servidor.
  // - /dashboard  → src/app/dashboard/layout.tsx (datos memoizados con cache())
  // - /onboarding → la propia página redirige si el perfil ya está completo
  //   o si no hay sesión.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/onboarding",
    "/api/auth/:path*",
    "/api/push/:path*",
    "/api/webhooks/:path*",
    "/api/admin/:path*",
  ],
};
